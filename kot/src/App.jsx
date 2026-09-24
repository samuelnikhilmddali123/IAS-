import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricsRow } from './components/MetricsRow';
import { KanbanBoard } from './components/KanbanBoard';
import { SubPage } from './components/SubPage';
import { Footer } from './components/Footer';
import { NewOrderModal } from './components/NewOrderModal';
import { initialOrders, initialCompletedOrders, initialAlerts } from './data/mockOrders';
import { KitchenAPI } from './services/api';
import { getSocket } from './services/socket';
import { normalizeOrder } from './utils/orderAdapter';
import { playKitchenChime } from './utils/audio';
import { printKOTTicket } from './utils/printer';

export function App() {
  const getInitialTab = () => {
    const path = window.location.pathname;
    const parts = path.replace(/\/$/, '').split('/');
    const lastPart = parts[parts.length - 1];
    const validTabs = [
      'dashboard', 'active-kots', 'preparing',
      'ready', 'completed', 'cancelled', 'menu-items',
      'tables', 'reports', 'settings'
    ];
    if (validTabs.includes(lastPart)) return lastPart;
    // Fallback to active-kot if they typed it without 's'
    if (lastPart === 'active-kot') return 'active-kots';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [orders, setOrders] = useState({
    prep: [],
    ready: [],
    completed: [],
    cancelled: []
  });
  const [completedOrders, setCompletedOrders] = useState([]);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Orders');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync activeTab to URL
  useEffect(() => {
    const newPath = `/admin/kot/${activeTab}/`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab: activeTab }, '', newPath);
    }
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const parts = path.replace(/\/$/, '').split('/');
      let lastPart = parts[parts.length - 1];
      if (lastPart === 'active-kot') lastPart = 'active-kots';
      const validTabs = [
        'dashboard', 'active-kots', 'preparing',
        'ready', 'completed', 'cancelled', 'menu-items',
        'tables', 'reports', 'settings'
      ];
      if (validTabs.includes(lastPart)) {
        setActiveTab(lastPart);
      } else {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch all orders & stats from backend
  const fetchOrdersAndStats = useCallback(async () => {
    try {
      const [ordersRes, statsRes] = await Promise.allSettled([
        KitchenAPI.getOrders(),
        KitchenAPI.getKitchenStats()
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value && ordersRes.value.orders) {
        const rawList = ordersRes.value.orders;
        const normalizedList = rawList
          .map(normalizeOrder)
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const bucketNew = normalizedList.filter(o => o.status === 'new');
        const bucketPrep = normalizedList.filter(o => o.status === 'prep');
        const bucketReady = normalizedList.filter(o => o.status === 'ready');
        const bucketCompleted = normalizedList.filter(o => o.status === 'completed');
        const bucketCancelled = normalizedList.filter(o => o.status === 'cancelled');

        setOrders({
          prep: bucketPrep,
          ready: bucketReady,
          completed: bucketCompleted,
          cancelled: bucketCancelled
        });

        // Map completed orders for the right panel & history table
        const completedList = bucketCompleted.map(o => ({
          id: o.tokenNumber ? `Token #${o.tokenNumber}` : o.orderNumber || `#${o.id}`,
          tokenNumber: o.tokenNumber,
          orderNumber: o.orderNumber,
          location: o.userName || o.table || 'Counter Pickup',
          userName: o.userName,
          items: o.items,
          totalAmount: o.totalAmount,
          time: new Date(o.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }),
          timeAgo: o.timeAgo
        }));

        setCompletedOrders(completedList);
      } else {
        // Fallback to mock data if backend request failed
        console.warn('Backend orders unavailable, using mock data.');
        setOrders(initialOrders);
        setCompletedOrders(initialCompletedOrders);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.stats) {
        setStats(statsRes.value.stats);
      }
    } catch (err) {
      console.error('fetchOrdersAndStats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load & Socket.IO listener registration
  useEffect(() => {
    fetchOrdersAndStats();

    // Setup Socket.IO
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // 1. Listen for immediate Kitchen Order Tickets (KOT)
    const handleNewKOT = (kot) => {
      console.log('⚡ Incoming KOT Ticket via Socket:', kot);
      playKitchenChime();

      const normalized = normalizeOrder({
        ...kot,
        id: kot.orderNumber || String(Date.now()),
        status: 'NEW',
        kitchenStatus: 'NEW',
        createdAt: kot.orderTime || new Date().toISOString()
      });

      setOrders((prev) => ({
        ...prev,
        prep: [normalized, ...prev.prep]
      }));

      const displayToken = normalized.tokenNumber ? `Token #${normalized.tokenNumber}` : normalized.orderNumber;
      setAlerts((prev) => [
        {
          id: Date.now(),
          type: 'new',
          title: 'Incoming KOT Received',
          target: displayToken,
          time: 'Just now',
          dot: 'red'
        },
        ...prev
      ]);
    };

    // 2. Listen for order status transitions from backend
    const handleOrderStatusUpdated = (updatedOrder) => {
      console.log('🔄 Order status updated via Socket:', updatedOrder.orderNumber, updatedOrder.status);
      fetchOrdersAndStats();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('newKOT', handleNewKOT);
    socket.on('orderStatusUpdated', handleOrderStatusUpdated);

    if (socket.connected) {
      setIsConnected(true);
    }

    // Auto-refresh interval every 20 seconds as fallback
    const interval = setInterval(() => {
      fetchOrdersAndStats();
    }, 20000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('newKOT', handleNewKOT);
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
      clearInterval(interval);
    };
  }, [fetchOrdersAndStats]);

  // Dynamic counts for MetricsRow & Sidebar
  const newCount = orders.new?.length || 0;
  const prepCount = orders.prep?.length || 0;
  const readyCount = orders.ready?.length || 0;
  const completedCount = stats?.todayOrdersCount || (orders.completed?.length || 0) + (completedOrders.length || 0);
  const cancelledCount = orders.cancelled?.length || 0;
  const totalCount = stats?.totalOrdersCount || (prepCount + readyCount + completedCount + cancelledCount);

  // Removed handleAcceptOrder since orders go straight to prep

  // Handler: Reject / Cancel Order
  const handleRejectOrder = async (orderId) => {
    const target = orders.prep.find((o) => o.id === orderId || o._id === orderId);
    const updatedPrep = orders.prep.filter((o) => o.id !== orderId && o._id !== orderId);

    setOrders({
      ...orders,
      prep: updatedPrep,
      cancelled: target ? [{ ...target, status: 'cancelled' }, ...orders.cancelled] : orders.cancelled
    });

    const displayId = target?.tokenNumber ? `Token #${target.tokenNumber}` : target?.orderNumber || `#${orderId}`;
    setAlerts([
      {
        id: Date.now(),
        type: 'alert',
        title: `${displayId} rejected & cancelled`,
        time: 'Just now',
        dot: 'red'
      },
      ...alerts
    ]);

    try {
      await KitchenAPI.updateOrderStatus(target?._id || orderId, 'CANCELLED');
      fetchOrdersAndStats();
    } catch (err) {
      console.error(`Failed to cancel order ${orderId} on backend:`, err);
    }
  };

  // Handler: Mark as Ready (Moves Prep -> Ready via backend)
  const handleMarkReady = async (orderId) => {
    const target = orders.prep.find((o) => o.id === orderId || o._id === orderId);
    if (!target) return;

    const updatedPrep = orders.prep.filter((o) => o.id !== orderId && o._id !== orderId);
    const newReadyItem = {
      ...target,
      status: 'ready',
      rawKitchenStatus: 'READY',
      readyTimeAgo: 'Ready just now',
      statusNote: 'Ready for officer pickup.'
    };

    setOrders({
      ...orders,
      prep: updatedPrep,
      ready: [newReadyItem, ...orders.ready]
    });

    const displayId = target.tokenNumber ? `Token #${target.tokenNumber}` : target.orderNumber || `#${orderId}`;
    setAlerts([
      {
        id: Date.now(),
        type: 'ready',
        title: `${displayId} is Ready for Pickup`,
        time: 'Just now',
        dot: 'green'
      },
      ...alerts
    ]);

    try {
      await KitchenAPI.updateOrderStatus(target._id || target.id, 'READY');
      fetchOrdersAndStats();
    } catch (err) {
      console.error(`Failed to mark order ${orderId} ready on backend:`, err);
    }
  };

  // Handler: Mark as Completed (Moves Ready -> Completed)
  const handleMarkCompleted = async (orderId) => {
    const target = orders.ready.find((o) => o.id === orderId || o._id === orderId);
    if (!target) return;

    const updatedReady = orders.ready.filter((o) => o.id !== orderId && o._id !== orderId);
    const timeNow = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const displayId = target.tokenNumber ? `Token #${target.tokenNumber}` : target.orderNumber || `#${target.id}`;
    const newCompletedRecord = {
      id: displayId,
      tokenNumber: target.tokenNumber,
      orderNumber: target.orderNumber,
      location: target.userName || target.table || 'Counter Pickup',
      userName: target.userName,
      items: target.items,
      totalAmount: target.totalAmount,
      time: timeNow
    };

    setOrders({
      ...orders,
      ready: updatedReady,
      completed: [{ ...target, status: 'completed' }, ...orders.completed]
    });

    setCompletedOrders([newCompletedRecord, ...completedOrders]);

    setAlerts([
      {
        id: Date.now(),
        type: 'completed',
        title: `${displayId} marked as Fulfilled`,
        time: 'Just now',
        dot: 'green'
      },
      ...alerts
    ]);

    try {
      await KitchenAPI.updateOrderStatus(target._id || target.id, 'COMPLETED');
      fetchOrdersAndStats();
    } catch (err) {
      console.error(`Failed to complete order ${orderId} on backend:`, err);
    }
  };

  // Handler: Create New Order
  const handleCreateOrder = async (newOrder) => {
    playKitchenChime();

    // Optimistically add to prep queue
    setOrders({
      ...orders,
      prep: [newOrder, ...orders.prep]
    });

    setAlerts([
      {
        id: Date.now(),
        type: 'new',
        title: 'New order ticket created',
        target: `#${newOrder.orderNumber || newOrder.id}`,
        time: 'Just now',
        dot: 'red'
      },
      ...alerts
    ]);

    // Attempt to persist on backend
    try {
      const payload = {
        userName: newOrder.userName || 'Officer',
        orderType: 'INSTANT',
        items: (newOrder.items || []).map((i) => ({
          foodId: i.foodId || 'food-d1',
          name: i.name,
          quantity: i.qty || i.quantity || 1
        })),
        orderNote: newOrder.note || ''
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchOrdersAndStats();
      }
    } catch (e) {
      console.warn('Backend order creation notice:', e.message);
    }
  };

  return (
    <div className="app-container">
      {/* Dark Olive Military Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        newOrdersCount={0}
      />

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Header Bar with Live Socket connection status */}
        <Header alerts={alerts} isConnected={isConnected} />

        {/* Scrollable Body (dashboard-mode locks page overflow to allow column scrolling) */}
        <div className={`content-scrollable ${activeTab === 'dashboard' ? 'dashboard-mode' : ''}`}>
          {/* Top Metrics Row connected to live API counts */}
          <MetricsRow
            counts={{
              newCount: 0,
              prepCount,
              readyCount,
              completedCount,
              cancelledCount,
              totalCount
            }}
          />

          {/* Views: Dashboard vs Subpage */}
          {activeTab === 'dashboard' ? (
            <KanbanBoard
              orders={orders}
              completedOrders={completedOrders}
              alerts={alerts}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterType={filterType}
              setFilterType={setFilterType}
              onRejectOrder={handleRejectOrder}
              onMarkReady={handleMarkReady}
              onMarkCompleted={handleMarkCompleted}
              onOpenNewOrderModal={() => setIsModalOpen(true)}
            />
          ) : (
            <SubPage
              activeTab={activeTab}
              orders={orders}
              completedOrders={completedOrders}
              stats={stats}
              onRejectOrder={handleRejectOrder}
              onMarkReady={handleMarkReady}
              onMarkCompleted={handleMarkCompleted}
              onPrintOrder={printKOTTicket}
            />
          )}
        </div>

        {/* Bottom Status Footer Bar */}
        <Footer />
      </div>

      {/* Interactive New Order Modal */}
      <NewOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
}

export default App;
