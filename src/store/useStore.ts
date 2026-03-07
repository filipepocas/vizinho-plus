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
import { Transaction } from '../types';

interface StoreState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<StoreState>((set) => ({
  transactions: [],

  addTransaction: async (transaction) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transaction,
        // Convertemos a data para o formato do Firebase
        createdAt: Timestamp.fromDate(transaction.createdAt)
      });
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
      throw error;
    }
  },

  subscribeToTransactions: () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertemos de volta de Timestamp para Date do JavaScript
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        } as Transaction;
      });
      set({ transactions });
    });
  },
}));