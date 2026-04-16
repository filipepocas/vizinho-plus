import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const roundToTwo = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const processNewTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const tx = snap.data();
    if (tx.processedByBackend) return;

    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);

    try {
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const merchantDoc = await transaction.get(merchantRef);
        
        if (!clientDoc.exists) throw new Error("Cliente não encontrado.");
        if (!merchantDoc.exists) throw new Error("Lojista não encontrado.");

        const merchantData = merchantDoc.data()!;
        const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
        const baseAmount = Number(tx.amount) || 0;
        const isLeaving = merchantData.isLeaving === true;

        let secureCashbackAmount = 0;
        let newCashbackEarned = 0;
        
        if (tx.type === 'earn') {
            if (isLeaving) throw new Error("Loja em processo de saída. Apenas descontos são permitidos.");
            secureCashbackAmount = roundToTwo(baseAmount * (merchantCashbackPercent / 100));
        } 
        else if (tx.type === 'redeem') {
            secureCashbackAmount = baseAmount; 
            const invoiceAmount = Number(tx.invoiceAmount) || 0; 

            if (invoiceAmount > 0 && secureCashbackAmount > (invoiceAmount * 0.5) + 0.05) {
                throw new Error("Fraude: Tentativa de resgate superior a 50% do valor da compra.");
            }

            // ITEM 6: Calcula o cashback do valor restante pago pelo cliente
            if (!isLeaving && invoiceAmount > secureCashbackAmount) {
                const amountPaid = invoiceAmount - secureCashbackAmount;
                newCashbackEarned = roundToTwo(amountPaid * (merchantCashbackPercent / 100));
            }
        } 
        else if (tx.type === 'cancel') {
            secureCashbackAmount = roundToTwo(baseAmount * (merchantCashbackPercent / 100));
        }

        transaction.update(snap.ref, {
            cashbackAmount: secureCashbackAmount,
            cashbackEarned: newCashbackEarned,
            cashbackPercent: tx.type === 'earn' ? merchantCashbackPercent : 0,
            processedByBackend: true 
        });

        const userData = clientDoc.data()!;
        let storeWallets = userData.storeWallets || {};
        const mId = tx.merchantId;
        
        if (!storeWallets[mId]) storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };

        let currentAvailable = storeWallets[mId].available || 0;

        if (tx.type === 'earn') {
          storeWallets[mId].available = roundToTwo(currentAvailable + secureCashbackAmount);
        } 
        else if (tx.type === 'redeem') {
          if (currentAvailable < secureCashbackAmount) {
            throw new Error("Fraude: Tentativa de resgate sem saldo suficiente.");
          }
          // Subtrai o desconto E soma o novo cashback gerado pela compra
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
      
    } catch (error: any) {
      console.error("Bloqueio Ativo: ", error);
      await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
  });

export const revertCancelledTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      const clientRef = db.collection("users").doc(after.clientId);
      
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) return;

        const userData = clientDoc.data()!;
        let storeWallets = userData.storeWallets || {};
        const mId = after.merchantId;

        if (!storeWallets[mId]) return;

        let currentAvailable = storeWallets[mId].available || 0;
        const amountToCancel = Number(after.cashbackAmount) || 0;
        const earnedToCancel = Number(after.cashbackEarned) || 0;

        if (after.type === 'earn') {
          storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
        } else if (after.type === 'redeem') {
          // Devolve o saldo descontado e remove o saldo que tinha sido ganho nessa compra
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

export const onNewTransactionNotification = functions.firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snapshot, _context) => {
    const tx = snapshot.data();
    if (!tx || (tx.type !== 'earn' && tx.type !== 'redeem')) return;

    const { clientId } = tx;

    try {
      const clientDoc = await db.collection("users").doc(clientId).get();
      const clientData = clientDoc.data();
      if (!clientData) return;

      const totalAvailable = clientData.wallet?.available || 0;
      if (totalAvailable < 50) return;
      if (!clientData.fcmTokens || !Array.isArray(clientData.fcmTokens) || clientData.fcmTokens.length === 0) return;

      const tokens: string[] = clientData.fcmTokens;
      const message = {
        notification: {
          title: "Saldo de 50€ Atingido! 🎉",
          body: `Parabéns! Já acumulaste um total de ${totalAvailable.toFixed(2)}€ no teu cartão. Já podes utilizar este valor na Comunidade V+!`,
        },
        tokens: tokens,
        android: { priority: "high" as const, notification: { color: "#00d66f" } },
        webpush: { headers: { Urgency: "high" } }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error as any;
            if (error?.code === "messaging/invalid-registration-token" || error?.code === "messaging/registration-token-not-registered") {
              failedTokens.push(tokens[idx]);
            }
          }
        });
        if (failedTokens.length > 0) {
          await db.collection("users").doc(clientId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
          });
        }
      }
    } catch (error) { console.error(error); }
  });

export const createMerchant = functions.https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
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
  } catch (error: any) { throw new functions.https.HttpsError("internal", error.message); }
});

export const onNewFeedback = functions.firestore
  .document("feedbacks/{feedbackId}")
  .onCreate(async (snapshot, _context) => {
    const feedback = snapshot.data();
    if (!feedback) return;
    try {
      const merchantDoc = await db.collection("users").doc(feedback.merchantId).get();
      const merchantData = merchantDoc.data();
      if (!merchantData?.fcmTokens || merchantData.fcmTokens.length === 0) return;
      const message = {
        notification: { title: "Nova Avaliação!", body: `${feedback.userName} deu-te ${feedback.rating} estrelas: "${feedback.comment || 'Sem comentário'}"` },
        tokens: merchantData.fcmTokens,
        android: { priority: "high" as const }, webpush: { headers: { Urgency: "high" } }
      };
      await admin.messaging().sendEachForMulticast(message);
    } catch (error) {}
  });

export const sendAdminNotification = functions.https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
  try {
    let tokens: string[] = [];
    if (data.targetUserId === "all") {
      const allUsers = await db.collection("users").where("fcmTokens", "!=", []).get();
      allUsers.forEach(doc => { if (doc.data().fcmTokens) tokens.push(...doc.data().fcmTokens); });
    } else {
      const userDoc = await db.collection("users").doc(data.targetUserId).get();
      tokens = userDoc.data()?.fcmTokens || [];
    }
    if (tokens.length === 0) return { success: false };
    const message = { notification: { title: data.title, body: data.body }, tokens: tokens, android: { priority: "high" as const }, webpush: { headers: { Urgency: "high" } } };
    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, sentCount: response.successCount };
  } catch (error: any) { throw new functions.https.HttpsError("internal", error.message); }
});