import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Platform, NativeModules } from 'react-native';
import { ScreenTab, CategoryId, MenuItem, CartItem, PaymentMethod, BackendOrder } from '../types';

export const getCandidateHosts = (): string[] => {
  const hosts: string[] = [];

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      hosts.push(window.location.hostname);
    }
  }

  // React Native NativeModules.SourceCode
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      hosts.push(match[1]);
    }
  } catch {}

  // Developer machine's LAN IP (vital for physical mobile devices on same Wi-Fi/Ethernet)
  hosts.push('10.241.83.177');

  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }

  hosts.push('localhost', '127.0.0.1');

  return Array.from(new Set(hosts.filter(Boolean)));
};

let cachedWorkingBase = '';

export const getApiBase = (): string => {
  if (cachedWorkingBase) return cachedWorkingBase;
  const candidates = getCandidateHosts();
  return `http://${candidates[0]}:5001`;
};

export const fetchWithFallback = async (
  endpointPath: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> => {
  const candidates = getCandidateHosts().map((h) => `http://${h}:5001`);
  const ordered = cachedWorkingBase
    ? [cachedWorkingBase, ...candidates.filter((c) => c !== cachedWorkingBase)]
    : candidates;

  let lastError: any = null;

  for (const base of ordered) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${base}${endpointPath}`;

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(tid);

      // Successfully reached a listening server (any HTTP status code returned)
      cachedWorkingBase = base;
      return res;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Cannot connect to backend server on any candidate URL');
};

console.log('[API CONFIG] Initial Candidate API URLs:', getCandidateHosts().map((h) => `http://${h}:5001`));

export interface UserProfile {
  name: string;
  mobile: string;
  designation: string;
  department: string;
  id: string;
  avatar?: string;
  email?: string;
}

export interface RegisterPayload {
  name: string;
  email?: string;
  phone: string;
  pin: string;
  avatar?: string;
  designation?: string;
  department?: string;
}

interface CanteenContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  userProfile: UserProfile;
  login: (mobile?: string, pin?: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  qrLogin: (qrPayload: string) => Promise<{ success: boolean; message?: string }>;
  lastDispatchedQr: { qrImage?: string; qrPayload?: string; fromWhatsApp?: string } | null;
  logout: () => void;
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
  activeCategory: CategoryId;
  setActiveCategory: (cat: CategoryId) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
  totalCartItems: number;
  cartSubtotal: number;
  orderNote: string;
  setOrderNote: (note: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  orderStep: 1 | 2 | 3;
  setOrderStep: (step: 1 | 2 | 3) => void;
  placeOrder: () => Promise<BackendOrder | null>;
  isOrderSuccessModalOpen: boolean;
  setIsOrderSuccessModalOpen: (open: boolean) => void;
  menuItems: MenuItem[];
  isMenuLoading: boolean;
  menuError: string | null;
  fetchMenu: () => Promise<void>;
  orderHistory: BackendOrder[];
  isOrderHistoryLoading: boolean;
  fetchOrderHistory: () => Promise<void>;
  lastPlacedOrder: BackendOrder | null;
}

const CanteenContext = createContext<CanteenContextType | undefined>(undefined);

export const CanteenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    mobile: '',
    designation: '',
    department: '',
    id: '',
    avatar: '',
    email: '',
  });

  const [activeTab, setActiveTab] = useState<ScreenTab>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart starts empty on launch
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [orderStep, setOrderStep] = useState<1 | 2 | 3>(1);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState<boolean>(false);

  // Dynamic Menu from Backend (NO hardcoded fallback)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState<boolean>(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Order History from Backend
  const [orderHistory, setOrderHistory] = useState<BackendOrder[]>([]);
  const [isOrderHistoryLoading, setIsOrderHistoryLoading] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<BackendOrder | null>(null);
  const [lastDispatchedQr, setLastDispatchedQr] = useState<{ qrImage?: string; qrPayload?: string; fromWhatsApp?: string } | null>(null);

  // Fetch Menu from Backend
  const fetchMenu = useCallback(async () => {
    setIsMenuLoading(true);
    setMenuError(null);
    try {
      const res = await fetchWithFallback('/api/foods', {
        headers: { Accept: 'application/json' },
      }, 5000);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.food)) {
          const mapped: MenuItem[] = data.food.map((f: any) => ({
            id: f.id || String(f._id),
            name: f.name,
            price: Number(f.price),
            isVeg: Boolean(f.isVeg),
            category: (f.category || 'lunch').toLowerCase() as CategoryId,
            subCategory: f.subCategory || '',
            image: f.image || 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
            rating: f.rating || 4.8,
            portion: f.portion || 'Standard Portion',
          }));
          setMenuItems(mapped);
          setMenuError(null);
          return;
        }
      }
      setMenuItems([]);
      setMenuError('Unable to load menu: Backend returned an error response.');
    } catch (err: any) {
      console.error('[MENU] Backend menu fetch failed:', err?.message || err);
      setMenuItems([]);
      setMenuError('Unable to load menu: Cannot connect to backend server. Please verify the backend is running.');
    } finally {
      setIsMenuLoading(false);
    }
  }, []);

  // Fetch Order History from Backend
  const fetchOrderHistory = useCallback(async () => {
    if (!userProfile.mobile) return;
    setIsOrderHistoryLoading(true);
    try {
      const phoneClean = userProfile.mobile.replace(/\D/g, '');
      const url = `/api/orders?phone=${encodeURIComponent(phoneClean)}`;
      const res = await fetchWithFallback(url, { headers: { Accept: 'application/json' } }, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrderHistory(data.orders);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsOrderHistoryLoading(false);
    }
  }, [userProfile.mobile]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrderHistory();
    }
  }, [isAuthenticated, fetchOrderHistory]);

  // Login Handler (strictly authenticates with Backend API)
  const login = async (
    mobile?: string,
    pin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPhone = (mobile || '').trim();
    const cleanPin = (pin || '').trim();

    if (!cleanPhone || !cleanPin) {
      return { success: false, error: 'Mobile number and PIN are required' };
    }

    try {
      const res = await fetchWithFallback('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin }),
      }, 6000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        const u = data.user;
        setUserProfile({
          name: u.name || '',
          mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : cleanPhone,
          designation: u.designation || 'Officer on Special Duty',
          department: u.department || 'Cabinet Secretariat • Government of India',
          id: u.officerId || u.id || ('GOI-DL-2026-' + Math.floor(1000 + Math.random() * 9000)),
          avatar: u.avatar || '',
          email: u.email || '',
        });
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        error: data.message || 'Invalid phone number or password',
      };
    } catch (err: any) {
      console.error('[AUTH] Login connection error:', err?.message || err);
      return {
        success: false,
        error: 'Unable to connect to backend server. Please ensure the backend is running.',
      };
    }
  };

  // Register Handler (saves officer to backend and retrieves profile)
  const registerUser = async (
    payload: RegisterPayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (!payload.name || !payload.phone || !payload.pin) {
      return { success: false, error: 'Full name, phone number, and PIN are required' };
    }

    try {
      const res = await fetchWithFallback('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 7000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        if (data.qr) {
          setLastDispatchedQr({
            qrImage: data.qr.qrImage,
            qrPayload: data.qr.qrPayload,
            fromWhatsApp: data.whatsapp ? data.whatsapp.from : '+91 91212 66269',
          });
        }
        const u = data.user;
        setUserProfile({
          name: u.name || payload.name,
          mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : payload.phone,
          designation: u.designation || payload.designation || 'Officer on Special Duty',
          department: u.department || payload.department || 'Cabinet Secretariat • Government of India',
          id: u.officerId || u.id || ('GOI-DL-2026-' + Math.floor(1000 + Math.random() * 9000)),
          avatar: u.avatar || payload.avatar || '',
          email: u.email || payload.email || '',
        });
        setIsAuthenticated(true);
        return { success: true };
      }

      return {
        success: false,
        error: data.message || 'Registration failed. Backend returned an error.',
      };
    } catch (err: any) {
      console.error('[AUTH] Registration connection error:', err?.message || err);
      return {
        success: false,
        error: 'Unable to connect to backend server. Please ensure the backend is running.',
      };
    }
  };

  // QR Login Handler (validates scanned one-time QR with Backend API)
  const qrLogin = async (qrPayload: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetchWithFallback('/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: qrPayload.trim() }),
      }, 6000);
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUserProfile({
          name: data.user.name || '',
          mobile: data.user.phone ? (data.user.phone.startsWith('+91') ? data.user.phone : `+91 ${data.user.phone}`) : '',
          designation: data.user.designation || 'Officer on Special Duty',
          department: data.user.department || 'Cabinet Secretariat • Government of India',
          id: data.user.officerId || data.user.id || ('GOI-DL-2026-' + Math.floor(1000 + Math.random() * 9000)),
          avatar: data.user.avatar || '',
          email: data.user.email || '',
        });
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: data.message || 'QR login verification failed' };
    } catch {
      return { success: false, message: 'Could not connect to backend authentication service. Backend is offline.' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserProfile({
      name: '',
      mobile: '',
      designation: '',
      department: '',
      id: '',
      avatar: '',
      email: '',
    });
    setCart([]);
    setActiveTab('home');
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter((c): c is CartItem => c !== null);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getItemQuantity = (itemId: string) => {
    const found = cart.find((c) => c.item.id === itemId);
    return found ? found.quantity : 0;
  };

  const totalCartItems = useMemo(
    () => cart.reduce((acc, c) => acc + c.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0),
    [cart]
  );

  // Place order connected to backend API (no fake order on backend failure)
  const placeOrder = async (): Promise<BackendOrder | null> => {
    const orderPayload = {
      userId: userProfile.id,
      userName: userProfile.name,
      userPhone: userProfile.mobile,
      userAvatar: userProfile.avatar,
      items: cart.map((c) => ({
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        image: c.item.image,
      })),
      totalAmount: cartSubtotal,
      subtotal: cartSubtotal,
      paymentMethod,
      orderNote,
      mealSlot: activeCategory !== 'all' ? activeCategory.toUpperCase() : 'LUNCH',
    };

    try {
      const res = await fetchWithFallback('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      }, 7000);
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setLastPlacedOrder(data.order);
        setOrderHistory((prev) => [data.order, ...prev]);
        setIsOrderSuccessModalOpen(true);
        setOrderStep(3);
        return data.order;
      }
    } catch (err) {
      console.error('[ORDER] Place order failed:', err);
    }
    return null;
  };

  return (
    <CanteenContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        userProfile,
        login,
        registerUser,
        qrLogin,
        lastDispatchedQr,
        logout,
        activeTab,
        setActiveTab,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        totalCartItems,
        cartSubtotal,
        orderNote,
        setOrderNote,
        paymentMethod,
        setPaymentMethod,
        orderStep,
        setOrderStep,
        placeOrder,
        isOrderSuccessModalOpen,
        setIsOrderSuccessModalOpen,
        menuItems,
        isMenuLoading,
        menuError,
        fetchMenu,
        orderHistory,
        isOrderHistoryLoading,
        fetchOrderHistory,
        lastPlacedOrder,
      }}
    >
      {children}
    </CanteenContext.Provider>
  );
};


export function useCanteen(): CanteenContextType {
  const context = useContext(CanteenContext);
  if (!context) {
    throw new Error('useCanteen must be used within a CanteenProvider');
  }
  return context;
}
