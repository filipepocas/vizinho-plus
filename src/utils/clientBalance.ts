import { Transaction } from '../types';

export interface ClientStoreBalanceEntry {
  id: string;
  name: string;
  available: number;
}

const getIssuedCashback = (tx: Transaction): number => {
  if (tx.type === 'redeem' && tx.cashbackEarned !== undefined && tx.cashbackEarned !== null) {
    return Number(tx.cashbackEarned) || 0;
  }

  if (tx.cashbackPercent !== undefined && tx.cashbackPercent !== null) {
    const purchaseAmount = Number(tx.invoiceAmount || tx.amount || 0);
    return Number(((purchaseAmount * Number(tx.cashbackPercent || 0)) / 100).toFixed(2));
  }

  return tx.type === 'earn' ? Number(tx.cashbackAmount || 0) : 0;
};

const getRedeemedCashback = (tx: Transaction): number => {
  return tx.type === 'redeem' ? Number(tx.cashbackAmount || tx.amount || 0) : 0;
};

const isIncludedInAvailableBalance = (tx: Transaction): boolean => {
  return tx.status === 'available' && tx.processedByBackend !== false;
};

export const calculateClientBalanceFromTransactions = (
  transactions: Transaction[] = [],
  clientId?: string
): number => {
  return transactions
    .filter((tx) => {
      if (!clientId || tx.clientId !== clientId) return false;
      if (!isIncludedInAvailableBalance(tx)) return false;
      return tx.type === 'earn' || tx.type === 'redeem';
    })
    .reduce((sum, tx) => {
      return sum + getIssuedCashback(tx) - getRedeemedCashback(tx);
    }, 0);
};

export const summarizeClientStoreBalancesFromTransactions = (
  transactions: Transaction[] = [],
  clientId?: string,
  storeWallets?: Record<string, { available?: number; pending?: number; merchantName?: string }>
): { total: number; entries: ClientStoreBalanceEntry[] } => {
  const balances = new Map<string, { name: string; available: number }>();

  // 1. Calcular a partir das transações carregadas
  transactions.forEach((tx) => {
    if (!clientId || tx.clientId !== clientId) return;
    if (!isIncludedInAvailableBalance(tx)) return;
    if (tx.type !== 'earn' && tx.type !== 'redeem') return;

    const merchantId = tx.merchantId || 'unknown';
    const existing = balances.get(merchantId) || { name: tx.merchantName || 'Loja Parceira', available: 0 };
    const delta = getIssuedCashback(tx) - getRedeemedCashback(tx);

    balances.set(merchantId, {
      name: existing.name,
      available: Number((existing.available + delta).toFixed(2)),
    });
  });

  const entries = Array.from(balances.entries())
    .map(([id, data]) => ({ id, name: data.name, available: Math.max(0, data.available) }))
    .filter((entry) => entry.available > 0)
    .sort((a, b) => b.available - a.available);

  return {
    total: Number(entries.reduce((sum, entry) => sum + entry.available, 0).toFixed(2)),
    entries,
  };
};
