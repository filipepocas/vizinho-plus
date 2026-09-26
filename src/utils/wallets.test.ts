import { summarizeStoreWallets } from './wallets';

describe('summarizeStoreWallets', () => {
  it('sums the available cashback by store and totals it', () => {
    const result = summarizeStoreWallets({
      lojaA: { available: 12.5, pending: 0, merchantName: 'Loja A' },
      lojaB: { available: 8.25, pending: 0, merchantName: 'Loja B' },
      lojaC: { available: 0, pending: 0, merchantName: 'Loja C' },
    });

    expect(result.total).toBe(20.75);
    expect(result.entries).toEqual([
      { id: 'lojaA', name: 'Loja A', available: 12.5 },
      { id: 'lojaB', name: 'Loja B', available: 8.25 },
    ]);
  });

  it('handles missing data with zero total', () => {
    expect(summarizeStoreWallets(undefined)).toEqual({
      total: 0,
      entries: [],
    });
  });
});
