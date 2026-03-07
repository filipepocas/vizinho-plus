// src/store/useStore.ts
import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Client, 
  Merchant, 
  Transaction, 
  User 
} from '../types';

interface AppState {
  currentUser: User | Client | Merchant | null;
  setCurrentUser: (user: User | Client | Merchant | null) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  transactions: [],

  addTransaction: async (transactionData) => {
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: Timestamp.now(),
      });

      if (transactionData.type === 'redeem') {
        await addDoc(collection(db, 'audit_logs'), {
          transactionId: docRef.id,
          type: 'SECURITY_CHECK',
          severity: transactionData.cashbackAmount > 50 ? 'HIGH' : 'LOW',
          merchantId: transactionData.merchantId,
          clientId: transactionData.clientId,
          amount: transactionData.cashbackAmount,
          timestamp: Timestamp.now(),
          message: `Redenção de saldo na loja ${transactionData.merchantName}`
        });
      }
    } catch (error) {
      console.error("Erro na operação: ", error);
      throw error;
    }
  },

  subscribeToTransactions: () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date(),
      })) as Transaction[];
      set({ transactions });
    });
  },
}));