export type ScreenTab = 'home' | 'menu' | 'cart' | 'orders' | 'profile' | 'settings' | 'help';

export type CategoryId =
  | 'all'
  | 'soups'
  | 'salads'
  | 'veg-starters'
  | 'paneer-starters'
  | 'egg-starters'
  | 'chicken-starters'
  | 'fish-prawns-starters'
  | 'chicken-curries'
  | 'mutton-curries'
  | 'fish-prawns-curries'
  | 'veg-curries'
  | 'rice-veg'
  | 'rice-non-veg'
  | 'noodles'
  | 'chicken-biryani'
  | 'mutton-biryani'
  | 'fish-prawns-biryani'
  | 'tandoori-kebabs'
  | 'indian-breads'
  | 'beverages'
  | 'desserts';

export interface Category {
  id: CategoryId;
  label: string;
  iconName: string;
}

export interface MenuItem {
  id: string;
  code?: string | null;
  name: string;
  price: number;
  generalPrice?: number;
  officialPrice?: number;
  isVeg: boolean;
  category: CategoryId;
  subCategory?: string | null;
  image: string;
  rating?: number | null;
  portion?: string | null;
  description?: string | null;
  availableQuantity?: number | null;
  active?: boolean | null;
  isAvailable?: boolean | null;
  tags?: string[] | null;
  [key: string]: any;
}

export interface UserProfile {
  name: string;
  mobile: string;
  designation?: string;
  department?: string;
  id: string;
  officerId?: string;
  avatar?: string;
  email?: string;
  location?: string;
  isOfficial?: boolean;
  dob?: string;
  marriageDate?: string;
  importantDates?: string;
  childrenCount?: string;
  childrenDetails?: string;
  siblings?: string;
  dietaryPreferences?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  homeAddress?: string;
}

export interface RegisterPayload {
  name: string;
  email?: string;
  phone: string;
  pin: string;
  avatar?: string;
  designation?: string;
  location?: string;
  department?: string;
  isOfficial?: boolean;
  dob?: string;
  marriageDate?: string;
  importantDates?: string;
  childrenCount?: string;
  childrenDetails?: string;
  siblings?: string;
  dietaryPreferences?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  homeAddress?: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export type PaymentMethod = 'online' | 'cod';

export interface MealTiming {
  name: string;
  hours: string;
  icon: string;
  isActive?: boolean;
}

export interface BackendOrder {
  id: string;
  _id?: string;
  orderNumber: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  userAvatar?: string;
  items: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalAmount: number;
  subtotal: number;
  paymentMethod: string;
  paymentStatus?: 'UNPAID' | 'PAYMENT_PENDING' | 'PAID';
  orderNote?: string;
  mealSlot?: string;
  orderType?: 'INSTANT' | 'PRE_ORDER';
  isPreOrder?: boolean;
  slotId?: string;
  preOrderSlot?: string;
  pickupDate?: string;
  pickupTime?: string;
  kitchenStatus?: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  billNumber?: string;
  status: 'NEW' | 'ACCEPTED' | 'PENDING' | 'PRE_ORDERED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  tokenNumber?: number;
  createdAt: string;
  updatedAt?: string;
}

