import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

/**
 * Função para criar um novo comerciante de forma segura.
 * Usa Admin SDK para criar o utilizador no Auth e Firestore.
 */
export const createMerchant = functions.https.onCall(async (data, context) => {
  // Apenas o Admin principal pode criar comerciantes
  if (context.auth?.token.email !== "rochap.filipe@gmail.com") {
    throw new functions.https.HttpsError("permission-denied", "Apenas o Administrador pode realizar esta ação.");
  }

  const { email, password, name, nif, category, cashbackPercent, freguesia, zipCode } = data;

  try {
    // 1. Criar utilizador no Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 2. Definir Custom Claims (opcional, mas recomendado para segurança extra)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "merchant" });

    // 3. Criar documento no Firestore
    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      name: name,
      email: email.toLowerCase(),
      nif: nif,
      role: "merchant",
      status: "active",
      category: category,
      cashbackPercent: Number(cashbackPercent),
      freguesia: freguesia,
      zipCode: zipCode,
      wallet: { available: 0, pending: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Erro ao criar comerciante:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Função agendada para rodar a cada hora e amadurecer transações pendentes de cashback.
 * Transforma transações 'pending' em 'available' se tiverem mais de 48h.
 */
export const matureCashback = functions.pubsub.schedule("every 60 minutes").onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const threshold = new Date(now.toDate().getTime() - (48 * 60 * 60 * 1000));
  const thresholdTimestamp = admin.firestore.Timestamp.fromDate(threshold);

  const pendingTransactionsQuery = db.collection("transactions")
      .where("status", "==", "pending")
      .where("type", "==", "earn")
      .where("createdAt", "<=", thresholdTimestamp);

  const snapshot = await pendingTransactionsQuery.get();

  if (snapshot.empty) {
    console.log("Nenhuma transação para amadurecer.");
    return null;
  }

  console.log(`A amadurecer ${snapshot.size} transações...`);

  const batchSize = 400; // Limite de 500 para lotes do Firestore
  let count = 0;

  for (let i = 0; i < snapshot.size; i += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + batchSize);

    for (const doc of chunk) {
      const data = doc.data();
      const clientId = data.clientId;
      const merchantId = data.merchantId;
      const amount = data.cashbackAmount;

      // Atualizar a transação
      batch.update(doc.ref, {
        status: "available",
        maturedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Atualizar a carteira do cliente (operação delicada em lote)
      // Nota: Em escala real, seria melhor usar uma transação ou incrementar campos.
      const clientRef = db.collection("users").doc(clientId);
      
      // Como estamos num batch, não podemos ler o estado atual facilmente aqui.
      // Solução recomendada: Cloud Function disparada por onCreate/onUpdate de transação 
      // ou usar increment() para os saldos.
      
      batch.update(clientRef, {
        [`storeWallets.${merchantId}.pending`]: admin.firestore.FieldValue.increment(-amount),
        [`storeWallets.${merchantId}.available`]: admin.firestore.FieldValue.increment(amount),
        "wallet.pending": admin.firestore.FieldValue.increment(-amount),
        "wallet.available": admin.firestore.FieldValue.increment(amount),
      });

      count++;
    }

    await batch.commit();
  }

  console.log(`${count} transações amadurecidas com sucesso.`);
  return null;
});
