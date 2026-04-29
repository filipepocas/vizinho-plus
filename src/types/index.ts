// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'merchant' | 'client';
  nif?: string;
  phone?: string;
  zipCode?: string;
  status?: 'active' | 'disabled' | 'pending';
  createdAt?: any;
  customerNumber?: string;
  birthDate?: string;
  cashbackPercent?: number;
  shopName?: string;
  responsibleName?: string; 
  distrito?: string;
  concelho?: string;
  freguesia?: string; 
  category?: string;
  address?: string;
  latitude?: number; 
  longitude?: number;
  businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
  fcmTokens?: string[];
  notificationsEnabled?: boolean; 
  notificationsUpdatedAt?: any;
  lastTokenUpdate?: any; 
  storeWallets?: Record<string, { 
    available: number; 
    pending: number;
    merchantName?: string;
    lastUpdate?: any;
  }>;
  devices?: Array<{
    deviceId: string;
    token: string;
    lastLogin: number;
    userAgent: string;
    notificationsEnabled: boolean;
  }>;
  wallet?: { 
    available: number; 
    pending: number; 
  };
  websiteUrl?: string;
  publicEmail?: string;
  isLeaving?: boolean;
  leavingDate?: string;
}

export interface ProductTaxonomy {
  id?: string;
  categories: {
    [categoryName: string]: {
      families: {
        [familyName: string]: string[];
      }
    }
  };
  updatedAt: any;
}

export interface Product {
  id?: string;
  merchantId: string;
  shopName: string;
  distrito: string;
  concelho: string;
  freguesia: string;
  coords?: { lat: number; lng: number };
  description: string;
  imageUrl: string;
  price: number;
  category: string;
  family: string;
  productType: string;
  hasPromo: boolean;
  promoPrice?: number;
  promoStart?: any;
  promoEnd?: any;
  createdAt: any;
}

export interface Banner { id: string; title: string; imageUrl: string; targetType: 'all' | 'zip' | 'birthday' | 'zonas'; targetValue?: string; targetZones?: string[]; targetZipCodes?: string[]; maxImpressions?: number; startDate: any; endDate: any; createdAt: any; active: boolean; }
export interface Transaction { id: string; clientId: string; merchantId: string; merchantName: string; amount: number; invoiceAmount?: number; type: 'earn' | 'redeem' | 'cancel'; status: 'pending' | 'available' | 'rejected' | 'cancelled'; createdAt: any; clientName?: string; clientCardNumber?: string; clientNif?: string; cashbackAmount: number; cashbackEarned?: number; documentNumber?: string; clientBirthDate?: string; processedByBackend?: boolean; maturedAt?: any; rejectReason?: string; cancelledAt?: any; }
export interface TransactionCreate { clientId: string; merchantId: string; merchantName: string; amount: number; invoiceAmount?: number; type: 'earn' | 'redeem' | 'cancel'; documentNumber?: string; clientName?: string; clientCardNumber?: string; clientBirthDate?: string; discountUsed?: number; }
export interface MarketingRequest { id?: string; merchantId?: string; merchantName?: string; shopName?: string; type: 'banner' | 'leaflet' | 'push_notification'; status: 'pending' | 'approved' | 'rejected'; createdAt: any; title?: string; text?: string; imageUrl?: string; requestedDate?: string; leafletCampaignTitle?: string; leafletCampaignId?: string; spaceType?: string; description?: string; sellPrice?: string; unit?: string; promoPrice?: string; promoType?: string; targetType?: string; targetCriteria?: string; targetValue?: string; targetZones?: string[]; targetCount?: number; cost?: number; isExternal?: boolean; companyName?: string; contactName?: string; nif?: string; email?: string; phone?: string; serviceCompleted?: boolean; finalPrice?: number; billingSent?: boolean; billingSentDate?: string; paymentReceived?: boolean; paymentReceivedDate?: string; }
export interface Leaflet { id?: string; title: string; createdAt?: any; startDate?: any; endDate?: any; leafletUrl?: string; imageUrl?: string; isActive?: boolean; targetZipCodes?: string[]; targetZones?: string[]; limitDate?: any; distributionDate?: any; }
export type LeafletCampaign = Leaflet;
export interface MerchantRequest { id?: string; uid?: string; shopName: string; responsibleName: string; nif: string; email: string; phone: string; category: string; distrito?: string; concelho?: string; freguesia: string; zipCode: string; cashbackPercent: string | number; pass?: string; password?: string; status?: 'pending' | 'approved' | 'rejected'; createdAt?: any; }
export interface AppNotification { id?: string; title: string; message: string; targetType?: string; targetValue: string; targetZones?: string[]; createdAt?: any; sent?: boolean; type?: string; icon?: string; }
export interface SystemConfig { id?: string; globalServiceFee: number; maturationHours: number; minRedeemAmount: number; platformStatus: 'active' | 'maintenance'; supportEmail: string; vantagensUrl: string; merchantTerms?: string; clientFaqs?: string; merchantFaqs?: string; showMemberCount?: boolean; updatedAt?: any; appVersion?: string; lastChangeBy?: string; }
export interface Vantagem { id: string; title?: string; description: string; partnerName: string; category: string; imageBase64?: string; zipCode?: string; address?: string; websiteUrl?: string; isActive: boolean; imageUrl?: string; targetZones?: string[]; createdAt?: any; }
export interface Feedback { id: string; merchantId: string; merchantName?: string; transactionId?: string; userId: string; userName: string; rating: number; comment: string; recommend?: boolean | null; status?: 'new' | 'reviewed'; createdAt: any; }
export interface AppEvent { id?: string; entityName: string; contactName: string; phone: string; email: string; title: string; location: string; eventType: string; ticketPrice: string; description: string; startDate: any; endDate: any; startTime: string; imageUrl: string; status: 'pending' | 'approved'; targetZips?: string[]; targetZones?: string[]; createdAt: any; }
export interface AntiWasteItem { id?: string; merchantId: string; merchantName: string; address: string; productInfo: string; conditions: string; targetZip?: string; targetZones?: string[]; endTime: any; createdAt: any; }
export type LocationsMap = Record<string, Record<string, string[]>>;
export interface PricingRule { id?: string; tool: 'banner' | 'push' | 'leaflet'; chargeType: 'per_day' | 'per_client' | 'fixed'; zoneLevel: 'global' | 'distrito' | 'concelho' | 'freguesia'; zoneName: string; leafletId?: string; spaceType?: string; price: number; minPrice: number; createdAt?: any; }

export interface MunicipalityFAQ {
  id?: string;
  distrito: string;
  concelho: string;
  freguesia?: string;
  type: 'camara' | 'junta';
  question: string;
  answer: string;
  contacts?: string;
  links?: string;
  createdAt: any;
}