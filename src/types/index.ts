// src/types/index.ts

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export type UserRole = 'admin' | 'merchant' | 'client' | 'user';
export type UserStatus = 'active' | 'disabled' | 'pending';
export type TransactionType = 'earn' | 'redeem' | 'cancel' | 'subtract';
export type TransactionStatus = 'pending' | 'available' | 'cancelled' | 'rejected';

export interface Feedback {
  id: string;
  transactionId: string;
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  recommend: boolean | null;
  status: 'new' | 'reviewed';
  createdAt: FirestoreTimestamp;
}

export interface SystemConfig {
  globalServiceFee: number;
  maturationHours: number;
  minRedeemAmount: number;
  platformStatus: 'active' | 'maintenance';
  supportEmail: string;
  vantagensUrl: string;
  updatedAt?: FirestoreTimestamp;
  lastChangeBy?: string;
  auditRef?: string;
}

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

export interface User {
  id: string;
  uid?: string;
  email: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  status: UserStatus;
  name?: string;
  responsibleName?: string; 
  nif?: string;
  phone?: string; 
  customerNumber?: string;
  birthDate?: string; // NOVO
  wallet?: {
    available: number;
    pending: number;
  };
  storeWallets?: { 
    [merchantId: string]: WalletData 
  };
  shopName?: string;
  cashbackPercent?: number;
  pendingCashbackPercent?: number;
  pendingCashbackEffectiveAt?: FirestoreTimestamp;
  primaryColor?: string;
  category?: string;
  operators?: Operator[];
  address?: string;
  zipCode?: string; 
  freguesia?: string;
  createdAt: FirestoreTimestamp;
}

export interface TransactionCore {
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  type: TransactionType;
  documentNumber?: string;
}

export interface TransactionCreate extends TransactionCore {
  cashbackAmount?: number;
  cashbackPercent?: number;
  clientName?: string; // NOVO
  clientCardNumber?: string; // NOVO
  clientBirthDate?: string; // NOVO
}

export interface Transaction extends TransactionCore {
  id: string;
  cashbackAmount: number;
  cashbackPercent: number;
  status: TransactionStatus;
  createdAt: FirestoreTimestamp;
  maturedAt?: FirestoreTimestamp;
  clientNif?: string;
  clientName?: string; // NOVO
  clientCardNumber?: string; // NOVO
  clientBirthDate?: string; // NOVO
}

export interface MerchantRequest {
  id?: string;
  shopName: string;
  responsibleName: string;
  email: string;
  phone: string;
  nif: string;
  category: string;
  cashbackPercent?: string | number;
  freguesia: string;
  zipCode: string;
  password?: string; 
  createdAt: any;
}

export interface Leaflet {
  id?: string;
  title: string;
  leafletUrl: string;
  startDate: FirestoreTimestamp;
  endDate: FirestoreTimestamp;
  isActive: boolean;
  targetZipCodes?: string[];
  createdAt: FirestoreTimestamp;
}

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  targetType: 'all' | 'email' | 'zipCode' | 'birthDate';
  targetValue: string;
  createdAt: FirestoreTimestamp;
}