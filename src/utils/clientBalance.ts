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
  if (tx.cashbackAmount !== undefined && tx.cashbackAmount !== null) {
    return Number(tx.cashbackAmount) || 0;
  }
  return Number(tx.amount || 0);
};

const isIncludedInAvailableBalance = (tx: Transaction): boolean => {
  return tx.status === 'available' || !tx.status;
};

export const getMaxRedeemableCashback = (availableBalance: number, invoiceAmount: number): number => {
  const availableCents = Math.max(0, Math.round((Number(availableBalance) || 0) * 100));
  const invoiceCents = Math.max(0, Math.round((Number(invoiceAmount) || 0) * 100));
  return Math.min(availableCents, Math.floor(invoiceCents / 2)) / 100;
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
  const movements: (StoreMovementEntry & { createdAtDate: number })[] = [];

  transactions.forEach((tx) => {
    if (!clientId || tx.clientId !== clientId) return;
    if (!isIncludedInAvailableBalance(tx)) return;
    if (tx.type !== 'earn' && tx.type !== 'redeem') return;
    if (storeId && tx.merchantId !== storeId) return;

    const txDate = getDateValue(tx.createdAt);
    const merchantId = tx.merchantId || 'unknown';
    const merchantName = tx.merchantName || 'Loja Parceira';

    if (tx.type === 'earn') {
      const amount = getIssuedCashback(tx);
      if (amount > 0) {
        movements.push({
          id: tx.id,
          merchantId,
          merchantName,
          type: 'earn',
          amount,
          createdAtDate: txDate,
        });
      }
    } else if (tx.type === 'redeem') {
      const redeemed = getRedeemedCashback(tx);
      if (redeemed > 0) {
        movements.push({
          id: tx.id,
          merchantId,
          merchantName,
          type: 'redeem',
          amount: redeemed,
          createdAtDate: txDate,
        });
      }

      const earned = getIssuedCashback(tx);
      if (earned > 0) {
        movements.push({
          id: `${tx.id}-earn`,
          merchantId,
          merchantName,
          type: 'earn',
          amount: earned,
          createdAtDate: txDate,
        });
      }
    }
  });

  return movements
    .sort((a, b) => b.createdAtDate - a.createdAtDate)
    .slice(0, limit)
    .map(({ createdAtDate, ...movement }) => movement);
};

export const summarizeClientStoreBalancesFromTransactions = (
  transactions: Transaction[] = [],
  clientId?: string,
  storeWallets?: Record<string, { available?: number; pending?: number; merchantName?: string }>
): { total: number; entries: ClientStoreBalanceEntry[] } => {
  const balances = new Map<string, { name: string; available: number }>();

  const clientCashbackTxs = transactions.filter((tx) => {
    if (!clientId || tx.clientId !== clientId) return false;
    return tx.type === 'earn' || tx.type === 'redeem';
  });
  const relevantTxs = clientCashbackTxs.filter(isIncludedInAvailableBalance);

  relevantTxs.forEach((tx) => {
    const merchantId = tx.merchantId || 'unknown';
    const existing = balances.get(merchantId) || { name: tx.merchantName || 'Loja Parceira', available: 0 };
    const delta = getIssuedCashback(tx) - getRedeemedCashback(tx);

    balances.set(merchantId, {
      name: existing.name,
      available: Number((existing.available + delta).toFixed(2)),
    });
  });

  if (storeWallets) {
    Object.entries(storeWallets).forEach(([merchantId, wallet]) => {
      if (clientCashbackTxs.some((tx) => (tx.merchantId || 'unknown') === merchantId)) return;
      const avail = Number(wallet?.available || 0);
      if (avail > 0) {
        balances.set(merchantId, {
          name: wallet?.merchantName || 'Loja Parceira',
          available: Number(avail.toFixed(2)),
        });
      }
    });
  }

  const entries = Array.from(balances.entries())
    .map(([id, data]) => ({ id, name: data.name, available: Math.max(0, Number(data.available.toFixed(2))) }))
    .sort((a, b) => b.available - a.available);

  return {
    total: Number(entries.reduce((sum, entry) => sum + entry.available, 0).toFixed(2)),
    entries,
  };
};
