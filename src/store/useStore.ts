// src/store/useStore.ts

import { create } from 'zustand';
import { 
  collection, onSnapshot, query, where, serverTimestamp, 
  doc, getDocs, writeBatch, limit, updateDoc, setDoc, arrayUnion, startAfter, getDoc
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
  lastVisibleProduct: any;
  hasMoreProducts: boolean;
  shoppingList: Product[];
  taxonomy: ProductTaxonomy | null;
  isLoading: boolean;
  isProductsLoading: boolean;
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
  
  fetchProducts: (filters?: any, isNextPage?: boolean) => Promise<void>;
  addToShoppingList: (product: Product) => void;
  removeFromShoppingList: (productId: string) => void;
  clearShoppingList: () => void;
  fetchTaxonomy: () => Promise<void>;
}

// Extrai data em ms de qualquer formato
const getProductDate = (p: Product): number => {
  if (!p.createdAt) return 0;
  if (p.createdAt.toDate && typeof p.createdAt.toDate === 'function') return p.createdAt.toDate().getTime();
  if (p.createdAt.seconds) return p.createdAt.seconds * 1000;
  if (typeof p.createdAt === 'string') return new Date(p.createdAt).getTime();
  if (typeof p.createdAt === 'number') return p.createdAt;
  return 0;
};

const getTransactionDate = (t: Transaction): number => {
  if (!t.createdAt) return 0;
  if (t.createdAt.toDate && typeof t.createdAt.toDate === 'function') return t.createdAt.toDate().getTime();
  if (t.createdAt.seconds) return t.createdAt.seconds * 1000;
  return 0;
};

export const useStore = create<StoreState>((set, get) => ({
  transactions: [],
  currentUser: null,
  locations: {},
  products: [],
  lastVisibleProduct: null,
  hasMoreProducts: true,
  shoppingList: JSON.parse(localStorage.getItem('vplus_shopping_list') || '[]'),
  taxonomy: null,
  isLoading: true,
  isProductsLoading: false,
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
      const cached = sessionStorage.getItem('vplus_taxonomy');
      const cacheTime = sessionStorage.getItem('vplus_taxonomy_time');
      const now = Date.now();
      
      if (cached && cacheTime && (now - Number(cacheTime)) < 3600000) {
        set({ taxonomy: JSON.parse(cached) });
        return;
      }

      const docSnap = await getDoc(doc(db, 'system', 'products_taxonomy'));
      if (docSnap.exists()) {
        const data = docSnap.data() as ProductTaxonomy;
        sessionStorage.setItem('vplus_taxonomy', JSON.stringify(data));
        sessionStorage.setItem('vplus_taxonomy_time', String(now));
        set({ taxonomy: data });
      }
    } catch(e) { 
      console.error(e); 
    }
  },

  fetchProducts: async (filters: any = {}, isNextPage: boolean = false) => {
    set({ isProductsLoading: true });
    const { products, lastVisibleProduct } = get();
    
    try {
      // Construir constraints dinamicamente
      const constraints: any[] = [];
      const canQueryConcelho = Array.isArray(filters.concelho) && filters.concelho.length > 0 && filters.concelho.length <= 10;
      const canQueryFreguesia = Array.isArray(filters.freguesia) && filters.freguesia.length > 0 && filters.freguesia.length <= 10;
      const useConcelhoQuery = canQueryConcelho;
      const useFreguesiaQuery = !useConcelhoQuery && canQueryFreguesia;

      // Otimização: Filtra direto no Firestore por campos exatos quando possível
      if (filters.distrito) {
        constraints.push(where('distrito', '==', filters.distrito));
      }
      if (useConcelhoQuery) {
        constraints.push(where('concelho', 'in', filters.concelho));
      } else if (useFreguesiaQuery) {
        constraints.push(where('freguesia', 'in', filters.freguesia));
      }
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }
      if (filters.family) {
        constraints.push(where('family', '==', filters.family));
      }
      if (filters.productType) {
        constraints.push(where('productType', '==', filters.productType));
      }
      
      constraints.push(limit(100));

      if (isNextPage && lastVisibleProduct) {
        constraints.push(startAfter(lastVisibleProduct));
      }

      // Construir query corretamente com todos os constraints
      const q = query(collection(db, 'products'), ...constraints);
      const snap = await getDocs(q);
      let fetchedProducts = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));

      // Ordenação robusta no cliente (evita necessidade de índices compostos complexos no Firestore)
      fetchedProducts.sort((a: Product, b: Product) => {
        const dateA = getProductDate(a);
        const dateB = getProductDate(b);
        if (dateA === 0 && dateB === 0) return 0;
        if (dateA === 0) return -1;
        if (dateB === 0) return 1;
        return dateB - dateA;
      });

      // Filtros geográficos e taxonomia adicionais no cliente
      const normalizeValue = (value: any) => {
        if (value === undefined || value === null) return '';
        return String(value).trim().toLowerCase();
      };

      const normalizedFilters = {
        concelho: (filters.concelho || []).map(normalizeValue).filter(Boolean),
        freguesia: (filters.freguesia || []).map(normalizeValue).filter(Boolean),
        category: normalizeValue(filters.category),
        family: normalizeValue(filters.family),
        productType: normalizeValue(filters.productType)
      };

      const hasAnyFilter = 
        normalizedFilters.concelho.length > 0 || 
        normalizedFilters.freguesia.length > 0 || 
        normalizedFilters.category !== '' || 
        normalizedFilters.family !== '' || 
        normalizedFilters.productType !== '';

      if (hasAnyFilter) {
        fetchedProducts = fetchedProducts.filter((p: Product) => {
          const productConcelho = normalizeValue(p.concelho);
          const productFreguesia = normalizeValue(p.freguesia);
          const productCategory = normalizeValue(p.category);
          const productFamily = normalizeValue(p.family);
          const productType = normalizeValue(p.productType);

          if (normalizedFilters.concelho.length > 0 && !normalizedFilters.concelho.includes(productConcelho)) return false;
          if (normalizedFilters.freguesia.length > 0 && !normalizedFilters.freguesia.includes(productFreguesia)) return false;
          if (normalizedFilters.category !== '' && productCategory !== normalizedFilters.category) return false;
          if (normalizedFilters.family !== '' && productFamily !== normalizedFilters.family) return false;
          if (normalizedFilters.productType !== '' && productType !== normalizedFilters.productType) return false;
          return true;
        });
      }

      set({
        products: isNextPage ? [...products, ...fetchedProducts] : fetchedProducts,
        lastVisibleProduct: snap.docs[snap.docs.length - 1],
        hasMoreProducts: snap.docs.length === 100,
        isProductsLoading: false
      });
    } catch(e) {
      console.error("Erro ao carregar produtos:", e);
      toast.error("Erro ao carregar produtos. Tente novamente.");
      set({ isProductsLoading: false });
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
        clientBirthDate: tx.clientBirthDate || "",
        cashbackPercent: currentUser.cashbackPercent || 0
      });
      toast.success("MOVIMENTO ENVIADO!");
      return newTxRef.id;
    } catch (e) {
      toast.error("ERRO NO REGISTO.");
    }
  },

  updateTransactionDocument: async (transactionId: string, documentNumber: string) => {
    try {
        const txRef = doc(db, 'transactions', transactionId);
        await updateDoc(txRef, { documentNumber: documentNumber.toUpperCase() });
        toast.success("Fatura associada!");
    } catch(e) {
      toast.error("Erro.");
    }
  },

  cancelTransaction: async (id: string) => {
    try {
      const txRef = doc(db, 'transactions', id);
      await updateDoc(txRef, { status: 'cancelled', cancelledAt: serverTimestamp() });
      toast.success("PEDIDO DE ANULAÇÃO ENVIADO.");
    } catch (e) {
      toast.error("ERRO.");
    }
  },

  subscribeToTransactions: (role?: string, id?: string) => {
    if (!id && role !== 'admin') return () => {};
    
    let q: any;
    if (role === 'admin') {
      q = query(collection(db, 'transactions'), limit(500));
    } else if (role === 'merchant') {
      q = query(collection(db, 'transactions'), where('merchantId', '==', id), limit(200));
    } else {
      q = query(collection(db, 'transactions'), where('clientId', '==', id), limit(150));
    }
    
    return onSnapshot(q, (snap: any) => {
      let docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction));
      
      docs.sort((a: Transaction, b: Transaction) => {
        return getTransactionDate(b) - getTransactionDate(a);
      });
      
      set({ transactions: docs });
    });
  },

  initializeAuth: () => {
    const cachedLocs = sessionStorage.getItem('vplus_locations');
    if (cachedLocs) {
      try { set({ locations: JSON.parse(cachedLocs) }); } catch(e) {}
    }

    const unsubLocs = onSnapshot(doc(db, 'system', 'locations'), (docSnap: any) => {
      const data = docSnap.data()?.data || {};
      sessionStorage.setItem('vplus_locations', JSON.stringify(data));
      set({ locations: data });
    });

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
      const q = query(
        collection(db, 'transactions'), 
        where(role === 'merchant' ? 'merchantId' : 'clientId', '==', userId),
        limit(500)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d: any) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
      toast.success("DADOS APAGADOS.");
    } catch (e) {
      toast.error("ERRO.");
    }
  }
}));