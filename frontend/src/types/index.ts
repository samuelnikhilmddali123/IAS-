export type ScreenTab = 'home' | 'menu' | 'cart' | 'orders' | 'profile' | 'settings' | 'help';

export type CategoryId =
  | 'all'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snacks'
  | 'beverages'
  | 'healthy'
  | 'south-indian'
  | 'north-indian';

export interface Category {
  id: CategoryId;
  label: string;
  iconName: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  category: CategoryId;
  subCategory?: string;
  image: string;
  rating?: number;
  portion?: string;
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
  pickupDate?: string;
  pickupTime?: string;
  kitchenStatus?: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  billNumber?: string;
  status: 'NEW' | 'ACCEPTED' | 'PENDING' | 'PRE_ORDERED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  tokenNumber?: number;
  createdAt: string;
}

