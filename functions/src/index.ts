import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

/**
 * Notifica o CLIENTE quando o saldo acumulado total atinge 50€ ou mais.
 * Focada no saldo global do cartão e na Comunidade V+.
 */
export const onNewTransactionNotification = functions.firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snapshot, _context) => {
    const tx = snapshot.data();
    if (!tx || tx.type !== 'earn') return;

    const { clientId } = tx;

    try {
      // 1. Obter os dados do CLIENTE para verificar o saldo total
      const clientDoc = await db.collection("users").doc(clientId).get();
      const clientData = clientDoc.data();

      if (!clientData) return;

      // Verificamos o saldo acumulado total (o saldo do cartão)
      const totalAvailable = clientData.wallet?.available || 0;

      // REGRA DOS 50€ (Saldo Global)
      if (totalAvailable < 50) {
        console.log(`Saldo global de ${totalAvailable}€ ainda abaixo dos 50€. Silêncio.`);
        return;
      }

      if (!clientData.fcmTokens || !Array.isArray(clientData.fcmTokens) || clientData.fcmTokens.length === 0) {
        return;
      }

      const tokens: string[] = clientData.fcmTokens;

      // 2. Preparar a mensagem focada na Comunidade V+
      const message = {
        notification: {
          title: "Saldo de 50€ Atingido! 🎉",
          body: `Parabéns! Já acumulaste um total de ${totalAvailable.toFixed(2)}€ no teu cartão. Já podes utilizar este valor em qualquer parceiro da Comunidade V+!`,
        },
        tokens: tokens,
        android: { 
          priority: "high" as const,
          notification: {
            color: "#00d66f"
          }
        },
        webpush: { headers: { Urgency: "high" } }
      };

      // 3. Enviar
      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Limpeza de tokens inválidos
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error as any;
            if (error?.code === "messaging/invalid-registration-token" || 
                error?.code === "messaging/registration-token-not-registered") {
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
    } catch (error) {
      console.error("Erro na notificação de saldo global:", error);
    }
  });

/**
 * Função para criar um novo comerciante de forma segura.
 */
export const createMerchant = functions.https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
  }

  const { email, password, name, nif, category, cashbackPercent, freguesia, zipCode } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "merchant" });

    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      name,
      email: email.toLowerCase(),
      nif,
      role: "merchant",
      status: "active",
      category,
      cashbackPercent: Number(cashbackPercent),
      freguesia,
      zipCode,
      wallet: { available: 0, pending: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmTokens: []
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Notifica o comerciante quando recebe uma nova avaliação.
 */
export const onNewFeedback = functions.firestore
  .document("feedbacks/{feedbackId}")
  .onCreate(async (snapshot, _context) => {
    const feedback = snapshot.data();
    if (!feedback) return;

    const { merchantId, rating, userName, comment } = feedback;

    try {
      const merchantDoc = await db.collection("users").doc(merchantId).get();
      const merchantData = merchantDoc.data();

      if (!merchantData?.fcmTokens) return;

      const message = {
        notification: {
          title: "Nova Avaliação!",
          body: `${userName} deu-te ${rating} estrelas: "${comment || 'Sem comentário'}"`,
        },
        tokens: merchantData.fcmTokens,
        android: { priority: "high" as const },
        webpush: { headers: { Urgency: "high" } }
      };

      await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
      console.error("Erro no feedback:", error);
    }
  });

/**
 * Função para o Admin enviar notificações manuais.
 */
export const sendAdminNotification = functions.https.onCall(async (data, context) => {
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
  }

  const { targetUserId, title, body } = data;

  try {
    let tokens: string[] = [];

    if (targetUserId === "all") {
      const allUsers = await db.collection("users").where("fcmTokens", "!=", []).get();
      allUsers.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens) tokens.push(...userData.fcmTokens);
      });
    } else {
      const userDoc = await db.collection("users").doc(targetUserId).get();
      tokens = userDoc.data()?.fcmTokens || [];
    }

    if (tokens.length === 0) return { success: false };

    const message = {
      notification: { title, body },
      tokens: tokens,
      android: { priority: "high" as const },
      webpush: { headers: { Urgency: "high" } }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return { success: true, sentCount: response.successCount };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});