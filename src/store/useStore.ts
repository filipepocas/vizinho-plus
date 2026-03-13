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
  runTransaction
} from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
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
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  cancelTransaction: (transactionId: string) => Promise<void>;
  subscribeToTransactions: (role?: string, identifier?: string) => () => void;
  registerClientProfile: (profile: UserProfile) => Promise<void>;
  checkNifExists: (nif: string) => Promise<boolean>;
  initializeAuth: () => () => void;
}

export const useStore = create<StoreState>((set) => ({
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

        // 1. ATRIBUIÇÃO DE CASHBACK (EARN)
        if (transactionData.type === 'earn') {
          walletUpdate = {
            'wallet.pending': currentPending + transactionData.cashbackAmount
          };
        } 
        // 2. UTILIZAÇÃO DE SALDO (REDEEM)
        else if (transactionData.type === 'redeem') {
          if (currentAvailable < transactionData.cashbackAmount) {
            throw new Error("Saldo disponível insuficiente.");
          }
          walletUpdate = {
            'wallet.available': currentAvailable - transactionData.cashbackAmount
          };
        }
        // 3. ANULAÇÃO OU SUBTRAÇÃO MANUAL (CANCEL / SUBTRACT)
        else if (transactionData.type === 'cancel' || transactionData.type === 'subtract') {
          const totalToSubtract = transactionData.cashbackAmount;
          let newAvailable = currentAvailable;
          let newPending = currentPending;

          // Se tiver saldo disponível, retira de lá primeiro
          if (currentAvailable >= totalToSubtract) {
            newAvailable = currentAvailable - totalToSubtract;
          } else {
            // Se não chegar, zera o disponível e retira o resto do pendente
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

        // Se era uma atribuição, removemos o saldo que foi dado (reversão segura)
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
        // Se era uma utilização, devolvemos o saldo ao cliente
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
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
        } catch (error) {
          console.error("Erro no initializeAuth:", error);
          set({ isLoading: false, isInitialized: true });
        }
      } else {
        set({ currentUser: null, isLoading: false, isInitialized: true });
      }
    });
    return unsubscribe;
  }
}));