import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { AppIcon, IconName } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { BackendOrder } from '../types';

const EMBLEM_IMG = require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');

// Duration to display newly rejected orders prominently at the top before moving to bottom history (5 minutes)
const RECENT_REJECTION_MS = 5 * 60 * 1000;

const STATUS_STAGES: Array<{
  key: string;
  label: string;
  sublabel: string;
  icon: IconName;
}> = [
  { key: 'NEW', label: 'Order Placed', sublabel: 'Received at canteen desk', icon: 'checkmark-circle' },
  { key: 'PREPARING', label: 'Preparing Food', sublabel: 'Chef cooking your meal', icon: 'restaurant' },
  { key: 'READY', label: 'Ready', sublabel: 'Ready at pickup counter', icon: 'notifications-outline' },
  { key: 'COMPLETED', label: 'Completed', sublabel: 'Order fulfilled & collected', icon: 'checkmark-done-circle' },
];

function getStageIndex(status?: string): number {
  const s = (status || 'NEW').toUpperCase();
  if (s === 'PRE_ORDERED' || s === 'PENDING' || s === 'NEW') return 0;
  if (s === 'ACCEPTED' || s === 'PREPARING') return 1;
  if (s === 'READY') return 2;
  if (s === 'COMPLETED' || s === 'DELIVERED') return 3;
  if (s === 'CANCELLED' || s === 'REJECTED') return -1;
  return 0;
}

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export const OrderTrackingScreen: React.FC = () => {
  const {
    orderHistory,
    isOrderHistoryLoading,
    fetchOrderHistory,
    setActiveTab,
    payOrder,
    payBatchOrders,
    sendPaymentQr,
    sendBatchPaymentQr,
    userProfile,
  } = useCanteen();

  // Modal States for Single & Consolidated Payments
  const [selectedPayOrder, setSelectedPayOrder] = useState<BackendOrder | null>(null);
  const [selectedBillOrder, setSelectedBillOrder] = useState<BackendOrder | null>(null);

  const [selectedPayBatch, setSelectedPayBatch] = useState<{
    orderIds: string[];
    totalAmount: number;
    title: string;
    orders: BackendOrder[];
  } | null>(null);

  const [selectedBillBatch, setSelectedBillBatch] = useState<{
    orders: BackendOrder[];
    totalAmount: number;
    title: string;
  } | null>(null);

  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [isDispatchingQr, setIsDispatchingQr] = useState<boolean>(false);
  const [mobileDispatchNotice, setMobileDispatchNotice] = useState<string | null>(null);
  const [restaurantQrDataUrl, setRestaurantQrDataUrl] = useState<string | null>(null);
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null);
  const [payErrorMsg, setPayErrorMsg] = useState<string | null>(null);

  // Live timer tick to automatically transition expired rejected orders from top to bottom
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [dismissedFromTop, setDismissedFromTop] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 0. All Rejected / Cancelled Orders
  const rejectedOrders = orderHistory.filter((o) => {
    const s = (o.kitchenStatus || o.status || '').toUpperCase();
    return s === 'CANCELLED' || s === 'REJECTED';
  });

  // Helper to determine if rejected order is "recent" (placed/rejected within RECENT_REJECTION_MS and not dismissed)
  const isRecentlyRejected = (o: BackendOrder) => {
    const key = String(o.id || o._id || o.orderNumber);
    if (dismissedFromTop[key]) return false;

    const rawDate = o.updatedAt || o.createdAt;
    if (!rawDate) return false;
    const t = new Date(rawDate).getTime();
    if (isNaN(t)) return false;

    return (nowTimestamp - t) < RECENT_REJECTION_MS;
  };

  // Top Section: Recent Rejections (Shown at top for 5 mins)
  const recentlyRejectedOrders = rejectedOrders.filter((o) => isRecentlyRejected(o));

  // Bottom Section: Older Rejections (Moved to bottom of all orders)
  const olderRejectedOrders = rejectedOrders.filter((o) => !isRecentlyRejected(o));

  // 1. Active orders (in progress: NEW, ACCEPTED, PREPARING, READY)
  const activeOrders = orderHistory.filter((o) => {
    const s = (o.kitchenStatus || o.status || '').toUpperCase();
    return s !== 'COMPLETED' && s !== 'DELIVERED' && s !== 'CANCELLED' && s !== 'REJECTED';
  });

  // 2. Unpaid completed orders (Payment Due)
  const unpaidCompletedOrders = orderHistory.filter((o) => {
    const s = (o.kitchenStatus || o.status || '').toUpperCase();
    const p = (o.paymentStatus || '').toUpperCase();
    const isDone = s === 'COMPLETED' || s === 'DELIVERED';
    const isUnpaid = p !== 'PAID';
    return isDone && isUnpaid;
  });

  // Group into today's unpaid orders vs older unpaid orders
  const todayUnpaidOrders = unpaidCompletedOrders.filter((o) => isToday(o.createdAt));
  const olderUnpaidOrders = unpaidCompletedOrders.filter((o) => !isToday(o.createdAt));
  const todayTotalDue = todayUnpaidOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

  // 3. Paid orders (Previous / Past Paid Orders History)
  const paidCompletedOrders = orderHistory.filter((o) => {
    const p = (o.paymentStatus || '').toUpperCase();
    return p === 'PAID';
  });

  // Pay Modal for Today's Consolidated Bill
  const handleOpenTodayPayModal = async () => {
    if (todayUnpaidOrders.length === 0) return;
    const orderIds = todayUnpaidOrders.map((o) => String(o.id || o._id || o.orderNumber));
    const batch = {
      orderIds,
      totalAmount: todayTotalDue,
      title: "Today's Consolidated Bill",
      orders: todayUnpaidOrders,
    };
    setSelectedPayBatch(batch);
    setPayErrorMsg(null);
    setPaySuccessMsg(null);
    setMobileDispatchNotice("Sending Today's Combined QR & Bill to your WhatsApp...");
    setRestaurantQrDataUrl(null);
    setIsDispatchingQr(true);

    try {
      const result = await sendBatchPaymentQr(orderIds, todayTotalDue);
      if (result.success) {
        if (result.qrDataUrl) setRestaurantQrDataUrl(result.qrDataUrl);
        setMobileDispatchNotice(`✓ Combined Bill & QR sent to your registered mobile: ${result.registeredMobile || userProfile.mobile}`);
      } else {
        setMobileDispatchNotice('Note: Scan the official Restaurant UPI QR code below to pay.');
      }
    } catch (e) {
      setMobileDispatchNotice('Note: Scan the official Restaurant UPI QR code below to pay.');
    } finally {
      setIsDispatchingQr(false);
    }
  };

  const handleConfirmBatchPayment = async () => {
    if (!selectedPayBatch) return;
    setIsPaying(true);
    setPayErrorMsg(null);
    setPaySuccessMsg(null);

    try {
      const result = await payBatchOrders(selectedPayBatch.orderIds);
      if (result.success) {
        setPaySuccessMsg("Payment Successful! Today's orders marked as PAID and moved to Previous Orders.");
        setTimeout(() => {
          setSelectedPayBatch(null);
          setPaySuccessMsg(null);
          fetchOrderHistory();
        }, 1600);
      } else {
        setPayErrorMsg(result.error || 'Payment failed. Please try again.');
      }
    } catch (e: any) {
      setPayErrorMsg(e?.message || 'Network error during payment.');
    } finally {
      setIsPaying(false);
    }
  };

  // Pay Modal for Single Order
  const handleOpenSinglePayModal = async (order: BackendOrder) => {
    setSelectedPayOrder(order);
    setPayErrorMsg(null);
    setPaySuccessMsg(null);
    setMobileDispatchNotice('Sending Restaurant QR & Bill to your registered mobile via WhatsApp...');
    setRestaurantQrDataUrl(null);
    setIsDispatchingQr(true);

    try {
      const orderId = String(order.id || order._id || order.orderNumber);
      const result = await sendPaymentQr(orderId);
      if (result.success) {
        if (result.qrDataUrl) setRestaurantQrDataUrl(result.qrDataUrl);
        setMobileDispatchNotice(`✓ Restaurant QR & Bill sent to your registered mobile: ${result.registeredMobile || userProfile.mobile}`);
      } else {
        setMobileDispatchNotice('Note: Scan the official Restaurant UPI QR code below to pay.');
      }
    } catch (e) {
      setMobileDispatchNotice('Note: Scan the official Restaurant UPI QR code below to pay.');
    } finally {
      setIsDispatchingQr(false);
    }
  };

  const handleConfirmSinglePayment = async () => {
    if (!selectedPayOrder) return;
    const orderId = String(selectedPayOrder.id || selectedPayOrder._id || selectedPayOrder.orderNumber);
    setIsPaying(true);
    setPayErrorMsg(null);
    setPaySuccessMsg(null);

    try {
      const result = await payOrder(orderId);
      if (result.success) {
        setPaySuccessMsg('Payment Successful! Order has been marked as PAID.');
        setTimeout(() => {
          setSelectedPayOrder(null);
          setPaySuccessMsg(null);
          fetchOrderHistory();
        }, 1600);
      } else {
        setPayErrorMsg(result.error || 'Payment failed. Please try again.');
      }
    } catch (e: any) {
      setPayErrorMsg(e?.message || 'Network error during payment.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Page Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <AppIcon name="receipt" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>MY ORDERS</Text>
            <Text style={styles.headerSubtitle}>
              Track live kitchen preparation, settle completed bills, and view past receipts.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchOrderHistory()}
          activeOpacity={0.7}
          disabled={isOrderHistoryLoading}
        >
          {isOrderHistoryLoading ? (
            <ActivityIndicator size="small" color="#0d3829" />
          ) : (
            <>
              <AppIcon name="refresh" size={15} color="#0d3829" style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Real-time Indicator Badge */}
      <View style={styles.liveIndicatorBar}>
        <View style={styles.pulsingDot} />
        <Text style={styles.liveIndicatorText}>
          Real-time updates active via Kitchen Socket.IO link
        </Text>
      </View>

      {/* ========================================================================= */}
      {/* SECTION 0: RECENTLY REJECTED ORDERS (SHOW AT TOP FOR 5 MINUTES)           */}
      {/* ========================================================================= */}
      {recentlyRejectedOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.rejectedSectionBadge}>
              <AppIcon name="alert-circle" size={14} color="#dc2626" style={{ marginRight: 5 }} />
              <Text style={styles.rejectedSectionBadgeText}>Urgent Notice</Text>
            </View>
            <Text style={styles.sectionTitleRejected}>
              Recently Rejected Orders ({recentlyRejectedOrders.length})
            </Text>
          </View>

          {recentlyRejectedOrders.map((order) => {
            const rawTime = order.updatedAt || order.createdAt;
            const elapsedMs = rawTime ? Math.max(0, nowTimestamp - new Date(rawTime).getTime()) : 0;
            const remainingMin = Math.max(1, Math.ceil((RECENT_REJECTION_MS - elapsedMs) / 60000));

            return (
              <View key={order.id || order.orderNumber} style={styles.rejectedOrderCard}>
                <View style={styles.rejectedCardHeader}>
                  <View>
                    <View style={styles.orderNumberRow}>
                      <Text style={styles.rejectedOrderNumber}>Order #{order.orderNumber}</Text>
                      {order.tokenNumber ? (
                        <View style={styles.tokenPill}>
                          <Text style={styles.tokenPillText}>Token #{order.tokenNumber}</Text>
                        </View>
                      ) : null}
                      <View style={styles.badgeRejectedSmall}>
                        <AppIcon name="close" size={10} color="#ffffff" style={{ marginRight: 3 }} />
                        <Text style={styles.badgeRejectedSmallText}>ORDER REJECTED</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={styles.cardTimeText}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} at{' '}
                        {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                      <Text style={styles.topDurationBadge}>
                        • Showing at top ({remainingMin}m remaining)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rejectedAmountBox}>
                    <Text style={styles.rejectedAmountLabel}>STATUS</Text>
                    <Text style={styles.rejectedAmountValue}>REJECTED</Text>
                  </View>
                </View>

                {/* Notice Message Banner */}
                <View style={styles.rejectionNoticeBanner}>
                  <AppIcon name="alert-circle" size={18} color="#b91c1c" style={{ marginRight: 8, marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rejectionNoticeTitle}>Order Declined by Kitchen</Text>
                    <Text style={styles.rejectionNoticeDesc}>
                      This order was declined by the kitchen team. You will not be charged or billed for this order. It will automatically move to bottom history after 5 minutes.
                    </Text>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.itemsDivider} />
                <View style={styles.itemsList}>
                  {(order.items || []).map((item, iIdx) => (
                    <View key={iIdx} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}×</Text>
                      <Text style={[styles.itemName, { textDecorationLine: 'line-through', color: '#94a3b8' }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemPrice, { color: '#94a3b8' }]}>₹{item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                {/* Card Actions */}
                <View style={styles.rejectedCardActionsRow}>
                  <TouchableOpacity
                    style={styles.dismissToBottomBtn}
                    onPress={() => {
                      const key = String(order.id || order._id || order.orderNumber);
                      setDismissedFromTop((prev) => ({ ...prev, [key]: true }));
                    }}
                    activeOpacity={0.75}
                  >
                    <AppIcon name="arrow-down-circle-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                    <Text style={styles.dismissToBottomBtnText}>Move to Bottom</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => setActiveTab('home')}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="restaurant" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.reorderBtnText}>Browse Menu & Re-Order ➔</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: TODAY'S CONSOLIDATED PAYMENT DUE BILLS                        */}
      {/* ========================================================================= */}
      {todayUnpaidOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.dueBadgePill}>
              <AppIcon name="flame" size={14} color="#dc2626" style={{ marginRight: 5 }} />
              <Text style={styles.dueBadgePillText}>Action Required</Text>
            </View>
            <Text style={styles.sectionTitleDue}>
              Today's Payment Due ({todayUnpaidOrders.length} {todayUnpaidOrders.length === 1 ? 'Bill' : 'Bills Combined'})
            </Text>
          </View>

          {/* Single Consolidated Card for Today's Bills */}
          <View style={styles.dueOrderCard}>
            <View style={styles.dueCardHeader}>
              <View>
                <View style={styles.orderNumberRow}>
                  <Text style={styles.dueOrderNumber}>
                    {todayUnpaidOrders.length === 1
                      ? `Order #${todayUnpaidOrders[0].orderNumber}`
                      : `Today's Combined Bill (${todayUnpaidOrders.length} Orders)`}
                  </Text>
                  <View style={styles.badgeCompletedSmall}>
                    <Text style={styles.badgeCompletedSmallText}>COMPLETED</Text>
                  </View>
                  <View style={styles.badgeUnpaidSmall}>
                    <Text style={styles.badgeUnpaidSmallText}>UNPAID</Text>
                  </View>
                </View>
                <Text style={styles.cardTimeText}>
                  Today • {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
              </View>

              <View style={styles.dueAmountBox}>
                <Text style={styles.dueAmountLabel}>TOTAL AMOUNT DUE</Text>
                <Text style={styles.dueAmountValue}>₹{todayTotalDue}</Text>
              </View>
            </View>

            {/* List All Items for Today's Orders */}
            <View style={styles.itemsDivider} />
            <View style={styles.consolidatedOrderList}>
              {todayUnpaidOrders.map((order, oIdx) => (
                <View key={order.id || order.orderNumber || oIdx} style={styles.singleOrderGroup}>
                  <View style={styles.orderSubHeaderRow}>
                    <Text style={styles.orderSubNumber}>Order #{order.orderNumber}</Text>
                    <Text style={styles.orderSubTime}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      {' • '}₹{order.totalAmount}
                    </Text>
                  </View>
                  <View style={styles.itemsList}>
                    {(order.items || []).map((item, iIdx) => (
                      <View key={iIdx} style={styles.itemRow}>
                        <Text style={styles.itemQuantity}>{item.quantity}×</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                      </View>
                    ))}
                  </View>
                  {oIdx < todayUnpaidOrders.length - 1 && <View style={styles.subOrderDivider} />}
                </View>
              ))}
            </View>

            {/* Action Buttons: VIEW BILL + SINGLE PAY NOW BUTTON */}
            <View style={styles.dueCardActionsRow}>
              <TouchableOpacity
                style={styles.viewBillBtn}
                onPress={() => {
                  setSelectedBillBatch({
                    orders: todayUnpaidOrders,
                    totalAmount: todayTotalDue,
                    title: "Today's Consolidated Bill",
                  });
                }}
                activeOpacity={0.8}
              >
                <AppIcon name="document-text-outline" size={15} color="#0d3829" style={{ marginRight: 6 }} />
                <Text style={styles.viewBillBtnText}>VIEW BILL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={handleOpenTodayPayModal}
                activeOpacity={0.85}
              >
                <AppIcon name="card" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.payNowBtnText}>
                  PAY NOW (₹{todayTotalDue})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Older Unpaid Orders (if from previous days) */}
      {olderUnpaidOrders.length > 0 && (
        <View style={[styles.section, { marginTop: 14 }]}>
          <Text style={[styles.sectionTitle, { color: '#b91c1c' }]}>
            Previous Unpaid Bills ({olderUnpaidOrders.length})
          </Text>
          {olderUnpaidOrders.map((order) => (
            <View key={order.id || order.orderNumber} style={styles.dueOrderCard}>
              <View style={styles.dueCardHeader}>
                <View>
                  <View style={styles.orderNumberRow}>
                    <Text style={styles.dueOrderNumber}>Order #{order.orderNumber}</Text>
                    <View style={styles.badgeCompletedSmall}>
                      <Text style={styles.badgeCompletedSmallText}>COMPLETED</Text>
                    </View>
                    <View style={styles.badgeUnpaidSmall}>
                      <Text style={styles.badgeUnpaidSmallText}>UNPAID</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTimeText}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} at{' '}
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>

                <View style={styles.dueAmountBox}>
                  <Text style={styles.dueAmountLabel}>AMOUNT DUE</Text>
                  <Text style={styles.dueAmountValue}>₹{order.totalAmount}</Text>
                </View>
              </View>

              <View style={styles.itemsDivider} />
              <View style={styles.itemsList}>
                {(order.items || []).map((item, iIdx) => (
                  <View key={iIdx} style={styles.itemRow}>
                    <Text style={styles.itemQuantity}>{item.quantity}×</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.dueCardActionsRow}>
                <TouchableOpacity
                  style={styles.viewBillBtn}
                  onPress={() => setSelectedBillOrder(order)}
                  activeOpacity={0.8}
                >
                  <AppIcon name="document-text-outline" size={15} color="#0d3829" style={{ marginRight: 6 }} />
                  <Text style={styles.viewBillBtnText}>VIEW BILL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.payNowBtn}
                  onPress={() => handleOpenSinglePayModal(order)}
                  activeOpacity={0.85}
                >
                  <AppIcon name="card" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.payNowBtnText}>PAY NOW (₹{order.totalAmount})</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ACTIVE ORDERS (IN PROGRESS: NEW -> ACCEPTED -> PREPARING -> READY) */}
      {/* ========================================================================= */}
      {activeOrders.length > 0 && (
        <View style={[styles.section, { marginTop: unpaidCompletedOrders.length > 0 ? 20 : 0 }]}>
          <Text style={styles.sectionTitle}>
            Active Orders ({activeOrders.length})
          </Text>

          {activeOrders.map((order) => {
            const currentStageIdx = getStageIndex(order.kitchenStatus || order.status);
            const currentStatus = (order.kitchenStatus || order.status || 'NEW').toUpperCase();

            return (
              <View key={order.id || order.orderNumber} style={styles.activeOrderCard}>
                {/* Order Top Bar */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.orderNumberRow}>
                      <Text style={styles.orderNumberText}>Order #{order.orderNumber}</Text>
                      {order.tokenNumber ? (
                        <View style={styles.tokenPill}>
                          <Text style={styles.tokenPillText}>Token #{order.tokenNumber}</Text>
                        </View>
                      ) : null}
                      <View style={styles.statusLivePill}>
                        <Text style={styles.statusLivePillText}>{currentStatus}</Text>
                      </View>
                      <View style={styles.badgeUnpaidSmall}>
                        <Text style={styles.badgeUnpaidSmallText}>UNPAID</Text>
                      </View>
                    </View>
                    <Text style={styles.cardTimeText}>
                      Placed at {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </Text>
                  </View>

                  <View style={styles.typeBadge}>
                    <AppIcon
                      name={order.orderType === 'PRE_ORDER' ? 'time-outline' : 'restaurant'}
                      size={13}
                      color="#0d3829"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.typeBadgeText}>
                      {order.orderType === 'PRE_ORDER' ? `Pre-Order (${order.pickupTime || 'Later'})` : 'Instant Order'}
                    </Text>
                  </View>
                </View>

                {/* 5-Stage Stepper */}
                <View style={styles.stepperContainer}>
                  <View style={styles.stepperTrack}>
                    {STATUS_STAGES.map((stage, idx) => {
                      const isDone = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;

                      return (
                        <React.Fragment key={stage.key}>
                          <View style={styles.stepNodeContainer}>
                            <View
                              style={[
                                styles.stepNodeCircle,
                                isDone && styles.stepNodeDone,
                                isCurrent && styles.stepNodeCurrent,
                              ]}
                            >
                              <AppIcon
                                name={stage.icon}
                                size={14}
                                color={isDone ? '#ffffff' : isCurrent ? '#ffffff' : '#94a3b8'}
                              />
                            </View>
                            <Text
                              style={[
                                styles.nodeLabel,
                                isCurrent && styles.nodeLabelCurrent,
                                isDone && styles.nodeLabelDone,
                              ]}
                              numberOfLines={1}
                            >
                              {stage.label}
                            </Text>
                          </View>

                          {idx < STATUS_STAGES.length - 1 && (
                            <View
                              style={[
                                styles.stepLine,
                                idx < currentStageIdx && styles.stepLineDone,
                              ]}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>

                {/* Current Stage Subtitle Banner */}
                <View style={styles.currentStageBanner}>
                  <AppIcon name="nutrition" size={14} color="#0d3829" style={{ marginRight: 6 }} />
                  <Text style={styles.currentStageBannerText}>
                    Status:{' '}
                    <Text style={{ fontWeight: '800', color: '#0d3829' }}>{currentStatus}</Text>
                    {' '}— {STATUS_STAGES[currentStageIdx]?.sublabel || ''}
                  </Text>
                </View>

                {/* Items Breakdown */}
                <View style={styles.itemsDivider} />
                <View style={styles.itemsList}>
                  {(order.items || []).map((item, iIdx) => (
                    <View key={iIdx} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}×</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                {order.orderNote ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>Special Request: {order.orderNote}</Text>
                  </View>
                ) : null}

                {/* Total & Notice */}
                <View style={styles.cardFooter}>
                  <Text style={styles.totalLabel}>Grand Total</Text>
                  <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
                </View>
                <Text style={styles.activePaymentNotice}>
                  ℹ️ Payment will become due after the order is completed and collected.
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State if No Active, No Due, and No Recent Rejected Orders */}
      {activeOrders.length === 0 && unpaidCompletedOrders.length === 0 && recentlyRejectedOrders.length === 0 && (
        <View style={styles.emptyActiveState}>
          <AppIcon name="restaurant-outline" size={36} color="#94a3b8" />
          <Text style={styles.emptyActiveTitle}>No Active Orders</Text>
          <Text style={styles.emptyActiveSub}>
            You have no orders currently in the kitchen.
          </Text>
          <TouchableOpacity
            style={styles.browseMenuBtn}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseMenuBtnText}>Browse Menu ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PREVIOUS ORDERS / PAST PAID ORDERS (PERMANENT HISTORY)        */}
      {/* ========================================================================= */}
      {paidCompletedOrders.length > 0 && (
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            Previous Orders • Paid History ({paidCompletedOrders.length})
          </Text>

          {paidCompletedOrders.map((order) => (
            <View key={order.id || order.orderNumber} style={styles.pastOrderCard}>
              <View style={styles.pastOrderHeader}>
                <View>
                  <Text style={styles.pastOrderNumber}>Order #{order.orderNumber}</Text>
                  <Text style={styles.pastOrderDate}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} at{' '}
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={styles.completedBadge}>
                    <AppIcon name="checkmark-circle" size={13} color="#15803d" style={{ marginRight: 4 }} />
                    <Text style={styles.completedBadgeText}>COMPLETED</Text>
                  </View>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>PAID</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.pastOrderItems}>
                {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </Text>

              <View style={styles.pastOrderFooter}>
                <Text style={styles.pastOrderAmount}>Total Paid: ₹{order.totalAmount}</Text>
                <TouchableOpacity
                  style={styles.pastOrderReceiptBtn}
                  onPress={() => setSelectedBillOrder(order)}
                >
                  <AppIcon name="document-text-outline" size={14} color="#0d3829" style={{ marginRight: 4 }} />
                  <Text style={styles.pastOrderReceiptText}>View Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: DECLINED & REJECTED ORDERS (MOVED TO BOTTOM OF ALL ORDERS)     */}
      {/* ========================================================================= */}
      {olderRejectedOrders.length > 0 && (
        <View style={[styles.section, { marginTop: 24, marginBottom: 20 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.olderRejectedSectionBadge}>
              <AppIcon name="close-circle" size={14} color="#64748b" style={{ marginRight: 5 }} />
              <Text style={styles.olderRejectedSectionBadgeText}>History</Text>
            </View>
            <Text style={styles.sectionTitleMuted}>
              Declined & Rejected Orders ({olderRejectedOrders.length})
            </Text>
          </View>

          {olderRejectedOrders.map((order) => (
            <View key={order.id || order.orderNumber} style={styles.olderRejectedOrderCard}>
              <View style={styles.pastOrderHeader}>
                <View>
                  <View style={styles.orderNumberRow}>
                    <Text style={styles.olderRejectedOrderNumber}>Order #{order.orderNumber}</Text>
                    {order.tokenNumber ? (
                      <View style={styles.tokenPillMuted}>
                        <Text style={styles.tokenPillMutedText}>Token #{order.tokenNumber}</Text>
                      </View>
                    ) : null}
                    <View style={styles.badgeRejectedMuted}>
                      <Text style={styles.badgeRejectedMutedText}>DECLINED</Text>
                    </View>
                  </View>
                  <Text style={styles.cardTimeText}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''} at{' '}
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>

                <View style={styles.rejectedAmountBoxMuted}>
                  <Text style={styles.rejectedAmountLabelMuted}>NOT BILLED</Text>
                  <Text style={styles.rejectedAmountValueMuted}>₹0.00</Text>
                </View>
              </View>

              <Text style={styles.pastOrderItems}>
                {(order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </Text>

              <View style={styles.pastOrderFooter}>
                <Text style={styles.olderRejectedReasonText}>
                  Declined by kitchen • No charges applied
                </Text>
                <TouchableOpacity
                  style={styles.reorderSmallBtn}
                  onPress={() => setActiveTab('home')}
                  activeOpacity={0.8}
                >
                  <AppIcon name="restaurant" size={12} color="#0d3829" style={{ marginRight: 4 }} />
                  <Text style={styles.reorderSmallBtnText}>Re-Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CONSOLIDATED BATCH PAY MODAL                                     */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedPayBatch)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isPaying && setSelectedPayBatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.payModalCard}>
            <View style={styles.payModalHeader}>
              <View style={styles.payModalHeaderLeft}>
                <AppIcon name="wallet" size={20} color="#0d3829" />
                <Text style={styles.payModalTitle}>Settle Today's Bill</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isPaying && setSelectedPayBatch(null)}
                style={styles.closeModalXBtn}
              >
                <AppIcon name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {paySuccessMsg ? (
              <View style={styles.paySuccessBox}>
                <AppIcon name="checkmark-circle" size={48} color="#16a34a" />
                <Text style={styles.paySuccessTitle}>Payment Received!</Text>
                <Text style={styles.paySuccessSub}>{paySuccessMsg}</Text>
              </View>
            ) : (
              <>
                <View style={styles.payDueAmountContainer}>
                  <Text style={styles.payDueAmountLabel}>TOTAL AMOUNT DUE FOR TODAY ({selectedPayBatch?.orders.length} ORDERS)</Text>
                  <Text style={styles.payDueAmountBig}>₹{selectedPayBatch?.totalAmount}</Text>
                </View>

                {mobileDispatchNotice ? (
                  <View style={styles.mobileDispatchBanner}>
                    <AppIcon name="phone-portrait-outline" size={15} color="#0d3829" style={{ marginRight: 6 }} />
                    <Text style={styles.mobileDispatchBannerText}>{mobileDispatchNotice}</Text>
                  </View>
                ) : null}

                <View style={styles.qrContainerBox}>
                  <Text style={styles.qrInstructionsTitle}>Scan using any UPI App</Text>
                  <View style={styles.qrMockFrame}>
                    {restaurantQrDataUrl ? (
                      <Image
                        source={{ uri: restaurantQrDataUrl }}
                        style={{ width: 140, height: 140, borderRadius: 8 }}
                        resizeMode="contain"
                      />
                    ) : isDispatchingQr ? (
                      <ActivityIndicator size="large" color="#0d3829" />
                    ) : (
                      <AppIcon name="qr-code" size={130} color="#0d3829" />
                    )}
                  </View>
                  <Text style={styles.upiIdText}>UPI ID: canteen.services@gov</Text>
                  <Text style={styles.supportedAppsText}>
                    Google Pay • PhonePe • Paytm • BHIM UPI
                  </Text>

                  <TouchableOpacity
                    style={styles.resendQrBtn}
                    onPress={handleOpenTodayPayModal}
                    disabled={isDispatchingQr || isPaying}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="logo-whatsapp" size={14} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.resendQrBtnText}>
                      {isDispatchingQr ? 'Dispatching to WhatsApp...' : 'Re-send Bill & QR to WhatsApp'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {payErrorMsg ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{payErrorMsg}</Text>
                  </View>
                ) : null}

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setSelectedPayBatch(null)}
                    disabled={isPaying}
                  >
                    <Text style={styles.cancelModalBtnText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmPayBtn}
                    onPress={handleConfirmBatchPayment}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <AppIcon name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmPayBtnText}>CONFIRM PAYMENT (₹{selectedPayBatch?.totalAmount})</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: SINGLE ORDER PAY MODAL                                           */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedPayOrder)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isPaying && setSelectedPayOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.payModalCard}>
            <View style={styles.payModalHeader}>
              <View style={styles.payModalHeaderLeft}>
                <AppIcon name="wallet" size={20} color="#0d3829" />
                <Text style={styles.payModalTitle}>Settle Bill #{selectedPayOrder?.orderNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isPaying && setSelectedPayOrder(null)}
                style={styles.closeModalXBtn}
              >
                <AppIcon name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {paySuccessMsg ? (
              <View style={styles.paySuccessBox}>
                <AppIcon name="checkmark-circle" size={48} color="#16a34a" />
                <Text style={styles.paySuccessTitle}>Payment Received!</Text>
                <Text style={styles.paySuccessSub}>{paySuccessMsg}</Text>
              </View>
            ) : (
              <>
                <View style={styles.payDueAmountContainer}>
                  <Text style={styles.payDueAmountLabel}>TOTAL AMOUNT DUE</Text>
                  <Text style={styles.payDueAmountBig}>₹{selectedPayOrder?.totalAmount}</Text>
                </View>

                {mobileDispatchNotice ? (
                  <View style={styles.mobileDispatchBanner}>
                    <AppIcon name="phone-portrait-outline" size={15} color="#0d3829" style={{ marginRight: 6 }} />
                    <Text style={styles.mobileDispatchBannerText}>{mobileDispatchNotice}</Text>
                  </View>
                ) : null}

                <View style={styles.qrContainerBox}>
                  <Text style={styles.qrInstructionsTitle}>Scan using any UPI App</Text>
                  <View style={styles.qrMockFrame}>
                    {restaurantQrDataUrl ? (
                      <Image
                        source={{ uri: restaurantQrDataUrl }}
                        style={{ width: 140, height: 140, borderRadius: 8 }}
                        resizeMode="contain"
                      />
                    ) : isDispatchingQr ? (
                      <ActivityIndicator size="large" color="#0d3829" />
                    ) : (
                      <AppIcon name="qr-code" size={130} color="#0d3829" />
                    )}
                  </View>
                  <Text style={styles.upiIdText}>UPI ID: canteen.services@gov</Text>
                  <Text style={styles.supportedAppsText}>
                    Google Pay • PhonePe • Paytm • BHIM UPI
                  </Text>
                </View>

                {payErrorMsg ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>{payErrorMsg}</Text>
                  </View>
                ) : null}

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelModalBtn}
                    onPress={() => setSelectedPayOrder(null)}
                    disabled={isPaying}
                  >
                    <Text style={styles.cancelModalBtnText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmPayBtn}
                    onPress={handleConfirmSinglePayment}
                    disabled={isPaying}
                  >
                    {isPaying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <AppIcon name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmPayBtnText}>CONFIRM PAYMENT</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CONSOLIDATED BATCH BILL MODAL                                    */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedBillBatch)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBillBatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCardWrapper}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* Receipt Header */}
              <View style={styles.rcBrandHeader}>
                <View style={styles.rcBrandLogoCol}>
                  <View style={styles.rcCircleLogo}>
                    <AppIcon name="restaurant" size={24} color="#ffffff" />
                  </View>
                </View>
                <View style={styles.rcBrandVDivider} />
                <View style={styles.rcBrandCenterCol}>
                  <Text style={styles.rcBrandTitle}>CANTEEN{"\n"}SERVICES</Text>
                  <Text style={styles.rcBrandSlogan}>GOOD FOOD{"\n"}GREATER SERVICE</Text>
                </View>
                <View style={styles.rcBrandVDivider} />
                <View style={styles.rcBrandRightCol}>
                  <Text style={styles.rcBrandPillText}>FRESH</Text>
                  <Text style={styles.rcBrandPillText}>HYGIENIC</Text>
                  <Text style={styles.rcBrandPillText}>NUTRITIOUS</Text>
                  <Text style={styles.rcBrandPillText}>FOR A BETTER YOU</Text>
                </View>
              </View>

              {/* Food Bill Pill */}
              <View style={styles.rcPillContainer}>
                <View style={styles.rcPillBanner}>
                  <Text style={styles.rcPillBannerText}>FOOD BILL</Text>
                </View>
                <Text style={styles.rcPillSubtitle}>THANK YOU FOR DINING WITH US</Text>
              </View>

              {/* Meta & Table Box */}
              <View style={styles.rcMetaSection}>
                <View style={styles.rcMetaLeft}>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Bill No</Text>
                    <Text style={styles.rcMetaColon}>:</Text>
                    <Text style={[styles.rcMetaVal, { fontWeight: '800' }]}>#CS{new Date().toISOString().slice(2, 10).replace(/-/g, '')}</Text>
                  </View>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Date</Text>
                    <Text style={styles.rcMetaColon}>:</Text>
                    <Text style={styles.rcMetaVal}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Time</Text>
                    <Text style={styles.rcMetaColon}>:</Text>
                    <Text style={styles.rcMetaVal}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                  </View>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Table</Text>
                    <Text style={styles.rcMetaColon}>:</Text>
                    <Text style={styles.rcMetaVal}>T-08</Text>
                  </View>
                  <View style={styles.rcMetaRow}>
                    <Text style={styles.rcMetaLabel}>Order Type</Text>
                    <Text style={styles.rcMetaColon}>:</Text>
                    <Text style={styles.rcMetaVal}>Dine In</Text>
                  </View>
                </View>

                <View style={styles.rcTableBadgeBox}>
                  <Text style={styles.rcTableBadgeHeader}>TABLE</Text>
                  <Text style={styles.rcTableBadgeMain}>T-08</Text>
                  <View style={styles.rcTableBadgeDivider} />
                  <Text style={styles.rcTableBadgeFooter}>HAVE A GREAT DAY</Text>
                </View>
              </View>

              {/* Dashed Line */}
              <View style={styles.rcDashedDivider} />

              {/* Items Table */}
              <View style={styles.rcTableHeader}>
                <Text style={[styles.rcTh, { width: 22 }]}>#</Text>
                <Text style={[styles.rcTh, { flex: 1 }]}>ITEM</Text>
                <Text style={[styles.rcTh, { width: 36, textAlign: 'center' }]}>QTY</Text>
                <Text style={[styles.rcTh, { width: 55, textAlign: 'right' }]}>RATE</Text>
                <Text style={[styles.rcTh, { width: 65, textAlign: 'right' }]}>AMOUNT</Text>
              </View>

              {(selectedBillBatch?.orders || []).flatMap((o) => o.items || []).map((item, idx) => (
                <View key={idx} style={styles.rcTableRow}>
                  <Text style={[styles.rcTd, { width: 22 }]}>{idx + 1}</Text>
                  <Text style={[styles.rcTd, { flex: 1, fontWeight: '500' }]}>{item.name}</Text>
                  <Text style={[styles.rcTd, { width: 36, textAlign: 'center' }]}>{item.quantity}</Text>
                  <Text style={[styles.rcTd, { width: 55, textAlign: 'right' }]}>₹{(item.price || 0).toFixed(0)}</Text>
                  <Text style={[styles.rcTd, { width: 65, textAlign: 'right', fontWeight: '700' }]}>₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}</Text>
                </View>
              ))}

              {/* Totals Section */}
              <View style={styles.rcTotalsWrapper}>
                <View style={[styles.rcTotalsRow, { marginTop: 2 }]}>
                  <Text style={[styles.rcTotLabel, { fontWeight: '900', fontSize: 13 }]}>TOTAL AMOUNT</Text>
                  <Text style={[styles.rcTotVal, { fontWeight: '900', fontSize: 16 }]}>₹{(selectedBillBatch?.totalAmount || 0).toFixed(0)}</Text>
                </View>
              </View>

              {/* Dashed Line */}
              <View style={styles.rcDashedDivider} />

              {/* Delight Footer */}
              <View style={styles.rcDelightSection}>
                <View style={styles.rcDelightLeft}>
                  <AppIcon name="restaurant" size={24} color="#000000" />
                  <View style={{ marginLeft: 6 }}>
                    <Text style={styles.rcDelightText}>GOOD FOOD</Text>
                    <Text style={styles.rcDelightText}>BRIGHTER DAYS</Text>
                  </View>
                </View>
                <View style={styles.rcDelightRight}>
                  <Text style={styles.rcScriptThankYou}>Thank You!</Text>
                  <Text style={styles.rcVisitAgain}>VISIT AGAIN</Text>
                </View>
              </View>

              {/* Dashed Line */}
              <View style={styles.rcDashedDivider} />

              {/* Feedback Section */}
              <View style={styles.rcFeedbackSection}>
                <AppIcon name="qr-code-outline" size={38} color="#000000" />
                <View style={styles.rcFeedbackVDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rcFeedbackMain}>Scan to share your feedback</Text>
                  <Text style={styles.rcFeedbackSub}>YOUR FEEDBACK HELPS US SERVE BETTER</Text>
                </View>
              </View>

              {/* Bottom Branding */}
              <View style={styles.rcBottomBranding}>
                <Text style={styles.rcBottomTitle}>CANTEEN SERVICES</Text>
                <Text style={styles.rcBottomSub}>GOOD FOOD. GREATER SERVICE.</Text>
              </View>

              <TouchableOpacity
                style={styles.closeBillBtn}
                onPress={() => setSelectedBillBatch(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBillBtnText}>Close Receipt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: SINGLE VIEW BILL MODAL                                           */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedBillOrder)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedBillOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCardWrapper}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {(() => {
                const invNum = selectedBillOrder?.orderNumber
                  ? (selectedBillOrder.orderNumber.startsWith('INV-') || selectedBillOrder.orderNumber.startsWith('#') ? selectedBillOrder.orderNumber : `#CS${selectedBillOrder.orderNumber.replace(/\D/g, '').slice(-6).padStart(6, '0') || '241027'}`)
                  : '#CS241027';
                const createdAtDate = selectedBillOrder?.createdAt ? new Date(selectedBillOrder.createdAt) : new Date();
                const dateFormatted = createdAtDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const timeFormatted = createdAtDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });
                const tokenNo = selectedBillOrder?.tokenNumber || (selectedBillOrder?.orderNumber ? selectedBillOrder.orderNumber.slice(-2) : '08');
                const tableStr = `T-${String(tokenNo).padStart(2, '0')}`;
                const totalAmt = Number(selectedBillOrder?.totalAmount || 0);
                const gstAmt = Math.round(totalAmt * 0.05);
                const subtotalAmt = totalAmt - gstAmt > 0 ? totalAmt - gstAmt : totalAmt;

                return (
                  <>
                    {/* Brand Header */}
                    <View style={styles.rcBrandHeader}>
                      <View style={styles.rcBrandLogoCol}>
                        <View style={styles.rcCircleLogo}>
                          <AppIcon name="restaurant" size={24} color="#ffffff" />
                        </View>
                      </View>
                      <View style={styles.rcBrandVDivider} />
                      <View style={styles.rcBrandCenterCol}>
                        <Text style={styles.rcBrandTitle}>CANTEEN{"\n"}SERVICES</Text>
                        <Text style={styles.rcBrandSlogan}>GOOD FOOD{"\n"}GREATER SERVICE</Text>
                      </View>
                      <View style={styles.rcBrandVDivider} />
                      <View style={styles.rcBrandRightCol}>
                        <Text style={styles.rcBrandPillText}>FRESH</Text>
                        <Text style={styles.rcBrandPillText}>HYGIENIC</Text>
                        <Text style={styles.rcBrandPillText}>NUTRITIOUS</Text>
                        <Text style={styles.rcBrandPillText}>FOR A BETTER YOU</Text>
                      </View>
                    </View>

                    {/* Food Bill Pill */}
                    <View style={styles.rcPillContainer}>
                      <View style={styles.rcPillBanner}>
                        <Text style={styles.rcPillBannerText}>FOOD BILL</Text>
                      </View>
                      <Text style={styles.rcPillSubtitle}>THANK YOU FOR DINING WITH US</Text>
                    </View>

                    {/* Meta Info & Table Box */}
                    <View style={styles.rcMetaSection}>
                      <View style={styles.rcMetaLeft}>
                        <View style={styles.rcMetaRow}>
                          <Text style={styles.rcMetaLabel}>Bill No</Text>
                          <Text style={styles.rcMetaColon}>:</Text>
                          <Text style={[styles.rcMetaVal, { fontWeight: '800' }]}>{invNum}</Text>
                        </View>
                        <View style={styles.rcMetaRow}>
                          <Text style={styles.rcMetaLabel}>Date</Text>
                          <Text style={styles.rcMetaColon}>:</Text>
                          <Text style={styles.rcMetaVal}>{dateFormatted}</Text>
                        </View>
                        <View style={styles.rcMetaRow}>
                          <Text style={styles.rcMetaLabel}>Time</Text>
                          <Text style={styles.rcMetaColon}>:</Text>
                          <Text style={styles.rcMetaVal}>{timeFormatted}</Text>
                        </View>
                        <View style={styles.rcMetaRow}>
                          <Text style={styles.rcMetaLabel}>Table</Text>
                          <Text style={styles.rcMetaColon}>:</Text>
                          <Text style={styles.rcMetaVal}>{tableStr}</Text>
                        </View>
                        <View style={styles.rcMetaRow}>
                          <Text style={styles.rcMetaLabel}>Order Type</Text>
                          <Text style={styles.rcMetaColon}>:</Text>
                          <Text style={styles.rcMetaVal}>Dine In</Text>
                        </View>
                      </View>

                      <View style={styles.rcTableBadgeBox}>
                        <Text style={styles.rcTableBadgeHeader}>TABLE</Text>
                        <Text style={styles.rcTableBadgeMain}>{tableStr}</Text>
                        <View style={styles.rcTableBadgeDivider} />
                        <Text style={styles.rcTableBadgeFooter}>HAVE A GREAT DAY</Text>
                      </View>
                    </View>

                    {/* Dashed Line */}
                    <View style={styles.rcDashedDivider} />

                    {/* Items Table */}
                    <View style={styles.rcTableHeader}>
                      <Text style={[styles.rcTh, { width: 22 }]}>#</Text>
                      <Text style={[styles.rcTh, { flex: 1 }]}>ITEM</Text>
                      <Text style={[styles.rcTh, { width: 36, textAlign: 'center' }]}>QTY</Text>
                      <Text style={[styles.rcTh, { width: 55, textAlign: 'right' }]}>RATE</Text>
                      <Text style={[styles.rcTh, { width: 65, textAlign: 'right' }]}>AMOUNT</Text>
                    </View>

                    {(selectedBillOrder?.items || []).map((item, idx) => (
                      <View key={idx} style={styles.rcTableRow}>
                        <Text style={[styles.rcTd, { width: 22 }]}>{idx + 1}</Text>
                        <Text style={[styles.rcTd, { flex: 1, fontWeight: '500' }]}>{item.name}</Text>
                        <Text style={[styles.rcTd, { width: 36, textAlign: 'center' }]}>{item.quantity}</Text>
                        <Text style={[styles.rcTd, { width: 55, textAlign: 'right' }]}>₹{(item.price || 0).toFixed(0)}</Text>
                        <Text style={[styles.rcTd, { width: 65, textAlign: 'right', fontWeight: '700' }]}>
                          ₹{((item.price || 0) * (item.quantity || 1)).toFixed(0)}
                        </Text>
                      </View>
                    ))}

                    {/* Totals Section */}
                    <View style={styles.rcTotalsWrapper}>
                      <View style={[styles.rcTotalsRow, { marginTop: 2 }]}>
                        <Text style={[styles.rcTotLabel, { fontWeight: '900', fontSize: 13 }]}>TOTAL AMOUNT</Text>
                        <Text style={[styles.rcTotVal, { fontWeight: '900', fontSize: 16 }]}>₹{totalAmt.toFixed(0)}</Text>
                      </View>
                    </View>

                    {/* Dashed Line */}
                    <View style={styles.rcDashedDivider} />

                    {/* Delight Footer */}
                    <View style={styles.rcDelightSection}>
                      <View style={styles.rcDelightLeft}>
                        <AppIcon name="restaurant" size={24} color="#000000" />
                        <View style={{ marginLeft: 6 }}>
                          <Text style={styles.rcDelightText}>GOOD FOOD</Text>
                          <Text style={styles.rcDelightText}>BRIGHTER DAYS</Text>
                        </View>
                      </View>
                      <View style={styles.rcDelightRight}>
                        <Text style={styles.rcScriptThankYou}>Thank You!</Text>
                        <Text style={styles.rcVisitAgain}>VISIT AGAIN</Text>
                      </View>
                    </View>

                    {/* Dashed Line */}
                    <View style={styles.rcDashedDivider} />

                    {/* Feedback Section */}
                    <View style={styles.rcFeedbackSection}>
                      <AppIcon name="qr-code-outline" size={38} color="#000000" />
                      <View style={styles.rcFeedbackVDivider} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rcFeedbackMain}>Scan to share your feedback</Text>
                        <Text style={styles.rcFeedbackSub}>YOUR FEEDBACK HELPS US SERVE BETTER</Text>
                      </View>
                    </View>

                    {/* Bottom Branding */}
                    <View style={styles.rcBottomBranding}>
                      <Text style={styles.rcBottomTitle}>CANTEEN SERVICES</Text>
                      <Text style={styles.rcBottomSub}>GOOD FOOD. GREATER SERVICE.</Text>
                    </View>
                  </>
                );
              })()}

              <TouchableOpacity
                style={styles.closeBillBtn}
                onPress={() => setSelectedBillOrder(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBillBtnText}>Close Receipt</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0d3829',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d3829',
  },
  liveIndicatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dueBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  sectionTitleDue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  dueOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  dueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dueOrderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgeCompletedSmall: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCompletedSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  badgeUnpaidSmall: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeUnpaidSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#dc2626',
  },
  dueAmountBox: {
    alignItems: 'flex-end',
  },
  dueAmountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  dueAmountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dc2626',
  },
  consolidatedOrderList: {
    gap: 10,
  },
  singleOrderGroup: {
    backgroundColor: '#fafaf9',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0f0ee',
  },
  orderSubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderSubNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d3829',
  },
  orderSubTime: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  subOrderDivider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginVertical: 8,
  },
  dueCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewBillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d3829',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3829',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  payNowBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  activeOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  tokenPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tokenPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  statusLivePill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusLivePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0d3829',
  },
  cardTimeText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 3,
  },
  stepperContainer: {
    marginTop: 14,
    marginBottom: 12,
    width: '100%',
  },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepNodeContainer: {
    alignItems: 'center',
    width: 80,
  },
  stepNodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  stepNodeDone: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  stepNodeCurrent: {
    backgroundColor: '#0d3829',
    borderColor: '#0d3829',
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 5,
    textAlign: 'center',
  },
  nodeLabelCurrent: {
    fontWeight: '800',
    color: '#0d3829',
  },
  nodeLabelDone: {
    fontWeight: '700',
    color: '#16a34a',
  },
  stepLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: '#e2e8f0',
    marginBottom: 18,
    marginHorizontal: 2,
  },
  stepLineDone: {
    backgroundColor: '#16a34a',
  },
  currentStageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  currentStageBannerText: {
    fontSize: 11,
    color: '#15803d',
  },
  itemsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  itemsList: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d3829',
    width: 24,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
  },
  itemPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  noteText: {
    fontSize: 10.5,
    color: '#92400e',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0d3829',
  },
  activePaymentNotice: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyActiveState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  emptyActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyActiveSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  browseMenuBtn: {
    marginTop: 14,
    backgroundColor: '#0d3829',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  browseMenuBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pastOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  pastOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  pastOrderNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  pastOrderDate: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  paidBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  pastOrderItems: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  pastOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pastOrderAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  pastOrderReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pastOrderReceiptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d3829',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  payModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  payModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  payModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeModalXBtn: {
    padding: 4,
  },
  paySuccessBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  paySuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 10,
  },
  paySuccessSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  payDueAmountContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  payDueAmountLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  payDueAmountBig: {
    fontSize: 22,
    fontWeight: '900',
    color: '#dc2626',
    marginTop: 2,
  },
  mobileDispatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  mobileDispatchBannerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#047857',
    fontWeight: '600',
  },
  qrContainerBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  qrInstructionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  qrMockFrame: {
    width: 146,
    height: 146,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  upiIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d3829',
  },
  supportedAppsText: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 2,
  },
  resendQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  resendQrBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  errorBoxText: {
    fontSize: 11,
    color: '#dc2626',
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmPayBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#0d3829',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPayBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  billModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  billTaxHeader: {
    backgroundColor: '#0d3829',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTaxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billEmblemLarge: {
    width: 44,
    height: 48,
  },
  billTaxOrgTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  billTaxOrgSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  billTaxDocType: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  billTaxStatusPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  billTaxStatusPillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  billTaxStatusPillSub: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  billTaxGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 16,
  },
  billTaxGridCol: {
    flex: 1,
  },
  billTaxMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  billTaxMetaKey: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  billTaxMetaVal: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  billTaxTable: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  billTaxTableHead: {
    backgroundColor: '#0d3829',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  billTaxTh: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  billTaxTableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  billTaxTd: {
    fontSize: 11,
    color: '#334155',
  },
  billTaxBottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  billTaxReceiptBox: {
    flex: 1.1,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fdfdfd',
  },
  billTaxReceiptBoxTitle: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  billTaxReceiptBoxLine: {
    fontSize: 9.5,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  billTaxSummaryBox: {
    flex: 1,
  },
  billTaxSumLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  billTaxSumKey: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '600',
  },
  billTaxSumVal: {
    fontSize: 10.5,
    color: '#0f172a',
    fontWeight: '700',
  },
  billTaxTotalBanner: {
    backgroundColor: '#0d3829',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  billTaxTotalBannerLabel: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '900',
  },
  billTaxTotalBannerVal: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
  },
  closeBillBtn: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#0d3829',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  receiptCardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  rcBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  rcBrandLogoCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcCircleLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcBrandVDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#71717a',
    opacity: 0.6,
  },
  rcBrandCenterCol: {
    flex: 1.2,
  },
  rcBrandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  rcBrandSlogan: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#3f3f46',
    marginTop: 3,
    lineHeight: 10,
  },
  rcBrandRightCol: {
    flex: 1,
  },
  rcBrandPillText: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#3f3f46',
    lineHeight: 11,
  },
  rcPillContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rcPillBanner: {
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rcPillBannerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  rcPillSubtitle: {
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#3f3f46',
    marginTop: 5,
  },
  rcMetaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  rcMetaLeft: {
    flex: 1.2,
  },
  rcMetaRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
  },
  rcMetaLabel: {
    width: 72,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
  },
  rcMetaColon: {
    width: 12,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
  },
  rcMetaVal: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
  },
  rcTableBadgeBox: {
    width: 95,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  rcTableBadgeHeader: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#000000',
  },
  rcTableBadgeMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    marginVertical: 1,
  },
  rcTableBadgeDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#000000',
    marginVertical: 3,
  },
  rcTableBadgeFooter: {
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#3f3f46',
  },
  rcDashedDivider: {
    borderTopWidth: 1.2,
    borderTopColor: '#71717a',
    borderStyle: 'dashed',
    marginVertical: 10,
    width: '100%',
  },
  rcTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.2,
    borderBottomColor: '#000000',
    paddingBottom: 6,
    marginBottom: 4,
  },
  rcTh: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  rcTableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    alignItems: 'center',
  },
  rcTd: {
    fontSize: 11.5,
    color: '#000000',
  },
  rcTotalsWrapper: {
    alignItems: 'flex-end',
    borderTopWidth: 1.2,
    borderTopColor: '#000000',
    paddingTop: 5,
    marginTop: 4,
  },
  rcTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 170,
    paddingVertical: 1.5,
  },
  rcTotLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
  },
  rcTotVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
  },
  rcTotalsGrandDivider: {
    width: 170,
    height: 1.2,
    backgroundColor: '#000000',
    marginVertical: 3,
  },
  rcDelightSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rcDelightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rcDelightText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#000000',
  },
  rcDelightRight: {
    alignItems: 'flex-end',
  },
  rcScriptThankYou: {
    fontSize: 20,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#000000',
  },
  rcVisitAgain: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: '#3f3f46',
    marginTop: 1,
  },
  rcFeedbackSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  rcFeedbackVDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#71717a',
    opacity: 0.6,
  },
  rcFeedbackMain: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#000000',
  },
  rcFeedbackSub: {
    fontSize: 6.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#52525b',
    marginTop: 2,
  },
  rcBottomBranding: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  rcBottomTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#000000',
  },
  rcBottomSub: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#3f3f46',
    marginTop: 2,
  },

  closeBillBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitleRejected: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b91c1c',
  },
  rejectedSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rejectedSectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  rejectedOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rejectedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rejectedOrderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgeRejectedSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRejectedSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  rejectedAmountBox: {
    alignItems: 'flex-end',
  },
  rejectedAmountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#b91c1c',
    letterSpacing: 0.5,
  },
  rejectedAmountValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
  },
  rejectionNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  rejectionNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 2,
  },
  rejectionNoticeDesc: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 15,
  },
  rejectedCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  topDurationBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b91c1c',
    marginLeft: 6,
  },
  dismissToBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  dismissToBottomBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  olderRejectedSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  olderRejectedSectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  olderRejectedOrderCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  olderRejectedOrderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  tokenPillMuted: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  tokenPillMutedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  badgeRejectedMuted: {
    backgroundColor: '#cbd5e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeRejectedMutedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#334155',
  },
  rejectedAmountBoxMuted: {
    alignItems: 'flex-end',
  },
  rejectedAmountLabelMuted: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748b',
  },
  rejectedAmountValueMuted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  olderRejectedReasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  reorderSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ea',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reorderSmallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0d3829',
  },
});
