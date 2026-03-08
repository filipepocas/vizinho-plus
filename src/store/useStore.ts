// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
<<<<<<< HEAD
  orderBy,
=======
  orderBy, 
  where,
>>>>>>> df97bfc (a)
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types';

interface StoreState {
  transactions: Transaction[];
<<<<<<< HEAD
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  subscribeToTransactions: () => () => void;
=======
  // Atualizado para incluir Documento e Operador conforme o Mapa de Trabalho
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'> & { 
    documentNumber?: string, 
    operatorCode?: string 
  }) => Promise<void>;
  subscribeToTransactions: (role?: string, id?: string) => () => void;
>>>>>>> df97bfc (a)
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      transactions: [],
      currentUser: null,

<<<<<<< HEAD
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
=======
  addTransaction: async (transactionData) => {
    try {
      // 1. Registo da Transação Principal (Com data/hora automática do servidor)
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: Timestamp.now(), // Registo automático conforme regra 
      });

      // 2. Lógica de Auditoria e Segurança (Audit Logs)
      // Se for resgate (redeem) ou valor alto, cria log especial
      if (transactionData.type === 'redeem' || transactionData.cashbackAmount > 50) {
        await addDoc(collection(db, 'audit_logs'), {
          transactionId: docRef.id,
          type: transactionData.type === 'redeem' ? 'CASHBACK_REDEEM' : 'HIGH_VALUE_TRANSACTION',
          severity: transactionData.cashbackAmount > 100 ? 'CRITICAL' : 'NORMAL',
          merchantId: transactionData.merchantId,
          clientId: transactionData.clientId,
          operatorCode: transactionData.operatorCode || 'N/A', // Regra dos Operadores
          documentNumber: transactionData.documentNumber || 'N/A', // Regra da Fatura
          amount: transactionData.cashbackAmount,
          timestamp: Timestamp.now(),
          message: `Movimento de ${transactionData.cashbackAmount}€ validado pelo operador ${transactionData.operatorCode}`
        });
      }
    } catch (error) {
      console.error("Erro na operação molecular: ", error);
      throw error;
    }
  },

  // Subscrição inteligente: Admin vê tudo, Lojista vê só o seu, Cliente vê só o seu
  subscribeToTransactions: (role, id) => {
    let q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

    // Filtro por Loja conforme regra: "O saldo só pode ser utilizado na loja onde é obtido"
    if (role === 'merchant' && id) {
      q = query(collection(db, 'transactions'), where('merchantId', '==', id), orderBy('createdAt', 'desc'));
    } else if (role === 'client' && id) {
      q = query(collection(db, 'transactions'), where('clientId', '==', id), orderBy('createdAt', 'desc'));
    }

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
>>>>>>> df97bfc (a)
