import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';

export const OrdersScreen: React.FC = () => {
  const [viewMode, setViewMode] = React.useState<'checkout' | 'history'>('checkout');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const {
    cart,
    totalCartItems,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    orderNote,
    setOrderNote,
    paymentMethod,
    setPaymentMethod,
    orderStep,
    setOrderStep,
    placeOrder,
    isOrderSuccessModalOpen,
    setIsOrderSuccessModalOpen,
    setActiveTab,
    orderHistory,
    fetchOrderHistory,
    isOrderHistoryLoading,
    lastPlacedOrder,
    logout,
  } = useCanteen();

  const handlePlaceOrderClick = async () => {
    setIsSubmitting(true);
    try {
      await placeOrder();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderDoneAndLogout = React.useCallback(() => {
    setIsOrderSuccessModalOpen(false);
    clearCart();
    setOrderStep(1);
    logout();
  }, [clearCart, logout, setIsOrderSuccessModalOpen, setOrderStep]);

  React.useEffect(() => {
    let timer: any;
    if (isOrderSuccessModalOpen) {
      timer = setTimeout(() => {
        handleOrderDoneAndLogout();
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOrderSuccessModalOpen, handleOrderDoneAndLogout]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 0. Top View Mode Toggle: Current Checkout vs Order History */}
      <View style={styles.viewModeToggleRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'checkout' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('checkout')}
          activeOpacity={0.8}
        >
          <AppIcon
            name="cart-outline"
            size={16}
            color={viewMode === 'checkout' ? '#ffffff' : '#0a3d31'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'checkout' && styles.viewModeBtnTextActive,
            ]}
          >
            Checkout ({totalCartItems})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'history' && styles.viewModeBtnActive]}
          onPress={() => {
            setViewMode('history');
            fetchOrderHistory();
          }}
          activeOpacity={0.8}
        >
          <AppIcon
            name="receipt-outline"
            size={16}
            color={viewMode === 'history' ? '#ffffff' : '#0a3d31'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'history' && styles.viewModeBtnTextActive,
            ]}
          >
            Order History ({orderHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'history' ? (
        /* ==================== ORDER HISTORY VIEW ==================== */
        <View style={styles.historyContainer}>
          <View style={styles.historyHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Your Past Orders</Text>
              <Text style={styles.pageSubtitle}>
                Saved orders and live kitchen preparation status
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshHistoryBtn}
              onPress={fetchOrderHistory}
              activeOpacity={0.7}
            >
              <AppIcon name="refresh" size={14} color="#0a3d31" style={{ marginRight: 4 }} />
              <Text style={styles.refreshHistoryText}>
                {isOrderHistoryLoading ? 'Refreshing...' : 'Refresh Status'}
              </Text>
            </TouchableOpacity>
          </View>

          {orderHistory.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <AppIcon name="receipt-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyHistoryTitle}>No Orders Placed Yet</Text>
              <Text style={styles.emptyHistorySub}>
                Your order receipts and live kitchen updates will appear here once you place an order.
              </Text>
              <TouchableOpacity
                style={styles.browseMenuBtn}
                onPress={() => setActiveTab('home')}
                activeOpacity={0.8}
              >
                <Text style={styles.browseMenuBtnText}>Browse Today's Menu ➔</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orderHistory.map((ord) => {
                const isPrep = ord.status === 'PREPARING' || ord.status === 'PENDING';
                const isReady = ord.status === 'READY';
                const isDone = ord.status === 'DELIVERED';
                return (
                  <View key={ord.id || ord.orderNumber} style={styles.historyOrderCard}>
                    <View style={styles.historyOrderHeader}>
                      <View>
                        <Text style={styles.historyOrderNum}>{ord.orderNumber}</Text>
                        <Text style={styles.historyOrderDate}>
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Token #{ord.tokenNumber || 'CS-24'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadgePill,
                          isPrep && styles.statusBadgePrep,
                          isReady && styles.statusBadgeReady,
                          isDone && styles.statusBadgeDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isPrep && styles.statusTextPrep,
                            isReady && styles.statusTextReady,
                            isDone && styles.statusTextDone,
                          ]}
                        >
                          {isPrep ? '⏳ Preparing in Kitchen' : isReady ? '🔔 Ready for Pickup' : '✓ Delivered'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyItemsList}>
                      {(ord.items || []).map((itm: any, idx: number) => (
                        <View key={idx} style={styles.historyItemRow}>
                          <Text style={styles.historyItemName}>
                            {itm.quantity}x {itm.name || (itm.item && itm.item.name)}
                          </Text>
                          <Text style={styles.historyItemPrice}>₹{(itm.price || (itm.item && itm.item.price) || 0) * (itm.quantity || 1)}</Text>
                        </View>
                      ))}
                    </View>

                    {ord.orderNote ? (
                      <Text style={styles.historyNoteText}>Special Note: "{ord.orderNote}"</Text>
                    ) : null}

                    <View style={styles.historyFooterRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.historyPayMethod}>Payment: </Text>
                        <Text
                          style={{
                            fontWeight: '700',
                            fontSize: 11,
                            color: (ord.paymentStatus || 'PAYMENT_PENDING') === 'PAID' ? '#15803d' : '#b45309',
                          }}
                        >
                          {(ord.paymentStatus || 'PAYMENT_PENDING') === 'PAID' ? '✓ PAID' : '⏳ PAYMENT PENDING'}
                        </Text>
                      </View>
                      <Text style={styles.historyTotalAmount}>
                        Total: <Text style={styles.historyTotalBold}>₹{ord.totalAmount}</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* ==================== CHECKOUT FLOW ==================== */
        <>
      {/* 1. Stepper Bar (1. Your Order -> 2. Kitchen Submission -> 3. Confirmation) */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, orderStep >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, orderStep >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, orderStep >= 1 && styles.stepLabelActive]}>
            Your Order
          </Text>
        </View>

        <View style={[styles.stepConnector, orderStep >= 2 && styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, orderStep >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, orderStep >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, orderStep >= 2 && styles.stepLabelActive]}>
            Submit Order
          </Text>
        </View>

        <View style={[styles.stepConnector, orderStep >= 3 && styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, orderStep >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, orderStep >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, orderStep >= 3 && styles.stepLabelActive]}>
            Confirmation
          </Text>
        </View>
      </View>

      {/* 2. Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Review & Place Order</Text>
        <Text style={styles.pageSubtitle}>Zero upfront payment. Settle your bill post-meal via Restaurant QR.</Text>
      </View>

      {/* 3. Main Order Columns */}
      <View style={styles.mainColumns}>
        {/* Left Column: Expanded Cart Items & Special Instructions */}
        <View style={styles.leftColumn}>
          <View style={styles.cartCard}>
            <View style={styles.cartCardHeader}>
              <View style={styles.titleRow}>
                <AppIcon name="cart-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.cartTitle}>
                  Your Cart <Text style={styles.cartItemCount}>({totalCartItems} items)</Text>
                </Text>
              </View>

              {cart.length > 0 && (
                <TouchableOpacity onPress={clearCart} style={styles.clearBtn} activeOpacity={0.7}>
                  <AppIcon name="trash-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.clearBtnText}>Clear Cart</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* List of Cart Items */}
            <View style={styles.itemsList}>
              {cart.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <AppIcon name="fast-food-outline" size={32} color="#cbd5e1" />
                  <Text style={styles.emptyCartTitle}>No items in order</Text>
                  <TouchableOpacity
                    style={styles.browseMenuBtn}
                    onPress={() => setActiveTab('menu')}
                  >
                    <Text style={styles.browseMenuBtnText}>Browse Menu</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                cart.map((c) => (
                  <View key={c.item.id} style={styles.cartItemRow}>
                    <Image source={{ uri: c.item.image }} style={styles.itemThumb} />

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{c.item.name}</Text>
                      <View style={styles.tagRow}>
                        <View style={styles.vegDot} />
                        <Text style={styles.tagText}>{c.item.subCategory || c.item.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.itemPrice}>₹{c.item.price * c.quantity}</Text>

                    {/* Stepper */}
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(c.item.id, -1)}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{c.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(c.item.id, 1)}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Trash Delete */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => removeFromCart(c.item.id)}
                    >
                      <AppIcon name="trash-outline" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Add a Note (Optional) */}
            <View style={styles.noteSection}>
              <View style={styles.noteHeader}>
                <AppIcon name="document-text-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
                <Text style={styles.noteTitle}>Add a Note (Optional)</Text>
              </View>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Less spicy, no onion, extra chutney..."
                placeholderTextColor="#94a3b8"
                maxLength={100}
                value={orderNote}
                onChangeText={setOrderNote}
                disableFullscreenUI={true}
              />
              <Text style={styles.noteCounter}>{orderNote.length}/100</Text>
            </View>
          </View>

          {/* Productivity Banner */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerIconBox}>
              <AppIcon name="leaf" size={18} color="#15803d" />
            </View>
            <View style={styles.bannerTextBox}>
              <Text style={styles.bannerTitle}>Good Food. Greater Productivity.</Text>
              <Text style={styles.bannerSub}>
                Nutritious meals for a healthier, stronger India.
              </Text>
            </View>
          </View>
        </View>

        {/* Right Column: Order Summary & Payment Method */}
        <View style={styles.rightColumn}>
          {/* Order Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <AppIcon name="receipt-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.summaryTitle}>Order Summary</Text>
            </View>

            <View style={styles.summaryLines}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items ({totalCartItems})</Text>
                <Text style={styles.summaryValue}>₹{cartSubtotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Charge</Text>
                <Text style={styles.summaryValue}>₹0</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{cartSubtotal}</Text>
              </View>
            </View>
          </View>

          {/* Post-Food Payment Settlement Notice (No card/COD at checkout) */}
          <View style={styles.paymentNoticeCard}>
            <View style={styles.paymentNoticeHeader}>
              <View style={styles.paymentNoticeIconBox}>
                <AppIcon name="restaurant" size={17} color="#0a3d31" />
              </View>
              <View style={styles.paymentNoticeTexts}>
                <Text style={styles.paymentNoticeTitle}>Order Now • Pay Later</Text>
                <Text style={styles.paymentNoticeSubtitle}>
                  Zero upfront payment required at checkout.
                </Text>
              </View>
            </View>
            <View style={styles.paymentPendingPill}>
              <Text style={styles.paymentPendingPillText}>PAYMENT STATUS: PAYMENT PENDING</Text>
            </View>
            <Text style={styles.paymentNoticeDesc}>
              This order will immediately enter the kitchen queue. You can place multiple orders during your dining visit. After finishing your meal, settle your total bill via the Restaurant QR code in the Payment section.
            </Text>
          </View>

          {/* Place Order Button */}
          <TouchableOpacity
            style={[styles.placeOrderBtn, (cart.length === 0 || isSubmitting) && styles.placeOrderBtnDisabled]}
            disabled={cart.length === 0 || isSubmitting}
            onPress={handlePlaceOrderClick}
            activeOpacity={0.85}
          >
            <Text style={styles.placeOrderBtnText}>
              {isSubmitting ? 'Sending Order to Kitchen...' : 'Checkout Order (Pay Later)'}
            </Text>
            <AppIcon name="arrow-forward" size={16} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            Order is verified and recorded on the server before session completion.
          </Text>
        </View>
      </View>
      </>
      )}

      {/* Order Success & Immediate Logout Modal */}
      <Modal
        visible={isOrderSuccessModalOpen}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <AppIcon name="checkmark-circle" size={48} color="#15803d" />
            </View>
            <Text style={styles.modalTitle}>Order Placed Successfully!</Text>
            <Text style={styles.tokenBadge}>Token: #{lastPlacedOrder?.tokenNumber ? `CS-${lastPlacedOrder.tokenNumber}` : 'CS-8429'}</Text>
            <Text style={styles.modalMessage}>
              Your order <Text style={{ fontWeight: '700' }}>{lastPlacedOrder?.orderNumber || ''}</Text> has been submitted to the Canteen Kitchen.{'\n'}
              Kitchen status: <Text style={{ fontWeight: '700', color: '#0a3d31' }}>PREPARING</Text>
            </Text>
            <View style={styles.modalDetailsBox}>
              <Text style={styles.modalDetailLine}>
                Order Total: <Text style={{ fontWeight: '700' }}>₹{lastPlacedOrder?.totalAmount || cartSubtotal}</Text>
              </Text>
              <Text style={styles.modalDetailLine}>
                Payment Status: <Text style={{ fontWeight: '700', color: '#b45309' }}>PAYMENT PENDING</Text>
              </Text>
            </View>

            <View style={styles.logoutNoticeBox}>
              <AppIcon name="log-out-outline" size={17} color="#0a3d31" style={{ marginRight: 6 }} />
              <Text style={styles.logoutNoticeText}>
                Your order is saved. You are being logged out now. Log in with your QR code later to order more or settle your payment.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={handleOrderDoneAndLogout}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneBtnText}>Sign Out & Return to Login ➔</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#0d3829',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#0d3829',
    fontWeight: '700',
  },
  stepConnector: {
    width: 48,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  stepConnectorActive: {
    backgroundColor: '#0d3829',
  },
  pageHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  mainColumns: {
    flexDirection: 'row',
    gap: 20,
  },
  leftColumn: {
    flex: 1.15,
  },
  rightColumn: {
    flex: 0.85,
  },
  cartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  cartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cartItemCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  itemsList: {
    paddingVertical: 8,
  },
  emptyCartBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCartTitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 10,
  },
  browseMenuBtn: {
    backgroundColor: '#0d3829',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  browseMenuBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  tagText: {
    fontSize: 10,
    color: '#64748b',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 4,
    height: 28,
    marginRight: 12,
  },
  stepBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 8,
  },
  deleteBtn: {
    padding: 6,
  },
  noteSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    position: 'relative',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  noteCounter: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 10,
    color: '#94a3b8',
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  bannerSub: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 1,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryLines: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  paymentNoticeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 16,
  },
  paymentNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentNoticeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eef7f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  paymentNoticeTexts: {
    flex: 1,
  },
  paymentNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  paymentNoticeSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  paymentPendingPill: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  paymentPendingPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  paymentNoticeDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  logoutNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  logoutNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    fontWeight: '500',
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3829',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderBtnDisabled: {
    opacity: 0.5,
  },
  placeOrderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
  },
  disclaimerLink: {
    color: '#15803d',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 28,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  tokenBadge: {
    backgroundColor: '#eef7f2',
    color: '#0d3829',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 4,
  },
  modalDetailLine: {
    fontSize: 12,
    color: '#334155',
  },
  modalTrackBtn: {
    backgroundColor: '#0a3d31',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTrackBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalDoneBtn: {
    backgroundColor: '#f1f5f9',
    width: '100%',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalDoneBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },

  /* View Mode Toggle Bar */
  viewModeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 6,
    alignSelf: 'flex-start',
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#0a3d31',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a3d31',
  },
  viewModeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* Order History Container */
  historyContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  refreshHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  refreshHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a3d31',
  },

  /* Empty State */
  emptyHistoryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
  },
  emptyHistorySub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 380,
    marginTop: 6,
    lineHeight: 18,
  },

  /* Order List & Cards */
  ordersList: {
    gap: 16,
  },
  historyOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  historyOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  historyOrderNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a3d31',
  },
  historyOrderDate: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 3,
  },
  statusBadgePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  statusBadgePrep: {
    backgroundColor: '#e0f2fe',
  },
  statusBadgeReady: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeDone: {
    backgroundColor: '#f8fafc',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  statusTextPrep: {
    color: '#0369a1',
  },
  statusTextReady: {
    color: '#15803d',
  },
  statusTextDone: {
    color: '#64748b',
  },
  historyItemsList: {
    gap: 6,
    marginBottom: 10,
  },
  historyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  historyNoteText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#d97706',
    backgroundColor: '#fffbeb',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  historyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 4,
  },
  historyPayMethod: {
    fontSize: 12,
    color: '#64748b',
  },
  historyTotalAmount: {
    fontSize: 13,
    color: '#64748b',
  },
  historyTotalBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a3d31',
  },
});
