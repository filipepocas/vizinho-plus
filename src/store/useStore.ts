import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  setDoc,
  doc 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../config/firebase';

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

// Interface atualizada com o Número de Cliente de 10 dígitos
export interface UserProfile {
  uid: string;
  customerNumber?: string; // NOVO: Campo para o número de 10 dígitos do cartão
  name: string;
  nif: string;
  freguesia: string;
  postalCode: string;
  phone?: string;
  email: string;
  role: 'client' | 'merchant' | 'admin';
}

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | any | null;
  setCurrentUser: (user: any | null) => void;
  logout: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: (role?: string, id?: string) => () => void;
  registerClientProfile: (profile: UserProfile) => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  transactions: [],
  currentUser: null,

  setCurrentUser: (user) => set({ currentUser: user }),

  logout: async () => {
    try {
      await signOut(auth);
      set({ currentUser: null, transactions: [] });
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  },

  registerClientProfile: async (profile) => {
    try {
      await setDoc(doc(db, 'users', profile.uid), {
        ...profile,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao registar perfil:", error);
      throw error;
    }
  },

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