import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import { ScreenTab, CategoryId, MenuItem, CartItem, PaymentMethod, BackendOrder } from '../types';

export const getCandidateBases = (): string[] => {
  const bases: string[] = [];

  // 1. Explicit EXPO_PUBLIC_API_URL if configured
  if (process.env.EXPO_PUBLIC_API_URL) {
    bases.push(process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, ''));
  }

  // 2. Web Browser Context
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const isHttps = window.location.protocol === 'https:';
    const origin = window.location.origin ? window.location.origin.replace(/\/+$/, '') : '';
    const hostname = window.location.hostname || 'localhost';

    if (isHttps) {
      if (origin && !origin.includes(':8081') && !origin.includes(':19006') && !origin.includes(':3000')) {
        bases.push(origin);
      }
      bases.push(`https://${hostname}`);
      bases.push(`https://${hostname}:5001`);
    } else {
      bases.push(`http://${hostname}:5001`);
      bases.push('http://localhost:5001', 'http://127.0.0.1:5001');
      if (origin && !origin.includes(':8081') && !origin.includes(':19006') && !origin.includes(':3000') && !origin.includes(':5173')) {
        bases.push(origin);
      }
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
        bases.push(`http://${host}:5001`);
      }
    }
  } catch {}

  // 4. React Native NativeModules.SourceCode
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/:\/\/([^:\/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      bases.push(`http://${match[1]}:5001`);
    }
  } catch {}

  // 5. Android Emulator loopback alias
  if (Platform.OS === 'android') {
    bases.push('http://10.0.2.2:5001');
  }

  // 6. Localhost fallbacks
  bases.push('http://localhost:5001', 'http://127.0.0.1:5001');

  return Array.from(new Set(bases.filter(Boolean)));
};

export const getCandidateHosts = (): string[] => {
  return getCandidateBases().map((b) => {
    const match = b.match(/:\/\/([^:\/]+)/);
    return match ? match[1] : b || 'localhost';
  });
};

let cachedWorkingBase = 'http://localhost:5001';
let moduleAuthToken = '';

// Initialize cachedWorkingBase from storage on app load
if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem('@canteen_working_base');
    if (saved && !saved.includes(':8081') && !saved.includes(':19006') && !saved.includes(':3000')) {
      cachedWorkingBase = saved;
    } else if (window.location && window.location.hostname) {
      cachedWorkingBase = `http://${window.location.hostname}:5001`;
    }
  } catch {}
}
AsyncStorage.getItem('@canteen_working_base').then((saved) => {
  if (saved && !saved.includes(':8081') && !saved.includes(':19006') && !saved.includes(':3000')) {
    cachedWorkingBase = saved;
  }
}).catch(() => {});

export const getApiBase = (): string => {
  if (cachedWorkingBase !== '') return cachedWorkingBase;
  const candidates = getCandidateBases();
  return candidates[0] || 'http://localhost:5001';
};

export const resolveImageUrl = (imageUri?: string): string => {
  if (!imageUri || typeof imageUri !== 'string') {
    return '';
  }
  const trimmed = imageUri.trim();
  if (!trimmed || trimmed.includes('unsplash.com')) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  
  // In Web environment (including HTTPS on restaurants.stackvil.com or localhost),
  // return relative path so the browser loads directly from current host without mixed-content errors
  if (Platform.OS === 'web') {
    return path;
  }

  const base = getApiBase().replace(/\/+$/, '');
  return `${base}${path}`;
};

export const fetchWithFallback = async (
  endpointPath: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> => {
  const candidates = getCandidateBases();
  
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

  // Inject Bearer token automatically if available
  if (moduleAuthToken && !reqHeaders['Authorization'] && !reqHeaders['authorization']) {
    reqHeaders['Authorization'] = `Bearer ${moduleAuthToken}`;
  }

  // 1. If we have a cached working base, try it first
  if (cachedWorkingBase !== '') {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), Math.min(timeoutMs, 2500));
      const url = `${cachedWorkingBase}${endpointPath}`;

      const res = await fetch(url, {
        ...options,
        headers: reqHeaders,
        signal: controller.signal,
      });
      clearTimeout(tid);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') && endpointPath.startsWith('/api/')) {
        throw new Error(`Cached base ${cachedWorkingBase} returned HTML fallback`);
      }
      return res;
    } catch {
      // Cached base failed, fall through to fast parallel probing
      cachedWorkingBase = '';
    }
  }

  // 2. For mutating requests (POST, PUT, PATCH, DELETE), ensure we do NOT blast duplicate requests concurrently
  const isMutation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());

  const singleFetch = async (base: string): Promise<Response> => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      base.startsWith('http://')
    ) {
      throw new Error('Skipping insecure http on https origin');
    }

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${base}${endpointPath}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers: reqHeaders,
        signal: controller.signal,
      });
      clearTimeout(tid);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') && endpointPath.startsWith('/api/')) {
        throw new Error(`Endpoint ${endpointPath} returned HTML instead of API JSON from ${base}`);
      }

      cachedWorkingBase = base;
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try { localStorage.setItem('@canteen_working_base', base); } catch {}
      }
      AsyncStorage.setItem('@canteen_working_base', base).catch(() => {});
      return res;
    } catch (e) {
      clearTimeout(tid);
      throw e;
    }
  };

  // If this is a mutation request and we don't have a cached base, probe first with a harmless GET
  if (isMutation) {
    try {
      const probeCandidate = async (base: string): Promise<string> => {
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.location?.protocol === 'https:' &&
          base.startsWith('http://')
        ) {
          throw new Error('Insecure http');
        }
        const ctrl = new AbortController();
        const ptid = setTimeout(() => ctrl.abort(), 1500);
        try {
          const pr = await fetch(`${base}/api/whatsapp/status`, { signal: ctrl.signal });
          clearTimeout(ptid);
          const ct = pr.headers.get('content-type') || '';
          if (!ct.includes('text/html') && (pr.ok || pr.status < 500)) return base;
          throw new Error('Status not ok');
        } catch (e) {
          clearTimeout(ptid);
          throw e;
        }
      };
      const foundBase = await Promise.any(candidates.map(probeCandidate));
      if (foundBase) {
        cachedWorkingBase = foundBase;
        return await singleFetch(foundBase);
      }
    } catch {
      // Fall through to sequential attempt
    }

    // Try candidates sequentially for mutations to prevent duplicates
    let lastError = null;
    for (const base of candidates) {
      try {
        return await singleFetch(base);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Cannot connect to backend server on any candidate URL');
  }

  // For read-only GET requests, use parallel fast probing
  try {
    return await Promise.any(candidates.map((base) => singleFetch(base)));
  } catch (aggregateErr: any) {
    const firstErr = aggregateErr?.errors?.[0] || aggregateErr;
    throw firstErr || new Error('Cannot connect to backend server on any candidate URL');
  }
};

export interface QuickLoginSession {
  token: string;
  profile: UserProfile;
  expiresAt: number;
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
  isOfficialUser: boolean;
  getItemPrice: (item: MenuItem) => number;
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
    isOfficial: false,
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

  // Fetch Menu from Backend with automatic retry
  const fetchMenu = useCallback(async (retries = 2) => {
    setIsMenuLoading(true);
    setMenuError(null);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchWithFallback('/api/foods', {
          headers: { Accept: 'application/json' },
        }, 5000);

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.food)) {
            const mapped: MenuItem[] = data.food.map((f: any) => {
              const p = Number(f.price) || 0;
              const gp = Number(f.generalPrice) || p;
              let op = Number(f.officialPrice);
              if (isNaN(op) || op <= 0) {
                op = p > 0 ? Math.max(1, Math.round(p * 0.85)) : 0;
              }
              return {
                id: f.id || String(f._id),
                name: f.name,
                price: p,
                generalPrice: gp,
                officialPrice: op,
                isVeg: Boolean(f.isVeg),
                category: (f.category || 'lunch').toLowerCase() as CategoryId,
                subCategory: f.subCategory || '',
                image: resolveImageUrl(f.image),
                rating: f.rating || 4.8,
                portion: f.portion || 'Standard Portion',
              };
            });
            setMenuItems(mapped);
            setMenuError(null);
            setIsMenuLoading(false);
            return;
          }
        }
      } catch (err: any) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        console.error('[MENU] Backend menu fetch failed:', err?.message || err);
        setMenuItems([]);
        setMenuError('Unable to load menu: Cannot connect to backend server. Please verify the backend is running.');
      }
    }
    setIsMenuLoading(false);
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
          designation: u.designation || '',
          department: u.department || '',
          location: u.location || '',
          id: String(u.id || u._id || u.officerId || ''),
          officerId: u.officerId || '',
          avatar: u.avatar || '',
          email: u.email || '',
          dob: u.dob || '',
          marriageDate: u.marriageDate || '',
          importantDates: u.importantDates || '',
          childrenCount: u.childrenCount || '',
          childrenDetails: u.childrenDetails || '',
          siblings: u.siblings || '',
          dietaryPreferences: u.dietaryPreferences || '',
          emergencyContact: u.emergencyContact || '',
          bloodGroup: u.bloodGroup || '',
          homeAddress: u.homeAddress || '',
          isOfficial: Boolean(u.isOfficial),
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: u.name || '',
            mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : candidatePhone,
            designation: u.designation || '',
            department: u.department || '',
            location: u.location || '',
            id: String(u.id || u._id || u.officerId || ''),
            officerId: u.officerId || '',
            avatar: u.avatar || '',
            email: u.email || '',
            isOfficial: Boolean(u.isOfficial),
            dob: u.dob || '',
            marriageDate: u.marriageDate || '',
            importantDates: u.importantDates || '',
            childrenCount: u.childrenCount || '',
            childrenDetails: u.childrenDetails || '',
            siblings: u.siblings || '',
            dietaryPreferences: u.dietaryPreferences || '',
            emergencyContact: u.emergencyContact || '',
            bloodGroup: u.bloodGroup || '',
            homeAddress: u.homeAddress || '',
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
          designation: (u.designation || payload.designation || '').trim(),
          location: (u.location || payload.location || '').trim(),
          department: (u.department || payload.department || '').trim(),
          id: String(u.id || u._id || u.officerId || ''),
          officerId: u.officerId || '',
          avatar: u.avatar || payload.avatar || '',
          email: u.email || payload.email || '',
          dob: u.dob || payload.dob || '',
          marriageDate: u.marriageDate || payload.marriageDate || '',
          importantDates: u.importantDates || payload.importantDates || '',
          childrenCount: u.childrenCount || payload.childrenCount || '',
          childrenDetails: u.childrenDetails || payload.childrenDetails || '',
          siblings: u.siblings || payload.siblings || '',
          dietaryPreferences: u.dietaryPreferences || payload.dietaryPreferences || '',
          emergencyContact: u.emergencyContact || payload.emergencyContact || '',
          bloodGroup: u.bloodGroup || payload.bloodGroup || '',
          homeAddress: u.homeAddress || payload.homeAddress || '',
          isOfficial: Boolean(u.isOfficial),
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: u.name || payload.name,
            mobile: u.phone ? (u.phone.startsWith('+91') ? u.phone : `+91 ${u.phone}`) : payload.phone,
            designation: (u.designation || payload.designation || '').trim(),
            location: (u.location || payload.location || '').trim(),
            department: (u.department || payload.department || '').trim(),
            id: String(u.id || u._id || u.officerId || ''),
            officerId: u.officerId || '',
            avatar: u.avatar || payload.avatar || '',
            email: u.email || payload.email || '',
            isOfficial: Boolean(u.isOfficial),
            dob: u.dob || payload.dob || '',
            marriageDate: u.marriageDate || payload.marriageDate || '',
            importantDates: u.importantDates || payload.importantDates || '',
            childrenCount: u.childrenCount || payload.childrenCount || '',
            childrenDetails: u.childrenDetails || payload.childrenDetails || '',
            siblings: u.siblings || payload.siblings || '',
            dietaryPreferences: u.dietaryPreferences || payload.dietaryPreferences || '',
            emergencyContact: u.emergencyContact || payload.emergencyContact || '',
            bloodGroup: u.bloodGroup || payload.bloodGroup || '',
            homeAddress: u.homeAddress || payload.homeAddress || '',
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
          designation: data.user.designation || '',
          department: data.user.department || '',
          location: data.user.location || '',
          id: String(data.user.id || data.user._id || data.user.officerId || ''),
          officerId: data.user.officerId || '',
          avatar: data.user.avatar || '',
          email: data.user.email || '',
          dob: data.user.dob || '',
          marriageDate: data.user.marriageDate || '',
          importantDates: data.user.importantDates || '',
          childrenCount: data.user.childrenCount || '',
          childrenDetails: data.user.childrenDetails || '',
          siblings: data.user.siblings || '',
          dietaryPreferences: data.user.dietaryPreferences || '',
          emergencyContact: data.user.emergencyContact || '',
          bloodGroup: data.user.bloodGroup || '',
          homeAddress: data.user.homeAddress || '',
          isOfficial: Boolean(data.user.isOfficial),
        });
        const qlSession: QuickLoginSession = {
          token: tok,
          profile: {
            name: data.user.name || '',
            mobile: data.user.phone ? (data.user.phone.startsWith('+91') ? data.user.phone : `+91 ${data.user.phone}`) : '',
            designation: data.user.designation || '',
            department: data.user.department || '',
            location: data.user.location || '',
            id: String(data.user.id || data.user._id || data.user.officerId || ''),
            officerId: data.user.officerId || '',
            avatar: data.user.avatar || '',
            email: data.user.email || '',
            isOfficial: Boolean(data.user.isOfficial),
            dob: data.user.dob || '',
            marriageDate: data.user.marriageDate || '',
            importantDates: data.user.importantDates || '',
            childrenCount: data.user.childrenCount || '',
            childrenDetails: data.user.childrenDetails || '',
            siblings: data.user.siblings || '',
            dietaryPreferences: data.user.dietaryPreferences || '',
            emergencyContact: data.user.emergencyContact || '',
            bloodGroup: data.user.bloodGroup || '',
            homeAddress: data.user.homeAddress || '',
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
      designation: profile.designation || '',
      department: profile.department || '',
      location: profile.location || '',
      id: String(profile.id || cleanPhone || 'user'),
      officerId: profile.officerId || profile.id || ('GOI-DL-2026-' + (cleanPhone ? cleanPhone.slice(-4) : '0001')),
      avatar: profile.avatar || '',
      email: profile.email || '',
      isOfficial: profile.isOfficial !== undefined ? Boolean(profile.isOfficial) : false,
      dob: profile.dob || '',
      marriageDate: profile.marriageDate || '',
      importantDates: profile.importantDates || '',
      childrenCount: profile.childrenCount || '',
      childrenDetails: profile.childrenDetails || '',
      siblings: profile.siblings || '',
      dietaryPreferences: profile.dietaryPreferences || '',
      emergencyContact: profile.emergencyContact || '',
      bloodGroup: profile.bloodGroup || '',
      homeAddress: profile.homeAddress || '',
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
          
          const latestActive = (orderHistory || []).find((o: any) => {
            const st = (o.kitchenStatus || o.status || '').toUpperCase();
            return ['NEW', 'ACCEPTED', 'PENDING', 'PRE_ORDERED', 'PLACED', 'ORDER_PLACED', 'PREPARING', 'COOKING', 'IN_PROGRESS', 'ALMOST_READY', 'READY'].includes(st);
          });
          
          let initialStatus: string | null = null;
          if (latestActive) {
            const kSt = (latestActive.kitchenStatus || '').toUpperCase();
            const oSt = (latestActive.status || '').toUpperCase();
            if (kSt === 'NEW' || kSt === 'ACCEPTED' || oSt === 'NEW' || oSt === 'PENDING' || oSt === 'PRE_ORDERED' || oSt === 'PLACED' || oSt === 'ORDER_PLACED') {
              initialStatus = 'NEW';
            } else if (kSt === 'PREPARING' || kSt === 'COOKING' || oSt === 'PREPARING' || oSt === 'COOKING' || oSt === 'IN_PROGRESS') {
              initialStatus = 'PREPARING';
            } else if (kSt === 'READY' || kSt === 'ALMOST_READY' || oSt === 'READY' || oSt === 'ALMOST_READY') {
              initialStatus = 'READY';
            }
          }

          const sessionData = {
            id: String(profileToSave.id || rawPhone || 'user'),
            name: profileToSave.name || (latestActive && latestActive.userName) || 'Officer',
            phone: rawPhone,
            avatar: profileToSave.avatar || (latestActive && latestActive.userAvatar) || '',
            designation: profileToSave.designation || 'IAS Officer',
            token: tokenToSave || '',
            orderStatus: initialStatus,
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

  const isOfficialUser = Boolean(userProfile?.isOfficial);

  const getItemPrice = useCallback((item: MenuItem): number => {
    if (userProfile?.isOfficial) {
      if (item.officialPrice !== undefined && item.officialPrice > 0) {
        return item.officialPrice;
      }
      const gp = item.generalPrice || item.price || 0;
      return gp > 0 ? Math.max(1, Math.round(gp * 0.85)) : 0;
    }
    return item.generalPrice || item.price || 0;
  }, [userProfile?.isOfficial]);

  const totalCartItems = useMemo(
    () => cart.reduce((acc, c) => acc + c.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((acc, c) => acc + getItemPrice(c.item) * c.quantity, 0),
    [cart, getItemPrice]
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
        price: getItemPrice(c.item),
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
        setCart([]);
        setActiveTab('orders');
        fetchOrderHistory();
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
        price: getItemPrice(c.item),
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
      const newAvatar = (data.user && data.user.avatar) || updates.avatar;

      setUserProfile((prev) => {
        const nextProfile: UserProfile = {
          ...prev,
          ...(data.user || {}),
          name: updates.name !== undefined ? updates.name : (data.user?.name ?? prev.name),
          designation: updates.designation !== undefined ? updates.designation : (data.user?.designation ?? prev.designation),
          location: updates.location !== undefined ? updates.location : (data.user?.location ?? prev.location),
          department: updates.department !== undefined ? updates.department : (data.user?.department ?? prev.department),
          avatar: newAvatar !== undefined && newAvatar !== '' ? newAvatar : prev.avatar,
          email: updates.email !== undefined ? updates.email : (data.user?.email ?? prev.email),
          dob: updates.dob !== undefined ? updates.dob : (data.user?.dob ?? prev.dob),
          marriageDate: updates.marriageDate !== undefined ? updates.marriageDate : (data.user?.marriageDate ?? prev.marriageDate),
          importantDates: updates.importantDates !== undefined ? updates.importantDates : (data.user?.importantDates ?? prev.importantDates),
          childrenCount: updates.childrenCount !== undefined ? updates.childrenCount : (data.user?.childrenCount ?? prev.childrenCount),
          childrenDetails: updates.childrenDetails !== undefined ? updates.childrenDetails : (data.user?.childrenDetails ?? prev.childrenDetails),
          siblings: updates.siblings !== undefined ? updates.siblings : (data.user?.siblings ?? prev.siblings),
          dietaryPreferences: updates.dietaryPreferences !== undefined ? updates.dietaryPreferences : (data.user?.dietaryPreferences ?? prev.dietaryPreferences),
          emergencyContact: updates.emergencyContact !== undefined ? updates.emergencyContact : (data.user?.emergencyContact ?? prev.emergencyContact),
          bloodGroup: updates.bloodGroup !== undefined ? updates.bloodGroup : (data.user?.bloodGroup ?? prev.bloodGroup),
          homeAddress: updates.homeAddress !== undefined ? updates.homeAddress : (data.user?.homeAddress ?? prev.homeAddress),
        };

        // Sync with quickLoginSession
        setQuickLoginSession((prevQl) => {
          if (!prevQl) return null;
          const updatedQl = { ...prevQl, profile: nextProfile };
          if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem('canteen_quick_login', JSON.stringify(updatedQl));
            } catch {}
          }
          return updatedQl;
        });

        return nextProfile;
      });

      if (res.ok && data.success) {
        return { success: true };
      }

      // Even if backend return status had minor error, local update succeeded
      return { success: true };
    } catch (err: any) {
      console.error('[AUTH] Profile update error:', err?.message || err);
      // Fallback local update if backend is unreachable
      if (updates.avatar) {
        setUserProfile((prev) => ({ ...prev, avatar: updates.avatar }));
      }
      return {
        success: true,
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
            designation: data.user.designation || '',
            department: data.user.department || '',
            location: data.user.location || '',
            id: String(data.user.id || data.user._id || data.user.officerId || ''),
            officerId: data.user.officerId || '',
            avatar: data.user.avatar || '',
            email: data.user.email || '',
            dob: data.user.dob || '',
            marriageDate: data.user.marriageDate || '',
            importantDates: data.user.importantDates || '',
            childrenCount: data.user.childrenCount || '',
            childrenDetails: data.user.childrenDetails || '',
            siblings: data.user.siblings || '',
            dietaryPreferences: data.user.dietaryPreferences || '',
            emergencyContact: data.user.emergencyContact || '',
            bloodGroup: data.user.bloodGroup || '',
            homeAddress: data.user.homeAddress || '',
            isOfficial: Boolean(data.user.isOfficial),
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
        isOfficialUser,
        getItemPrice,
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
