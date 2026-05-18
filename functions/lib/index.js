"use strict";
// functions/src/index.ts
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
exports.memberCounter = exports.adminMessenger = exports.merchantPushDispatcher = exports.notifDispatcher = exports.feedbackNotifier = exports.txReverser = exports.txProcessor = void 0;
const v2 = __importStar(require("firebase-functions/v2"));
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
/**
 * 1. PROCESSAR NOVAS TRANSAÇÕES E ATRIBUIR SALDO
 */
exports.txProcessor = v2.firestore.onDocumentCreated("transactions/{transactionId}", async (event) => {
    var _a, _b;
    const tx = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!tx || tx.processedByBackend)
        return;
    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);
    try {
        await db.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            const merchantDoc = await transaction.get(merchantRef);
            if (!clientDoc.exists || !merchantDoc.exists)
                throw new Error("Documentos não encontrados.");
            const merchantData = merchantDoc.data();
            if (!merchantData)
                throw new Error("Dados do lojista vazios.");
            const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
            const baseAmount = Number(tx.amount) || 0;
            const isLeaving = merchantData.isLeaving === true;
            let secureCashbackAmount = 0;
            let newCashbackEarned = 0;
            if (tx.type === 'earn') {
                if (isLeaving)
                    throw new Error("Loja em processo de saída.");
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
            transaction.update(event.data.ref, {
                cashbackAmount: secureCashbackAmount,
                cashbackEarned: newCashbackEarned,
                cashbackPercent: tx.type === 'earn' ? merchantCashbackPercent : 0,
                processedByBackend: true
            });
            const userData = clientDoc.data();
            if (!userData)
                throw new Error("Dados do cliente vazios.");
            let storeWallets = userData.storeWallets || {};
            const mId = tx.merchantId;
            if (!storeWallets[mId])
                storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };
            let currentAvailable = storeWallets[mId].available || 0;
            if (tx.type === 'earn') {
                storeWallets[mId].available = roundToTwo(currentAvailable + secureCashbackAmount);
            }
            else if (tx.type === 'redeem') {
                if (currentAvailable < secureCashbackAmount)
                    throw new Error("Saldo insuficiente.");
                storeWallets[mId].available = roundToTwo(currentAvailable - secureCashbackAmount + newCashbackEarned);
            }
            storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();
            let globalAvailable = 0;
            Object.values(storeWallets).forEach((w) => { globalAvailable += (w.available || 0); });
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
    }
    catch (error) {
        logger.error("Erro Transação:", error);
        await ((_b = event.data) === null || _b === void 0 ? void 0 : _b.ref.update({ status: "rejected", rejectReason: error.message }));
    }
});
/**
 * 2. REVERTER ANULAÇÕES
 */
exports.txReverser = v2.firestore.onDocumentUpdated("transactions/{transactionId}", async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (before && after && before.status !== 'cancelled' && after.status === 'cancelled') {
        const clientRef = db.collection("users").doc(after.clientId);
        await db.runTransaction(async (transaction) => {
            const clientDoc = await transaction.get(clientRef);
            const userData = clientDoc.data();
            if (!clientDoc.exists || !userData)
                return;
            let storeWallets = userData.storeWallets || {};
            const mId = after.merchantId;
            if (!storeWallets[mId])
                return;
            let currentAvailable = storeWallets[mId].available || 0;
            const amountToCancel = Number(after.cashbackAmount) || 0;
            const earnedToCancel = Number(after.cashbackEarned) || 0;
            if (after.type === 'earn') {
                storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
            }
            else if (after.type === 'redeem') {
                storeWallets[mId].available = roundToTwo(currentAvailable + amountToCancel - earnedToCancel);
            }
            let globalAvailable = 0;
            Object.values(storeWallets).forEach((w) => { globalAvailable += (w.available || 0); });
            transaction.update(clientRef, {
                storeWallets: storeWallets,
                wallet: { available: roundToTwo(globalAvailable), pending: 0 }
            });
        });
    }
});
/**
 * 3. AVALIAÇÕES DAS LOJAS (Feedback)
 */
exports.feedbackNotifier = v2.firestore.onDocumentCreated("feedbacks/{feedbackId}", async (event) => {
    var _a;
    const feedback = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!feedback)
        return;
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
    }
    catch (error) {
        logger.error("Erro feedback:", error);
    }
});
/**
 * 4. MOTOR DE DISPARO DE NOTIFICAÇÕES DO ADMIN
 */
exports.notifDispatcher = v2.firestore.onDocumentWritten("notifications/{notifId}", async (event) => {
    var _a, _b, _c;
    const notif = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    if (!notif || notif.status !== 'approved' || notif.sent === true)
        return;
    const scheduledFor = ((_b = notif.scheduledFor) === null || _b === void 0 ? void 0 : _b.toDate) ? notif.scheduledFor.toDate() : new Date(notif.scheduledFor);
    if (scheduledFor > new Date())
        return;
    try {
        const usersSnap = await db.collection("users").where("role", "==", "client").where("status", "==", "active").get();
        let tokens = [];
        usersSnap.forEach(doc => {
            var _a;
            const user = doc.data();
            if (!user.fcmTokens || user.fcmTokens.length === 0)
                return;
            let matches = false;
            if (notif.targetType === 'all')
                matches = true;
            else if (notif.targetType === 'email') {
                if (user.email === ((_a = notif.targetValue) === null || _a === void 0 ? void 0 : _a.toLowerCase()))
                    matches = true;
            }
            else if (notif.targetType === 'birthDate') {
                if (user.birthDate && user.birthDate.split('-')[1] === notif.targetValue)
                    matches = true;
            }
            else if (notif.targetType === 'zonas') {
                const zones = notif.targetZones || [];
                if (zones.some((z) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`))) {
                    matches = true;
                }
            }
            if (matches)
                tokens.push(...user.fcmTokens);
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
                await admin.messaging().sendEachForMulticast(Object.assign(Object.assign({}, message), { tokens: chunk }));
            }
        }
        await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), reachCount: tokens.length }));
    }
    catch (error) {
        logger.error("Erro fatal no disparo de Push Admin:", error);
    }
});
/**
 * 5. MOTOR DE DISPARO DO LOJISTA
 */
exports.merchantPushDispatcher = v2.firestore.onDocumentUpdated("marketing_requests/{reqId}", async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if ((before === null || before === void 0 ? void 0 : before.status) !== 'approved' && (after === null || after === void 0 ? void 0 : after.status) === 'approved' && (after === null || after === void 0 ? void 0 : after.type) === 'push_notification' && (after === null || after === void 0 ? void 0 : after.sent) !== true) {
        try {
            const usersSnap = await db.collection("users").where("role", "==", "client").where("status", "==", "active").get();
            let tokens = [];
            usersSnap.forEach(doc => {
                const user = doc.data();
                if (!user.fcmTokens || user.fcmTokens.length === 0)
                    return;
                let matches = false;
                if (after.targetType === 'all')
                    matches = true;
                else if (after.targetType === 'birthDate') {
                    const cm = new Date().getMonth() + 1;
                    if (user.birthDate && parseInt(user.birthDate.split('-')[1]) === cm)
                        matches = true;
                }
                else if (after.targetType === 'zonas') {
                    const zones = after.targetZones || [];
                    if (zones.some((z) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`))) {
                        matches = true;
                    }
                }
                if (matches)
                    tokens.push(...user.fcmTokens);
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
                    await admin.messaging().sendEachForMulticast(Object.assign(Object.assign({}, message), { tokens: chunk }));
                }
            }
            await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({ sent: true }));
        }
        catch (error) {
            logger.error("Erro no Push do Lojista:", error);
        }
    }
});
/**
 * 6. MENSAGEM MANUAL DO ADMIN
 */
exports.adminMessenger = v2.https.onCall(async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.email) !== "rochap.filipe@gmail.com") {
        throw new v2.https.HttpsError("permission-denied", "Acesso restrito.");
    }
    const { targetUserId, title, body } = request.data;
    try {
        let tokens = [];
        if (targetUserId === "all") {
            const allUsers = await db.collection("users").where("fcmTokens", "!=", []).get();
            allUsers.forEach(doc => { const d = doc.data(); if (d.fcmTokens)
                tokens.push(...d.fcmTokens); });
        }
        else {
            const userDoc = await db.collection("users").doc(targetUserId).get();
            tokens = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmTokens) || [];
        }
        if (tokens.length === 0)
            return { success: false };
        const message = {
            notification: { title, body }, tokens,
            webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png", vibrate: [200, 100, 200] } }
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        return { success: true, sentCount: response.successCount };
    }
    catch (error) {
        throw new v2.https.HttpsError("internal", error.message);
    }
});
/**
 * 7. CONTADOR DE MEMBROS
 */
exports.memberCounter = v2.firestore.onDocumentWritten("users/{userId}", async () => {
    try {
        const usersSnap = await db.collection("users").get();
        const count = usersSnap.size;
        await db.doc("system/memberCount").set({
            count,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        logger.error("Erro ao atualizar contador:", error);
    }
});
//# sourceMappingURL=index.js.map