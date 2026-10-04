import { Transaction } from '../types';

export interface ClientStoreBalanceEntry {
  id: string;
  name: string;
  available: number;
}

const getSafeTxCashback = (tx: any): number => {
  if (tx.cashbackAmount !== undefined && tx.cashbackAmount !== null && !isNaN(Number(tx.cashbackAmount))) {
    return Number(tx.cashbackAmount);
  }
  if (tx.cashbackEarned !== undefined && tx.cashbackEarned !== null && !isNaN(Number(tx.cashbackEarned))) {
    return Number(tx.cashbackEarned);
  }
  if (tx.type === 'redeem') {
    return Number(tx.amount || 0);
  }
  const invoice = Number(tx.invoiceAmount || tx.amount || 0);
  const percent = Number(tx.cashbackPercent || 0);
  return Number(((invoice * percent) / 100).toFixed(2));
};

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
      const value = getSafeTxCashback(tx);
      return tx.type === 'earn' ? sum + value : sum - value;
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
    if (tx.status === 'cancelled' || tx.status === 'rejected') return;
    if (tx.type !== 'earn' && tx.type !== 'redeem') return;

    const merchantId = tx.merchantId || 'unknown';
    const existing = balances.get(merchantId) || { name: tx.merchantName || 'Loja Parceira', available: 0 };
    const val = getSafeTxCashback(tx);
    const delta = tx.type === 'earn' ? val : -val;

    balances.set(merchantId, {
      name: existing.name,
      available: Number((existing.available + delta).toFixed(2)),
    });
  });

  // 2. Mesclar com storeWallets persistidas no documento do utilizador (fonte de verdade para históricos > 150 transações)
  if (storeWallets) {
    Object.entries(storeWallets).forEach(([merchantId, walletData]) => {
      const walletAvailable = Number(walletData?.available || 0);
      const existing = balances.get(merchantId);
      if (!existing || walletAvailable > existing.available) {
        balances.set(merchantId, {
          name: walletData?.merchantName || existing?.name || 'Loja Parceira',
          available: Number(walletAvailable.toFixed(2)),
        });
      }
    });
  }

  const entries = Array.from(balances.entries())
    .map(([id, data]) => ({ id, name: data.name, available: Math.max(0, data.available) }))
    .filter((entry) => entry.available > 0)
    .sort((a, b) => b.available - a.available);

  return {
    total: Number(entries.reduce((sum, entry) => sum + entry.available, 0).toFixed(2)),
    entries,
  };
};
