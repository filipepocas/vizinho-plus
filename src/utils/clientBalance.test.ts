import { describe, expect, it } from 'vitest';
import { getMaxRedeemableCashback, getRecentStoreMovements, summarizeCashbackLedger, summarizeClientStoreBalancesFromTransactions } from './clientBalance';

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

  it('keeps a store with zero net balance so its recent history remains visible', () => {
    const transactions = [
      {
        id: 'tx-earn', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', status: 'available',
        cashbackAmount: 10, createdAt: { seconds: 10 },
      },
      {
        id: 'tx-redeem', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'redeem', status: 'available',
        cashbackAmount: 10, cashbackEarned: 0, cashbackPercent: 0, createdAt: { seconds: 20 },
      },
    ] as any;

    expect(summarizeClientStoreBalancesFromTransactions(transactions, 'client-1')).toEqual({
      total: 0,
      entries: [{ id: 'm1', name: 'Loja A', available: 0 }],
    });
    expect(getRecentStoreMovements(transactions, 'client-1', 'm1', 5)).toHaveLength(2);
  });

  it('combines transaction balances with wallet-only stores without overriding the ledger', () => {
    const transactions = [
      {
        id: 'tx-earn', clientId: 'client-1', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', status: 'available',
        cashbackAmount: 2,
      },
      {
        id: 'tx-cancelled', clientId: 'client-1', merchantId: 'm2', merchantName: 'Loja B', type: 'earn', status: 'cancelled',
        cashbackAmount: 12,
      },
    ] as any;

    expect(summarizeClientStoreBalancesFromTransactions(transactions, 'client-1', {
      m1: { available: 99, pending: 0, merchantName: 'Loja A' },
      m2: { available: 12, pending: 0, merchantName: 'Loja B' },
      m3: { available: 5, pending: 0, merchantName: 'Loja C' },
    })).toEqual({
      total: 7,
      entries: [
        { id: 'm3', name: 'Loja C', available: 5 },
        { id: 'm1', name: 'Loja A', available: 2 },
      ],
    });
  });

  it('caps redemption at the balance and rounds the 50% limit down to cents', () => {
    expect(getMaxRedeemableCashback(10, 20)).toBe(10);
    expect(getMaxRedeemableCashback(20, 20)).toBe(10);
    expect(getMaxRedeemableCashback(20, 1.01)).toBe(0.5);
    expect(getMaxRedeemableCashback(20, -1)).toBe(0);
  });

  it('includes both redeem and emit movements when a purchase has discount and cashback earned', () => {
    const transactions = [
      {
        id: 'tx-hybrid',
        clientId: 'client-1',
        merchantId: 'm1',
        merchantName: 'Loja A',
        type: 'redeem',
        status: 'available',
        amount: 50,
        invoiceAmount: 50,
        cashbackAmount: 10,
        cashbackEarned: 4,
        cashbackPercent: 10,
        createdAt: { seconds: 100 },
      },
    ] as any;

    expect(getRecentStoreMovements(transactions, 'client-1', 'm1', 5)).toEqual([
      { id: 'tx-hybrid', merchantId: 'm1', merchantName: 'Loja A', type: 'redeem', amount: 10 },
      { id: 'tx-hybrid-earn', merchantId: 'm1', merchantName: 'Loja A', type: 'earn', amount: 4 },
    ]);
  });
});
