// src/store/useStore.ts

import { create } from 'zustand';
import { 
  collection, onSnapshot, query, orderBy, where, serverTimestamp, 
  doc, getDocs, writeBatch, limit, updateDoc, setDoc, arrayUnion, getDoc
} from 'firebase/firestore';
import { signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { Transaction, TransactionCreate, User as UserProfile, LocationsMap, Product, ProductTaxonomy } from '../types';
import toast from 'react-hot-toast';

interface StoreState {
  transactions: Transaction[];
  currentUser: UserProfile | null;
  locations: LocationsMap;
  products: Product[];
  shoppingList: Product[];
  taxonomy: ProductTaxonomy | null;
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
  
  fetchProducts: (filters?: any) => Promise<void>;
  addToShoppingList: (product: Product) => void;
  removeFromShoppingList: (productId: string) => void;
  clearShoppingList: () => void;
  fetchTaxonomy: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  transactions: [],
  currentUser: null,
  locations: {},
  products: [],
  shoppingList: JSON.parse(localStorage.getItem('vplus_shopping_list') || '[]'),
  taxonomy: null,
  isLoading: true,
  isInitialized: false,

  setCurrentUser: (user) => set({ currentUser: user, isLoading: false, isInitialized: true }),
  setLoading: (loading) => set({ isLoading: loading }),

  logout: async () => {
    set({ isLoading: true });
    try {
      await signOut(auth);
      set({ currentUser: null, transactions: [], isLoading: false, isInitialized: true });
    } catch (e) { set({ isLoading: false }); }
  },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast.success("EMAIL DE RECUPERAÇÃO ENVIADO!");
  },

  fetchTaxonomy: async () => {
    try {
      const docSnap = await getDoc(doc(db, 'system', 'products_taxonomy'));
      if (docSnap.exists()) set({ taxonomy: docSnap.data() as ProductTaxonomy });
    } catch(e) { console.error(e); }
  },

  fetchProducts: async (filters: any = {}) => {
    set({ isLoading: true });
    
    try {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      let q = query(
        collection(db, 'products'), 
        where('createdAt', '>=', seteDiasAtras),
        orderBy('createdAt', 'desc')
      );

      if (filters.distrito) {
        q = query(q, where('distrito', '==', filters.distrito));
      }

      const snap = await getDocs(q);
      let fetchedProducts = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));

      // CORREÇÃO: Tipagem explícita (p: Product) nos filtros em memória
      if (filters.concelho && filters.concelho.length > 0) {
        fetchedProducts = fetchedProducts.filter((p: Product) => filters.concelho.includes(p.concelho));
      }
      if (filters.freguesia && filters.freguesia.length > 0) {
        fetchedProducts = fetchedProducts.filter((p: Product) => filters.freguesia.includes(p.freguesia));
      }
      if (filters.category && filters.category.length > 0) {
        fetchedProducts = fetchedProducts.filter((p: Product) => filters.category.includes(p.category));
      }
      if (filters.family && filters.family.length > 0) {
        fetchedProducts = fetchedProducts.filter((p: Product) => filters.family.includes(p.family));
      }
      if (filters.productType && filters.productType.length > 0) {
        fetchedProducts = fetchedProducts.filter((p: Product) => filters.productType.includes(p.productType));
      }

      set({
        products: fetchedProducts,
        isLoading: false
      });
    } catch(e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addToShoppingList: (product) => {
    const { shoppingList } = get();
    if (shoppingList.some(item => item.id === product.id)) {
      toast.error("Produto já está na lista!");
      return;
    }
    const newList = [...shoppingList, product];
    localStorage.setItem('vplus_shopping_list', JSON.stringify(newList));
    set({ shoppingList: newList });
    toast.success("Adicionado à lista!");
  },

  removeFromShoppingList: (productId) => {
    const newList = get().shoppingList.filter(p => p.id !== productId);
    localStorage.setItem('vplus_shopping_list', JSON.stringify(newList));
    set({ shoppingList: newList });
  },

  clearShoppingList: () => {
    localStorage.removeItem('vplus_shopping_list');
    set({ shoppingList: [] });
  },

  updateUserToken: async (userId: string, token: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { fcmTokens: arrayUnion(token), notificationsEnabled: true });
    } catch (e) { console.error(e); }
  },

  toggleNotifications: async (userId: string, enabled: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { notificationsEnabled: enabled });
      toast.success(enabled ? "NOTIFICAÇÕES ATIVADAS!" : "NOTIFICAÇÕES DESATIVADAS.");
    } catch (e) { toast.error("ERRO."); }
  },

  checkNifExists: async (nif: string) => {
    if (!nif || nif.trim() === '') return false;
    const q = query(collection(db, 'users'), where('nif', '==', nif), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  addTransaction: async (tx: TransactionCreate) => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    try {
      const newTxRef = doc(collection(db, 'transactions'));
      await setDoc(newTxRef, {
        clientId: tx.clientId, merchantId: currentUser.id, merchantName: currentUser.shopName || currentUser.name,
        amount: Number(tx.amount), invoiceAmount: tx.invoiceAmount ? Number(tx.invoiceAmount) : 0,
        type: tx.type, status: 'pending', createdAt: serverTimestamp(),
        clientNif: tx.documentNumber || "", documentNumber: tx.documentNumber || "",
        clientName: tx.clientName || "Desconhecido", clientCardNumber: tx.clientCardNumber || "---", clientBirthDate: tx.clientBirthDate || ""
      });
      toast.success("MOVIMENTO ENVIADO!");
      return newTxRef.id;
    } catch (e) { toast.error("ERRO NO REGISTO."); }
  },

  updateTransactionDocument: async (transactionId: string, documentNumber: string) => {
    try {
        const txRef = doc(db, 'transactions', transactionId);
        await updateDoc(txRef, { documentNumber: documentNumber.toUpperCase() });
        toast.success("Fatura associada!");
    } catch(e) { toast.error("Erro."); }
  },

  cancelTransaction: async (id: string) => {
    try {
      const txRef = doc(db, 'transactions', id);
      await updateDoc(txRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
      toast.success("PEDIDO DE ANULAÇÃO ENVIADO.");
    } catch (e) { toast.error("ERRO."); }
  },

  subscribeToTransactions: (role?: string, id?: string) => {
    if (!id && role !== 'admin') return () => {};
    let q: any;
    if (role === 'admin') {
      q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(500));
    } else if (role === 'merchant') {
      q = query(collection(db, 'transactions'), where('merchantId', '==', id), orderBy('createdAt', 'desc'), limit(150));
    } else {
      q = query(collection(db, 'transactions'), where('clientId', '==', id), orderBy('createdAt', 'desc'), limit(150));
    }
    
    return onSnapshot(q, (snap: any) => set({ transactions: snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)) }));
  },

  initializeAuth: () => {
    const unsubLocs = onSnapshot(doc(db, 'system', 'locations'), (docSnap: any) => set({ locations: docSnap.data()?.data || {} }));
    const unsubAuth = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        onSnapshot(doc(db, 'users', user.uid), (d: any) => {
          if (d.exists()) set({ currentUser: { ...d.data(), id: user.uid } as UserProfile, isLoading: false, isInitialized: true });
        });
      } else set({ currentUser: null, isLoading: false, isInitialized: true });
    });
    get().fetchTaxonomy();
    return () => { unsubAuth(); unsubLocs(); };
  },

  deleteUserWithHistory: async (userId: string, role: 'client' | 'merchant') => {
    try {
      const q = query(collection(db, 'transactions'), where(role === 'merchant' ? 'merchantId' : 'clientId', '==', userId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d: any) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
      toast.success("DADOS APAGADOS.");
    } catch (e) { toast.error("ERRO."); }
  }
}));