"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNewFeedback = exports.matureCashback = exports.createMerchant = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const luxon_1 = require("luxon");
admin.initializeApp();
const db = admin.firestore();
/**
 * Função para criar um novo comerciante de forma segura.
 * Usa Admin SDK para criar o utilizador no Auth e Firestore.
 */
exports.createMerchant = functions.https.onCall(async (data, context) => {
    var _a;
    // Apenas o Admin principal pode criar comerciantes
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.email) !== "rochap.filipe@gmail.com") {
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
    }
    catch (error) {
        console.error("Erro ao criar comerciante:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Função para amadurecer transações pendentes de cashback.
 * Transforma transações 'pending' em 'available' se tiverem mais de 48h.
 * Agora disparada por chamada manual (onCall) para evitar necessidade de plano Blaze (agendamento).
 * Utiliza o fuso horário de Portugal Continental para cálculos.
 */
exports.matureCashback = functions.https.onCall(async (_data, context) => {
    var _a;
    // Apenas o Admin principal pode disparar a maturação
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.email) !== "rochap.filipe@gmail.com") {
        throw new functions.https.HttpsError("permission-denied", "Apenas o Administrador pode realizar esta ação.");
    }
    try {
        // Obter hora atual no fuso horário de Portugal
        const nowPortugal = luxon_1.DateTime.now().setZone("Europe/Lisbon");
        // Subtrair 48 horas
        const threshold = nowPortugal.minus({ hours: 48 });
        const thresholdTimestamp = admin.firestore.Timestamp.fromDate(threshold.toJSDate());
        const pendingTransactionsQuery = db.collection("transactions")
            .where("status", "==", "pending")
            .where("type", "==", "earn")
            .where("createdAt", "<=", thresholdTimestamp);
        const snapshot = await pendingTransactionsQuery.get();
        if (snapshot.empty) {
            return { success: true, message: "Nenhuma transação para amadurecer.", count: 0 };
        }
        const batchSize = 400;
        let count = 0;
        for (let i = 0; i < snapshot.size; i += batchSize) {
            const batch = db.batch();
            const chunk = snapshot.docs.slice(i, i + batchSize);
            for (const doc of chunk) {
                const transactionData = doc.data();
                const clientId = transactionData.clientId;
                const merchantId = transactionData.merchantId;
                const amount = transactionData.cashbackAmount;
                // Atualizar a transação
                batch.update(doc.ref, {
                    status: "available",
                    maturedAt: admin.firestore.FieldValue.serverTimestamp(),
                    maturedAtTZ: nowPortugal.toISO(), // Guardar a hora da maturação no fuso de PT
                });
                const clientRef = db.collection("users").doc(clientId);
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
        return {
            success: true,
            message: `${count} transações amadurecidas com sucesso.`,
            count,
            processedAt: nowPortugal.toISO()
        };
    }
    catch (error) {
        console.error("Erro ao amadurecer cashback:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * Notifica o comerciante quando recebe uma nova avaliação.
 * Disparado sempre que um documento é criado na coleção 'feedbacks'.
 */
exports.onNewFeedback = functions.firestore
    .document("feedbacks/{feedbackId}")
    .onCreate(async (snapshot, _context) => {
    const feedback = snapshot.data();
    if (!feedback)
        return;
    const { merchantId, rating, userName, comment } = feedback;
    try {
        // 1. Obter os tokens do comerciante
        const merchantDoc = await db.collection("users").doc(merchantId).get();
        const merchantData = merchantDoc.data();
        if (!merchantData || !merchantData.fcmTokens || !Array.isArray(merchantData.fcmTokens) || merchantData.fcmTokens.length === 0) {
            console.log(`Comerciante ${merchantId} não tem tokens de notificação.`);
            return;
        }
        const tokens = merchantData.fcmTokens;
        // 2. Preparar a mensagem
        const message = {
            notification: {
                title: "Nova Avaliação!",
                body: `${userName} deu-te ${rating} estrelas: "${comment || 'Sem comentário'}"`,
            },
            tokens: tokens,
        };
        // 3. Enviar a notificação
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`${response.successCount} notificações enviadas com sucesso para o comerciante ${merchantId}.`);
        // Limpar tokens inválidos se necessário
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    if ((error === null || error === void 0 ? void 0 : error.code) === "messaging/invalid-registration-token" ||
                        (error === null || error === void 0 ? void 0 : error.code) === "messaging/registration-token-not-registered") {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });
            if (failedTokens.length > 0) {
                await db.collection("users").doc(merchantId).update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
                });
                console.log(`Removidos ${failedTokens.length} tokens inválidos.`);
            }
        }
    }
    catch (error) {
        console.error("Erro ao enviar notificação de feedback:", error);
    }
});
//# sourceMappingURL=index.js.map