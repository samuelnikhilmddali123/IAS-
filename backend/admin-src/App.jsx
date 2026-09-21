import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { AddFoodModal } from './components/AddFoodModal';
import { DashboardPage } from './pages/DashboardPage';
import { FoodMenuPage } from './pages/FoodMenuPage';
import { OrdersPage } from './pages/OrdersPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { OfficersPage } from './pages/OfficersPage';

export const App = () => {
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrdersCount: 0,
    activeOrdersCount: 0,
    totalOfficersCount: 0,
  });

  const [toast, setToast] = useState({ message: '', show: false });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [whatsappCount, setWhatsappCount] = useState(0);

  const showToast = useCallback((message) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast({ message: '', show: false });
    }, 3500);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [statsRes, foodsRes, ordersRes, usersRes, waRes] = await Promise.all([
        fetch('/api/orders/admin/stats').then((r) => r.json()).catch(() => ({})),
        fetch('/api/foods/admin').then((r) => r.json()).catch(() => ({})),
        fetch('/api/orders/admin/all').then((r) => r.json()).catch(() => ({})),
        fetch('/api/auth/users').then((r) => r.json()).catch(() => ({})),
        fetch('/api/whatsapp/outbox').then((r) => r.json()).catch(() => ({})),
      ]);

      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (foodsRes.success && Array.isArray(foodsRes.food)) {
        setFoods(foodsRes.food);
      }
      if (ordersRes.success && Array.isArray(ordersRes.orders)) {
        setOrders(ordersRes.orders);
      }
      if (usersRes.success && Array.isArray(usersRes.users)) {
        setOfficers(usersRes.users);
      }
      if (waRes.success && Array.isArray(waRes.outbox)) {
        setWhatsappCount(waRes.outbox.length);
      }
    } catch (err) {
      console.error('Data refresh error:', err);
    }
  }, []);

  useEffect(() => {
    refreshAllData();

    // Setup Socket.IO listener if available
    let socket = null;
    if (typeof window !== 'undefined' && window.io) {
      try {
        socket = window.io();
        socket.on('connect', () => {
          console.log('[Socket.IO] Connected to Canteen live feed');
        });
        socket.on('newKOT', (kot) => {
          showToast(`🔔 NEW KOT: Order #${kot?.orderNumber || ''} received in Kitchen!`);
          refreshAllData();
        });
        socket.on('newOrder', () => {
          showToast('🔔 New customer order placed');
          refreshAllData();
        });
        socket.on('orderStatusUpdated', () => {
          refreshAllData();
        });
      } catch (e) {
        console.warn('Socket.IO init warning:', e);
      }
    }

    // Polling fallback
    const interval = setInterval(refreshAllData, 12000);
    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [refreshAllData, showToast]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Failed to update order status');
        return;
      }
      showToast(`Order status updated to ${newStatus}`);
      await refreshAllData();
    } catch (e) {
      showToast('Error updating order status: ' + e.message);
    }
  };

  const handleToggleFoodAvailability = async (foodId) => {
    try {
      const target = foods.find((f) => (f.id || f._id) === foodId);
      if (!target) return;
      const newAvailability = !(target.isAvailable !== false);
      const res = await fetch(`/api/foods/${foodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newAvailability }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Item availability updated: ${newAvailability ? 'In Stock' : 'Out of Stock'}`);
        await refreshAllData();
      } else {
        showToast('Failed to update availability');
      }
    } catch (e) {
      showToast('Error toggling availability');
    }
  };

  const handleDeleteFood = async (foodId, foodName) => {
    if (!confirm(`Are you sure you want to delete "${foodName}" from the menu?`)) return;
    try {
      const res = await fetch(`/api/foods/${foodId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`"${foodName}" removed from menu`);
        await refreshAllData();
      } else {
        showToast('Failed to delete food item');
      }
    } catch (e) {
      showToast('Error deleting item');
    }
  };

  const handleUpdateFoodPrice = async (foodId, newPrice) => {
    try {
      const res = await fetch(`/api/foods/${foodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Price updated to ₹${newPrice}`);
        await refreshAllData();
      } else {
        showToast('Failed to update price');
      }
    } catch (e) {
      showToast('Error updating price');
    }
  };

  const handleAddFood = async (foodData) => {
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${foodData.name}" added to menu`);
        setIsAddModalOpen(false);
        await refreshAllData();
      } else {
        alert('Failed: ' + (data.message || 'Error'));
      }
    } catch (e) {
      alert('Error saving new food item');
    }
  };

  const activeOrdersCount = orders.filter((o) => {
    const s = (o.status || o.kitchenStatus || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'DELIVERED' && s !== 'CANCELLED';
  }).length;

  return (
    <div className="admin-app">
      <Header onRefresh={refreshAllData} />

      <div className="app-body">
        <Sidebar
          counts={{
            foods: foods.length,
            activeOrders: activeOrdersCount,
            officers: officers.length,
            whatsapp: whatsappCount,
          }}
        />

        <main className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  stats={stats}
                  orders={orders}
                  foods={foods}
                  officers={officers}
                  onOpenAddFood={() => setIsAddModalOpen(true)}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              }
            />
            <Route
              path="/food-menu"
              element={
                <FoodMenuPage
                  foods={foods}
                  onOpenAddFood={() => setIsAddModalOpen(true)}
                  onToggleAvailability={handleToggleFoodAvailability}
                  onDeleteFood={handleDeleteFood}
                  onUpdateFoodPrice={handleUpdateFoodPrice}
                />
              }
            />
            <Route
              path="/orders"
              element={
                <OrdersPage
                  orders={orders}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                />
              }
            />
            <Route
              path="/whatsapp"
              element={<WhatsAppPage showToast={showToast} />}
            />
            <Route
              path="/officers"
              element={
                <OfficersPage
                  officers={officers}
                  refreshAllData={refreshAllData}
                  showToast={showToast}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <Toast message={toast.message} show={toast.show} />

      <AddFoodModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddFood={handleAddFood}
      />
    </div>
  );
};
