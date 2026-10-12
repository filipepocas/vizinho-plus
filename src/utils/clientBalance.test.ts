import { describe, expect, it } from 'vitest';
import { summarizeCashbackLedger, summarizeClientStoreBalancesFromTransactions } from './clientBalance';

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
});
