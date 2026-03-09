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

// Interface unificada para Clientes, Lojistas e Admins
// Alterada para tornar campos de perfil opcionais (?) e evitar erros no Login
export interface UserProfile {
  id: string; // ID do documento no Firestore
  uid?: string; // UID do Firebase Auth (para clientes)
  customerNumber?: string; 
  name?: string;     // Tornado opcional para aceitar logins parciais
  nif?: string;      // Tornado opcional
  email?: string;    // Tornado opcional
  role: 'client' | 'merchant' | 'admin';
  // Campos específicos de Lojista
  cashbackPercent?: number;
  phone?: string;
  freguesia?: string;
  postalCode?: string;
  operators?: any[];
  firstAccess?: boolean;
  temporaryPassword?: string;
  password?: string;
}

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
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
      // Usamos o uid se existir (clientes auth), caso contrário o id (lojistas manuais)
      const docId = profile.uid || profile.id;
      await setDoc(doc(db, 'users', docId), {
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

    // Filtros por Role para garantir que ninguém vê o que não deve
    if (role === 'merchant' && identifier) {
      q = query(transRef, where('merchantId', '==', identifier), orderBy('createdAt', 'desc'));
    } else if (role === 'client' && identifier) {
      q = query(transRef, where('clientId', '==', identifier), orderBy('createdAt', 'desc'));
    } else if (role === 'admin') {
      // Admin vê tudo por padrão
      q = query(transRef, orderBy('createdAt', 'desc'));
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