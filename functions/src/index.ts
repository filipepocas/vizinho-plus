// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Função Auxiliar para arredondamento financeiro preciso (2 casas decimais)
 * Evita problemas de dízimas binárias (ex: 0.1 + 0.2 = 0.30000000000000004)
 */
const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * 1. PROCESSAR NOVAS TRANSAÇÕES (WIZARD FLOW)
 * Esta função é o motor central do cashback. 
 * Processa compras, descontos e notas de crédito de forma unificada.
 */
export const processNewTransaction = functions.region("us-central1").firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const tx = snap.data();
    
    // Proteção contra loops e dados nulos
    if (!tx || tx.processedByBackend) return;

    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);

    try {
      let notificationPayload = { title: "", body: "" };

      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const merchantDoc = await transaction.get(merchantRef);
        
        if (!clientDoc.exists || !merchantDoc.exists) throw new Error("Documentos não encontrados.");

        const merchantData = merchantDoc.data();
        if (!merchantData) throw new Error("Dados do lojista vazios.");

        const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
        const invoiceAmount = Number(tx.invoiceAmount) || 0;
        
        // --- NOVA MATEMÁTICA DO WIZARD ---
        // Se o tipo for 'redeem', o campo 'amount' traz o valor do desconto solicitado
        let discountUsed = 0;
        if (tx.type === 'redeem') {
            discountUsed = Number(tx.amount) || 0;
        }

        // O Cashback é ganho sobre o valor real pago (Fatura - Desconto)
        // Se for nota de crédito (fatura negativa), o cashback ganho será negativo (estorno de saldo)
        const amountPaid = roundToTwo(invoiceAmount - discountUsed);
        const secureCashbackEarned = roundToTwo(amountPaid * (merchantCashbackPercent / 100));

        // O impacto líquido na carteira do cliente é: O que ganhou MENOS o que descontou
        const netWalletChange = roundToTwo(secureCashbackEarned - discountUsed);

        // Atualiza o documento da transação com os valores finais blindados pelo servidor
        transaction.update(snap.ref, {
            cashbackAmount: secureCashbackEarned, // Valor do cashback gerado (positivo ou negativo)
            discountUsed: discountUsed,           // Valor do saldo que foi abatido
            amountPaid: amountPaid,               // Valor final pago em dinheiro/cartão
            cashbackPercent: merchantCashbackPercent,
            processedByBackend: true,
            status: 'available'                   // Saldo fica disponível no imediato
        });

        const userData = clientDoc.data();
        if (!userData) throw new Error("Dados do cliente vazios.");

        let storeWallets = userData.storeWallets || {};
        const mId = tx.merchantId;
        
        // Inicializa carteira da loja se não existir
        if (!storeWallets[mId]) {
            storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };
        }

        let currentAvailable = Number(storeWallets[mId].available) || 0;
        
        // Atualização do saldo da loja específica (pode ficar negativo em notas de crédito)
        storeWallets[mId].available = roundToTwo(currentAvailable + netWalletChange);
        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();

        // Recalcular Saldo Global do Utilizador (Soma de todas as storeWallets)
        let globalAvailable = 0;
        Object.values(storeWallets).forEach((w: any) => { 
            globalAvailable += (Number(w.available) || 0); 
        });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { 
            available: roundToTwo(globalAvailable), 
            pending: 0 
          }
        });

        // Criar Alerta Interno (Notificação na App que desaparece ao ler)
        const alertRef = db.collection("users").doc(tx.clientId).collection("alerts").doc();
        transaction.set(alertRef, {
            title: invoiceAmount >= 0 ? "Nova Compra!" : "Nota de Crédito",
            message: invoiceAmount >= 0 
                ? `Compra em ${tx.merchantName}. Fatura: ${invoiceAmount.toFixed(2)}€ | Ganhaste: ${secureCashbackEarned.toFixed(2)}€.`
                : `Nota de crédito em ${tx.merchantName}. Valor: ${invoiceAmount.toFixed(2)}€ | Saldo ajustado.`,
            type: 'transaction',
            transactionId: snap.id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        notificationPayload = {
            title: `Vizinho+: ${tx.merchantName}`,
            body: invoiceAmount >= 0 
                ? `Pagaste ${amountPaid.toFixed(2)}€ e ganhaste ${secureCashbackEarned.toFixed(2)}€ de cashback! 🥳`
                : `Nota de crédito de ${Math.abs(invoiceAmount).toFixed(2)}€ processada.`
        };
      });

      // ENVIAR NOTIFICAÇÃO PUSH (Executado após o sucesso da transação)
      const clientDocAfter = await clientRef.get();
      const clientData = clientDocAfter.data();
      if (clientData?.fcmTokens && clientData.fcmTokens.length > 0) {
          const message = {
              notification: notificationPayload,
              tokens: clientData.fcmTokens,
              webpush: {
                  headers: { Urgency: "high" },
                  notification: {
                      icon: "/logo192.png",
                      badge: "/logo192.png",
                      requireInteraction: true
                  }
              }
          };
          await admin.messaging().sendEachForMulticast(message);
      }
      
    } catch (error: any) {
      console.error("Erro Crítico na Transação:", error);
      await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
  });
/**
 * 2. REVERTER ANULAÇÕES
 * Se o lojista anular uma transação, o sistema reverte exatamente o impacto 
 * líquido que foi aplicado na carteira do cliente.
 */
export const revertCancelledTransaction = functions.region("us-central1").firestore
  .document("transactions/{transactionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Só executa se o status mudar para 'cancelled'
    if (before && after && before.status !== 'cancelled' && after.status === 'cancelled') {
      const clientRef = db.collection("users").doc(after.clientId);
      
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const userData = clientDoc.data();
        if (!clientDoc.exists || !userData) return;

        let storeWallets = userData.storeWallets || {};
        const mId = after.merchantId;
        if (!storeWallets[mId]) return;

        let currentAvailable = Number(storeWallets[mId].available) || 0;
        
        // Recupera os valores calculados pelo backend no momento da criação
        const cashbackEarned = Number(after.cashbackAmount) || 0;
        const discountUsed = Number(after.discountUsed) || 0;

        // O impacto original foi: (Ganho - Desconto)
        // Para reverter, subtraímos esse impacto do saldo atual
        const netImpactToRevert = roundToTwo(cashbackEarned - discountUsed);

        storeWallets[mId].available = roundToTwo(currentAvailable - netImpactToRevert);
        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();

        // Recalcular Saldo Global
        let globalAvailable = 0;
        Object.values(storeWallets).forEach((w: any) => { 
            globalAvailable += (Number(w.available) || 0); 
        });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: 0 }
        });
      });
    }
  });

/**
 * 3. AVALIAÇÕES DAS LOJAS (Feedback)
 * Notifica o lojista quando recebe uma nova avaliação.
 */
export const onNewFeedback = functions.region("us-central1").firestore
  .document("feedbacks/{feedbackId}")
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    if (!feedback) return;
    try {
      const merchantDoc = await db.collection("users").doc(feedback.merchantId).get();
      const merchantData = merchantDoc.data();
      if (merchantData?.fcmTokens && merchantData.fcmTokens.length > 0) {
        const message = {
          notification: { 
              title: "Nova Avaliação de Cliente!", 
              body: `${feedback.userName} deu-te ${feedback.rating} estrelas.` 
          },
          tokens: merchantData.fcmTokens,
          webpush: {
              headers: { Urgency: "high" },
              notification: { icon: "/logo192.png", badge: "/logo192.png", vibrate: [200, 100, 200] }
          }
        };
        await admin.messaging().sendEachForMulticast(message);
      }
    } catch (error) {
        console.error("Erro ao notificar feedback:", error);
    }
  });

/**
 * 4. MOTOR DE DISPARO DE NOTIFICAÇÕES DO ADMIN
 * Filtra utilizadores e envia notificações em massa (Multicast).
 */
export const dispatchAdminNotifications = functions.region("us-central1").firestore
  .document("notifications/{notifId}")
  .onWrite(async (change, context) => {
    const notif = change.after.data();
    
    if (!notif || notif.status !== 'approved' || notif.sent === true) return;

    // Proteção para agendamentos futuros
    const scheduledFor = notif.scheduledFor?.toDate ? notif.scheduledFor.toDate() : new Date(notif.scheduledFor);
    if (scheduledFor > new Date()) return; 

    try {
        const usersSnap = await db.collection("users").where("role", "==", "client").where("status", "==", "active").get();
        let tokens: string[] = [];

        usersSnap.forEach(doc => {
            const user = doc.data();
            if (!user.fcmTokens || user.fcmTokens.length === 0) return;

            let matches = false;
            if (notif.targetType === 'all') matches = true;
            else if (notif.targetType === 'email') {
                if (user.email === notif.targetValue?.toLowerCase()) matches = true;
            } 
            else if (notif.targetType === 'birthDate') {
                if (user.birthDate && user.birthDate.split('-')[1] === notif.targetValue) matches = true;
            } 
            else if (notif.targetType === 'zonas') {
                const zones = notif.targetZones || [];
                if (zones.some((z: string) => 
                    z.includes(`Freguesia: ${user.freguesia}`) || 
                    z.includes(`Concelho: ${user.concelho}`) || 
                    z.includes(`Distrito: ${user.distrito}`)
                )) {
                    matches = true;
                }
            }

            if (matches) tokens.push(...user.fcmTokens);
        });

        if (tokens.length > 0) {
            const uniqueTokens = [...new Set(tokens)];
            const message = {
                notification: { title: notif.title, body: notif.message },
                webpush: {
                    headers: { Urgency: "high" },
                    notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true }
                }
            };

            // Envio em lotes de 500 (Limite do Firebase)
            const chunkSize = 500;
            for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                const chunk = uniqueTokens.slice(i, i + chunkSize);
                await admin.messaging().sendEachForMulticast({ ...message, tokens: chunk });
            }
        }

        await change.after.ref.update({ 
            sent: true, 
            sentAt: admin.firestore.FieldValue.serverTimestamp(), 
            reachCount: tokens.length 
        });

    } catch (error) {
        console.error("Erro fatal no disparo de Push Admin:", error);
    }
  });

/**
 * 5. MOTOR DE DISPARO DO LOJISTA (Marketing)
 */
export const dispatchMerchantPushCampaigns = functions.region("us-central1").firestore
  .document("marketing_requests/{reqId}")
  .onUpdate(async (change, context) => {
     const before = change.before.data();
     const after = change.after.data();

     if (before && after && before.status !== 'approved' && after.status === 'approved' && after.type === 'push_notification' && after.sent !== true) {
         
        try {
            const usersSnap = await db.collection("users").where("role", "==", "client").where("status", "==", "active").get();
            let tokens: string[] = [];

            usersSnap.forEach(doc => {
                const user = doc.data();
                if (!user.fcmTokens || user.fcmTokens.length === 0) return;

                let matches = false;
                if (after.targetType === 'all') matches = true;
                else if (after.targetType === 'birthDate') {
                    const cm = new Date().getMonth() + 1;
                    if (user.birthDate && parseInt(user.birthDate.split('-')[1]) === cm) matches = true;
                } 
                else if (after.targetType === 'zonas') {
                    const zones = after.targetZones || [];
                    if (zones.some((z: string) => 
                        z.includes(`Freguesia: ${user.freguesia}`) || 
                        z.includes(`Concelho: ${user.concelho}`) || 
                        z.includes(`Distrito: ${user.distrito}`)
                    )) {
                        matches = true;
                    }
                }

                if (matches) tokens.push(...user.fcmTokens);
            });

            if (tokens.length > 0) {
                const uniqueTokens = [...new Set(tokens)];
                const message = {
                    notification: { title: after.title, body: after.text },
                    webpush: {
                        headers: { Urgency: "high" },
                        notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true }
                    }
                };

                const chunkSize = 500;
                for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                    const chunk = uniqueTokens.slice(i, i + chunkSize);
                    await admin.messaging().sendEachForMulticast({ ...message, tokens: chunk });
                }
            }

            await change.after.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp() });

        } catch (error) {
            console.error("Erro no Push do Lojista:", error);
        }
     }
  });

/**
 * 6. MENSAGEM MANUAL DO ADMIN (HTTPS CALLABLE)
 */
export const sendAdminNotification = functions.region("us-central1").https.onCall(async (data, context) => {
  // Proteção de e-mail do Super Admin
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
      throw new functions.https.HttpsError("permission-denied", "Acesso restrito ao Super Administrador.");
  }

  const { targetUserId, title, body } = data;
  try {
    let tokens: string[] = [];
    if (targetUserId === "all") {
      const allUsers = await db.collection("users").where("fcmTokens", "!=", []).get();
      allUsers.forEach(doc => { 
          const d = doc.data(); 
          if (d.fcmTokens) tokens.push(...d.fcmTokens); 
      });
    } else {
      const userDoc = await db.collection("users").doc(targetUserId).get();
      tokens = userDoc.data()?.fcmTokens || [];
    }

    if (tokens.length === 0) return { success: false, message: "Nenhum dispositivo encontrado." };

    const message = { 
        notification: { title, body }, 
        tokens: [...new Set(tokens)], 
        webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png" } } 
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, sentCount: response.successCount };
  } catch (error: any) { 
      throw new functions.https.HttpsError("internal", error.message); 
  }
});