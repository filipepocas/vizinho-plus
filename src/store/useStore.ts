// src/store/useStore.ts
import { create } from 'zustand';
import { 
  collection, onSnapshot, query, orderBy, where, serverTimestamp, 
  setDoc, doc, getDocs, writeBatch, updateDoc, limit 
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, TransactionCreate, User as UserProfile } from '../types';
import { requestNotificationPermission } from '../utils/notifications';
import toast from 'react-hot-toast';

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
    await signOut(auth);
    set({ currentUser: null, transactions: [], isLoading: false });
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
    if (!currentUser || currentUser.role !== 'merchant') throw new Error("Apenas lojistas.");

    try {
      const merchantPercent = currentUser.cashbackPercent || 0;
      const amount = Number(transactionData.amount);
      const calculatedCashback = Math.round((amount * (merchantPercent / 100)) * 100) / 100;

      const newTransRef = doc(collection(db, 'transactions'));
      await setDoc(newTransRef, {
        clientId: transactionData.clientId,
        merchantId: currentUser.id,
        merchantName: currentUser.shopName || currentUser.name,
        amount: amount,
        cashbackAmount: transactionData.type === 'earn' ? calculatedCashback : amount,
        cashbackPercent: merchantPercent,
        documentNumber: transactionData.documentNumber || 'S/ Doc',
        type: transactionData.type,
        status: transactionData.type === 'earn' ? 'pending' : 'available',
        createdAt: serverTimestamp(),
      });
      toast.success("MOVIMENTO REGISTADO!");
    } catch (error: any) {
      toast.error("ERRO: " + error.message);
    }
  },

  cancelTransaction: async (transactionId) => {
    const transRef = doc(db, 'transactions', transactionId);
    await updateDoc(transRef, { 
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });
    toast.success("ANULADO COM SUCESSO.");
  },

  subscribeToTransactions: (role, identifier) => {
    if (!identifier && role !== 'admin') return () => {};
    const transRef = collection(db, 'transactions');
    let q;

    if ((role === 'merchant' || role === 'client' || role === 'user') && identifier) {
      const field = (role === 'merchant') ? 'merchantId' : 'clientId';
      // LIMITAÇÃO DE 100 PARA PERFORMANCE
      q = query(transRef, where(field, '==', identifier), orderBy('createdAt', 'desc'), limit(100));
    } else if (role === 'admin') {
      q = query(transRef, orderBy('createdAt', 'desc'), limit(100));
    } else {
      return () => {};
    }

    return onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      set({ transactions: transData });
    });
  },

  initializeAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        requestNotificationPermission(user.uid);
        onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            set({ currentUser: { ...userDoc.data(), id: user.uid } as UserProfile, isLoading: false, isInitialized: true });
          } else {
            set({ currentUser: { id: user.uid, email: user.email!, role: 'client' } as UserProfile, isLoading: false, isInitialized: true });
          }
        });
      } else {
        set({ currentUser: null, transactions: [], isLoading: false, isInitialized: true });
      }
    });
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
      toast.success("DADOS ELIMINADOS.");
    } finally { set({ isLoading: false }); }
  }
}));