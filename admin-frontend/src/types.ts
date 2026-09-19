export interface FoodItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  price: number;
  availableQuantity?: number;
  portion?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  image?: string;
}

export interface OrderItem {
  id?: string;
  name?: string;
  quantity: number;
  price?: number;
  item?: {
    name: string;
    price: number;
  };
}

export interface Order {
  id?: string;
  orderNumber: string;
  userAvatar?: string;
  userName?: string;
  userPhone?: string;
  items: OrderItem[];
  mealSlot?: string;
  paymentMethod?: string;
  totalAmount: number;
  status: string;
  createdAt: string | number;
  orderNote?: string;
}

export interface Officer {
  id: string;
  avatar?: string;
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  department?: string;
  createdAt?: string | number;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  totalOfficersCount: number;
}

export interface WhatsAppConfig {
  adminWhatsAppNumber?: string;
  provider?: string;
  connectionStatus?: string;
  lastTestedAt?: string;
  meta?: {
    phoneNumberId?: string;
    accessToken?: string;
  };
  twilio?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  };
}

export interface WhatsAppOutboxMessage {
  id?: string;
  qrId?: string;
  from?: string;
  to: string;
  userName?: string;
  qrImage?: string;
  qrDataUrl?: string;
  qrPayload?: string;
  timestamp: string | number;
  expiresAt?: string | number;
}

export interface WhatsAppTokenRecord {
  id: string;
  used?: boolean;
  expiresAt?: string;
}

export interface WhatsAppWebStatus {
  isConnected: boolean;
  status?: string;
  pairingQr?: string;
  adminWhatsAppNumber?: string;
}
