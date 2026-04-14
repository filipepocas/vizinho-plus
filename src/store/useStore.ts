import { create } from 'zustand';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  serverTimestamp, 
  doc, 
  getDocs, 
  writeBatch, 
  getDoc, 
  limit, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';
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
  updateUserToken: (userId: string, token: string) => Promise<void>;
  toggleNotifications: (userId: string, enabled: boolean) => Promise<void>;
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
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp(),
        notificationsEnabled: true
      });
    } catch (e) {
      console.error("Erro ao guardar token:", e);
    }
  },

  toggleNotifications: async (userId: string, enabled: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationsEnabled: enabled,
        notificationsUpdatedAt: serverTimestamp()
      });
      toast.success(enabled ? "NOTIFICAÇÕES ATIVADAS!" : "NOTIFICAÇÕES DESATIVADAS.");
    } catch (e) {
      toast.error("ERRO AO ALTERAR PREFERÊNCIAS.");
    }
  },

  checkNifExists: async (nif: string) => {
    if (!nif || nif.trim() === '') return false;
    const q = query(collection(db, 'users'), where('nif', '==', nif), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  // X1 - RESOLVIDO: O frontend apenas regista a transação. O Backend atualiza o saldo da carteira.
  addTransaction: async (tx) => {
    const { currentUser } = get();
    if (!currentUser) return;
    try {
      const newTxRef = doc(collection(db, 'transactions'));
      
      // Criar transação apenas. Cloud Function fará as contas reais.
      await updateDoc(newTxRef, {
        clientId: tx.clientId,
        merchantId: currentUser.id,
        merchantName: currentUser.shopName || currentUser.name,
        amount: Number(tx.amount), // Valor da fatura (Earn) ou do desconto (Redeem)
        invoiceAmount: tx.invoiceAmount ? Number(tx.invoiceAmount) : 0, // X6 - Regra dos 50%
        type: tx.type,
        status: 'pending', // Deixa a cloud function aprovar
        createdAt: serverTimestamp(),
        clientNif: tx.documentNumber || "", 
        documentNumber: tx.documentNumber || "",
        clientName: tx.clientName || "Desconhecido",
        clientCardNumber: tx.clientCardNumber || "---",
        clientBirthDate: tx.clientBirthDate || ""
      });

      toast.success("MOVIMENTO ENVIADO PARA PROCESSAMENTO!");
      return newTxRef.id;
    } catch (e) { 
      // Em caso de erro, pode estar a tentar criar no updateDoc que não existe, logo forçamos setDoc
      try {
        const newTxRef = doc(collection(db, 'transactions'));
        const batch = writeBatch(db);
        batch.set(newTxRef, {
          clientId: tx.clientId,
          merchantId: currentUser.id,
          merchantName: currentUser.shopName || currentUser.name,
          amount: Number(tx.amount),
          invoiceAmount: tx.invoiceAmount ? Number(tx.invoiceAmount) : 0,
          type: tx.type,
          status: 'pending',
          createdAt: serverTimestamp(),
          clientNif: tx.documentNumber || "", 
          documentNumber: tx.documentNumber || "",
          clientName: tx.clientName || "Desconhecido",
          clientCardNumber: tx.clientCardNumber || "---",
          clientBirthDate: tx.clientBirthDate || ""
        });
        await batch.commit();
        toast.success("MOVIMENTO REGISTADO!");
        return newTxRef.id;
      } catch(err2) {
        toast.error("ERRO NO REGISTO.");
      }
    }
  },

  updateTransactionDocument: async (transactionId, documentNumber) => {
    try {
        const txRef = doc(db, 'transactions', transactionId);
        await updateDoc(txRef, { documentNumber: documentNumber.toUpperCase() });
        toast.success("Fatura associada com sucesso!");
    } catch(e) { 
      toast.error("Erro ao atualizar fatura.");
    }
  },

  // X1 - RESOLVIDO: O frontend apenas marca como cancelado.
  cancelTransaction: async (id) => {
    try {
      const txRef = doc(db, 'transactions', id);
      await updateDoc(txRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
      toast.success("PEDIDO DE ANULAÇÃO ENVIADO.");
    } catch (e) { 
      toast.error("ERRO AO ANULAR.");
    }
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
    } catch (e) { 
      toast.error("ERRO."); 
    }
  }
}));