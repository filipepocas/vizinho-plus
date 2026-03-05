// src/types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'merchant' | 'client';
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cardNumber: string;
  totalCashback: number;
  availableCashback: number;
  createdAt: any;
}

export interface Merchant {
  id: string;
  shopName: string;
  email: string;
  nif: string;
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface Operator {
  id: string;
  merchantId: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  merchantId: string;
  merchantName?: string;
  amount: number;
  cashbackAmount: number;
  type: 'earn' | 'redeem';
  status: 'pending' | 'available' | 'cancelled';
  createdAt: any;
}