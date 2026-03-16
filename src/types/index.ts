// src/types/index.ts

/**
 * Interface para representar o Timestamp do Firebase de forma tipada
 * Evita o uso de 'any' em campos de data (Ponto 13 da Auditoria).
 */
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export type UserRole = 'admin' | 'merchant' | 'client' | 'user';
export type UserStatus = 'active' | 'disabled' | 'pending';
export type TransactionType = 'earn' | 'redeem' | 'cancel' | 'subtract';
export type TransactionStatus = 'pending' | 'available' | 'cancelled' | 'rejected';

export interface WalletData {
  merchantName: string;
  available: number;
  pending: number;
  lastUpdate?: FirestoreTimestamp;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
}

/**
 * Interface Principal de Utilizador (User)
 * Unifica Client e Merchant para evitar redundância.
 * Resolve definitivamente o conflito de zipCode vs postalCode.
 */
export interface User {
  id: string;
  uid?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name?: string;
  nif?: string;
  phone?: string;
  
  // Campos específicos de Cliente
  customerNumber?: string;
  // Carteira global (usada no AdminUsers e Dashboards)
  wallet?: {
    available: number;
    pending: number;
  };
  // Carteiras por loja
  storeWallets?: { 
    [merchantId: string]: WalletData 
  };

  // Campos específicos de Lojista (Merchant)
  shopName?: string;
  cashbackPercent?: number;
  primaryColor?: string;
  category?: string;
  operators?: Operator[];

  // Endereço Uniformizado (zipCode para manter compatibilidade com Firebase/UI)
  address?: string;
  zipCode?: string; 
  freguesia?: string;
  
  createdAt: FirestoreTimestamp;
}

/**
 * Interface de Transação
 * Blindada contra 'any' e com tipos restritos (Pontos 13 e 15).
 */
export interface Transaction {
  id: string;
  clientId: string;
  clientNif?: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackAmount: number;
  cashbackPercent: number;
  documentNumber?: string;
  operatorId?: string; 
  operatorName?: string;
  operatorCode?: string;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: FirestoreTimestamp;
  maturedAt?: FirestoreTimestamp;
}

/**
 * Interfaces Auxiliares para Dashboards
 */
export interface StoreBalance {
  merchantId: string;
  merchantName: string;
  totalBalance: number;
  availableBalance: number;
}

/**
 * Interfaces de compatibilidade (Helpers)
 * Estendem a interface User para manter a tipagem forte em componentes específicos.
 */
export interface Client extends User {
  role: 'client';
}

export interface Merchant extends User {
  role: 'merchant';
}