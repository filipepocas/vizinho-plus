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
exports.refreshAppCache = exports.cleanupExpiredData = exports.generateAppCache = exports.updateMemberCount = exports.sendAdminNotification = exports.dispatchMerchantPushCampaigns = exports.dispatchAdminNotifications = exports.onNewFeedback = exports.revertCancelledTransaction = exports.processNewTransaction = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
/**
 * 1. PROCESSAR NOVAS TRANSAÇÕES (WIZARD FLOW)
 */
exports.processNewTransaction = functions.region("us-central1").firestore
    .document("transactions/{transactionId}")
    .onCreate(async (snap, context) => {
    const tx = snap.data();
    if (!tx || tx.processedByBackend)
        return;
    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);
    try {
        let notificationPayload = { title: "", body: "" };
        const merchantDoc = await merchantRef.get();
        const merchantData = merchantDoc.data();
        if (!merchantData)
            throw new Error("Lojista não encontrado.");
        const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
        const invoiceAmount = Number(tx.invoiceAmount) || 0;
        let discountUsed = 0;
        if (tx.type === 'redeem')
            discountUsed = Number(tx.amount) || 0;
        const amountPaid = roundToTwo(invoiceAmount - discountUsed);
        const secureCashbackEarned = roundToTwo(amountPaid * (merchantCashbackPercent / 100));
        const netWalletChange = roundToTwo(secureCashbackEarned - discountUsed);
        await snap.ref.update({
            cashbackAmount: secureCashbackEarned, discountUsed, amountPaid,
            cashbackPercent: merchantCashbackPercent, processedByBackend: true, status: 'available'
        });
        const batch = db.batch();
        batch.update(clientRef, {
            [`storeWallets.${tx.merchantId}.available`]: admin.firestore.FieldValue.increment(netWalletChange),
            [`storeWallets.${tx.merchantId}.merchantName`]: tx.merchantName,
            [`storeWallets.${tx.merchantId}.lastUpdate`]: admin.firestore.FieldValue.serverTimestamp(),
            'wallet.available': admin.firestore.FieldValue.increment(netWalletChange),
            'wallet.pending': 0
        });
        await batch.commit();
        const alertRef = db.collection("users").doc(tx.clientId).collection("alerts").doc();
        await alertRef.set({
            title: invoiceAmount >= 0 ? "Nova Compra!" : "Nota de Crédito",
            message: invoiceAmount >= 0
                ? `Compra em ${tx.merchantName}. Fatura: ${invoiceAmount.toFixed(2)}€ | Ganhaste: ${secureCashbackEarned.toFixed(2)}€.`
                : `Nota de crédito em ${tx.merchantName}. Valor: ${invoiceAmount.toFixed(2)}€ | Saldo ajustado.`,
            type: 'transaction', transactionId: snap.id, read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        notificationPayload = {
            title: `Vizinho+: ${tx.merchantName}`,
            body: invoiceAmount >= 0
                ? `Pagaste ${amountPaid.toFixed(2)}€ e ganhaste ${secureCashbackEarned.toFixed(2)}€ de cashback!`
                : `Nota de crédito de ${Math.abs(invoiceAmount).toFixed(2)}€ processada.`
        };
        const clientDoc = await clientRef.get();
        const clientData = clientDoc.data();
        if ((clientData === null || clientData === void 0 ? void 0 : clientData.fcmTokens) && clientData.fcmTokens.length > 0) {
            const message = {
                notification: notificationPayload, tokens: clientData.fcmTokens,
                webpush: {
                    headers: { Urgency: "high" },
                    notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true }
                }
            };
            await admin.messaging().sendEachForMulticast(message);
        }
    }
    catch (error) {
        console.error("Erro Crítico na Transação:", error);
        await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
});
/**
 * 2. REVERTER ANULAÇÕES
 */
exports.revertCancelledTransaction = functions.region("us-central1").firestore
    .document("transactions/{transactionId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before && after && before.status !== 'cancelled' && after.status === 'cancelled') {
        const clientRef = db.collection("users").doc(after.clientId);
        try {
            const clientDoc = await clientRef.get();
            const userData = clientDoc.data();
            if (!clientDoc.exists || !userData)
                return;
            const storeWallets = userData.storeWallets || {};
            if (!storeWallets[after.merchantId])
                return;
            const cashbackEarned = Number(after.cashbackAmount) || 0;
            const discountUsed = Number(after.discountUsed) || 0;
            const netImpactToRevert = roundToTwo(cashbackEarned - discountUsed);
            const batch = db.batch();
            batch.update(clientRef, {
                [`storeWallets.${after.merchantId}.available`]: admin.firestore.FieldValue.increment(-netImpactToRevert),
                'wallet.available': admin.firestore.FieldValue.increment(-netImpactToRevert),
            });
            await batch.commit();
        }
        catch (error) {
            console.error("Erro na reversão:", error);
        }
    }
});
/**
 * 3. AVALIAÇÕES DAS LOJAS (Feedback)
 */
exports.onNewFeedback = functions.region("us-central1").firestore
    .document("feedbacks/{feedbackId}")
    .onCreate(async (snap, context) => {
    const feedback = snap.data();
    if (!feedback)
        return;
    try {
        const merchantDoc = await db.collection("users").doc(feedback.merchantId).get();
        const merchantData = merchantDoc.data();
        if ((merchantData === null || merchantData === void 0 ? void 0 : merchantData.fcmTokens) && merchantData.fcmTokens.length > 0) {
            const message = {
                notification: { title: "Nova Avaliação de Cliente!", body: `${feedback.userName} deu-te ${feedback.rating} estrelas.` },
                tokens: merchantData.fcmTokens,
                webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png", vibrate: [200, 100, 200] } }
            };
            await admin.messaging().sendEachForMulticast(message);
        }
    }
    catch (error) {
        console.error("Erro ao notificar feedback:", error);
    }
});
/**
 * 4. MOTOR DE DISPARO DE NOTIFICAÇÕES DO ADMIN
 */
exports.dispatchAdminNotifications = functions.region("us-central1").firestore
    .document("notifications/{notifId}")
    .onWrite(async (change, context) => {
    var _a;
    const notif = change.after.data();
    if (!notif || notif.status !== 'approved' || notif.sent === true)
        return;
    const scheduledFor = ((_a = notif.scheduledFor) === null || _a === void 0 ? void 0 : _a.toDate) ? notif.scheduledFor.toDate() : new Date(notif.scheduledFor);
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
                if (zones.some((z) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`)))
                    matches = true;
            }
            if (matches)
                tokens.push(...user.fcmTokens);
        });
        if (tokens.length > 0) {
            const uniqueTokens = [...new Set(tokens)];
            const message = {
                notification: { title: notif.title, body: notif.message },
                webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true } }
            };
            const chunkSize = 500;
            for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                const chunk = uniqueTokens.slice(i, i + chunkSize);
                await admin.messaging().sendEachForMulticast(Object.assign(Object.assign({}, message), { tokens: chunk }));
            }
        }
        await change.after.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), reachCount: tokens.length });
    }
    catch (error) {
        console.error("Erro fatal no disparo de Push Admin:", error);
    }
});
/**
 * 5. MOTOR DE DISPARO DO LOJISTA (Marketing)
 */
exports.dispatchMerchantPushCampaigns = functions.region("us-central1").firestore
    .document("marketing_requests/{reqId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before && after && before.status !== 'approved' && after.status === 'approved' && after.type === 'push_notification' && after.sent !== true) {
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
                    if (zones.some((z) => z.includes(`Freguesia: ${user.freguesia}`) || z.includes(`Concelho: ${user.concelho}`) || z.includes(`Distrito: ${user.distrito}`)))
                        matches = true;
                }
                if (matches)
                    tokens.push(...user.fcmTokens);
            });
            if (tokens.length > 0) {
                const uniqueTokens = [...new Set(tokens)];
                const message = {
                    notification: { title: after.title, body: after.text },
                    webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png", requireInteraction: true } }
                };
                const chunkSize = 500;
                for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
                    const chunk = uniqueTokens.slice(i, i + chunkSize);
                    await admin.messaging().sendEachForMulticast(Object.assign(Object.assign({}, message), { tokens: chunk }));
                }
            }
            await change.after.ref.update({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        catch (error) {
            console.error("Erro no Push do Lojista:", error);
        }
    }
});
/**
 * 6. MENSAGEM MANUAL DO ADMIN (HTTPS CALLABLE)
 */
exports.sendAdminNotification = functions.region("us-central1").https.onCall(async (data, context) => {
    var _a, _b;
    if (((_a = context.auth) === null || _a === void 0 ? void 0 : _a.token.email) !== "rochap.filipe@gmail.com")
        throw new functions.https.HttpsError("permission-denied", "Acesso restrito.");
    const { targetUserId, title, body } = data;
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
        const message = { notification: { title, body }, tokens: [...new Set(tokens)], webpush: { headers: { Urgency: "high" }, notification: { icon: "/logo192.png", badge: "/logo192.png" } } };
        const response = await admin.messaging().sendEachForMulticast(message);
        return { success: true, sentCount: response.successCount };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", error.message);
    }
});
/**
 * 7. CONTADOR DE MEMBROS
 */
exports.updateMemberCount = functions.region("us-central1").firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
    const statsRef = db.collection("system").doc("stats");
    try {
        await db.runTransaction(async (transaction) => {
            var _a;
            const statsDoc = await transaction.get(statsRef);
            let currentCount = statsDoc.exists ? (((_a = statsDoc.data()) === null || _a === void 0 ? void 0 : _a.membersCount) || 0) : 0;
            if (!change.before.exists && change.after.exists)
                currentCount += 1;
            else if (change.before.exists && !change.after.exists)
                currentCount = Math.max(0, currentCount - 1);
            transaction.set(statsRef, { membersCount: currentCount, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
    }
    catch (error) {
        console.error("Erro ao atualizar contador de membros:", error);
    }
});
/**
 * 8. GERAÇÃO DE CACHE CENTRALIZADO (Agendado diariamente)
 */
exports.generateAppCache = functions.region("us-central1").pubsub.schedule("every 24 hours").onRun(async (context) => {
    var _a;
    try {
        const cache = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            locations: {}, stats: { membersCount: 0 }, config: {},
            pricingRules: [], municipalitiesFaqs: [], leafletCampaigns: [],
        };
        const locDoc = await db.collection("system").doc("locations").get();
        if (locDoc.exists)
            cache.locations = ((_a = locDoc.data()) === null || _a === void 0 ? void 0 : _a.data) || {};
        const statsDoc = await db.collection("system").doc("stats").get();
        if (statsDoc.exists)
            cache.stats = statsDoc.data() || { membersCount: 0 };
        const configDoc = await db.collection("system").doc("config").get();
        if (configDoc.exists)
            cache.config = configDoc.data() || {};
        const pricingSnap = await db.collection("pricing_rules").get();
        pricingSnap.forEach(doc => cache.pricingRules.push(Object.assign({ id: doc.id }, doc.data())));
        const faqsSnap = await db.collection("municipalities_faqs").orderBy("createdAt", "desc").limit(100).get();
        faqsSnap.forEach(doc => cache.municipalitiesFaqs.push(Object.assign({ id: doc.id }, doc.data())));
        const campaignsSnap = await db.collection("leaflet_campaigns").where("isActive", "==", true).get();
        campaignsSnap.forEach(doc => cache.leafletCampaigns.push(Object.assign({ id: doc.id }, doc.data())));
        await db.collection("system").doc("app_cache").set(cache);
        console.log("Cache gerado com sucesso.");
    }
    catch (error) {
        console.error("Erro ao gerar app_cache:", error);
    }
    return null;
});
/**
 * 9. LIMPEZA AUTOMÁTICA DE DADOS EXPIRADOS (Agendado diariamente)
 */
exports.cleanupExpiredData = functions.region("us-central1").pubsub.schedule("every 24 hours").onRun(async (context) => {
    const batchSize = 100;
    const now = admin.firestore.Timestamp.now();
    // Eventos expirados
    const expiredEvents = await db.collection("events").where("endDate", "<", now).limit(batchSize).get();
    const eventBatch = db.batch();
    expiredEvents.docs.forEach(doc => eventBatch.delete(doc.ref));
    await eventBatch.commit();
    console.log(`Eventos eliminados: ${expiredEvents.size}`);
    // Desperdício Zero expirado
    const expiredWaste = await db.collection("anti_waste").where("endTime", "<", now).limit(batchSize).get();
    const wasteBatch = db.batch();
    expiredWaste.docs.forEach(doc => wasteBatch.delete(doc.ref));
    await wasteBatch.commit();
    console.log(`Anúncios de desperdício eliminados: ${expiredWaste.size}`);
    // Produtos do Marketplace com mais de 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const expiredProducts = await db.collection("products").where("createdAt", "<", sevenDaysAgo).limit(batchSize).get();
    const productBatch = db.batch();
    expiredProducts.docs.forEach(doc => productBatch.delete(doc.ref));
    await productBatch.commit();
    console.log(`Produtos expirados eliminados: ${expiredProducts.size}`);
    return null;
});
/**
 * 10. FORÇAR A ATUALIZAÇÃO DO CACHE (Admin)
 */
exports.refreshAppCache = functions.region("us-central1").https.onCall(async (data, context) => {
    var _a, _b;
    // Verificar se o utilizador é admin
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Necessita de autenticação.");
    }
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Acesso restrito ao administrador.");
    }
    try {
        const cache = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            locations: {}, stats: { membersCount: 0 }, config: {},
            pricingRules: [], municipalitiesFaqs: [], leafletCampaigns: [],
        };
        const locDoc = await db.collection("system").doc("locations").get();
        if (locDoc.exists)
            cache.locations = ((_b = locDoc.data()) === null || _b === void 0 ? void 0 : _b.data) || {};
        const statsDoc = await db.collection("system").doc("stats").get();
        if (statsDoc.exists)
            cache.stats = statsDoc.data() || { membersCount: 0 };
        const configDoc = await db.collection("system").doc("config").get();
        if (configDoc.exists)
            cache.config = configDoc.data() || {};
        const pricingSnap = await db.collection("pricing_rules").get();
        pricingSnap.forEach(doc => cache.pricingRules.push(Object.assign({ id: doc.id }, doc.data())));
        const faqsSnap = await db.collection("municipalities_faqs").orderBy("createdAt", "desc").limit(100).get();
        faqsSnap.forEach(doc => cache.municipalitiesFaqs.push(Object.assign({ id: doc.id }, doc.data())));
        const campaignsSnap = await db.collection("leaflet_campaigns").where("isActive", "==", true).get();
        campaignsSnap.forEach(doc => cache.leafletCampaigns.push(Object.assign({ id: doc.id }, doc.data())));
        await db.collection("system").doc("app_cache").set(cache);
        return { success: true };
    }
    catch (error) {
        throw new functions.https.HttpsError("internal", "Erro ao atualizar cache.");
    }
});
//# sourceMappingURL=index.js.map