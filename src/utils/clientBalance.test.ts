import { describe, expect, it } from 'vitest';
import { getRecentStoreMovements, summarizeCashbackLedger, summarizeClientStoreBalancesFromTransactions } from './clientBalance';

describe('cashback balance rules', () => {
  it('counts available cashback even when backend processing flag is false', () => {
    const transactions = [
      {
        id: 'tx-earn',
        clientId: 'client-1',
        merchantId: 'merchant-1',
        merchantName: 'Loja A',
        amount: 100,
        invoiceAmount: 100,
        type: 'earn',
        status: 'available',
        cashbackAmount: 10,
        cashbackEarned: 10,
        cashbackPercent: 10,
        processedByBackend: false,
      },
      {
        id: 'tx-redeem',
        clientId: 'client-1',
        merchantId: 'merchant-1',
        merchantName: 'Loja A',
        amount: 80,
        invoiceAmount: 80,
        type: 'redeem',
        status: 'available',
        cashbackAmount: 8,
        cashbackEarned: 0,
        cashbackPercent: 10,
        processedByBackend: false,
      },
    ] as any;

    expect(summarizeCashbackLedger(transactions)).toEqual({
      emitted: 17.2,
      redeemed: 8,
      available: 9.2,
    });

    expect(summarizeClientStoreBalancesFromTransactions(transactions, 'client-1')).toEqual({
      total: 9.2,
      entries: [{ id: 'merchant-1', name: 'Loja A', available: 9.2 }],
    });
  });

  it('returns the last 5 movements per store for client history', () => {
    const transactions = [
      {
        id: 'tx-1', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', status: 'available',
        cashbackAmount: 10, cashbackEarned: 10, createdAt: { seconds: 10 },
      },
      {
        id: 'tx-2', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'redeem', status: 'available',
        cashbackAmount: 3, cashbackEarned: 0, createdAt: { seconds: 20 },
      },
      {
        id: 'tx-3', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', status: 'available',
        cashbackAmount: 7, cashbackEarned: 7, createdAt: { seconds: 30 },
      },
      {
        id: 'tx-4', clientId: 'client-1', merchantId: 'm2', merchantName: 'Loja B', type: 'earn', status: 'available',
        cashbackAmount: 5, cashbackEarned: 5, createdAt: { seconds: 40 },
      },
      {
        id: 'tx-5', clientId: 'client-1', merchantId: 'm2', merchantName: 'Loja B', type: 'redeem', status: 'available',
        cashbackAmount: 2, cashbackEarned: 0, createdAt: { seconds: 50 },
      },
      {
        id: 'tx-6', clientId: 'client-1', merchantId: 'm2', merchantName: 'Loja B', type: 'earn', status: 'available',
        cashbackAmount: 8, cashbackEarned: 8, createdAt: { seconds: 60 },
      },
    ] as any;

    expect(getRecentStoreMovements(transactions, 'client-1', 'm1', 5)).toEqual([
      { id: 'tx-3', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', amount: 7 },
      { id: 'tx-2', merchantId: 'm1', merchantName: 'Loja A', type: 'redeem', amount: 3 },
      { id: 'tx-1', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', amount: 10 },
    ]);
  });
});
