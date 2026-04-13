import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, where, serverTimestamp, setDoc, doc, getDocs, writeBatch, increment, getDoc, limit, updateDoc, arrayUnion } from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, TransactionCreate, User as UserProfile } from '../types';
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
  addTransaction: (transaction: TransactionCreate) => Promise<string | undefined>;
  cancelTransaction: (transactionId: string) => Promise<void>;
  updateTransactionDocument: (transactionId: string, documentNumber: string) => Promise<void>; 
  subscribeToTransactions: (role?: string, id?: string) => () => void;
  checkNifExists: (nif: string) => Promise<boolean>;
  initializeAuth: () => () => void;
  deleteUserWithHistory: (userId: string, role: 'client' | 'merchant') => Promise<void>;
  updateUserToken: (userId: string, token: string) => Promise<void>; // NOVA FUNÇÃO
}

export const useStore = create<StoreState>((set, get) => ({
  transactions: [],
  currentUser: null,
  isLoading: true,
  isInitialized: false,

  setCurrentUser: (user) => set({ currentUser: user, isLoading: false, isInitialized: true }),
  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      set({ currentUser: null, transactions: [], isLoading: false, isInitialized: true });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast.success("EMAIL DE RECUPERAÇÃO ENVIADO!");
  },

  updateUserToken: async (userId: string, token: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      // Usamos arrayUnion para permitir que o utilizador receba notificações em vários aparelhos
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp()
      });
      console.log("Token de notificação atualizado com sucesso.");
    } catch (e) {
      console.error("Erro ao guardar token:", e);
    }
  },

  checkNifExists: async (nif: string) => {
    if (!nif || nif.trim() === '') return false;
    const q = query(collection(db, 'users'), where('nif', '==', nif), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  addTransaction: async (tx) => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const batch = writeBatch(db);
      let currentCbPercent = currentUser.cashbackPercent || 0;
      const amount = Number(tx.amount);
      const cashback = tx.type === 'earn' ? Math.round((amount * currentCbPercent / 100) * 100) / 100 : amount;
      const newTxRef = doc(collection(db, 'transactions'));
      
      batch.set(newTxRef, {
        clientId: tx.clientId,
        merchantId: currentUser.id,
        merchantName: currentUser.shopName || currentUser.name,
        amount,
        cashbackAmount: cashback,
        cashbackPercent: currentCbPercent,
        type: tx.type,
        status: 'available',
        createdAt: serverTimestamp(),
        clientNif: tx.documentNumber || "", 
        documentNumber: tx.documentNumber || "",
        clientName: tx.clientName || "Desconhecido",
        clientCardNumber: tx.clientCardNumber || "---",
        clientBirthDate: tx.clientBirthDate || ""
      });

      const userRef = doc(db, 'users', tx.clientId);
      if (tx.type === 'earn') {
        batch.update(userRef, {
          [`wallet.available`]: increment(cashback),
          [`storeWallets.${currentUser.id}.available`]: increment(cashback),
          [`storeWallets.${currentUser.id}.merchantName`]: currentUser.shopName || currentUser.name
        });
      } else {
        batch.update(userRef, {
          [`wallet.available`]: increment(-amount),
          [`storeWallets.${currentUser.id}.available`]: increment(-amount)
        });
      }
      await batch.commit();
      toast.success("MOVIMENTO REGISTADO!");
      return newTxRef.id;
    } catch (e) { toast.error("ERRO NO REGISTO."); }
  },

  updateTransactionDocument: async (transactionId, documentNumber) => {
    try {
        const txRef = doc(db, 'transactions', transactionId);
        await updateDoc(txRef, { documentNumber: documentNumber.toUpperCase() });
        toast.success("Fatura associada com sucesso!");
    } catch(e) { toast.error("Erro ao atualizar fatura."); }
  },

  cancelTransaction: async (id) => {
    try {
      const txRef = doc(db, 'transactions', id);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;
      const txData = txSnap.data();
      const batch = writeBatch(db);
      batch.update(txRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
      const userRef = doc(db, 'users', txData.clientId);
      
      if (txData.type === 'earn') {
        const type = txData.status === 'pending' ? 'pending' : 'available';
        batch.update(userRef, { 
            [`wallet.${type}`]: increment(-txData.cashbackAmount), 
            [`storeWallets.${txData.merchantId}.${type}`]: increment(-txData.cashbackAmount) 
        });
      } else {
        batch.update(userRef, { 
            [`wallet.available`]: increment(txData.amount), 
            [`storeWallets.${txData.merchantId}.available`]: increment(txData.amount) 
        });
      }
      await batch.commit();
      toast.success("ANULADO.");
    } catch (e) { toast.error("ERRO."); }
  },

  subscribeToTransactions: (role, id) => {
    if (!id && role !== 'admin') return () => {};
    const q = role === 'admin' 
      ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500))
      : query(collection(db, 'transactions'), where(role === 'merchant' ? 'merchantId' : 'clientId', '==', id), orderBy('createdAt', 'desc'), limit(150));
    
    return onSnapshot(q, (snap) => {
      set({ transactions: snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)) });
    }, (err) => console.error("Transactions sub error:", err));
  },

  initializeAuth: () => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (user) {
        set({ isLoading: true });
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (d) => {
          if (d.exists()) {
            set({ currentUser: { ...d.data(), id: user.uid } as UserProfile, isLoading: false, isInitialized: true });
          } else {
            set({ currentUser: null, isLoading: false, isInitialized: true });
          }
        }, (err) => {
          set({ isLoading: false, isInitialized: true });
        });
      } else {
        set({ currentUser: null, isLoading: false, isInitialized: true });
      }
    });

    return () => { unsubAuth(); if (unsubProfile) unsubProfile(); };
  },

  deleteUserWithHistory: async (userId, role) => {
    try {
      const q = query(collection(db, 'transactions'), where(role === 'merchant' ? 'merchantId' : 'clientId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
      toast.success("DADOS APAGADOS.");
    } catch (e) { toast.error("ERRO."); }
  }
}));