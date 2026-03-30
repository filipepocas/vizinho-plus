import { create } from 'zustand';
import { 
  collection, onSnapshot, query, orderBy, where, serverTimestamp, 
  setDoc, doc, getDocs, writeBatch, updateDoc, limit, increment, getDoc 
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
    toast.success("EMAIL DE RECUPERAÇÃO ENVIADO!");
  },

  checkNifExists: async (nif: string) => {
    const q = query(collection(db, 'users'), where('nif', '==', nif), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  },

  addTransaction: async (tx) => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    try {
      const amount = Number(tx.amount);
      // Arredondar a 2 casas decimais para evitar bugs de matemática do JavaScript
      const cashback = tx.type === 'earn' ? Math.round((amount * (currentUser.cashbackPercent || 0) / 100) * 100) / 100 : amount;
      
      const batch = writeBatch(db);
      const newTxRef = doc(collection(db, 'transactions'));
      
      // 1. Guardar a Transação
      batch.set(newTxRef, {
        clientId: tx.clientId,
        merchantId: currentUser.id,
        merchantName: currentUser.shopName || currentUser.name,
        amount,
        cashbackAmount: cashback,
        cashbackPercent: currentUser.cashbackPercent || 0,
        type: tx.type,
        status: tx.type === 'earn' ? 'pending' : 'available',
        createdAt: serverTimestamp(),
        clientNif: tx.documentNumber // Guardar o NIF na TX para pesquisa fácil
      });

      // 2. Atualizar o Saldo do Cliente em tempo real
      const userRef = doc(db, 'users', tx.clientId);
      if (tx.type === 'earn') {
        // Se ganhou cashback, vai para o PENDENTE
        batch.update(userRef, {
          [`wallet.pending`]: increment(cashback),
          [`storeWallets.${currentUser.id}.pending`]: increment(cashback),
          [`storeWallets.${currentUser.id}.merchantName`]: currentUser.shopName || currentUser.name
        });
      } else if (tx.type === 'redeem') {
        // Se descontou saldo, retira do DISPONÍVEL
        batch.update(userRef, {
          [`wallet.available`]: increment(-amount),
          [`storeWallets.${currentUser.id}.available`]: increment(-amount)
        });
      }

      await batch.commit();
      toast.success("MOVIMENTO REGISTADO COM SUCESSO!");
    } catch (e) { 
      console.error(e);
      toast.error("ERRO NO REGISTO. VERIFICA A LIGAÇÃO."); 
    }
  },

  cancelTransaction: async (id) => {
    try {
      const txRef = doc(db, 'transactions', id);
      const txSnap = await getDoc(txRef);
      
      if (!txSnap.exists()) throw new Error("Transação não encontrada");
      
      const txData = txSnap.data();
      if (txData.status === 'cancelled') return;

      const batch = writeBatch(db);
      
      // 1. Mudar estado da transação para cancelada
      batch.update(txRef, { status: 'cancelled', cancelledAt: serverTimestamp() });

      // 2. Reverter os saldos na carteira do cliente
      const userRef = doc(db, 'users', txData.clientId);
      if (txData.type === 'earn') {
        // Retira o que tinha sido dado (verifica se estava pendente ou já maturado)
        const balanceType = txData.status === 'pending' ? 'pending' : 'available';
        batch.update(userRef, {
          [`wallet.${balanceType}`]: increment(-txData.cashbackAmount),
          [`storeWallets.${txData.merchantId}.${balanceType}`]: increment(-txData.cashbackAmount)
        });
      } else if (txData.type === 'redeem') {
        // Devolve o saldo que o cliente tinha tentado gastar
        batch.update(userRef, {
          [`wallet.available`]: increment(txData.amount),
          [`storeWallets.${txData.merchantId}.available`]: increment(txData.amount)
        });
      }

      await batch.commit();
      toast.success("COMPRA ANULADA E SALDOS REVERTIDOS.");
    } catch (e) {
      console.error(e);
      toast.error("ERRO AO ANULAR A TRANSAÇÃO.");
    }
  },

  subscribeToTransactions: (role, id) => {
    if (!id && role !== 'admin') return () => {};
    const q = role === 'admin' 
      ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100))
      : query(collection(db, 'transactions'), where(role === 'merchant' ? 'merchantId' : 'clientId', '==', id), orderBy('createdAt', 'desc'), limit(100));
    
    return onSnapshot(q, (snap) => {
      set({ transactions: snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)) });
    });
  },

  initializeAuth: () => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        onSnapshot(doc(db, 'users', user.uid), (d) => {
          if (d.exists()) set({ currentUser: { ...d.data(), id: user.uid } as UserProfile, isLoading: false, isInitialized: true });
        });
      } else { 
        set({ currentUser: null, isLoading: false, isInitialized: true }); 
      }
    });
  },

  deleteUserWithHistory: async (userId, role) => {
    try {
      const field = role === 'merchant' ? 'merchantId' : 'clientId';
      const q = query(collection(db, 'transactions'), where(field, '==', userId));
      const snap = await getDocs(q);

      // Limite do Firebase Batch é 500. Vamos dividir em lotes de 490 por segurança.
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      snap.docs.forEach((docSnap) => {
        currentBatch.delete(docSnap.ref);
        count++;
        if (count === 490) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });

      // Apagar também o perfil do utilizador na base de dados
      currentBatch.delete(doc(db, 'users', userId));
      batches.push(currentBatch.commit());

      await Promise.all(batches); // Executa todos os blocos de forma assíncrona
      toast.success("DADOS E HISTÓRICO ELIMINADOS PERMANENTEMENTE.");
    } catch (e) {
      console.error(e);
      toast.error("ERRO AO ELIMINAR CONTA.");
      throw e;
    }
  }
}));