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
  freguesia?: string;
  category?: string;
  address?: string;
  storeWallets?: Record<string, { available: number; pending: number }>;
  // Nova propriedade adicionada para os equipamentos
  devices?: any[]; 
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
  cashbackAmount?: number;
  documentNumber?: string;
}

export interface MarketingRequest {
  id?: string;
  merchantId: string;
  merchantName: string;
  // Nova opção de notificação adicionada
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
  // Novos campos para a notificação Push
  targetCriteria?: string;
  targetValue?: string;
  targetCount?: number;
  cost?: number;
}

export interface LeafletCampaign {
  id?: string;
  title: string;
  limitDate: any;
  distributionDate: any;
  createdAt?: any;
}