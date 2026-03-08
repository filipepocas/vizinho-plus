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
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      transactions: [],
      currentUser: null,

      setCurrentUser: (user) => {
        console.log("Sistema: Utilizador autenticado com sucesso.");
        set({ currentUser: user });
      },

      addTransaction: async (transaction) => {
        try {
          await addDoc(collection(db, 'transactions'), {
            ...transaction,
            createdAt: Timestamp.fromDate(transaction.createdAt)
          });
        } catch (error) {
          console.error("Erro na transação:", error);
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
      name: 'vplus-storage-v1', // Chave limpa que acabaste de autorizar
      storage: createJSONStorage(() => localStorage),
    }
  )
);