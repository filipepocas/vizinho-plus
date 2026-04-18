import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * 1. PROCESSAR NOVAS TRANSAÇÕES E NOTIFICAÇÕES
 */
export const processNewTransaction = functions.region("us-central1").firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const tx = snap.data();
    if (!tx || tx.processedByBackend) return;

    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);

    try {
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const merchantDoc = await transaction.get(merchantRef);
        
        if (!clientDoc.exists || !merchantDoc.exists) throw new Error("Documentos não encontrados.");

        const merchantData = merchantDoc.data();
        if (!merchantData) throw new Error("Dados do lojista vazios.");

        const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
        const baseAmount = Number(tx.amount) || 0;
        const isLeaving = merchantData.isLeaving === true;

        let secureCashbackAmount = 0;
        let newCashbackEarned = 0;
        
        if (tx.type === 'earn') {
            if (isLeaving) throw new Error("Loja em processo de saída.");
            secureCashbackAmount = roundToTwo(baseAmount * (merchantCashbackPercent / 100));
        } 
        else if (tx.type === 'redeem') {
            secureCashbackAmount = baseAmount; 
            const invoiceAmount = Number(tx.invoiceAmount) || 0; 

            if (invoiceAmount > 0 && secureCashbackAmount > (invoiceAmount * 0.5) + 0.05) {
                throw new Error("Fraude: Resgate superior a 50%.");
            }

            if (!isLeaving && invoiceAmount > secureCashbackAmount) {
                const amountPaid = invoiceAmount - secureCashbackAmount;
                newCashbackEarned = roundToTwo(amountPaid * (merchantCashbackPercent / 100));
            }
        } 

        transaction.update(snap.ref, {
            cashbackAmount: secureCashbackAmount,
            cashbackEarned: newCashbackEarned,
            cashbackPercent: tx.type === 'earn' ? merchantCashbackPercent : 0,
            processedByBackend: true 
        });

        const userData = clientDoc.data();
        if (!userData) throw new Error("Dados do cliente vazios.");

        let storeWallets = userData.storeWallets || {};
        const mId = tx.merchantId;
        
        if (!storeWallets[mId]) storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };

        let currentAvailable = storeWallets[mId].available || 0;

        if (tx.type === 'earn') {
          storeWallets[mId].available = roundToTwo(currentAvailable + secureCashbackAmount);
        } 
        else if (tx.type === 'redeem') {
          if (currentAvailable < secureCashbackAmount) throw new Error("Saldo insuficiente.");
          storeWallets[mId].available = roundToTwo(currentAvailable - secureCashbackAmount + newCashbackEarned);
        }

        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();
        let globalAvailable = 0;
        Object.values(storeWallets).forEach((w: any) => { globalAvailable += (w.available || 0); });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: 0 }
        });
      });

      // Notificação
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
                  android: { priority: "high" as const, notification: { color: "#00d66f" } },
                  webpush: { headers: { Urgency: "high" } }
              };
              await admin.messaging().sendEachForMulticast(message);
          }
      }
      
    } catch (error: any) {
      console.error("Erro Transação:", error);
      await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
  });

/**
 * 2. REVERTER ANULAÇÕES
 */
export const revertCancelledTransaction = functions.region("us-central1").firestore
  .document("transactions/{transactionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before && after && before.status !== 'cancelled' && after.status === 'cancelled') {
      const clientRef = db.collection("users").doc(after.clientId);
      
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const userData = clientDoc.data();
        if (!clientDoc.exists || !userData) return;

        let storeWallets = userData.storeWallets || {};
        const mId = after.merchantId;
        if (!storeWallets[mId]) return;

        let currentAvailable = storeWallets[mId].available || 0;
        const amountToCancel = Number(after.cashbackAmount) || 0;
        const earnedToCancel = Number(after.cashbackEarned) || 0;

        if (after.type === 'earn') {
          storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
        } else if (after.type === 'redeem') {
          storeWallets[mId].available = roundToTwo(currentAvailable + amountToCancel - earnedToCancel);
        }

        let globalAvailable = 0;
        Object.values(storeWallets).forEach((w: any) => { globalAvailable += (w.available || 0); });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: 0 }
        });
      });
    }
  });

/**
 * 3. CRIAR COMERCIANTE
 */
export const createMerchant = functions.region("us-central1").https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
  }
  const { email, password, name, nif, category, cashbackPercent, freguesia, zipCode } = data;
  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "merchant" });
    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid, name, email: email.toLowerCase(), nif, role: "merchant", status: "active",
      category, cashbackPercent: Number(cashbackPercent), freguesia, zipCode, wallet: { available: 0, pending: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(), fcmTokens: []
    });
    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * 4. NOTIFICAR FEEDBACK
 */
export const onNewFeedback = functions.region("us-central1").firestore
  .document("feedbacks/{feedbackId}")
  .onCreate(async (snap, context) => {
    const feedback = snap.data();
    if (!feedback) return;
    try {
      const merchantDoc = await db.collection("users").doc(feedback.merchantId).get();
      const merchantData = merchantDoc.data();
      if (merchantData && merchantData.fcmTokens && merchantData.fcmTokens.length > 0) {
        const message = {
          notification: { title: "Nova Avaliação!", body: `${feedback.userName} deu-te ${feedback.rating} estrelas.` },
          tokens: merchantData.fcmTokens,
          android: { priority: "high" as const },
          webpush: { headers: { Urgency: "high" } }
        };
        await admin.messaging().sendEachForMulticast(message);
      }
    } catch (error) {}
  });

/**
 * 5. NOTIFICAÇÃO MANUAL DO ADMIN
 */
export const sendAdminNotification = functions.region("us-central1").https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
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
      const d = userDoc.data();
      tokens = d?.fcmTokens || [];
    }
    if (tokens.length === 0) return { success: false };
    const message = { notification: { title, body }, tokens, android: { priority: "high" as const }, webpush: { headers: { Urgency: "high" } } };
    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, sentCount: response.successCount };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});