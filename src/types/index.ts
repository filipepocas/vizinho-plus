// src/types/index.ts

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'merchant' | 'client';
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  totalBalance: number;
  availableBalance: number;
}

export interface Merchant {
  id: string;
  shopName: string;
  email: string;
  nif?: string;
  logoUrl?: string;
  primaryColor?: string; // NOVA MOLÉCULA: Ex: "#1C305C"
  createdAt: Date;
  status: 'active' | 'inactive';
}

export interface Transaction {
  id: string;
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackAmount: number;
  type: 'earn' | 'redeem';
  status: 'pending' | 'available';
  createdAt: Date;
}