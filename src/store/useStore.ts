// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      transactions: [],
      currentUser: null,

      setCurrentUser: (user) => {
        console.log("MOLÉCULA: Utilizador injetado no estado:", user);
        set({ currentUser: user });
      },

      logout: () => {
        set({ currentUser: null });
        localStorage.removeItem('vplus-storage-auth-v1');
      },

      addTransaction: async (transaction) => {
        try {
          await addDoc(collection(db, 'transactions'), {
            ...transaction,
            createdAt: Timestamp.fromDate(transaction.createdAt)
          });
        } catch (error) {
          console.error("ERRO FIREBASE TRANSACTION:", error);
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
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Transaction;
          });
          set({ transactions });
        });
      },
    }),
    {
      name: 'vplus-storage-auth-v1', // Chave única para limpar erros anteriores
      storage: createJSONStorage(() => localStorage),
    }
  )
);