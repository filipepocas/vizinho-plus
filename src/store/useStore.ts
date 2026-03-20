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

// BLINDAGEM DE SEGURANÇA: Remove ativamente cálculos vindos do browser
const pickAllowedTransactionFields = (input: TransactionCreate) => {
  return {
    clientId: input.clientId,
    merchantId: input.merchantId,
    merchantName: input.merchantName,
    amount: input.amount,          // O backend fará o cálculo do cashback baseado nisto
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
  registerClientProfile: (profile: UserProfile) => Promise<void>;
  checkNifExists: (nif: string) => Promise<boolean>;
  initializeAuth: () => () => void;
  deleteUserWithHistory: (userId: string, role: 'client' | 'merchant') => Promise<void>;
  processPendingCashback: (userId: string) => Promise<void>;
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
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  },

  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  },

  checkNifExists: async (nif: string) => {
    try {
      const q = query(collection(db, 'users'), where('nif', '==', nif));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
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
      }, { merge: true });
    } catch (error) {
      throw error;
    }
  },

  processPendingCashback: async (userId: string) => {
    console.log("Maturação agora é feita com segurança em lote via Admin.");
  },

  // REGISTO SEGURO DA TRANSAÇÃO (O BACKEND FARÁ AS CONTAS)
  addTransaction: async (transactionData) => {
    try {
      const securePayload = pickAllowedTransactionFields(transactionData);
      const newTransRef = doc(collection(db, 'transactions'));
      
      await setDoc(newTransRef, {
        ...securePayload,
        status: transactionData.type === 'earn' ? 'pending' : 
               (transactionData.type === 'cancel' || transactionData.type === 'subtract') ? 'cancelled' : 'available',
        createdAt: serverTimestamp(),
      });
      // Cloud Function atuará após este registo.
    } catch (error) {
      console.error("Erro ao pedir transação:", error);
      throw error;
    }
  },

  cancelTransaction: async (transactionId) => {
    try {
      const transRef = doc(db, 'transactions', transactionId);
      await updateDoc(transRef, { 
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });
      // Cloud Function irá reverter os saldos automaticamente.
    } catch (error) {
      throw error;
    }
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
      set({ transactions: [] });
      return () => {};
    }

    return onSnapshot(q, (snapshot) => {
      const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      set({ transactions: transData });
    });
  },

  initializeAuth: () => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (user) {
        requestNotificationPermission(user.uid);

        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const nextUser = { ...userDoc.data(), id: user.uid } as UserProfile;

            // Transição agendada de Percentagem do Lojista
            if (nextUser.role === 'merchant' && typeof (nextUser as any).pendingCashbackPercent === 'number' && (nextUser as any).pendingCashbackEffectiveAt?.toDate) {
              const effectiveAt = (nextUser as any).pendingCashbackEffectiveAt.toDate();
              if (effectiveAt <= new Date()) {
                updateDoc(doc(db, 'users', user.uid), {
                  cashbackPercent: (nextUser as any).pendingCashbackPercent,
                  pendingCashbackPercent: null,
                  pendingCashbackEffectiveAt: null,
                  updatedAt: serverTimestamp(),
                } as any).catch(e => console.error(e));
              }
            }

            set({ currentUser: nextUser, isLoading: false, isInitialized: true });
          } else {
            const role = user.email === 'rochap.filipe@gmail.com' ? 'admin' : 'client';
            set({ currentUser: { id: user.uid, email: user.email!, role: role } as UserProfile, isLoading: false, isInitialized: true });
          }
        });
      } else {
        set({ currentUser: null, transactions: [], isLoading: false, isInitialized: true });
      }
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
    };
  },

  deleteUserWithHistory: async (userId, role) => {
    set({ isLoading: true });
    try {
      const batch = writeBatch(db);
      const fieldToMatch = role === 'merchant' ? 'merchantId' : 'clientId';
      const q = query(collection(db, 'transactions'), where(fieldToMatch, '==', userId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((transactionDoc) => batch.delete(transactionDoc.ref));
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
    } finally {
      set({ isLoading: false });
    }
  }
}));