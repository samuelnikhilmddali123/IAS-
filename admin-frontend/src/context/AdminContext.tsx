import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { FoodItem, Order, Officer, AdminStats, WhatsAppConfig, WhatsAppOutboxMessage, WhatsAppTokenRecord, WhatsAppWebStatus } from '../types';

interface QrModalData {
  imgUrl: string;
  payload: string;
  toPhone: string;
  userName: string;
}

interface AdminContextType {
  API_BASE: string;
  allFoods: FoodItem[];
  allOrders: Order[];
  allOfficers: Officer[];
  adminStats: AdminStats;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  refreshAllData: () => Promise<void>;
  
  // Modals state
  isAddFoodModalOpen: boolean;
  editingFoodItem: FoodItem | null;
  openAddFoodModal: () => void;
  openEditFoodModal: (food: FoodItem) => void;
  closeAddFoodModal: () => void;
  
  isTestWaModalOpen: boolean;
  openTestWaModal: () => void;
  closeTestWaModal: () => void;
  
  isQrModalOpen: boolean;
  qrModalData: QrModalData | null;
  openQrModal: (imgUrl: string, payload: string, toPhone: string, userName: string) => void;
  closeQrModal: () => void;

  // WhatsApp state
  waWebStatus: WhatsAppWebStatus | null;
  waConfig: WhatsAppConfig | null;
  waOutbox: WhatsAppOutboxMessage[];
  waTokens: Record<string, WhatsAppTokenRecord>;
  loadWhatsAppWebStatus: (forceRefresh?: boolean) => Promise<void>;
  loadWhatsAppConfig: () => Promise<void>;
  loadWhatsAppOutbox: () => Promise<void>;
}

const API_BASE = window.location.origin;

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allOfficers, setAllOfficers] = useState<Officer[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalOrdersCount: 0,
    activeOrdersCount: 0,
    totalOfficersCount: 0,
  });
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(null);

  const [isTestWaModalOpen, setIsTestWaModalOpen] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<QrModalData | null>(null);

  // WhatsApp
  const [waWebStatus, setWaWebStatus] = useState<WhatsAppWebStatus | null>(null);
  const [waConfig, setWaConfig] = useState<WhatsAppConfig | null>(null);
  const [waOutbox, setWaOutbox] = useState<WhatsAppOutboxMessage[]>([]);
  const [waTokens, setWaTokens] = useState<Record<string, WhatsAppTokenRecord>>({});

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [statsRes, foodsRes, ordersRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders/admin/stats`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/foods/admin`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/orders/admin/all`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/auth/users`).then((r) => r.json()).catch(() => ({})),
      ]);

      if (statsRes.success && statsRes.stats) {
        setAdminStats(statsRes.stats);
      }
      if (foodsRes.success && Array.isArray(foodsRes.food)) {
        setAllFoods(foodsRes.food);
      }
      if (ordersRes.success && Array.isArray(ordersRes.orders)) {
        setAllOrders(ordersRes.orders);
      }
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setAllOfficers(usersRes.users);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }, []);

  const loadWhatsAppWebStatus = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? `${API_BASE}/api/whatsapp/pair` : `${API_BASE}/api/whatsapp/status`;
      const method = forceRefresh ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      const data = await res.json();
      setWaWebStatus(data);
    } catch (err) {
      console.warn('Failed to load WhatsApp Web status:', err);
    }
  }, []);

  const loadWhatsAppConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/config`);
      const data = await res.json();
      if (data.success && data.config) {
        setWaConfig(data.config);
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp config:', err);
    }
  }, []);

  const loadWhatsAppOutbox = useCallback(async () => {
    try {
      const [outboxRes, tokensRes] = await Promise.all([
        fetch(`${API_BASE}/api/whatsapp/outbox`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/whatsapp/tokens`).then(r => r.json()).catch(() => ({}))
      ]);

      if (outboxRes.outbox) {
        setWaOutbox(outboxRes.outbox);
      }
      if (Array.isArray(tokensRes.tokens)) {
        const tokenMap: Record<string, WhatsAppTokenRecord> = {};
        tokensRes.tokens.forEach((t: WhatsAppTokenRecord) => {
          tokenMap[t.id] = t;
        });
        setWaTokens(tokenMap);
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp outbox:', err);
    }
  }, []);

  // Poll main data every 10 seconds
  useEffect(() => {
    refreshAllData();
    const timer = setInterval(refreshAllData, 10000);
    return () => clearInterval(timer);
  }, [refreshAllData]);

  const openAddFoodModal = () => {
    setEditingFoodItem(null);
    setIsAddFoodModalOpen(true);
  };

  const openEditFoodModal = (food: FoodItem) => {
    setEditingFoodItem(food);
    setIsAddFoodModalOpen(true);
  };

  const closeAddFoodModal = () => {
    setIsAddFoodModalOpen(false);
    setEditingFoodItem(null);
  };

  const openTestWaModal = () => setIsTestWaModalOpen(true);
  const closeTestWaModal = () => setIsTestWaModalOpen(false);

  const openQrModal = (imgUrl: string, payload: string, toPhone: string, userName: string) => {
    setQrModalData({ imgUrl, payload, toPhone, userName });
    setIsQrModalOpen(true);
  };
  const closeQrModal = () => {
    setIsQrModalOpen(false);
    setQrModalData(null);
  };

  return (
    <AdminContext.Provider
      value={{
        API_BASE,
        allFoods,
        allOrders,
        allOfficers,
        adminStats,
        toastMessage,
        showToast,
        refreshAllData,
        isAddFoodModalOpen,
        editingFoodItem,
        openAddFoodModal,
        openEditFoodModal,
        closeAddFoodModal,
        isTestWaModalOpen,
        openTestWaModal,
        closeTestWaModal,
        isQrModalOpen,
        qrModalData,
        openQrModal,
        closeQrModal,
        waWebStatus,
        waConfig,
        waOutbox,
        waTokens,
        loadWhatsAppWebStatus,
        loadWhatsAppConfig,
        loadWhatsAppOutbox,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
