// functions/src/index.ts

import * as v2 from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * 1. PROCESSAR NOVAS TRANSAÇÕES E ATRIBUIR SALDO
 */
export const txProcessor = v2.firestore.onDocumentCreated(
  "transactions/{transactionId}",
  async (event) => {
    const tx = event.data?.data();
    if (!tx || tx.processedByBackend) return;

    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);

    try {
      await db.runTransaction(async (transaction) => {
        const transactionDoc = await transaction.get(event.data!.ref);
        const clientDoc = await transaction.get(clientRef);
        const merchantDoc = await transaction.get(merchantRef);

        const currentTx = transactionDoc.data();
        if (!transactionDoc.exists || !currentTx || currentTx.processedByBackend || currentTx.status !== "available") return;
        if (!clientDoc.exists || !merchantDoc.exists) throw new Error("Documentos não encontrados.");

        const merchantData = merchantDoc.data();
        if (!merchantData) throw new Error("Dados do lojista vazios.");

        const merchantCashbackPercent = Number(merchantData.cashbackPercent ?? 0);
        if (!Number.isFinite(merchantCashbackPercent) || merchantCashbackPercent < 0 || merchantCashbackPercent > 100) {
          throw new Error("Percentagem de cashback inválida.");
        }
        const isLeaving = merchantData.isLeaving === true;
        const invoiceAmount = Number(currentTx.invoiceAmount);
        if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {
          throw new Error("O valor da compra tem de ser superior a zero.");
        }

        let secureCashbackAmount = 0;
        let newCashbackEarned = 0;

        if (currentTx.type === 'earn') {
          if (isLeaving) throw new Error("Loja em processo de saída.");
          secureCashbackAmount = roundToTwo(invoiceAmount * (merchantCashbackPercent / 100));
        } else if (currentTx.type === 'redeem') {
          const requestedCashback = Number(currentTx.cashbackAmount ?? currentTx.amount);
          if (!Number.isFinite(requestedCashback) || requestedCashback <= 0) {
            throw new Error("O valor a descontar tem de ser superior a zero.");
          }
          secureCashbackAmount = roundToTwo(requestedCashback);
          const invoiceCents = Math.round(invoiceAmount * 100);
          const maximumRedeemable = Math.floor(invoiceCents / 2) / 100;

          if (secureCashbackAmount > maximumRedeemable) {
            throw new Error("Fraude: Resgate superior a 50%.");
          }

          if (!isLeaving) {
            const amountPaid = Math.max(0, invoiceAmount - secureCashbackAmount);
            newCashbackEarned = roundToTwo(amountPaid * (merchantCashbackPercent / 100));
          }
        } else {
          throw new Error("Tipo de transação inválido.");
        }

        transaction.update(event.data!.ref, {
          cashbackAmount: secureCashbackAmount,
          cashbackEarned: newCashbackEarned,
          cashbackPercent: isLeaving ? 0 : merchantCashbackPercent,
          processedByBackend: true
        });

        const userData = clientDoc.data();
        if (!userData) throw new Error("Dados do cliente vazios.");

        let storeWallets = userData.storeWallets || {};
        const mId = currentTx.merchantId;

        if (!storeWallets[mId]) storeWallets[mId] = { available: 0, pending: 0, merchantName: currentTx.merchantName };

        const currentAvailable = roundToTwo(Number(storeWallets[mId].available || 0));
        if (!Number.isFinite(currentAvailable) || currentAvailable < 0) {
          throw new Error("Saldo da loja inválido.");
        }

        if (currentTx.type === 'earn') {
          storeWallets[mId].available = roundToTwo(currentAvailable + secureCashbackAmount);
        } else if (currentTx.type === 'redeem') {
          if (currentAvailable < secureCashbackAmount) throw new Error("Saldo insuficiente.");
          storeWallets[mId].available = roundToTwo(currentAvailable - secureCashbackAmount + newCashbackEarned);
        }

        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();
        const globalAvailable = Object.values(storeWallets).reduce((total: number, wallet: any) => {
          return total + Number(wallet.available || 0);
        }, 0);

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: 0 }
        });
      });

      const clientDocAfter = await clientRef.get();
      const clientData = clientDocAfter.data();
      if (clientData && clientData.wallet) {
        const totalAvailable = clientData.wallet.available || 0;
        if (totalAvailable >= 50 && clientData.fcmTokens && clientData.fcmTokens.length > 0) {
          const message = {
            notification: {
              title: "Saldo de 50€ Atingido! 🎉",
              body: `Parabéns! Já tens ${totalAvailable.toFixed(2)}€ acumulados no Vizinho+!`,
            },
            tokens: clientData.fcmTokens,
            webpush: {
              headers: { Urgency: "high" },
              notification: {
                icon: "/logo192.png",
                badge: "/logo192.png",
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200]
              }
            }
          };
          await admin.messaging().sendEachForMulticast(message);
        }
      }

    } catch (error: any) {
      logger.error("Erro Transação:", error);
      await db.runTransaction(async (transaction) => {
        const transactionDoc = await transaction.get(event.data!.ref);
        const currentTx = transactionDoc.data();
        if (transactionDoc.exists && currentTx?.status === "available" && !currentTx.processedByBackend) {
          transaction.update(event.data!.ref, { status: "rejected", rejectReason: error.message });
        }
      });
    }
  }
);

/**
 * 2. REVERTER ANULAÇÕES
 */
export const txReverser = v2.firestore.onDocumentUpdated(
  "transactions/{transactionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before && after && before.status === 'available' && before.processedByBackend === true && after.status === 'cancelled') {
      const clientRef = db.collection("users").doc(after.clientId);
      const transactionRef = event.data!.after.ref;

      await db.runTransaction(async (transaction) => {
        const transactionDoc = await transaction.get(transactionRef);
        const clientDoc = await transaction.get(clientRef);
        const currentTx = transactionDoc.data();
        if (!transactionDoc.exists || !currentTx || currentTx.walletReversalProcessed) return;
        if (currentTx.status !== "cancelled" || currentTx.processedByBackend !== true) return;

        const userData = clientDoc.data();
        if (!clientDoc.exists || !userData) return;

        let storeWallets = userData.storeWallets || {};
        const mId = currentTx.merchantId;

        if (!storeWallets[mId]) {
          transaction.update(transactionRef, { walletReversalProcessed: true });
          return;
        }

        const currentAvailable = roundToTwo(Number(storeWallets[mId].available || 0));
        if (!Number.isFinite(currentAvailable) || currentAvailable < 0) {
          throw new Error("Saldo da loja inválido.");
        }
        const amountToCancel = Number(currentTx.cashbackAmount) || 0;
        const earnedToCancel = Number(currentTx.cashbackEarned) || 0;

        if (currentTx.type === 'earn') {
          storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
        } else if (currentTx.type === 'redeem') {
          storeWallets[mId].available = roundToTwo(currentAvailable + amountToCancel - earnedToCancel);
        }

        const globalAvailable = Object.values(storeWallets).reduce((total: number, wallet: any) => {
          return total + Number(wallet.available || 0);
        }, 0);

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: 0 }
        });
        transaction.update(transactionRef, { walletReversalProcessed: true });
      });
    }
  }
);

/**
 * 3. AVALIAÇÕES DAS LOJAS (Feedback)
 */
export const feedbackNotifier = v2.firestore.onDocumentCreated(
  "feedbacks/{feedbackId}",
  async (event) => {
    const feedback = event.data?.data();
    if (!feedback) return;
    try {
      const merchantDoc = await db.collection("users").doc(feedback.merchantId).get();
      const merchantData = merchantDoc.data();
      if (merchantData && merchantData.fcmTokens && merchantData.fcmTokens.length > 0) {
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
      logger.error("Erro feedback:", error);
    }
  }
);

/**
 * 4. MOTOR DE DISPARO DE NOTIFICAÇÕES DO ADMIN
 */
export const notifDispatcher = v2.firestore.onDocumentWritten(
  "notifications/{notifId}",
  async (event) => {
    const notif = event.data?.after.data();

    if (!notif || notif.status !== 'approved' || notif.sent === true) return;

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
        } else if (notif.targetType === 'birthDate') {
          if (user.birthDate && user.birthDate.split('-')[1] === notif.targetValue) matches = true;
        } else if (notif.targetType === 'zonas') {
          const zones = notif.targetZones || [];
          if (zones.some((z: string) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`))) {
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
            notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true, vibrate: [200, 100, 200, 100, 200] }
          }
        };

        const chunkSize = 500;
        for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
          const chunk = uniqueTokens.slice(i, i + chunkSize);
          await admin.messaging().sendEachForMulticast({ ...message, tokens: chunk });
        }
      }

      await event.data?.after.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), reachCount: tokens.length });

    } catch (error) {
      logger.error("Erro fatal no disparo de Push Admin:", error);
    }
  }
);

/**
 * 5. MOTOR DE DISPARO DO LOJISTA
 */
export const merchantPushDispatcher = v2.firestore.onDocumentUpdated(
  "marketing_requests/{reqId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before?.status !== 'approved' && after?.status === 'approved' && after?.type === 'push_notification' && after?.sent !== true) {

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
          } else if (after.targetType === 'zonas') {
            const zones = after.targetZones || [];
            if (zones.some((z: string) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`))) {
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
              notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true, vibrate: [200, 100, 200, 100, 200] }
            }
          };

          const chunkSize = 500;
          for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
            const chunk = uniqueTokens.slice(i, i + chunkSize);
            await admin.messaging().sendEachForMulticast({ ...message, tokens: chunk });
          }
        }

        await event.data?.after.ref.update({ sent: true });

      } catch (error) {
        logger.error("Erro no Push do Lojista:", error);
      }
    }
  }
);

/**
 * 6. MENSAGEM MANUAL DO ADMIN
 */
export const adminMessenger = v2.https.onCall(async (request) => {
  if (request.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new v2.https.HttpsError("permission-denied", "Acesso restrito.");
  }
  const { targetUserId, title, body } = request.data;
  try {
    let tokens: string[] = [];
    if (targetUserId === "all") {
      const allUsers = await db.collection("users").where("fcmTokens", "!=", []).get();
      allUsers.forEach(doc => { const d = doc.data(); if (d.fcmTokens) tokens.push(...d.fcmTokens); });
    } else {
      const userDoc = await db.collection("users").doc(targetUserId).get();
      tokens = userDoc.data()?.fcmTokens || [];
    }
    if (tokens.length === 0) return { success: false };
    const message = {
      notification: { title, body }, tokens,
      webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png", vibrate: [200, 100, 200] } }
    };
    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, sentCount: response.successCount };
  } catch (error: any) {
    throw new v2.https.HttpsError("internal", error.message);
  }
});

/**
 * 7. CONTADOR DE MEMBROS
 */
export const memberCounter = v2.firestore.onDocumentWritten(
  "users/{userId}",
  async () => {
    try {
      const usersSnap = await db.collection("users").get();
      const count = usersSnap.size;
      logger.info(`[memberCounter] Contando membros: ${count}`);
      await db.doc("system/memberCount").set({
        count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.error("Erro ao atualizar contador:", error);
    }
  }
);

/**
 * 8. ENDPOINT HTTP - Retorna contagem de membros (público)
 */
export const getMemberCount = v2.https.onRequest(async (req, res) => {
  try {
    const countSnap = await db.doc("system/memberCount").get();
    if (countSnap.exists) {
      res.header("Cache-Control", "public, max-age=3600");
      res.json({ count: countSnap.data()?.count || 0 });
    } else {
      // Se o documento não existe, contar e criar
      const usersSnap = await db.collection("users").get();
      const count = usersSnap.size;
      await db.doc("system/memberCount").set({
        count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ count });
    }
  } catch (error) {
    logger.error("Erro em getMemberCount:", error);
    res.status(500).json({ error: "Erro ao contar membros" });
  }
});