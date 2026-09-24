import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import { ScreenTab, CategoryId, MenuItem, CartItem, PaymentMethod, BackendOrder } from '../types';

export const getCandidateHosts = (): string[] => {
  const hosts: string[] = [];

  // 1. Explicit EXPO_PUBLIC_API_URL if configured
  if (process.env.EXPO_PUBLIC_API_URL) {
    try {
      const match = process.env.EXPO_PUBLIC_API_URL.match(/:\/\/([^:/]+)/);
      if (match && match[1]) {
        hosts.push(match[1]);
      }
    } catch {}
  }

  // 2. Web browser location
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      hosts.push(window.location.hostname);
    }
  }

  // 3. Dynamic Metro Bundler Host from Expo Constants
  try {
    const debuggerHost =
      Constants.expoConfig?.hostUri ||
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any)?.manifest?.debuggerHost ||
      '';
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        hosts.push(host);
      }
    }
  } catch {}

  // 4. React Native NativeModules.SourceCode
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      hosts.push(match[1]);
    }
  } catch {}

  // 5. Developer machine's active Wi-Fi LAN IP (for physical mobile devices)
  hosts.push('192.168.1.103');

  // 6. Android Emulator loopback alias
  if (Platform.OS === 'android') {
    hosts.push('10.0.2.2');
  }

  // 7. Localhost fallback (applicable for Web and local desktop testing)
  if (Platform.OS === 'web') {
    hosts.push('localhost', '127.0.0.1');
  }

  return Array.from(new Set(hosts.filter(Boolean)));
};

let cachedWorkingBase = '';
let moduleAuthToken = '';

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

  const reqHeaders: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        reqHeaders[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => {
        reqHeaders[k] = v;
      });
    } else {
      Object.assign(reqHeaders, options.headers);
    }
  }

  // Inject Bearer token automatically if available and not yet set
  if (moduleAuthToken && !reqHeaders['Authorization'] && !reqHeaders['authorization']) {
    reqHeaders['Authorization'] = `Bearer ${moduleAuthToken}`;
  }

  let lastError: any = null;

  for (const base of ordered) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${base}${endpointPath}`;

      const res = await fetch(url, {
        ...options,
        headers: reqHeaders,
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

export interface QuickLoginSession {
  token: string;
  profile: UserProfile;
  expiresAt: number;
}

export interface UserProfile {
  name: string;
  mobile: string;
  designation: string;
  department: string;
  id: string;
  officerId?: string;
  avatar?: string;
  email?: string;
  location?: string;
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
}

export interface ActionSuccessInfo {
  type: 'checkout' | 'bill';
  message: string;
  order?: BackendOrder;
  bill?: any;
}

interface CanteenContextType {
  quickLogin: (token: string, profile: any) => void;
  quickLoginSession: QuickLoginSession | null;
  quickLoginFromSaved: () => void;
  logoutNotice: string | null;
  setLogoutNotice: (msg: string | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  authToken: string;
  userProfile: UserProfile;
  login: (passwordOrPhone?: string, optionalPin?: string) => Promise<{ success: boolean; error?: string }>;
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
  pickupTime: string;
  setPickupTime: (time: string) => void;
  isPreOrder: boolean;
  setIsPreOrder: (val: boolean) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  orderStep: 1 | 2 | 3;
  setOrderStep: (step: 1 | 2 | 3) => void;
  checkoutCart: () => Promise<{ success: boolean; message?: string; error?: string; order?: BackendOrder }>;
  generateBillCart: () => Promise<{ success: boolean; message?: string; error?: string; bill?: any; order?: BackendOrder }>;
  placeOrder: () => Promise<BackendOrder | null>;
  actionSuccessModal: ActionSuccessInfo | null;
  setActionSuccessModal: (val: ActionSuccessInfo | null) => void;
  isOrderSuccessModalOpen: boolean;
  setIsOrderSuccessModalOpen: (open: boolean) => void;
  menuItems: MenuItem[];
  isMenuLoading: boolean;
  menuError: string | null;
  fetchMenu: () => Promise<void>;
  orderHistory: BackendOrder[];
  isOrderHistoryLoading: boolean;
  fetchOrderHistory: () => Promise<void>;
  unpaidOrders: BackendOrder[];
  unpaidTotalAmount: number;
  isUnpaidLoading: boolean;
  fetchUnpaidOrders: () => Promise<BackendOrder[]>;
  lastPlacedOrder: BackendOrder | null;
  payOrder: (orderId: string) => Promise<{ success: boolean; error?: string; order?: BackendOrder }>;
  payBatchOrders: (orderIds: string[]) => Promise<{ success: boolean; error?: string }>;
  sendBatchPaymentQr: (orderIds: string[], totalAmount: number) => Promise<{
    success: boolean;
    error?: string;
    registeredMobile?: string;
    qrDataUrl?: string;
    upiId?: string;
  }>;
  sendPaymentQr: (orderId: string) => Promise<{
    success: boolean;
    error?: string;
    registeredMobile?: string;
    qrDataUrl?: string;
    upiId?: string;
  }>;
}

const CanteenContext = createContext<CanteenContextType | undefined>(undefined);

export const CanteenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quickLoginSession, setQuickLoginSession] = useState<QuickLoginSession | null>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('canteen_quick_login');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Date.now() < parsed.expiresAt) {
            return parsed;
          } else {
            localStorage.removeItem('canteen_quick_login');
          }
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (!quickLoginSession) return;
    const interval = setInterval(() => {
      if (Date.now() >= quickLoginSession.expiresAt) {
        setQuickLoginSession(null);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('canteen_quick_login');
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [quickLoginSession]);

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem('canteen_jwt_token') || '';
    }
    return '';
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    mobile: '',
    designation: '',
    department: '',
    id: '',
    avatar: '',
    email: '',
  });

  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScreenTab>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart and Pre-Order states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');
  const [isPreOrder, setIsPreOrder] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [orderStep, setOrderStep] = useState<1 | 2 | 3>(1);

  // Success Feedback Modal
  const [actionSuccessModal, setActionSuccessModal] = useState<ActionSuccessInfo | null>(null);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState<boolean>(false);

  // Dynamic Menu from Backend
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState<boolean>(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Order History from Backend
  const [orderHistory, setOrderHistory] = useState<BackendOrder[]>([]);
  const [isOrderHistoryLoading, setIsOrderHistoryLoading] = useState<boolean>(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<BackendOrder | null>(null);
  const [lastDispatchedQr, setLastDispatchedQr] = useState<{ qrImage?: string; qrPayload?: string; fromWhatsApp?: string } | null>(null);

  // Unpaid Orders
  const [unpaidOrders, setUnpaidOrders] = useState<BackendOrder[]>([]);
  const [unpaidTotalAmount, setUnpaidTotalAmount] = useState<number>(0);
  const [isUnpaidLoading, setIsUnpaidLoading] = useState<boolean>(false);

  // Keep module level token synced for fetchWithFallback
  useEffect(() => {
    moduleAuthToken = authToken;
  }, [authToken]);

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

  // Fetch Order History from Backend (User Isolation Enforced)
  const fetchOrderHistory = useCallback(async () => {
    setIsOrderHistoryLoading(true);
    try {
      // 1. Try authenticated /api/orders/my-orders
      const res = await fetchWithFallback('/api/orders/my-orders', {
        headers: {
          Accept: 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }, 5000);

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrderHistory(data.orders);
          return;
        }
      }

      // 2. Fallback by phone/id query
      if (userProfile.mobile || userProfile.id) {
        const phoneClean = userProfile.mobile ? userProfile.mobile.replace(/\D/g, '') : '';
        const url = `/api/orders?userId=${encodeURIComponent(userProfile.id)}&phone=${encodeURIComponent(phoneClean)}`;
        const fallbackRes = await fetchWithFallback(url, {
          headers: {
            Accept: 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }, 5000);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          if (data.success && Array.isArray(data.orders)) {
            setOrderHistory(data.orders);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsOrderHistoryLoading(false);
    }
  }, [authToken, userProfile.mobile, userProfile.id]);

  const fetchUnpaidOrders = useCallback(async (): Promise<BackendOrder[]> => {
    return [];
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrderHistory();
    }
  }, [isAuthenticated, fetchOrderHistory]);

  // Real-Time Socket.IO Updates & 4-second Polling Fallback
  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: Socket | null = null;
    try {
      const serverUrl = getApiBase();
      socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      const handleOrderUpdate = (data: any) => {
        if (!data) return;
        const updatedOrderId = data.orderId || data.order?.id || data.order?._id || data.order?.orderNumber;
        const newStatus = data.status || data.order?.status;
        const newKitchenStatus = data.kitchenStatus || data.order?.kitchenStatus;

        setOrderHistory((prev) =>
          prev.map((order) => {
            const matches =
              (updatedOrderId && (order.id === updatedOrderId || order._id === updatedOrderId || order.orderNumber === updatedOrderId)) ||
              (data.order && (order.id === data.order.id || order._id === data.order._id || order.orderNumber === data.order.orderNumber));

            if (matches) {
              return {
                ...order,
                ...(data.order || {}),
                status: newStatus || order.status,
                kitchenStatus: newKitchenStatus || order.kitchenStatus,
              };
            }
            return order;
          })
        );
      };

      socket.on('orderStatusUpdated', handleOrderUpdate);
      socket.on('orderUpdated', handleOrderUpdate);
    } catch (e) {
      console.warn('[SOCKET] Real-time tracking connection failed:', e);
    }

    // 4-second polling fallback
    const interval = setInterval(() => {
      fetchOrderHistory();
    }, 4000);

    return () => {
      if (socket) {
        socket.off('orderStatusUpdated');
        socket.off('orderUpdated');
        socket.disconnect();
      }
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchOrderHistory]);

  // Login Handler (Password-Only Login & Dual-Credential Support)
  const login = async (
    passwordOrPhone?: string,
    optionalPin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    let candidatePassword = '';
    let candidatePhone = '';

    if (optionalPin !== undefined && String(optionalPin).trim() !== '') {
      candidatePhone = (passwordOrPhone || '').trim();
      candidatePassword = (optionalPin || '').trim();
    } else {
      candidatePassword = (passwordOrPhone || '').trim();
    }

    if (!candidatePassword) {
      return { success: false, error: 'Password is required' };
    }

    try {
      const res = await fetchWithFallback('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: candidatePassword,
          ...(candidatePhone ? { phone: candidatePhone } : {}),
        }),
      }, 6000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        const u = data.user;
        const tok = data.token || '';
        setAuthToken(tok);
        moduleAuthToken = tok;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined' && tok) {
          localStorage.setItem('canteen_jwt_token', tok);
        }

        setUserProfile({
          name: u.name || '',
          mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : candidatePhone,
          designation: u.designation || 'Officer on Special Duty',
          department: u.department || 'Cabinet Secretariat • Government of India',
          id: String(u.id || u._id || u.officerId || ''),
          officerId: u.officerId || '',
          avatar: u.avatar || '',
          email: u.email || '',
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: u.name || '',
            mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : candidatePhone,
            designation: u.designation || 'Officer on Special Duty',
            department: u.department || 'Cabinet Secretariat • Government of India',
            id: String(u.id || u._id || u.officerId || ''),
            officerId: u.officerId || '',
            avatar: u.avatar || '',
            email: u.email || '',
          },
          expiresAt: u.pinExpiresAt ? new Date(u.pinExpiresAt).getTime() : (Date.now() + 60 * 60 * 1000)
        };
        setQuickLoginSession(qlSession);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('canteen_quick_login', JSON.stringify(qlSession));
        }

        // Also track in @recent_sessions for instant login screen presence
        try {
          const rawPhone = (u.phone || candidatePhone || '').replace(/\D/g, '').slice(-10);
          const rSession = {
            id: String(u.id || u._id || u.officerId || rawPhone),
            name: u.name || '',
            phone: rawPhone,
            avatar: u.avatar || '',
            designation: u.designation || 'IAS Officer',
            token: tok,
            logoutTime: Date.now()
          };
          AsyncStorage.getItem('@recent_sessions').then((res) => {
            let sList = res ? JSON.parse(res) : [];
            sList = sList.filter((s: any) => s.id !== rSession.id && s.phone !== rSession.phone);
            sList.unshift(rSession);
            sList = sList.slice(0, 5);
            AsyncStorage.setItem('@recent_sessions', JSON.stringify(sList));
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
              localStorage.setItem('@recent_sessions', JSON.stringify(sList));
            }
          }).catch(() => {});
        } catch (e) {}

        setIsAuthenticated(true);
        setTimeout(() => {
          fetchOrderHistory();
        }, 30);
        return { success: true };
      }

      return {
        success: false,
        error: data.message || 'Invalid password.',
      };
    } catch (err: any) {
      console.error('[AUTH] Login connection error:', err?.message || err);
      return {
        success: false,
        error: 'Unable to connect to backend server. Please ensure the backend is running.',
      };
    }
  };

  // Register Handler
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
      }, 35000);

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
        const tok = data.token || '';
        setAuthToken(tok);
        moduleAuthToken = tok;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined' && tok) {
          localStorage.setItem('canteen_jwt_token', tok);
        }

        setUserProfile({
          name: u.name || payload.name,
          mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : payload.phone,
          designation: (u.designation || payload.designation || 'Officer on Special Duty').trim(),
          location: (u.location || payload.location || '').trim(),
          department: (u.department || payload.department || 'Cabinet Secretariat • Government of India').trim(),
          id: String(u.id || u._id || u.officerId || ''),
          officerId: u.officerId || '',
          avatar: u.avatar || payload.avatar || '',
          email: u.email || payload.email || '',
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: u.name || payload.name,
            mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : payload.phone,
            designation: (u.designation || payload.designation || 'Officer on Special Duty').trim(),
          location: (u.location || payload.location || '').trim(),
          department: (u.department || payload.department || 'Cabinet Secretariat • Government of India').trim(),
            id: String(u.id || u._id || u.officerId || ''),
            officerId: u.officerId || '',
            avatar: u.avatar || payload.avatar || '',
            email: u.email || payload.email || '',
          },
          expiresAt: Date.now() + 60 * 60 * 1000
        };
        setQuickLoginSession(qlSession);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('canteen_quick_login', JSON.stringify(qlSession));
        }

        setIsAuthenticated(true);
        setTimeout(() => {
          fetchOrderHistory();
        }, 30);
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

  // QR Login Handler
  const qrLogin = async (qrPayload: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetchWithFallback('/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: qrPayload.trim() }),
      }, 6000);
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        const tok = data.token || '';
        setAuthToken(tok);
        moduleAuthToken = tok;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined' && tok) {
          localStorage.setItem('canteen_jwt_token', tok);
        }

        setUserProfile({
          name: data.user.name || '',
          mobile: data.user.phone ? (data.user.phone.startsWith('+91') ? data.user.phone : `+91 ${data.user.phone}`) : '',
          designation: data.user.designation || 'Officer on Special Duty',
          department: data.user.department || 'Cabinet Secretariat • Government of India',
          id: String(data.user.id || data.user._id || data.user.officerId || ''),
          officerId: data.user.officerId || '',
          avatar: data.user.avatar || '',
          email: data.user.email || '',
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: data.user.name || '',
            mobile: data.user.phone ? (data.user.phone.startsWith('+91') ? data.user.phone : `+91 ${data.user.phone}`) : '',
            designation: data.user.designation || 'Officer on Special Duty',
            department: data.user.department || 'Cabinet Secretariat • Government of India',
            id: String(data.user.id || data.user._id || data.user.officerId || ''),
            officerId: data.user.officerId || '',
            avatar: data.user.avatar || '',
            email: data.user.email || '',
          },
          expiresAt: Date.now() + 60 * 60 * 1000
        };
        setQuickLoginSession(qlSession);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('canteen_quick_login', JSON.stringify(qlSession));
        }

        setIsAuthenticated(true);
        setTimeout(() => {
          fetchOrderHistory();
        }, 30);
        return { success: true };
      }
      return { success: false, message: data.message || 'QR login verification failed' };
    } catch {
      return { success: false, message: 'Could not connect to backend authentication service. Backend is offline.' };
    }
  };


  const quickLogin = useCallback((token: string, profile: any) => {
    const tok = token || 'quick-auth-' + Date.now();
    moduleAuthToken = tok;
    setAuthToken(tok);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('canteen_jwt_token', tok);
      } catch {}
    }
    const cleanPhone = (profile.mobile || profile.phone || '').replace(/\D/g, '').slice(-10);
    const formattedMobile = cleanPhone ? (cleanPhone.startsWith('+91') ? cleanPhone : `+91 ${cleanPhone}`) : (profile.mobile || '');
    
    const normalized: UserProfile = {
      name: profile.name || 'Officer',
      mobile: formattedMobile,
      designation: profile.designation || 'IAS Officer • Special Duty',
      department: profile.department || 'Cabinet Secretariat • Government of India',
      id: String(profile.id || cleanPhone || 'user'),
      officerId: profile.officerId || profile.id || (`GOI-DL-2026-${cleanPhone ? cleanPhone.slice(-4) : '0001'}`),
      avatar: profile.avatar || '',
      email: profile.email || '',
    };
    setUserProfile(normalized);
    setIsAuthenticated(true);

    // Persist to quick login session
    const qlSession: QuickLoginSession = {
      token: tok,
      profile: normalized,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    setQuickLoginSession(qlSession);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('canteen_quick_login', JSON.stringify(qlSession));
      } catch {}
    }

    // Refresh recent session timestamp
    const sessionData = {
      id: normalized.id,
      name: normalized.name,
      phone: cleanPhone,
      avatar: normalized.avatar,
      designation: normalized.designation,
      token: tok,
      logoutTime: Date.now(),
    };
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('@recent_sessions');
        let sessions = raw ? JSON.parse(raw) : [];
        sessions = sessions.filter((s: any) => s.phone !== cleanPhone && s.id !== normalized.id);
        sessions.unshift(sessionData);
        localStorage.setItem('@recent_sessions', JSON.stringify(sessions.slice(0, 8)));
      } catch {}
    }

    setTimeout(() => {
      fetchOrderHistory();
    }, 50);
  }, [fetchOrderHistory]);

  // Logout Handler (Clears all state, tokens, storage, and resets authenticated status)
  const logout = useCallback(() => {
    const profileToSave = { ...userProfile };
    const tokenToSave = moduleAuthToken || authToken;

    const storeRecentSession = async () => {
      try {
        if (profileToSave && (profileToSave.id || profileToSave.mobile || profileToSave.name)) {
          const rawPhone = (profileToSave.mobile || '').replace(/\D/g, '').slice(-10);
          const sessionData = {
            id: String(profileToSave.id || rawPhone || 'user'),
            name: profileToSave.name || 'Officer',
            phone: rawPhone,
            avatar: profileToSave.avatar || '',
            designation: profileToSave.designation || 'IAS Officer',
            token: tokenToSave || '',
            logoutTime: Date.now()
          };
          const existing = await AsyncStorage.getItem('@recent_sessions');
          let sessions = existing ? JSON.parse(existing) : [];
          sessions = sessions.filter((s: any) => s.id !== sessionData.id && s.phone !== sessionData.phone);
          sessions.unshift(sessionData);
          sessions = sessions.slice(0, 5);
          await AsyncStorage.setItem('@recent_sessions', JSON.stringify(sessions));
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('@recent_sessions', JSON.stringify(sessions));
          }
        }
      } catch (e) {
        console.error('Failed to save recent session', e);
      }
    };
    storeRecentSession();

    moduleAuthToken = '';
    setAuthToken('');
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('canteen_jwt_token');
        localStorage.removeItem('canteen_user');
        sessionStorage.clear();
      } catch {}
    }

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
    setOrderNote('');
    setPickupTime('');
    setIsPreOrder(false);
    setUnpaidOrders([]);
    setUnpaidTotalAmount(0);
    setActionSuccessModal(null);
    setIsOrderSuccessModalOpen(false);
    setActiveTab('home');
  }, []);

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
    setOrderNote('');
    setPickupTime('');
    setIsPreOrder(false);
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

  // ==========================================
  // ACTION 1: CHECKOUT (Send order to kitchen)
  // ==========================================
  const checkoutCart = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    order?: BackendOrder;
  }> => {
    if (cart.length === 0) {
      return { success: false, error: 'Your cart is empty.' };
    }

    const payload = {
      userId: userProfile.id,
      userName: userProfile.name,
      userPhone: userProfile.mobile,
      items: cart.map((c) => ({
        foodId: c.item.id,
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        image: c.item.image,
      })),
      orderNote,
      orderType: isPreOrder || Boolean(pickupTime) ? 'PRE_ORDER' : 'INSTANT',
      pickupTime: isPreOrder || Boolean(pickupTime) ? pickupTime : null,
      pickupDate: isPreOrder || Boolean(pickupTime) ? new Date().toISOString() : null,
    };

    try {
      const res = await fetchWithFallback('/api/cart/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      }, 9000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.order) {
        setLastPlacedOrder(data.order);
        setOrderHistory((prev) => [data.order, ...prev]);
        logout();
        return {
          success: true,
          message: data.message || 'Order sent to kitchen successfully.',
          order: data.order,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Server rejected order checkout.',
        };
      }
    } catch (err: any) {
      console.error('[CHECKOUT] Error:', err);
      return {
        success: false,
        error: err?.message || 'Network error connecting to backend.',
      };
    }
  };

  // ==========================================
  // ACTION 2: GENERATE BILL (Bill to WhatsApp & QR)
  // ==========================================
  const generateBillCart = async (): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    bill?: any;
    order?: BackendOrder;
  }> => {
    if (cart.length === 0) {
      return { success: false, error: 'Your cart is empty.' };
    }

    const payload = {
      userId: userProfile.id,
      userName: userProfile.name,
      userPhone: userProfile.mobile,
      items: cart.map((c) => ({
        foodId: c.item.id,
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        image: c.item.image,
      })),
      orderNote,
      orderType: isPreOrder || Boolean(pickupTime) ? 'PRE_ORDER' : 'INSTANT',
      pickupTime: isPreOrder || Boolean(pickupTime) ? pickupTime : null,
      pickupDate: isPreOrder || Boolean(pickupTime) ? new Date().toISOString() : null,
    };

    try {
      const res = await fetchWithFallback('/api/cart/generate-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      }, 12000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        if (data.order) {
          setLastPlacedOrder(data.order);
          setOrderHistory((prev) => [data.order, ...prev]);
        }
        return {
          success: true,
          message: data.message || 'Bill generated and sent successfully.',
          bill: data.bill,
          order: data.order,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Server rejected bill generation.',
        };
      }
    } catch (err: any) {
      console.error('[GENERATE BILL] Error:', err);
      return {
        success: false,
        error: err?.message || 'Network error connecting to backend.',
      };
    }
  };

  // Backward compatible alias
  const placeOrder = async (): Promise<BackendOrder | null> => {
    const result = await checkoutCart();
    return result.order || null;
  };

  // Batch Pay Multiple Orders
  const payBatchOrders = async (
    orderIds: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetchWithFallback('/api/orders/pay-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ orderIds }),
      }, 9000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setOrderHistory((prev) =>
          prev.map((o) => {
            const match = orderIds.includes(String(o.id)) || orderIds.includes(String(o._id)) || orderIds.includes(String(o.orderNumber));
            return match ? { ...o, paymentStatus: 'PAID' } : o;
          })
        );
        return { success: true };
      }
      return { success: false, error: data.message || 'Batch payment failed.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error processing batch payment.' };
    }
  };

  // Batch Send Combined Restaurant QR & Bill to Mobile
  const sendBatchPaymentQr = async (
    orderIds: string[],
    totalAmount: number
  ): Promise<{
    success: boolean;
    error?: string;
    registeredMobile?: string;
    qrDataUrl?: string;
    upiId?: string;
  }> => {
    try {
      const res = await fetchWithFallback('/api/orders/send-batch-payment-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ orderIds, totalAmount }),
      }, 9000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          registeredMobile: data.registeredMobile,
          qrDataUrl: data.qrDataUrl,
          upiId: data.upiId,
        };
      }
      return { success: false, error: data.message || 'Failed to dispatch combined QR to mobile.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error dispatching combined QR.' };
    }
  };

  // Customer Pay Order (Requirement 9 & 10: payment after COMPLETED)
  const payOrder = async (
    orderId: string
  ): Promise<{ success: boolean; error?: string; order?: BackendOrder }> => {
    try {
      const res = await fetchWithFallback(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }, 8000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setOrderHistory((prev) =>
          prev.map((o) =>
            o.id === orderId || o._id === orderId || o.orderNumber === orderId
              ? { ...o, paymentStatus: 'PAID' }
              : o
          )
        );
        return { success: true, order: data.order };
      }
      return { success: false, error: data.message || 'Payment failed.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error processing payment.' };
    }
  };

  // Customer Send Restaurant QR & Bill to Mobile (Requirement 1, 7 & 16)
  const sendPaymentQr = async (
    orderId: string
  ): Promise<{
    success: boolean;
    error?: string;
    registeredMobile?: string;
    qrDataUrl?: string;
    upiId?: string;
  }> => {
    try {
      const res = await fetchWithFallback(`/api/orders/${orderId}/send-payment-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      }, 8000);

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          registeredMobile: data.registeredMobile,
          qrDataUrl: data.qrDataUrl,
          upiId: data.upiId
        };
      }
      return { success: false, error: data.message || 'Failed to dispatch Restaurant QR to mobile.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error dispatching QR to mobile.' };
    }
  };

  
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetchWithFallback('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user) {
        setUserProfile(prev => ({
          ...prev,
          name: data.user.name || prev.name,
          designation: data.user.designation || prev.designation,
          location: data.user.location || prev.location,
          avatar: data.user.avatar || prev.avatar,
        }));
        return { success: true };
      }

      return {
        success: false,
        error: data.message || 'Failed to update profile.',
      };
    } catch (err: any) {
      console.error('[AUTH] Profile update error:', err?.message || err);
      return {
        success: false,
        error: 'Unable to connect to backend server.',
      };
    }
  };

  const quickLoginFromSaved = useCallback(async () => {
    if (quickLoginSession && Date.now() < quickLoginSession.expiresAt) {
      const tok = quickLoginSession.token;
      
      try {
        const res = await fetchWithFallback('/api/auth/me', {
          headers: { Authorization: `Bearer ${tok}` }
        });
        const data = await res.json();
        
        if (data.success && data.user) {
          moduleAuthToken = tok;
          setAuthToken(tok);
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.setItem('canteen_jwt_token', tok);
          }
          setUserProfile({
            name: data.user.name || '',
            mobile: data.user.phone ? (data.user.phone.startsWith('+91') ? data.user.phone : `+91 ${data.user.phone}`) : '',
            designation: data.user.designation || 'Officer on Special Duty',
            department: data.user.department || 'Cabinet Secretariat • Government of India',
            id: String(data.user.id || data.user._id || data.user.officerId || ''),
            officerId: data.user.officerId || '',
            avatar: data.user.avatar || '',
            email: data.user.email || '',
          });
          setIsAuthenticated(true);
          setTimeout(() => {
            fetchOrderHistory();
          }, 30);
        } else {
          setQuickLoginSession(null);
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            localStorage.removeItem('canteen_quick_login');
          }
        }
      } catch (err) {
        setQuickLoginSession(null);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('canteen_quick_login');
        }
      }
    } else {
      setQuickLoginSession(null);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('canteen_quick_login');
      }
    }
  }, [quickLoginSession, fetchOrderHistory]);



  return (
    <CanteenContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        authToken,
        userProfile,
        login,
        registerUser,
        qrLogin,
        updateProfile,
        quickLoginSession,
        quickLoginFromSaved,
        quickLogin,
        logoutNotice,
        setLogoutNotice,
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
        pickupTime,
        setPickupTime,
        isPreOrder,
        setIsPreOrder,
        paymentMethod,
        setPaymentMethod,
        orderStep,
        setOrderStep,
        checkoutCart,
        generateBillCart,
        placeOrder,
        payOrder,
        actionSuccessModal,
        setActionSuccessModal,
        isOrderSuccessModalOpen,
        setIsOrderSuccessModalOpen,
        menuItems,
        isMenuLoading,
        menuError,
        fetchMenu,
        orderHistory,
        isOrderHistoryLoading,
        fetchOrderHistory,
        unpaidOrders,
        unpaidTotalAmount,
        isUnpaidLoading,
        fetchUnpaidOrders,
        lastPlacedOrder,
        sendPaymentQr,
        payBatchOrders,
        sendBatchPaymentQr,
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
