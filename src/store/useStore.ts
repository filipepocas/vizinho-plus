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
  // Função para gravar no Firebase
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  // Função para ouvir dados em tempo real
  subscribeToTransactions: () => () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  transactions: [],

  addTransaction: async (transactionData) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: Timestamp.now(), // Usar hora do servidor Firebase
      });
    } catch (error) {
      console.error("Erro ao gravar transação: ", error);
    }
  },

  subscribeToTransactions: () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    
    // O onSnapshot "ouve" as mudanças no Firebase e atualiza a App na hora
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Converter Timestamp do Firebase de volta para Date do JavaScript
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
      })) as Transaction[];
      
      set({ transactions });
    });

    return unsubscribe;
  },
}));