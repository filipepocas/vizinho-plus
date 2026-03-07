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

export interface Operator {
  id: string;
  name: string;
  merchantId: string;
}