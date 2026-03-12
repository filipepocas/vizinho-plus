import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  setDoc,
  doc,
  getDoc,
  getDocs,
  addDoc
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
  maturedAt?: any;
}

export interface UserProfile {
  id: string; 
  uid?: string; 
  customerNumber?: string; 
  name?: string;     
  nif?: string;      
  email?: string;    
  role: 'client' | 'merchant' | 'admin' | 'user';
  status?: 'active' | 'disabled' | 'pending';
  cashbackPercent?: number;
  phone?: string;
  address?: string;    
  city?: string;       
  category?: string;   
  zipCode?: string;
  operators?: any[];
  firstAccess?: boolean;
  wallet?: {
    available: number;
    pending: number;
  };
  createdAt?: any;
}

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
  registerClientProfile: (profile: UserProfile) => Promise<void>;
  checkNifExists: (nif: string) => Promise<boolean>;
}

export const useStore = create<StoreState>((set) => ({
  transactions: [],
  currentUser: null,
  isLoading: true,

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

  checkNifExists: async (nif: string) => {
    try {
      const q = query(collection(db, 'users'), where('nif', '==', nif));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Erro ao verificar NIF:", error);
      return false;
    }
  },

  registerClientProfile: async (profile) => {
    try {
      const docId = profile.uid || profile.id;
      const { id, ...dataToSave } = profile;
      await setDoc(doc(db, 'users', docId), {
        ...dataToSave,
        createdAt: serverTimestamp(),
        wallet: profile.wallet || { available: 0, pending: 0 }
      }, { merge: true });
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
    let q;

    if ((role === 'merchant' || role === 'client' || role === 'user') && identifier) {
      const field = (role === 'merchant') ? 'merchantId' : 'clientId';
      q = query(transRef, where(field, '==', identifier), orderBy('createdAt', 'desc'));
    } else {
      q = query(transRef, orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      set({ transactions: transData });
    }, (error) => {
      console.error("Erro na escuta de transações:", error.message);
    });
  },
}));

// LISTENER DE SESSÃO MELHORADO
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Se o user entrar, vamos buscar os detalhes (role, etc) ao Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      useStore.getState().setCurrentUser({
        id: user.uid,
        ...userDoc.data()
      } as UserProfile);
    } else {
      // Caso especial para o teu email de admin se o doc ainda não existir
      if (user.email === 'rochap.filipe@gmail.com') {
        useStore.getState().setCurrentUser({
          id: user.uid,
          email: user.email,
          role: 'admin',
          name: 'Filipe (Admin)'
        } as UserProfile);
      }
    }
  } else {
    useStore.getState().setCurrentUser(null);
  }
});