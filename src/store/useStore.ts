// src/store/useStore.ts
import { create } from 'zustand';
import { 
  Client, 
  Merchant, 
  Transaction, 
  User, 
  Operator 
} from '../types';

interface AppState {
  // Estado do Utilizador Atual
  currentUser: User | Client | Merchant | null;
  setCurrentUser: (user: User | Client | Merchant | null) => void;

  // Dados Globais (Simulados para a fase de construção, serão Firebase depois)
  clients: Client[];
  merchants: Merchant[];
  transactions: Transaction[];
  operators: Operator[];

  // Ações (Funções de Negócio)
  addTransaction: (transaction: Transaction) => void;
  updateBalances: (clientId: string) => void;
  getTransactionsByClient: (clientId: string) => Transaction[];
  getTransactionsByMerchant: (merchantId: string) => Transaction[];
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Inicializamos com listas vazias (como pediste, sem dados fictícios agora)
  clients: [],
  merchants: [],
  transactions: [],
  operators: [],

  addTransaction: (transaction) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));
    // Sempre que há uma transação, atualizamos os saldos do cliente
    get().updateBalances(transaction.clientId);
  },

  updateBalances: (clientId) => {
    const { transactions, clients } = get();
    const clientTransactions = transactions.filter(t => t.clientId === clientId);

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

    let total = 0;
    let available = 0;

    clientTransactions.forEach(t => {
      if (t.type === 'earn') {
        total += t.cashbackAmount;
        // Só fica disponível se tiver passado mais de 48 horas
        if (new Date(t.createdAt) <= fortyEightHoursAgo) {
          available += t.cashbackAmount;
        }
      } else if (t.type === 'redeem') {
        total -= t.cashbackAmount;
        available -= t.cashbackAmount;
      }
    });

    set((state) => ({
      clients: state.clients.map(c => 
        c.id === clientId 
          ? { ...c, totalBalance: total, availableBalance: available } 
          : c
      )
    }));
  },

  getTransactionsByClient: (clientId) => {
    return get().transactions.filter(t => t.clientId === clientId);
  },

  getTransactionsByMerchant: (merchantId) => {
    return get().transactions.filter(t => t.merchantId === merchantId);
  },
}));