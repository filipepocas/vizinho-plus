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
  clients: Client[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  transactions: [],
  clients: [],

  addTransaction: async (transactionData) => {
    try {
      // 1. Gravar a Transação Principal
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: Timestamp.now(),
      });

      // 2. Se for uma Redenção (Gasto de Saldo), criar um Log de Auditoria de Segurança
      if (transactionData.type === 'redeem') {
        await addDoc(collection(db, 'audit_logs'), {
          transactionId: docRef.id,
          type: 'SECURITY_CHECK',
          severity: transactionData.cashbackAmount > 50 ? 'HIGH' : 'LOW', // Alerta se gastar > 50€ de uma vez
          merchantId: transactionData.merchantId,
          clientId: transactionData.clientId,
          amount: transactionData.cashbackAmount,
          timestamp: Timestamp.now(),
          message: `Redenção de saldo efetuada na loja ${transactionData.merchantName}`
        });
      }
    } catch (error) {
      console.error("Erro na operação molecular: ", error);
      throw error;
    }
  },

  subscribeToTransactions: () => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date(),
      })) as Transaction[];
      
      set({ transactions });
    });

    return unsubscribe;
  },
}));