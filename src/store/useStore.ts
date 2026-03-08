// src/store/useStore.ts
import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Transaction {
  id: string;
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackAmount: number;
  type: 'earn' | 'redeem' | 'subtract';
  documentNumber?: string;
  operatorCode?: string;
  status: 'pending' | 'available';
  createdAt: any;
}

interface StoreState {
  transactions: Transaction[];
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: (role?: string, id?: string) => () => void;
}

export const useStore = create<StoreState>((set) => ({
  transactions: [],
  currentUser: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  logout: () => set({ currentUser: null, transactions: [] }),

  addTransaction: async (transactionData) => {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao adicionar transação:", error);
      throw error;
    }
  },

  subscribeToTransactions: (role, identifier) => {
    const transRef = collection(db, 'transactions');
    let q = query(transRef, orderBy('createdAt', 'desc'));

    if (role === 'merchant' && identifier) {
      q = query(transRef, where('merchantId', '==', identifier), orderBy('createdAt', 'desc'));
    } else if (role === 'client' && identifier) {
      q = query(transRef, where('clientId', '==', identifier), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      set({ transactions: transData });
    }, (error) => {
      console.error("Erro na escuta de transações:", error);
    });
  },
}));