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
  getDocs,
  writeBatch,
  updateDoc,
  limit
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, TransactionCreate, User as UserProfile } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

// Filtro de segurança: Prepara os dados conforme as Rules exigem
const pickAllowedTransactionFields = (input: TransactionCreate, merchantPercent: number) => {
  const amount = Number(input.amount);
  // O valor do cashback enviado tem de ser matematicamente exato para as Rules aceitarem
  const calculatedCashback = Number((amount * (merchantPercent / 100)).toFixed(2));

  return {
    clientId: input.clientId,
    merchantId: input.merchantId,
    merchantName: input.merchantName,
    amount: amount,
    cashbackAmount: calculatedCashback, 
    cashbackPercent: merchantPercent,
    documentNumber: input.documentNumber || '',
    type: input.type,
  };
};

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  addTransaction: (transaction: TransactionCreate) => Promise<void>;
  cancelTransaction: (transactionId: string) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
  checkNifExists: (nif: string) => Promise<boolean>;
  initializeAuth: () => () => void;
  deleteUserWithHistory: (userId: string, role: 'client' | 'merchant') => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  transactions: [],
  currentUser: null,
  isLoading: true,
  isInitialized: false,

  setCurrentUser: (user) => set({ currentUser: user, isLoading: false, isInitialized: true }),
  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    try {
      await signOut(auth);
      set({ currentUser: null, transactions: [], isLoading: false });
    } catch (error) { console.error("Erro ao sair:", error); }
  },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  checkNifExists: async (nif: string) => {
    const q = query(collection(db, 'users'), where('nif', '==', nif));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  },

  addTransaction: async (transactionData) => {
    const { currentUser } = get();
    if (!currentUser || currentUser.role !== 'merchant') {
      throw new Error("Apenas lojistas podem registar transações.");
    }

    try {
      // Usamos a percentagem oficial do lojista para o cálculo
      const merchantPercent = currentUser.cashbackPercent || 0;
      const securePayload = pickAllowedTransactionFields(transactionData, merchantPercent);
      
      const newTransRef = doc(collection(db, 'transactions'));
      
      await setDoc(newTransRef, {
        ...securePayload,
        status: transactionData.type === 'earn' ? 'pending' : 'available',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro na transação:", error);
      throw error;
    }
  },

  cancelTransaction: async (transactionId) => {
    const transRef = doc(db, 'transactions', transactionId);
    await updateDoc(transRef, { 
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });
  },

  subscribeToTransactions: (role, identifier, limitCount = 50) => {
    if (!identifier && role !== 'admin') return () => {};
    const transRef = collection(db, 'transactions');
    let q;

    if ((role === 'merchant' || role === 'client' || role === 'user') && identifier) {
      const field = (role === 'merchant') ? 'merchantId' : 'clientId';
      q = query(transRef, where(field, '==', identifier), orderBy('createdAt', 'desc'), limit(limitCount));
    } else if (role === 'admin') {
      q = query(transRef, orderBy('createdAt', 'desc'), limit(limitCount));
    } else {
      return () => {};
    }

    return onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      set({ transactions: transData });
    });
  },

  initializeAuth: () => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        requestNotificationPermission(user.uid);
        onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            set({ currentUser: { ...userDoc.data(), id: user.uid } as UserProfile, isLoading: false, isInitialized: true });
          } else {
            const role = user.email === 'rochap.filipe@gmail.com' ? 'admin' : 'client';
            set({ currentUser: { id: user.uid, email: user.email!, role } as UserProfile, isLoading: false, isInitialized: true });
          }
        });
      } else {
        set({ currentUser: null, transactions: [], isLoading: false, isInitialized: true });
      }
    });
    return authUnsubscribe;
  },

  deleteUserWithHistory: async (userId, role) => {
    set({ isLoading: true });
    try {
      const batch = writeBatch(db);
      const fieldToMatch = role === 'merchant' ? 'merchantId' : 'clientId';
      const q = query(collection(db, 'transactions'), where(fieldToMatch, '==', userId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((tx) => batch.delete(tx.ref));
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
    } finally { set({ isLoading: false }); }
  }
}));