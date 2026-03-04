// src/types/index.ts

export type UserRole = 'admin' | 'merchant' | 'client';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Client extends User {
  cardNumber: string;      // Os 10 dígitos aleatórios
  totalBalance: number;    // Saldo Total (inclui o que ainda não pode ser usado)
  availableBalance: number; // Saldo Disponível (após 48h)
  nif?: string;
  phone?: string;
}

export interface Merchant extends User {
  nif: string;
  shopName: string;
  address: string;
  postalCode: string;
}

export interface Operator {
  id: string;
  merchantId: string;
  name: string;
  pin: string; // O código de 5 dígitos
}

export interface Transaction {
  id: string;              // Texto e número livre (ex: VPLUS-123)
  clientId: string;
  merchantId: string;
  operatorId: string;
  amount: number;          // Valor da transação
  cashbackAmount: number;  // Valor de cashback gerado ou descontado
  type: 'earn' | 'redeem' | 'refund'; // Ganhar, Descontar ou Nota de Crédito
  status: 'pending' | 'available';     // Fica pending por 48h
  documentNumber?: string; // Número da fatura/nota de crédito
  createdAt: Date;
}