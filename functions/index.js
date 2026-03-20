const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Função Auxiliar para não perdermos precisão nos cêntimos
const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * 1. OUVIR NOVAS TRANSAÇÕES (ADD)
 * Quando o Frontend cria um documento em 'transactions', esta função executa.
 */
exports.processNewTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const tx = snap.data();
    const clientRef = db.collection("users").doc(tx.clientId);

    try {
      await db.runTransaction(async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists) throw new Error("Cliente não encontrado.");

        const userData = clientDoc.data();
        let storeWallets = userData.storeWallets || {};
        
        const mId = tx.merchantId;
        if (!storeWallets[mId]) {
          storeWallets[mId] = { available: 0, pending: 0, merchantName: tx.merchantName };
        }

        let currentAvailable = storeWallets[mId].available || 0;
        let currentPending = storeWallets[mId].pending || 0;
        const amount = Number(tx.cashbackAmount) || 0;

        if (tx.type === 'earn') {
          storeWallets[mId].pending = roundToTwo(currentPending + amount);
        } 
        else if (tx.type === 'redeem') {
          // Segurança Extra: Se for redeem e não houver saldo, falha e avisa.
          if (currentAvailable < amount) {
            throw new Error("Saldo insuficiente");
          }
          storeWallets[mId].available = roundToTwo(currentAvailable - amount);
        }

        storeWallets[mId].lastUpdate = admin.firestore.FieldValue.serverTimestamp();

        // Calcular carteira global
        let globalAvailable = 0;
        let globalPending = 0;
        Object.values(storeWallets).forEach(w => {
          globalAvailable += (w.available || 0);
          globalPending += (w.pending || 0);
        });

        // Atualiza a carteira do cliente no Firestore
        transaction.update(clientRef, {
          storeWallets: storeWallets,
          wallet: {
            available: roundToTwo(globalAvailable),
            pending: roundToTwo(globalPending)
          }
        });
      });
      console.log(`Transação ${context.params.transactionId} processada com sucesso.`);
    } catch (error) {
      console.error("Erro ao processar transação. Rejeitando...", error);
      // Se falhar (ex: sem saldo), marca a transação como rejeitada
      await snap.ref.update({ status: "rejected", rejectReason: error.message });
    }
  });


/**
 * 2. OUVIR ANULAÇÕES (UPDATE)
 * Quando o Frontend altera o status para 'cancelled', revertemos o dinheiro.
 */
exports.revertCancelledTransaction = functions.firestore
  .document("transactions/{transactionId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Se a transação acabou de ser cancelada
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

        // Reverter a matemática
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