import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen, getApiBase } from '../context/CanteenContext';

interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalDishes: number;
  totalOfficers: number;
}

export const AdminScreen: React.FC = () => {
  const { fetchMenu } = useCanteen();
  const [activeAdminTab, setActiveAdminTab] = useState<'orders' | 'foods' | 'officers' | 'whatsapp'>('orders');
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<AdminStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    totalDishes: 0,
    totalOfficers: 0,
  });

  // Food items state
  const [foodsList, setFoodsList] = useState<any[]>([]);
  const [showAddDishModal, setShowAddDishModal] = useState<boolean>(false);
  const [dishForm, setDishForm] = useState({
    name: '',
    category: 'lunch',
    price: '',
    portion: '',
    description: '',
    isVeg: true,
    image: '',
    availableQuantity: '50',
  });
  const [dishFormError, setDishFormError] = useState<string>('');
  const [savingDish, setSavingDish] = useState<boolean>(false);

  // Orders state
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Officers state
  const [officersList, setOfficersList] = useState<any[]>([]);

  // WhatsApp Gateway & QR Outbox state
  const [waAdminNumber, setWaAdminNumber] = useState<string>('+91 91212 66269');
  const [waProvider, setWaProvider] = useState<string>('sandbox');
  const [waStatusBadge, setWaStatusBadge] = useState<string>('Connected (Canteen Gateway)');
  const [waOutboxList, setWaOutboxList] = useState<any[]>([]);
  const [waTokensList, setWaTokensList] = useState<any[]>([]);
  const [showTestWaModal, setShowTestWaModal] = useState<boolean>(false);
  const [testWaPhone, setTestWaPhone] = useState<string>('');
  const [testWaMsg, setTestWaMsg] = useState<string>('');
  const [isSavingWaConfig, setIsSavingWaConfig] = useState<boolean>(false);
  const [isSendingTestWa, setIsSendingTestWa] = useState<boolean>(false);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  // Load Admin Data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Stats
      const statsRes = await fetch(`${getApiBase()}/api/orders/admin/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats((prev) => ({
            ...prev,
            totalOrders: statsData.stats.totalOrders || 0,
            totalRevenue: statsData.stats.totalRevenue || 0,
            activeOrders: statsData.stats.activeOrders || 0,
          }));
        }
      }

      // 2. All Orders
      const ordersRes = await fetch(`${getApiBase()}/api/orders`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          setAdminOrders(ordersData.orders);
        }
      }

      // 3. Foods
      const foodsRes = await fetch(`${getApiBase()}/api/foods`);
      if (foodsRes.ok) {
        const foodsData = await foodsRes.json();
        if (foodsData.success && Array.isArray(foodsData.food)) {
          setFoodsList(foodsData.food);
          setStats((prev) => ({ ...prev, totalDishes: foodsData.food.length }));
        }
      }

      // 4. Officers
      const officersRes = await fetch(`${getApiBase()}/api/auth/users`);
      if (officersRes.ok) {
        const officersData = await officersRes.json();
        if (officersData.success && Array.isArray(officersData.users)) {
          setOfficersList(officersData.users);
          setStats((prev) => ({ ...prev, totalOfficers: officersData.users.length }));
        }
      }

      // 5. WhatsApp & QR Gateway
      const [waCfgRes, waOutboxRes, waTokensRes] = await Promise.all([
        fetch(`${getApiBase()}/api/whatsapp/config`),
        fetch(`${getApiBase()}/api/whatsapp/outbox`),
        fetch(`${getApiBase()}/api/whatsapp/tokens`),
      ]);
      if (waCfgRes.ok) {
        const cfgData = await waCfgRes.json();
        if (cfgData.success && cfgData.config) {
          setWaAdminNumber(cfgData.config.adminWhatsAppNumber || '+91 91212 66269');
          setWaProvider(cfgData.config.provider || 'sandbox');
          setWaStatusBadge(cfgData.config.connectionStatus || 'Connected');
        }
      }
      if (waOutboxRes.ok) {
        const outboxData = await waOutboxRes.json();
        if (outboxData.success && Array.isArray(outboxData.outbox)) {
          setWaOutboxList(outboxData.outbox);
        }
      }
      if (waTokensRes.ok) {
        const tokensData = await waTokensRes.json();
        if (tokensData.success && Array.isArray(tokensData.tokens)) {
          setWaTokensList(tokensData.tokens);
        }
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Save WhatsApp Configuration
  const handleSaveWaConfig = async () => {
    setIsSavingWaConfig(true);
    try {
      const res = await fetch(`${getApiBase()}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWhatsAppNumber: waAdminNumber.trim(),
          provider: waProvider,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadDashboardData();
      }
    } catch {
      // ignore
    } finally {
      setIsSavingWaConfig(false);
    }
  };

  // Send Test WhatsApp Message
  const handleSendTestWa = async () => {
    if (!testWaPhone.trim()) return;
    setIsSendingTestWa(true);
    try {
      const res = await fetch(`${getApiBase()}/api/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testWaPhone.trim(),
          message: testWaMsg.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowTestWaModal(false);
        setTestWaPhone('');
        setTestWaMsg('');
        await loadDashboardData();
      }
    } catch {
      // ignore
    } finally {
      setIsSendingTestWa(false);
    }
  };

  // Copy QR payload to clipboard for testing
  const handleCopyPayload = (payload: string, id: string) => {
    if (!payload) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload);
    }
    setCopiedPayloadId(id);
    setTimeout(() => setCopiedPayloadId(null), 2500);
  };

  // Open web portal in new window
  const openWebPortal = () => {
    const portalUrl = `${getApiBase()}/admin/`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(portalUrl, '_blank');
    } else {
      Linking.openURL(portalUrl).catch(() => {});
    }
  };

  // Change order status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${getApiBase()}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadDashboardData();
      }
    } catch {
      // ignore
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Change order payment status
  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/orders/${orderId}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newPaymentStatus }),
      });
      if (res.ok) {
        await loadDashboardData();
      }
    } catch {
      // ignore
    }
  };

  // Add Dish
  const handleCreateDish = async () => {
    if (!dishForm.name.trim() || !dishForm.price.trim()) {
      setDishFormError('Dish name and price are required.');
      return;
    }
    setSavingDish(true);
    setDishFormError('');
    try {
      const payload = {
        name: dishForm.name.trim(),
        category: dishForm.category,
        price: parseFloat(dishForm.price),
        portion: dishForm.portion || 'Standard Portion',
        description: dishForm.description,
        isVeg: dishForm.isVeg,
        image:
          dishForm.image.trim() ||
          'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=500&q=80',
        availableQuantity: parseInt(dishForm.availableQuantity) || 50,
      };

      const res = await fetch(`${getApiBase()}/api/foods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddDishModal(false);
        setDishForm({
          name: '',
          category: 'lunch',
          price: '',
          portion: '',
          description: '',
          isVeg: true,
          image: '',
          availableQuantity: '50',
        });
        await loadDashboardData();
        await fetchMenu();
      } else {
        setDishFormError(data.message || 'Failed to add dish.');
      }
    } catch {
      setDishFormError('Could not connect to backend server.');
    } finally {
      setSavingDish(false);
    }
  };

  // Delete Dish
  const handleDeleteDish = async (foodId: string) => {
    try {
      const res = await fetch(`${getApiBase()}/api/foods/${foodId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadDashboardData();
        await fetchMenu();
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header with Portal Launch */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.emblemBadge}>
            <AppIcon name="shield-checkmark" size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Central Canteen Administration Desk</Text>
            <Text style={styles.headerSubtitle}>
              Live Kitchen Ops • Menu Engineering • Registered Officers Directory
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadDashboardData}
            activeOpacity={0.8}
          >
            <AppIcon name="time-outline" size={15} color="#0a3d31" style={{ marginRight: 5 }} />
            <Text style={styles.refreshBtnText}>Refresh Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.portalLaunchBtn}
            onPress={openWebPortal}
            activeOpacity={0.85}
          >
            <AppIcon name="grid" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.portalLaunchText}>Open Full Web Portal ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metric Cards Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Orders</Text>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.activeOrders}</Text>
          <Text style={styles.statSub}>In Kitchen Preparation</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Orders Today</Text>
          <Text style={[styles.statValue, { color: '#0a3d31' }]}>{stats.totalOrders}</Text>
          <Text style={styles.statSub}>All Time Tokens</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Revenue Settled</Text>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>₹{stats.totalRevenue}</Text>
          <Text style={styles.statSub}>UPI, Cards & Postpaid</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Menu Dishes</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.totalDishes}</Text>
          <Text style={styles.statSub}>Breakfast, Lunch, Dinner, Snacks</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Registered Officers</Text>
          <Text style={[styles.statValue, { color: '#7c3aed' }]}>{stats.totalOfficers}</Text>
          <Text style={styles.statSub}>Verified IAS / IPS Profiles</Text>
        </View>
      </View>

      {/* Nav Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeAdminTab === 'orders' && styles.tabBtnActive]}
          onPress={() => setActiveAdminTab('orders')}
        >
          <AppIcon
            name="receipt-outline"
            size={16}
            color={activeAdminTab === 'orders' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeAdminTab === 'orders' && styles.tabBtnTextActive]}>
            Kitchen Live Queue ({adminOrders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeAdminTab === 'foods' && styles.tabBtnActive]}
          onPress={() => setActiveAdminTab('foods')}
        >
          <AppIcon
            name="restaurant-outline"
            size={16}
            color={activeAdminTab === 'foods' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeAdminTab === 'foods' && styles.tabBtnTextActive]}>
            Food Menu Manager ({foodsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeAdminTab === 'officers' && styles.tabBtnActive]}
          onPress={() => setActiveAdminTab('officers')}
        >
          <AppIcon
            name="person-outline"
            size={16}
            color={activeAdminTab === 'officers' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeAdminTab === 'officers' && styles.tabBtnTextActive]}>
            Officers Directory ({officersList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeAdminTab === 'whatsapp' && styles.tabBtnActive]}
          onPress={() => setActiveAdminTab('whatsapp')}
        >
          <AppIcon
            name="call-outline"
            size={16}
            color={activeAdminTab === 'whatsapp' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeAdminTab === 'whatsapp' && styles.tabBtnTextActive]}>
            WhatsApp & QR ({waOutboxList.length})
          </Text>
        </TouchableOpacity>

        {activeAdminTab === 'foods' && (
          <TouchableOpacity
            style={styles.addDishBtn}
            onPress={() => setShowAddDishModal(true)}
            activeOpacity={0.85}
          >
            <AppIcon name="fast-food-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.addDishBtnText}>+ Add Food Item</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a3d31" />
            <Text style={styles.loadingText}>Syncing Canteen Database...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. ORDERS TAB */}
            {activeAdminTab === 'orders' && (
              <View style={styles.ordersGrid}>
                {adminOrders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No orders in queue</Text>
                    <Text style={styles.emptySub}>Orders placed by officers will display here in real time.</Text>
                  </View>
                ) : (
                  adminOrders.map((ord) => {
                    const statusUpper = (ord.status || 'PREPARING').toUpperCase();
                    const isReady = statusUpper === 'READY';
                    const isDelivered = statusUpper === 'DELIVERED';
                    const isCancelled = statusUpper === 'CANCELLED';

                    return (
                      <View key={ord.id || ord.orderNumber} style={styles.orderAdminCard}>
                        <View style={styles.orderAdminHeader}>
                          <View>
                            <Text style={styles.orderTokenText}>TOKEN #{ord.tokenNumber || '12'}</Text>
                            <Text style={styles.orderIdText}>{ord.orderNumber}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={[
                                styles.statusBadge,
                                (ord.paymentStatus || 'PAYMENT_PENDING') === 'PAID'
                                  ? { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }
                                  : { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                                { marginRight: 6 }
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: (ord.paymentStatus || 'PAYMENT_PENDING') === 'PAID' ? '#15803d' : '#b45309' }
                                ]}
                              >
                                {(ord.paymentStatus || 'PAYMENT_PENDING') === 'PAID' ? '✓ PAID' : '⏳ UNPAID'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.statusBadge,
                                isReady && styles.badgeReady,
                                isDelivered && styles.badgeDelivered,
                                isCancelled && styles.badgeCancelled,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  isReady && styles.badgeTextReady,
                                  isDelivered && styles.badgeTextDelivered,
                                  isCancelled && styles.badgeTextCancelled,
                                ]}
                              >
                                {statusUpper}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Officer info */}
                        <View style={styles.officerRow}>
                          {ord.userAvatar ? (
                            <Image source={{ uri: ord.userAvatar }} style={styles.officerMiniPic} />
                          ) : (
                            <View style={styles.officerPlaceholder}>
                              <AppIcon name="person" size={14} color="#0a3d31" />
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.officerNameText}>{ord.userName || 'IAS Officer'}</Text>
                            <Text style={styles.officerPhoneText}>{ord.userPhone || '—'}</Text>
                          </View>
                          <Text style={styles.orderTimeText}>
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        {/* Items list */}
                        <View style={styles.itemsListContainer}>
                          {(ord.items || []).map((itm: any, idx: number) => (
                            <View key={idx} style={styles.itemAdminRow}>
                              <Text style={styles.itemNameText}>
                                {itm.name} <Text style={styles.itemQtyText}>x{itm.quantity}</Text>
                              </Text>
                              <Text style={styles.itemPriceText}>₹{itm.price * itm.quantity}</Text>
                            </View>
                          ))}
                        </View>

                        {ord.orderNote ? (
                          <View style={styles.noteBox}>
                            <Text style={styles.noteText}>Note: "{ord.orderNote}"</Text>
                          </View>
                        ) : null}

                        {/* Footer & Action Buttons */}
                        <View style={styles.orderAdminFooter}>
                          <Text style={styles.footerTotal}>Total: ₹{ord.totalAmount}</Text>

                          <View style={styles.statusButtonsGroup}>
                            {(ord.paymentStatus || 'PAYMENT_PENDING') !== 'PAID' ? (
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#15803d' }]}
                                onPress={() => handleUpdatePaymentStatus(ord.id || ord.orderNumber, 'PAID')}
                              >
                                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Mark Paid ✓</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }]}
                                onPress={() => handleUpdatePaymentStatus(ord.id || ord.orderNumber, 'PAYMENT_PENDING')}
                              >
                                <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600' }}>Revert Unpaid</Text>
                              </TouchableOpacity>
                            )}

                            {statusUpper !== 'PREPARING' && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnPrepare]}
                                onPress={() => handleUpdateStatus(ord.id || ord.orderNumber, 'PREPARING')}
                                disabled={updatingOrderId === (ord.id || ord.orderNumber)}
                              >
                                <Text style={styles.btnPrepareText}>Prepare</Text>
                              </TouchableOpacity>
                            )}

                            {statusUpper !== 'READY' && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnReady]}
                                onPress={() => handleUpdateStatus(ord.id || ord.orderNumber, 'READY')}
                                disabled={updatingOrderId === (ord.id || ord.orderNumber)}
                              >
                                <Text style={styles.btnReadyText}>Mark Ready</Text>
                              </TouchableOpacity>
                            )}

                            {statusUpper !== 'DELIVERED' && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnDelivered]}
                                onPress={() => handleUpdateStatus(ord.id || ord.orderNumber, 'DELIVERED')}
                                disabled={updatingOrderId === (ord.id || ord.orderNumber)}
                              >
                                <Text style={styles.btnDeliveredText}>Dispatch ✓</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* 2. FOODS TAB */}
            {activeAdminTab === 'foods' && (
              <View style={styles.foodsGrid}>
                {foodsList.map((food) => (
                  <View key={food.id || food._id} style={styles.foodAdminCard}>
                    <Image source={{ uri: food.image }} style={styles.foodAdminImage} />
                    <View style={styles.foodAdminContent}>
                      <View style={styles.foodAdminHead}>
                        <Text style={styles.foodAdminCategory}>
                          {(food.category || 'lunch').toUpperCase()} • {food.isVeg ? 'VEG 🌱' : 'NON-VEG 🍖'}
                        </Text>
                        <Text style={styles.foodAdminPrice}>₹{food.price}</Text>
                      </View>
                      <Text style={styles.foodAdminTitle}>{food.name}</Text>
                      <Text style={styles.foodAdminDesc} numberOfLines={2}>
                        {food.description || food.portion}
                      </Text>

                      <View style={styles.foodAdminFooter}>
                        <Text style={styles.stockBadge}>In Stock: {food.availableQuantity || 50}</Text>
                        <TouchableOpacity
                          style={styles.deleteFoodBtn}
                          onPress={() => handleDeleteDish(food.id || food._id)}
                        >
                          <AppIcon name="trash-outline" size={14} color="#dc2626" />
                          <Text style={styles.deleteFoodText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 3. OFFICERS TAB */}
            {activeAdminTab === 'officers' && (
              <View style={styles.officersGrid}>
                {officersList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Officers Registered Yet</Text>
                    <Text style={styles.emptySub}>
                      Officers who register with their selected Google profile photo will be listed here.
                    </Text>
                  </View>
                ) : (
                  officersList.map((off, idx) => (
                    <View key={off.id || off._id || idx} style={styles.officerCard}>
                      <Image
                        source={{
                          uri:
                            off.avatar ||
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                        }}
                        style={styles.officerCardAvatar}
                      />
                      <View style={styles.officerCardInfo}>
                        <Text style={styles.officerCardName}>{off.name}</Text>
                        <Text style={styles.officerCardDesignation}>
                          {off.designation || 'IAS Officer • Special Duty'}
                        </Text>
                        <Text style={styles.officerCardPhone}>📱 {off.phone}</Text>
                        {off.email ? <Text style={styles.officerCardEmail}>✉️ {off.email}</Text> : null}
                        <View style={styles.officerVerifiedBadge}>
                          <AppIcon name="shield-checkmark" size={12} color="#16a34a" style={{ marginRight: 4 }} />
                          <Text style={styles.officerVerifiedText}>Verified NIC Directory</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 4. WHATSAPP GATEWAY & QR OUTBOX TAB */}
            {activeAdminTab === 'whatsapp' && (
              <View style={styles.whatsappContainer}>
                {/* Admin WhatsApp Sender Config Card */}
                <View style={styles.waConfigCard}>
                  <View style={styles.waConfigHeader}>
                    <View>
                      <Text style={styles.waConfigTitle}>Centralized WhatsApp Sender Configuration</Text>
                      <Text style={styles.waConfigSubtitle}>
                        All one-time QR login codes are sent strictly from this Admin-configured number to the officer's registered mobile.
                      </Text>
                    </View>
                    <View style={styles.waStatusPill}>
                      <Text style={styles.waStatusPillText}>🟢 {waStatusBadge}</Text>
                    </View>
                  </View>

                  <View style={styles.waFormGrid}>
                    <View style={styles.waInputCol}>
                      <Text style={styles.waInputLabel}>Admin WhatsApp Number *</Text>
                      <TextInput
                        style={styles.waInputField}
                        value={waAdminNumber}
                        onChangeText={setWaAdminNumber}
                        placeholder="+91 91212 66269"
                        disableFullscreenUI={true}
                      />
                      <Text style={styles.waInputHint}>Controlled by Admin (The sender seen by users)</Text>
                    </View>

                    <View style={styles.waInputCol}>
                      <Text style={styles.waInputLabel}>Provider Gateway *</Text>
                      <View style={styles.waProviderRow}>
                        {['sandbox', 'meta', 'twilio'].map((p) => (
                          <TouchableOpacity
                            key={p}
                            style={[styles.waProviderPill, waProvider === p && styles.waProviderPillActive]}
                            onPress={() => setWaProvider(p)}
                          >
                            <Text style={[styles.waProviderPillText, waProvider === p && styles.waProviderPillTextActive]}>
                              {p === 'sandbox' ? 'Canteen Gateway' : p === 'meta' ? 'Meta Cloud' : 'Twilio'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.waInputHint}>Backend WhatsApp API integration</Text>
                    </View>

                    <View style={styles.waActionButtonsCol}>
                      <TouchableOpacity
                        style={styles.saveWaConfigBtn}
                        onPress={handleSaveWaConfig}
                        disabled={isSavingWaConfig}
                      >
                        {isSavingWaConfig ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.saveWaConfigBtnText}>Save Configuration</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.testWaBtn}
                        onPress={() => setShowTestWaModal(true)}
                      >
                        <Text style={styles.testWaBtnText}>✉️ Test WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Dispatched QR Outbox Section */}
                <View style={styles.outboxSection}>
                  <View style={styles.outboxSectionHeader}>
                    <Text style={styles.outboxSectionTitle}>
                      Dispatched QR Codes Outbox ({waOutboxList.length})
                    </Text>
                    <Text style={styles.outboxSectionSub}>
                      Live audit of one-time login credentials sent to registered officers
                    </Text>
                  </View>

                  {waOutboxList.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No WhatsApp QR Messages Dispatched</Text>
                      <Text style={styles.emptySub}>
                        When an officer registers in the app, a one-time QR login code is dispatched here automatically.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.outboxGrid}>
                      {waOutboxList.map((msg, idx) => {
                        const tokenRec = waTokensList.find((t) => t.id === msg.qrId) || {};
                        const isUsed = tokenRec.used;
                        const isExpired = tokenRec.expiresAt && new Date(tokenRec.expiresAt) < new Date();
                        const isCopied = copiedPayloadId === msg.qrId;

                        let statusLabel = '🟢 ACTIVE (1-Time)';
                        let statusStyle = styles.waBadgeActive;
                        let textStyle = styles.waBadgeTextActive;

                        if (isUsed) {
                          statusLabel = '⚪ USED';
                          statusStyle = styles.waBadgeUsed;
                          textStyle = styles.waBadgeTextUsed;
                        } else if (isExpired) {
                          statusLabel = '🔴 EXPIRED';
                          statusStyle = styles.waBadgeExpired;
                          textStyle = styles.waBadgeTextExpired;
                        }

                        const qrUrl = msg.qrImage
                          ? `${getApiBase()}${msg.qrImage}`
                          : (msg.qrDataUrl || '');

                        return (
                          <View key={msg.id || idx} style={styles.outboxCard}>
                            <View style={styles.outboxCardHeader}>
                              <View>
                                <Text style={styles.outboxSenderText}>From: {msg.from || '+91 91212 66269'}</Text>
                                <Text style={styles.outboxRecipientText}>To: 📱 {msg.to}</Text>
                              </View>
                              <View style={[styles.waBadge, statusStyle]}>
                                <Text style={[styles.waBadgeText, textStyle]}>{statusLabel}</Text>
                              </View>
                            </View>

                            <View style={styles.outboxCardBody}>
                              {qrUrl ? (
                                <Image source={{ uri: qrUrl }} style={styles.outboxQrThumb} />
                              ) : (
                                <View style={styles.outboxQrPlaceholder}>
                                  <AppIcon name="qr-code-outline" size={28} color="#0a3d31" />
                                </View>
                              )}

                              <View style={styles.outboxCardDetails}>
                                <Text style={styles.outboxOfficerName}>{msg.userName || 'IAS Officer'}</Text>
                                <Text style={styles.outboxTimeText}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </Text>
                                <Text style={styles.outboxNote} numberOfLines={2}>
                                  One-time QR login code valid for 5 minutes.
                                </Text>

                                <TouchableOpacity
                                  style={[styles.copyPayloadBtn, isCopied && styles.copyPayloadBtnDone]}
                                  onPress={() => handleCopyPayload(msg.qrPayload, msg.qrId)}
                                >
                                  <Text style={[styles.copyPayloadBtnText, isCopied && styles.copyPayloadBtnTextDone]}>
                                    {isCopied ? '✓ Copied Payload' : '📋 Copy QR Payload for Test'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Add Dish Modal */}
      {showAddDishModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Canteen Food Item</Text>
              <TouchableOpacity onPress={() => setShowAddDishModal(false)}>
                <AppIcon name="arrow-back" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {dishFormError ? <Text style={styles.errorText}>{dishFormError}</Text> : null}

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Dish Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Masala Dosa, Shahi Thali"
                value={dishForm.name}
                onChangeText={(val) => setDishForm({ ...dishForm, name: val })}
                disableFullscreenUI={true}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Meal Category *</Text>
                  <View style={styles.catSelector}>
                    {['breakfast', 'lunch', 'dinner', 'snacks'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catPill, dishForm.category === cat && styles.catPillActive]}
                        onPress={() => setDishForm({ ...dishForm, category: cat })}
                      >
                        <Text
                          style={[styles.catPillText, dishForm.category === cat && styles.catPillTextActive]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ width: 120 }}>
                  <Text style={styles.inputLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 85"
                    keyboardType="numeric"
                    value={dishForm.price}
                    onChangeText={(val) => setDishForm({ ...dishForm, price: val })}
                    disableFullscreenUI={true}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Portion Specification</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 2 pcs with Sambar & Chutneys"
                value={dishForm.portion}
                onChangeText={(val) => setDishForm({ ...dishForm, portion: val })}
                disableFullscreenUI={true}
              />

              <Text style={styles.inputLabel}>Food Photo URL</Text>
              <TextInput
                style={styles.inputField}
                placeholder="https://images.unsplash.com/..."
                value={dishForm.image}
                onChangeText={(val) => setDishForm({ ...dishForm, image: val })}
                disableFullscreenUI={true}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.inputField, { height: 60 }]}
                placeholder="Fresh ingredients, dietary remarks..."
                multiline
                value={dishForm.description}
                onChangeText={(val) => setDishForm({ ...dishForm, description: val })}
                disableFullscreenUI={true}
              />

              {/* Veg Toggle */}
              <View style={styles.vegToggleRow}>
                <Text style={styles.inputLabel}>Dietary Type</Text>
                <TouchableOpacity
                  style={[styles.vegBtn, dishForm.isVeg ? styles.vegBtnActive : styles.nonVegBtnActive]}
                  onPress={() => setDishForm({ ...dishForm, isVeg: !dishForm.isVeg })}
                >
                  <Text style={styles.vegBtnText}>{dishForm.isVeg ? '🌱 Pure Vegetarian' : '🍖 Non-Vegetarian'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddDishModal(false)}
                disabled={savingDish}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateDish}
                disabled={savingDish}
              >
                {savingDish ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Dish to Canteen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Test WhatsApp Modal */}
      {showTestWaModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✉️ Send Test WhatsApp Message</Text>
              <TouchableOpacity onPress={() => setShowTestWaModal(false)}>
                <AppIcon name="arrow-back" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Recipient Mobile Number *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="+91 98888 88888 or 9888888888"
              value={testWaPhone}
              onChangeText={setTestWaPhone}
              keyboardType="phone-pad"
              disableFullscreenUI={true}
            />
            <Text style={styles.waInputHint}>Will be dispatched from Admin WhatsApp {waAdminNumber}</Text>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Custom Message (Optional)</Text>
            <TextInput
              style={[styles.inputField, { height: 64, textAlignVertical: 'top' }]}
              placeholder="Testing Canteen Services WhatsApp gateway delivery..."
              value={testWaMsg}
              onChangeText={setTestWaMsg}
              multiline
              disableFullscreenUI={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowTestWaModal(false)}
                disabled={isSendingTestWa}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#16a34a' }]}
                onPress={handleSendTestWa}
                disabled={isSendingTestWa || !testWaPhone.trim()}
              >
                {isSendingTestWa ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0a3d31',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a3d31',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a3d31',
  },
  portalLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d31',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  portalLaunchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statSub: {
    fontSize: 9,
    color: '#94a3b8',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tabBtnActive: {
    backgroundColor: '#0a3d31',
    borderColor: '#0a3d31',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  addDishBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addDishBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
  },
  ordersGrid: {
    gap: 12,
  },
  orderAdminCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
  },
  orderAdminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  orderTokenText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0a3d31',
  },
  orderIdText: {
    fontSize: 10,
    color: '#64748b',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeReady: {
    backgroundColor: '#dbeafe',
  },
  badgeDelivered: {
    backgroundColor: '#dcfce7',
  },
  badgeCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  badgeTextReady: {
    color: '#1d4ed8',
  },
  badgeTextDelivered: {
    color: '#15803d',
  },
  badgeTextCancelled: {
    color: '#b91c1c',
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  officerMiniPic: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  officerPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  officerPhoneText: {
    fontSize: 10,
    color: '#64748b',
  },
  orderTimeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  itemsListContainer: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  itemAdminRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  itemQtyText: {
    color: '#0a3d31',
    fontWeight: '700',
  },
  itemPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a3d31',
  },
  noteBox: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#fffbeb',
    borderRadius: 6,
  },
  noteText: {
    fontSize: 11,
    color: '#b45309',
    fontStyle: 'italic',
  },
  orderAdminFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0a3d31',
  },
  statusButtonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPrepare: {
    backgroundColor: '#fef3c7',
  },
  btnPrepareText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  btnReady: {
    backgroundColor: '#dbeafe',
  },
  btnReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  btnDelivered: {
    backgroundColor: '#16a34a',
  },
  btnDeliveredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  foodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  foodAdminCard: {
    width: '48.8%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  foodAdminImage: {
    width: 100,
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  foodAdminContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  foodAdminHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodAdminCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0a3d31',
  },
  foodAdminPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0a3d31',
  },
  foodAdminTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  foodAdminDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  foodAdminFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stockBadge: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  deleteFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteFoodText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  officersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  officerCard: {
    width: '48.8%',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  officerCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#0a3d31',
  },
  officerCardInfo: {
    flex: 1,
  },
  officerCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  officerCardDesignation: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  officerCardPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  officerCardEmail: {
    fontSize: 10,
    color: '#64748b',
  },
  officerVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  officerVerifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  emptyCard: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    width: 520,
    maxWidth: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a3d31',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 11,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  catPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  catPillActive: {
    backgroundColor: '#0a3d31',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  vegToggleRow: {
    marginTop: 10,
  },
  vegBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e6f4ea',
    borderWidth: 1,
    borderColor: '#a3cfbb',
  },
  vegBtnActive: {
    backgroundColor: '#e6f4ea',
  },
  nonVegBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  vegBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a3d31',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0a3d31',
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* WhatsApp & QR Outbox Styles */
  whatsappContainer: {
    gap: 16,
  },
  waConfigCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  waConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  waConfigTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a3d31',
  },
  waConfigSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  waStatusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  waStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  waFormGrid: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  waInputCol: {
    flex: 1,
  },
  waInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  waInputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0f172a',
  },
  waInputHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
  },
  waProviderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  waProviderPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  waProviderPillActive: {
    backgroundColor: '#0a3d31',
  },
  waProviderPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  waProviderPillTextActive: {
    color: '#ffffff',
  },
  waActionButtonsCol: {
    gap: 8,
    justifyContent: 'center',
    paddingTop: 18,
  },
  saveWaConfigBtn: {
    backgroundColor: '#0a3d31',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveWaConfigBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  testWaBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  testWaBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  outboxSection: {
    marginTop: 4,
  },
  outboxSectionHeader: {
    marginBottom: 10,
  },
  outboxSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  outboxSectionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  outboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outboxCard: {
    width: '48.8%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  outboxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
    marginBottom: 8,
  },
  outboxSenderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a3d31',
  },
  outboxRecipientText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  waBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  waBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  waBadgeUsed: {
    backgroundColor: '#f1f5f9',
  },
  waBadgeExpired: {
    backgroundColor: '#fee2e2',
  },
  waBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  waBadgeTextActive: {
    color: '#15803d',
  },
  waBadgeTextUsed: {
    color: '#64748b',
  },
  waBadgeTextExpired: {
    color: '#b91c1c',
  },
  outboxCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outboxQrThumb: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3d31',
  },
  outboxQrPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outboxCardDetails: {
    flex: 1,
  },
  outboxOfficerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  outboxTimeText: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  outboxNote: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
  },
  copyPayloadBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  copyPayloadBtnDone: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  copyPayloadBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a3d31',
  },
  copyPayloadBtnTextDone: {
    color: '#15803d',
  },
});
