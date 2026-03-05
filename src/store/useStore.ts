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
  User, 
  Operator 
} from '../types';

interface AppState {
  currentUser: User | Client | Merchant | null;
  setCurrentUser: (user: User | Client | Merchant | null) => void;
  transactions: Transaction[];
  clients: Client[]; // Devolvido para corrigir o erro
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  transactions: [],
  clients: [], // Inicializado vazio

  addTransaction: async (transactionData) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Erro ao gravar transação: ", error);
    }
  },

  subscribeToTransactions: () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
      })) as Transaction[];
      
      set({ transactions });
    });

    return unsubscribe;
  },
}));