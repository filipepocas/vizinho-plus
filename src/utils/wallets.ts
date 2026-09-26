export interface StoreWalletSummaryEntry {
  id: string;
  name: string;
  available: number;
}

export interface StoreWalletSummary {
  total: number;
  entries: StoreWalletSummaryEntry[];
}

export const summarizeStoreWallets = (
  storeWallets?: Record<string, { available?: number; merchantName?: string }>
): StoreWalletSummary => {
  if (!storeWallets) {
    return { total: 0, entries: [] };
  }

  const entries = Object.entries(storeWallets)
    .map(([id, data]) => ({
      id,
      name: data?.merchantName || 'Loja Parceira',
      available: Number(data?.available || 0),
    }))
    .filter((entry) => entry.available > 0)
    .sort((a, b) => b.available - a.available);

  return {
    total: entries.reduce((sum, entry) => sum + entry.available, 0),
    entries,
  };
};
