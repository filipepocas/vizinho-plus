// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'merchant' | 'client';
  nif?: string;
  phone?: string;
  zipCode?: string;
  status?: string;
  createdAt?: any;
  customerNumber?: string;
  birthDate?: string;
  cashbackPercent?: number;
  shopName?: string;
  responsibleName?: string;
  freguesia?: string;
  category?: string;
  address?: string;
  city?: string; // Adicionado para corrigir erro no UserExplore.tsx
  fcmTokens?: string[]; // Adicionado para corrigir erro no MerchantDashboard.tsx
  storeWallets?: Record<string, { available: number; pending: number }>;
  devices?: any[];
  wallet?: {
    available: number;
    pending: number;
  };
}

export interface Transaction {
  id: string;
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  type: 'earn' | 'redeem' | 'cancel';
  status: string;
  createdAt: any;
  clientName?: string;
  clientCardNumber?: string;
  clientNif?: string;
  cashbackAmount: number; 
  documentNumber?: string;
  clientBirthDate?: string;
}

export interface TransactionCreate {
  clientId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  type: 'earn' | 'redeem' | 'cancel';
  documentNumber?: string;
  clientName?: string;
  clientCardNumber?: string;
  clientBirthDate?: string;
}

export interface MarketingRequest {
  id?: string;
  merchantId: string;
  merchantName: string;
  shopName?: string;
  type: 'banner' | 'leaflet' | 'push_notification'; 
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  text?: string;
  imageUrl?: string;
  requestedDate?: string;
  leafletCampaignTitle?: string;
  spaceType?: string;
  description?: string;
  sellPrice?: string;
  unit?: string;
  promoPrice?: string;
  promoType?: string;
  targetCriteria?: string;
  targetValue?: string;
  targetCount?: number;
  cost?: number;
}

export interface Leaflet {
  id?: string;
  title: string;
  createdAt?: any;
  startDate?: any;
  endDate?: any;
  leafletUrl?: string;
  isActive?: boolean;
  targetZipCodes?: string[];
  limitDate?: any;
  distributionDate?: any;
}

export type LeafletCampaign = Leaflet;

export interface MerchantRequest {
  id?: string;
  shopName: string;
  responsibleName: string;
  nif: string;
  email: string;
  phone: string;
  category: string;
  freguesia: string;
  zipCode: string;
  cashbackPercent: string | number;
  pass?: string;
  password?: string;
  status?: string;
  createdAt?: any;
}

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  targetType?: string;
  targetValue: string; 
  createdAt?: any;
  sent?: boolean;
  type?: string;
  icon?: string;
}

export interface SystemConfig {
  id?: string;
  globalServiceFee: number;
  maturationHours: number;
  minRedeemAmount: number;
  platformStatus: string;
  supportEmail: string;
  vantagensUrl: string;
  updatedAt?: any;
  appVersion?: string;
}

// INTERFACE VANTAGEM TOTALMENTE CORRIGIDA
export interface Vantagem {
  id: string;
  title: string;
  description: string;
  partnerName: string;
  category: string;
  imageBase64?: string;
  zipCode?: string;
  address?: string;
  websiteUrl?: string;
  isActive: boolean;
  imageUrl?: string;
  createdAt?: any;
}

export interface Feedback {
  id: string;
  merchantId: string;
  clientId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}