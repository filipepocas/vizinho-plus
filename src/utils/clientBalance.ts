import { Transaction } from '../types';

export interface ClientStoreBalanceEntry {
  id: string;
  name: string;
  available: number;
}

export interface CashbackLedgerSummary {
  emitted: number;
  redeemed: number;
  available: number;
}

export interface StoreMovementEntry {
  id: string;
  merchantId: string;
  merchantName: string;
  type: 'earn' | 'redeem';
  amount: number;
}

const getDateValue = (value: any): number => {
  if (!value) return 0;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate().getTime();
  if (value.seconds) return value.seconds * 1000;
  if (typeof value === 'string') return new Date(value).getTime();
  if (typeof value === 'number') return value;
  return 0;
};

const getIssuedCashback = (tx: Transaction): number => {
  if (tx.type === 'redeem') {
    const earnedValue = Number(tx.cashbackEarned ?? 0);
    if (earnedValue > 0) {
      return earnedValue;
    }

    const purchaseAmount = Number(tx.invoiceAmount || tx.amount || 0);
    const amountPaid = Math.max(0, purchaseAmount - getRedeemedCashback(tx));
    return Number(((amountPaid * Number(tx.cashbackPercent || 0)) / 100).toFixed(2));
  }

  if (tx.cashbackAmount !== undefined && tx.cashbackAmount !== null) {
    return Number(tx.cashbackAmount) || 0;
  }

  if (tx.cashbackPercent !== undefined && tx.cashbackPercent !== null) {
    const purchaseAmount = Number(tx.invoiceAmount || tx.amount || 0);
    return Number(((purchaseAmount * Number(tx.cashbackPercent || 0)) / 100).toFixed(2));
  }

  return 0;
};

const getRedeemedCashback = (tx: Transaction): number => {
  if (tx.type !== 'redeem') return 0;
  return Number(tx.cashbackAmount ?? tx.amount ?? 0) || 0;
};

const isIncludedInAvailableBalance = (tx: Transaction): boolean => {
  return tx.status === 'available';
};

export const summarizeCashbackLedger = (transactions: Transaction[] = []): CashbackLedgerSummary => {
  const totals = transactions.reduce((summary, tx) => {
    if (!isIncludedInAvailableBalance(tx)) return summary;
    if (tx.type !== 'earn' && tx.type !== 'redeem') return summary;

    summary.emitted += getIssuedCashback(tx);
    summary.redeemed += getRedeemedCashback(tx);
    return summary;
  }, { emitted: 0, redeemed: 0 });

  const emitted = Number(totals.emitted.toFixed(2));
  const redeemed = Number(totals.redeemed.toFixed(2));
  return { emitted, redeemed, available: Number((emitted - redeemed).toFixed(2)) };
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

export const getRecentStoreMovements = (
  transactions: Transaction[] = [],
  clientId?: string,
  storeId?: string,
  limit: number = 5
): StoreMovementEntry[] => {
  return transactions
    .filter((tx) => {
      if (!clientId || tx.clientId !== clientId) return false;
      if (!isIncludedInAvailableBalance(tx)) return false;
      if (tx.type !== 'earn' && tx.type !== 'redeem') return false;
      if (storeId && tx.merchantId !== storeId) return false;
      return true;
    })
    .map((tx) => ({
      id: tx.id,
      merchantId: tx.merchantId || 'unknown',
      merchantName: tx.merchantName || 'Loja Parceira',
      type: tx.type as 'earn' | 'redeem',
      amount: Number(tx.cashbackAmount ?? tx.cashbackEarned ?? 0) || 0,
      createdAt: tx.createdAt,
    }))
    .sort((a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt))
    .slice(0, limit)
    .map(({ createdAt, ...movement }) => movement);
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
    .map(([id, data]) => ({ id, name: data.name, available: Number(data.available.toFixed(2)) }))
    .filter((entry) => entry.available !== 0)
    .sort((a, b) => b.available - a.available);

  return {
    total: Number(Array.from(balances.values()).reduce((sum, entry) => sum + entry.available, 0).toFixed(2)),
    entries,
  };
};
