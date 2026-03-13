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
  zipCode?: string; 
  postalCode?: string; // Adicionado para total compatibilidade com os componentes
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
  postalCode?: string; // Adicionado para compatibilidade
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
  zipCode?: string; 
  postalCode?: string; // Adicionado para compatibilidade
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
  cashbackPercent?: number; // Garante que o Report de Excel e Dashboard funcionem
  documentNumber?: string;
  operatorId?: string; 
  operatorName?: string;
  operatorCode?: string;
  type: 'earn' | 'redeem' | 'cancel' | 'subtract'; // Adicionado 'cancel' e mantido 'subtract' para segurança
  status: 'pending' | 'available' | 'cancelled';
  createdAt: any;
  maturedAt?: any;
}

export interface StoreBalance {
  merchantId: string;
  merchantName: string;
  totalBalance: number;
  availableBalance: number;
}