// src/store/useStore.ts
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
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, User as UserProfile } from '../types';

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

export const useStore = create<StoreState>((set, get) => ({
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
      const docId = profile.id;
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
      // Criamos a referência para o novo documento
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...transactionData,
        createdAt: serverTimestamp(),
      });

      // SINCRONIZAÇÃO IMEDIATA: 
      // Para evitar que o lojista fique na dúvida, adicionamos manualmente 
      // a transação ao estado local antes mesmo do Firebase devolver o Snapshot
      const newTransaction: Transaction = {
        ...transactionData,
        id: docRef.id,
        createdAt: Timestamp.now(), // Usamos um timestamp local temporário
      } as Transaction;

      set((state) => ({
        transactions: [newTransaction, ...state.transactions]
      }));

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
      
      // Atualizamos o estado local com os dados reais e ordenados do servidor
      set({ transactions: transData });
    }, (error) => {
      console.error("Erro na escuta de transações:", error.message);
    });
  },
}));

// LISTENER DE SESSÃO - PADRONIZAÇÃO DE ID
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      useStore.getState().setCurrentUser({
        ...userDoc.data(),
        id: user.uid, 
      } as UserProfile);
    } else {
      if (user.email === 'rochap.filipe@gmail.com') {
        useStore.getState().setCurrentUser({
          id: user.uid,
          email: user.email!,
          role: 'admin'
        } as UserProfile);
      }
    }
  } else {
    useStore.getState().setCurrentUser(null);
  }
});