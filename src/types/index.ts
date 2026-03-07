// src/types/index.ts

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'merchant' | 'client';
}

export interface Client {
  id: string;
  cardNumber: string; // O ID de 9 dígitos
  name: string;
  nif: string; // Único
  email: string;
  phone: string;
  zipCode: string;
  password?: string; // Para o login do cliente
  createdAt: Date;
}

export interface Operator {
  id: string;
  name: string;
  code: string; // Código de 5 dígitos para validar operações
}

export interface Merchant {
  id: string;
  shopName: string;
  email: string;
  nif: string;
  cashbackPercent: number; // Cada lojista define o seu (ex: 10, 5, 15)
  primaryColor: string;
  operators: Operator[]; // Lista de funcionários da loja
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface Transaction {
  id: string;
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number; // Valor da venda
  cashbackAmount: number; // Valor do cashback gerado
  docNumber?: string; // Número da Fatura ou Nota de Crédito
  operatorId?: string; // Quem fez a picação
  operatorName?: string;
  type: 'earn' | 'redeem' | 'subtract'; // Ganhar, Descontar ou Nota de Crédito
  status: 'pending' | 'available'; // Regra das 48h
  createdAt: Date;
}

// Interface para o saldo por loja (Checklist Página 1)
export interface StoreBalance {
  merchantId: string;
  merchantName: string;
  totalBalance: number;
  availableBalance: number;
}