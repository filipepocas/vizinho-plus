// src/store/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Client, 
  Merchant, 
  Transaction, 
  User, 
  Operator 
} from '../types';

interface AppState {
  currentUser: User | Client | Merchant | null;
  setCurrentUser: (user: User | Client | Merchant | null) => void;
  clients: Client[];
  merchants: Merchant[];
  transactions: Transaction[];
  operators: Operator[];
  addTransaction: (transaction: Transaction) => void;
  updateBalances: (clientId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      clients: [],
      merchants: [],
      transactions: [],
      operators: [],

      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }));
        get().updateBalances(transaction.clientId);
      },

      updateBalances: (clientId) => {
        const { transactions } = get();
        const clientTransactions = transactions.filter(t => t.clientId === clientId);
        const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000));

        let total = 0;
        let available = 0;

        clientTransactions.forEach(t => {
          const tDate = new Date(t.createdAt);
          if (t.type === 'earn') {
            total += t.cashbackAmount;
            if (tDate <= fortyEightHoursAgo) {
              available += t.cashbackAmount;
            }
          } else if (t.type === 'redeem') {
            total -= t.cashbackAmount;
            available -= t.cashbackAmount;
          }
        });

        // Nota: Como os clientes ainda não estão na lista 'clients', 
        // o dashboard do cliente calcula isto em tempo real a partir das transações.
      },
    }),
    {
      name: 'vplus-storage', // Nome da chave no navegador
      storage: createJSONStorage(() => localStorage),
    }
  )
);