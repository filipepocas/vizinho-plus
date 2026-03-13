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
  updateDoc,
  runTransaction,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth'; // ADICIONADO: sendPasswordResetEmail
import { db, auth } from '../config/firebase';
import { Transaction, User as UserProfile } from '../types';

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>; // ADICIONADO
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  cancelTransaction: (transactionId: string) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
  registerClientProfile: (profile: UserProfile) => Promise<void>;
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
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  },

  // NOVA FUNÇÃO: Recuperar Password
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
        wallet: profile.wallet || { available: 0, pending: 0 }
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao registar perfil:", error);
      throw error;
    }
  },

  addTransaction: async (transactionData) => {
    const clientRef = doc(db, 'users', transactionData.clientId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists()) throw new Error("Cliente não encontrado.");

        const userData = clientDoc.data() as UserProfile;
        const currentAvailable = userData.wallet?.available || 0;
        const currentPending = userData.wallet?.pending || 0;

        let walletUpdate = {};

        if (transactionData.type === 'earn') {
          walletUpdate = {
            'wallet.pending': currentPending + transactionData.cashbackAmount
          };
        } 
        else if (transactionData.type === 'redeem') {
          if (currentAvailable < transactionData.cashbackAmount) {
            throw new Error("Saldo disponível insuficiente.");
          }
          walletUpdate = {
            'wallet.available': currentAvailable - transactionData.cashbackAmount
          };
        }
        else if (transactionData.type === 'cancel' || transactionData.type === 'subtract') {
          const totalToSubtract = transactionData.cashbackAmount;
          let newAvailable = currentAvailable;
          let newPending = currentPending;

          if (currentAvailable >= totalToSubtract) {
            newAvailable = currentAvailable - totalToSubtract;
          } else {
            newAvailable = 0;
            const remaining = totalToSubtract - currentAvailable;
            newPending = Math.max(0, currentPending - remaining);
          }

          walletUpdate = {
            'wallet.available': newAvailable,
            'wallet.pending': newPending
          };
        }

        const newTransRef = doc(collection(db, 'transactions'));
        transaction.set(newTransRef, {
          ...transactionData,
          createdAt: serverTimestamp(),
        });

        transaction.update(clientRef, walletUpdate);
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

        const clientRef = doc(db, 'users', transData.clientId);
        const clientDoc = await transaction.get(clientRef);
        
        if (!clientDoc.exists()) throw new Error("Cliente não encontrado.");
        
        const userData = clientDoc.data() as UserProfile;
        const currentAvailable = userData.wallet?.available || 0;
        const currentPending = userData.wallet?.pending || 0;
        const amountToCancel = transData.cashbackAmount;

        let walletUpdate = {};

        if (transData.type === 'earn') {
          let newAvailable = currentAvailable;
          let newPending = currentPending;

          if (currentAvailable >= amountToCancel) {
            newAvailable = currentAvailable - amountToCancel;
          } else {
            newAvailable = 0;
            newPending = Math.max(0, currentPending - (amountToCancel - currentAvailable));
          }

          walletUpdate = {
            'wallet.available': newAvailable,
            'wallet.pending': newPending
          };
        } 
        else if (transData.type === 'redeem') {
          walletUpdate = {
            'wallet.available': currentAvailable + amountToCancel
          };
        }

        transaction.update(transRef, { status: 'cancelled' });
        transaction.update(clientRef, walletUpdate);
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