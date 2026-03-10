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
import { signOut, onAuthStateChanged } from 'firebase/auth';
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

export interface UserProfile {
  id: string; 
  uid?: string; 
  customerNumber?: string; 
  name?: string;     
  nif?: string;      
  email?: string;    
  role: 'client' | 'merchant' | 'admin';
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
  isLoading: boolean; // Adicionado para resolver o erro no App.tsx
  setCurrentUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
  registerClientProfile: (profile: UserProfile) => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  transactions: [],
  currentUser: null,
  isLoading: true, // Começa em true para aguardar a verificação inicial

  setCurrentUser: (user) => set({ currentUser: user, isLoading: false }),
  
  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    try {
      await signOut(auth);
      set({ currentUser: null, transactions: [], isLoading: false });
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  },

  registerClientProfile: async (profile) => {
    try {
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

    if (role === 'merchant' && identifier) {
      q = query(transRef, where('merchantId', '==', identifier), orderBy('createdAt', 'desc'));
    } else if (role === 'client' && identifier) {
      q = query(transRef, where('clientId', '==', identifier), orderBy('createdAt', 'desc'));
    } else if (role === 'admin') {
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

// Listener global para sincronizar o estado do Auth com o Store
onAuthStateChanged(auth, (user) => {
  if (!user) {
    useStore.getState().setCurrentUser(null);
  }
  // Nota: O preenchimento do perfil completo (role, etc) continuará a ser feito no seu componente de Login
});