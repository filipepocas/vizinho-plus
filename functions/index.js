const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Função Auxiliar para evitar problemas de dízimas (0.1 + 0.2 = 0.30000004)
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * 1. OUVIR NOVAS TRANSAÇÕES (ADD)
 * Lógica cega e segura. O servidor calcula tudo e entrega o dinheiro ao cliente.
 */
exports.processNewTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const tx = snap.data();
    
    // Evita loops caso a função atualize o próprio documento
    if (tx.processedByBackend) return;

    const clientRef = db.collection("users").doc(tx.clientId);
    const merchantRef = db.collection("users").doc(tx.merchantId);

    try {
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        const merchantDoc = await transaction.get(merchantRef);
        
        if (!clientDoc.exists) throw new Error("Cliente não encontrado.");
        if (!merchantDoc.exists) throw new Error("Lojista não encontrado.");

        const merchantData = merchantDoc.data();
        const merchantCashbackPercent = Number(merchantData.cashbackPercent) || 0;
        const baseAmount = Number(tx.amount) || 0;

        // --- MAGIA DA SEGURANÇA: BACKEND MATEMÁTICO ---
        let secureCashbackAmount = 0;
        
        if (tx.type === 'earn' || tx.type === 'cancel') {
            // Em acumulação, força a percentagem atual da loja. O Frontend não manda nisto.
            secureCashbackAmount = roundToTwo(baseAmount * (merchantCashbackPercent / 100));
        } else if (tx.type === 'redeem') {
            // No resgate, o valor de transação equivale ao cashback a descontar
            secureCashbackAmount = baseAmount;
        }

        // Atualiza a transação com os valores blindados
        transaction.update(snap.ref, {
            cashbackAmount: secureCashbackAmount,
            cashbackPercent: tx.type === 'earn' ? merchantCashbackPercent : 0,
            processedByBackend: true 
        });

        // Atualização da carteira do Cliente
        const userData = clientDoc.data();
        let storeWallets = userData.storeWallets || {};
        const mId = tx.merchantId;
        
        if (!storeWallets[mId]) {
          storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };
        }

        let currentAvailable = storeWallets[mId].available || 0;
        let currentPending = storeWallets[mId].pending || 0;

        if (tx.type === 'earn') {
          storeWallets[mId].pending = roundToTwo(currentPending + secureCashbackAmount);
        } 
        else if (tx.type === 'redeem') {
          if (currentAvailable < secureCashbackAmount) {
            throw new Error("Fraude Detetada: Tentativa de resgate sem saldo.");
          }
          storeWallets[mId].available = roundToTwo(currentAvailable - secureCashbackAmount);
        }

        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();

        let globalAvailable = 0;
        let globalPending = 0;
        Object.values(storeWallets).forEach(w => {
          globalAvailable += (w.available || 0);
          globalPending += (w.pending || 0);
        });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: {
            available: roundToTwo(globalAvailable),
            pending: roundToTwo(globalPending)
          }
        });
      });
      
    } catch (error) {
      console.error("Bloqueio Ativo: ", error);
      await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
  });


/**
 * 2. REVERTER ANULAÇÕES
 */
exports.revertCancelledTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Se o lojista clicou no botão "Anular"
    if (before.status !== 'cancelled' && after.status === 'cancelled') {
      const clientRef = db.collection("users").doc(after.clientId);
      
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) return;

        const userData = clientDoc.data();
        let storeWallets = userData.storeWallets || {};
        const mId = after.merchantId;

        if (!storeWallets[mId]) return;

        let currentAvailable = storeWallets[mId].available || 0;
        let currentPending = storeWallets[mId].pending || 0;
        const amountToCancel = Number(after.cashbackAmount) || 0;

        if (after.type === 'earn') {
          if (before.status === 'available') {
            storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
          } else {
            storeWallets[mId].pending = roundToTwo(Math.max(0, currentPending - amountToCancel));
          }
        } else if (after.type === 'redeem') {
          storeWallets[mId].available = roundToTwo(currentAvailable + amountToCancel);
        }

        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();

        let globalAvailable = 0;
        let globalPending = 0;
        Object.values(storeWallets).forEach(w => {
          globalAvailable += (w.available || 0);
          globalPending += (w.pending || 0);
        });

        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: { available: roundToTwo(globalAvailable), pending: roundToTwo(globalPending) }
        });
      });
    }
  });