// src/types/index.ts

export interface User {
  id: string; // Usamos id como base
  uid?: string; // Adicionado para compatibilidade com Firebase Auth se necessário
  email: string;
  role: 'admin' | 'merchant' | 'client' | 'user';
  name?: string;
  nif?: string;
  customerNumber?: string;
  phone?: string;
  cashbackPercent?: number;
  status?: 'active' | 'disabled' | 'pending';
  operators?: any[];
  wallet?: {
    available: number;
    pending: number;
  };
  // Campos de endereço uniformizados
  address?: string;
  category?: string;
  zipCode?: string; // Alterado de postalCode para zipCode para bater com o código dos componentes
  freguesia?: string;
  createdAt?: any;
}

export interface Client {
  id: string;
  cardNumber: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  zipCode: string;
  password?: string;
  createdAt: Date;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
}

export interface Merchant {
  id: string;
  shopName: string;
  email: string;
  nif: string;
  cashbackPercent: number;
  primaryColor: string;
  operators: Operator[];
  status: 'active' | 'inactive';
  createdAt: Date;
  address?: string;
  category?: string;
  zipCode?: string; // Uniformizado aqui também
  freguesia?: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  clientNif?: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackAmount: number;
  cashbackPercent?: number; // Adicionado para o Report de Excel não dar erro
  documentNumber?: string;
  operatorId?: string; 
  operatorName?: string;
  operatorCode?: string;
  type: 'earn' | 'redeem' | 'subtract';
  status: 'pending' | 'available';
  createdAt: any;
  maturedAt?: any;
}

export interface StoreBalance {
  merchantId: string;
  merchantName: string;
  totalBalance: number;
  availableBalance: number;
}