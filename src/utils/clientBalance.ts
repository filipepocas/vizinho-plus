import { Transaction } from '../types';

export interface ClientStoreBalanceEntry {
  id: string;
  name: string;
  available: number;
}

export const calculateClientBalanceFromTransactions = (
  transactions: Transaction[] = [],
  clientId?: string
): number => {
  return transactions
    .filter((tx) => {
      if (!clientId || tx.clientId !== clientId) return false;
      if (tx.status === 'cancelled' || tx.status === 'rejected') return false;
      return tx.type === 'earn' || tx.type === 'redeem';
    })
    .reduce((sum, tx) => {
      const value = Number(tx.cashbackAmount || 0);
      return tx.type === 'earn' ? sum + value : sum - value;
    }, 0);
};

export const summarizeClientStoreBalancesFromTransactions = (
  transactions: Transaction[] = [],
  clientId?: string
): { total: number; entries: ClientStoreBalanceEntry[] } => {
  const balances = new Map<string, { name: string; available: number }>();

  transactions.forEach((tx) => {
    if (!clientId || tx.clientId !== clientId) return;
    if (tx.status === 'cancelled' || tx.status === 'rejected') return;
    if (tx.type !== 'earn' && tx.type !== 'redeem') return;

    const merchantId = tx.merchantId || 'unknown';
    const existing = balances.get(merchantId) || { name: tx.merchantName || 'Loja Parceira', available: 0 };
    const delta = tx.type === 'earn' ? Number(tx.cashbackAmount || 0) : -Number(tx.cashbackAmount || 0);

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
    total: entries.reduce((sum, entry) => sum + entry.available, 0),
    entries,
  };
};
