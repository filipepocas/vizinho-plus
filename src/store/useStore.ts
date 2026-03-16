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
  runTransaction,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, User as UserProfile, WalletData } from '../types';

/**
 * Função auxiliar para garantir precisão matemática
 * Arredonda para 2 casas decimais para evitar erros de floating point.
 */
const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Calcula o saldo global (wallet) com base nas carteiras individuais de cada loja
 */
const calculateGlobalWallet = (storeWallets: { [key: string]: WalletData }) => {
  return Object.values(storeWallets).reduce((acc, curr) => ({
    available: roundToTwo(acc.available + (curr.available || 0)),
    pending: roundToTwo(acc.pending + (curr.pending || 0))
  }), { available: 0, pending: 0 });
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
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
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
      console.error("Erro ao enviar email de recuperação:", error);
      throw error;
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
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao registar perfil:", error);
      throw error;
    }
  },

  processPendingCashback: async (userId: string) => {
    try {
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      
      const q = query(
        collection(db, 'transactions'),
        where('clientId', '==', userId),
        where('status', '==', 'pending'),
        where('type', '==', 'earn')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'users', userId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists()) return;
        const userData = clientDoc.data() as UserProfile;
        const storeWallets = { ...(userData.storeWallets || {}) };
        let hasChanges = false;

        for (const transDoc of snapshot.docs) {
          const transRef = transDoc.ref;
          const currentTransSnapshot = await transaction.get(transRef);
          const transData = currentTransSnapshot.data() as Transaction;

          if (transData.status === 'pending') {
            const createdAt = (transData.createdAt as any as Timestamp).toDate();

            if (createdAt <= fortyEightHoursAgo) {
              const mId = transData.merchantId;
              const amount = roundToTwo(transData.cashbackAmount);

              if (!storeWallets[mId]) {
                storeWallets[mId] = { available: 0, pending: 0, merchantName: transData.merchantName };
              }

              storeWallets[mId].pending = roundToTwo(Math.max(0, (storeWallets[mId].pending || 0) - amount));
              storeWallets[mId].available = roundToTwo((storeWallets[mId].available || 0) + amount);
              
              transaction.update(transRef, { 
                status: 'available',
                maturedAt: serverTimestamp() 
              });
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          // Recalcular saldo global antes de guardar
          const wallet = calculateGlobalWallet(storeWallets);
          transaction.update(clientRef, { storeWallets, wallet });
        }
      });
    } catch (error) {
      console.error("Erro ao processar cashback automático:", error);
    }
  },

  addTransaction: async (transactionData) => {
    const clientRef = doc(db, 'users', transactionData.clientId);
    const mId = transactionData.merchantId;
    
    try {
      await runTransaction(db, async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists()) throw new Error("Cliente não encontrado.");

        const userData = clientDoc.data() as UserProfile;
        const storeWallets = { ...(userData.storeWallets || {}) };
        
        if (!storeWallets[mId]) {
          storeWallets[mId] = { 
            available: 0, 
            pending: 0, 
            merchantName: transactionData.merchantName 
          };
        }

        const currentAvailable = roundToTwo(storeWallets[mId].available || 0);
        const currentPending = roundToTwo(storeWallets[mId].pending || 0);
        const amount = roundToTwo(transactionData.cashbackAmount);

        if (transactionData.type === 'earn') {
          storeWallets[mId].pending = roundToTwo(currentPending + amount);
          storeWallets[mId].lastUpdate = serverTimestamp() as any;
        } 
        else if (transactionData.type === 'redeem') {
          if (currentAvailable < amount) {
            throw new Error("Saldo disponível insuficiente nesta loja.");
          }
          storeWallets[mId].available = roundToTwo(currentAvailable - amount);
          storeWallets[mId].lastUpdate = serverTimestamp() as any;
        }
        else if (transactionData.type === 'cancel' || transactionData.type === 'subtract') {
          let newAvailable = currentAvailable;
          let newPending = currentPending;

          if (currentAvailable >= amount) {
            newAvailable = roundToTwo(currentAvailable - amount);
          } else {
            newAvailable = 0;
            const remaining = roundToTwo(amount - currentAvailable);
            newPending = roundToTwo(Math.max(0, currentPending - remaining));
          }

          storeWallets[mId].available = newAvailable;
          storeWallets[mId].pending = newPending;
          storeWallets[mId].lastUpdate = serverTimestamp() as any;
        }

        // Recalcular saldo global
        const wallet = calculateGlobalWallet(storeWallets);

        const newTransRef = doc(collection(db, 'transactions'));
        transaction.set(newTransRef, {
          ...transactionData,
          cashbackAmount: amount,
          status: transactionData.type === 'earn' ? 'pending' : 'available',
          createdAt: serverTimestamp(),
        });

        transaction.update(clientRef, { storeWallets, wallet });
      });
    } catch (error) {
      console.error("Erro na transação atómica:", error);
      throw error;
    }
  },

  cancelTransaction: async (transactionId) => {
    try {
      await runTransaction(db, async (transaction) => {
        const transRef = doc(db, 'transactions', transactionId);
        const transDoc = await transaction.get(transRef);
        
        if (!transDoc.exists()) throw new Error("Transação não encontrada.");
        
        const transData = transDoc.data() as Transaction;
        if (transData.status === 'cancelled') throw new Error("Esta transação já foi anulada.");

        const mId = transData.merchantId;
        const clientRef = doc(db, 'users', transData.clientId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists()) throw new Error("Cliente não encontrado.");
        
        const userData = clientDoc.data() as UserProfile;
        const storeWallets = { ...(userData.storeWallets || {}) };
        
        if (!storeWallets[mId]) throw new Error("Carteira da loja não encontrada.");

        const currentAvailable = roundToTwo(storeWallets[mId].available || 0);
        const currentPending = roundToTwo(storeWallets[mId].pending || 0);
        const amountToCancel = roundToTwo(transData.cashbackAmount);

        if (transData.type === 'earn') {
          if (transData.status === 'available') {
            storeWallets[mId].available = roundToTwo(Math.max(0, currentAvailable - amountToCancel));
          } else {
            storeWallets[mId].pending = roundToTwo(Math.max(0, currentPending - amountToCancel));
          }
        } 
        else if (transData.type === 'redeem') {
          storeWallets[mId].available = roundToTwo(currentAvailable + amountToCancel);
        }

        storeWallets[mId].lastUpdate = serverTimestamp() as any;

        // Recalcular saldo global
        const wallet = calculateGlobalWallet(storeWallets);

        transaction.update(transRef, { status: 'cancelled' });
        transaction.update(clientRef, { storeWallets, wallet });
      });
    } catch (error) {
      console.error("Erro ao anular transação:", error);
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

  initializeAuth: () => {
    let userUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (user) {
        get().processPendingCashback(user.uid);

        userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            set({ 
              currentUser: { ...userDoc.data(), id: user.uid } as UserProfile,
              isLoading: false,
              isInitialized: true
            });
          } else {
            const role = user.email === 'rochap.filipe@gmail.com' ? 'admin' : 'client';
            set({ 
              currentUser: { id: user.uid, email: user.email!, role: role } as UserProfile,
              isLoading: false,
              isInitialized: true
            });
          }
        }, (error) => {
          console.error("Erro na escuta do perfil:", error);
          set({ isLoading: false, isInitialized: true });
        });
      } else {
        set({ currentUser: null, isLoading: false, isInitialized: true });
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
      querySnapshot.forEach((transactionDoc) => {
        batch.delete(transactionDoc.ref);
      });
      const userRef = doc(db, 'users', userId);
      batch.delete(userRef);
      await batch.commit();
    } catch (error) {
      console.error("Erro ao eliminar dados históricos:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));