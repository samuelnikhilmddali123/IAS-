import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen, ActionSuccessInfo } from '../context/CanteenContext';
import { BackendOrder } from '../types';

const PRE_ORDER_TIMES = ['1:00 PM', '2:30 PM', '6:00 PM', '7:30 PM', '8:30 PM'];

export const OrdersScreen: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeActionType, setActiveActionType] = useState<'checkout' | 'bill' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    cart,
    totalCartItems,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    orderNote,
    setOrderNote,
    pickupTime,
    setPickupTime,
    isPreOrder,
    setIsPreOrder,
    setActiveTab,
    checkoutCart,
    generateBillCart,
    actionSuccessModal,
    setActionSuccessModal,
    logout,
  } = useCanteen();

  // Order Placement Feedback Modal & Auto-Logout State
  const [successOrder, setSuccessOrder] = React.useState<BackendOrder | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState<boolean>(false);
  const [successActionType, setSuccessActionType] = React.useState<'checkout' | 'bill'>('checkout');
  const [countdown, setCountdown] = React.useState<number>(4);

  const handleOrderDoneAndLogout = React.useCallback(() => {
    setIsSuccessModalOpen(false);
    clearCart();
    const orderNum = successOrder?.orderNumber ? `Order #${successOrder.orderNumber}` : 'Order';
    const tokenStr = successOrder?.tokenNumber ? ` (Token #${successOrder.tokenNumber})` : '';
    logout(`✓ ${orderNum}${tokenStr} submitted and is directly PREPARING in the kitchen.`);
  }, [clearCart, logout, successOrder]);

  React.useEffect(() => {
    let interval: any;
    if (isSuccessModalOpen) {
      setCountdown(4);
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleOrderDoneAndLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSuccessModalOpen, handleOrderDoneAndLogout]);

  // ==========================================
  // ACTION 1: CHECKOUT HANDLER
  // ==========================================
  const handleCheckoutClick = async () => {
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items from the menu.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setActiveActionType('checkout');

    try {
      const result = await checkoutCart();
      if (result.success) {
        setSuccessOrder(result.order || null);
        setSuccessActionType('checkout');
        setIsSuccessModalOpen(true);
      } else {
        setErrorMessage(result.error || 'Failed to send order to kitchen. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
      setActiveActionType(null);
    }
  };

  // ==========================================
  // ACTION 2: GENERATE BILL HANDLER
  // ==========================================
  const handleGenerateBillClick = async () => {
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items from the menu.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setActiveActionType('bill');

    try {
      const result = await generateBillCart();
      if (result.success) {
        setSuccessOrder(result.order || null);
        setSuccessActionType('bill');
        setIsSuccessModalOpen(true);
      } else {
        setErrorMessage(result.error || 'Failed to generate and send bill. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to backend server.');
    } finally {
      setIsSubmitting(false);
      setActiveActionType(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <AppIcon name="cart-outline" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.pageTitle}>CART</Text>
            <Text style={styles.pageSubtitle}>
              Review items, customizations, and pre-order timings.
            </Text>
          </View>
        </View>

        {cart.length > 0 && (
          <TouchableOpacity
            onPress={clearCart}
            style={styles.clearCartHeaderBtn}
            activeOpacity={0.7}
            disabled={isSubmitting}
          >
            <AppIcon name="trash-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.clearCartHeaderText}>Clear Cart</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Error Message Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <AppIcon name="alert-circle" size={17} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <AppIcon name="close" size={15} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Main Cart Content */}
      <View style={styles.mainColumns}>
        {/* Left Column: Cart Items List + Customizations + Pre-Order */}
        <View style={styles.leftColumn}>
          {/* Cart Items Card */}
          <View style={styles.cartCard}>
            <View style={styles.cartCardHeader}>
              <Text style={styles.cartTitle}>
                Items in Cart <Text style={styles.cartCountBadge}>({totalCartItems})</Text>
              </Text>
              <Text style={styles.itemsTableHead}>ITEM • QTY • PRICE</Text>
            </View>

            {/* List of Cart Items */}
            <View style={styles.itemsList}>
              {cart.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <AppIcon name="bag-handle-outline" size={42} color="#cbd5e1" />
                  <Text style={styles.emptyCartTitle}>Your cart is currently empty</Text>
                  <Text style={styles.emptyCartSub}>Add wholesome officer meals from today's menu.</Text>
                  <TouchableOpacity
                    style={styles.browseMenuBtn}
                    onPress={() => setActiveTab('menu')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.browseMenuBtnText}>Browse Food Menu ➔</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                cart.map((c) => (
                  <View key={c.item.id} style={styles.cartItemRow}>
                    <Image source={{ uri: c.item.image }} style={styles.itemThumb} />

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {c.item.name}
                      </Text>
                      <View style={styles.itemMetaRow}>
                        <View
                          style={[
                            styles.dietDot,
                            { backgroundColor: c.item.isVeg ? '#16a34a' : '#dc2626' },
                          ]}
                        />
                        <Text style={styles.itemCategoryText}>
                          {c.item.subCategory || c.item.category} • ₹{c.item.price} each
                        </Text>
                      </View>
                    </View>

                    {/* Stepper (- qty +) */}
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(c.item.id, -1)}
                        activeOpacity={0.7}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{c.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateQuantity(c.item.id, 1)}
                        activeOpacity={0.7}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Item Total */}
                    <View style={styles.itemTotalBox}>
                      <Text style={styles.itemTotalPrice}>₹{c.item.price * c.quantity}</Text>
                    </View>

                    {/* Remove Trash */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => removeFromCart(c.item.id)}
                      activeOpacity={0.7}
                      disabled={isSubmitting}
                    >
                      <AppIcon name="trash-outline" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Note / Customization Section */}
            {cart.length > 0 && (
              <View style={styles.noteSection}>
                <View style={styles.noteHeader}>
                  <AppIcon name="document-text-outline" size={15} color="#0c3527" style={{ marginRight: 6 }} />
                  <Text style={styles.noteTitle}>Existing Notes / Customizations</Text>
                </View>
                <TextInput
                  style={styles.noteInput}
                  placeholder="e.g. Less spicy, no onion, extra chutney, separate packing..."
                  placeholderTextColor="#94a3b8"
                  maxLength={120}
                  value={orderNote}
                  onChangeText={setOrderNote}
                  disableFullscreenUI={true}
                  editable={!isSubmitting}
                />
              </View>
            )}
          </View>

          {/* Pre-Order / Pickup Time Card (Requirement 2 & 13) */}
          {cart.length > 0 && (
            <View style={styles.preOrderCard}>
              <View style={styles.preOrderHeader}>
                <View style={styles.preOrderTitleRow}>
                  <AppIcon name="time-outline" size={17} color="#0c3527" style={{ marginRight: 6 }} />
                  <Text style={styles.preOrderTitle}>Dining Option & Pickup Time</Text>
                </View>

                {/* Pre-Order Toggle */}
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !isPreOrder && styles.toggleBtnActive]}
                    onPress={() => {
                      setIsPreOrder(false);
                      setPickupTime('');
                    }}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.toggleBtnText, !isPreOrder && styles.toggleBtnTextActive]}>
                      Instant Dining
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isPreOrder && styles.toggleBtnActive]}
                    onPress={() => {
                      setIsPreOrder(true);
                      if (!pickupTime) setPickupTime('6:00 PM');
                    }}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.toggleBtnText, isPreOrder && styles.toggleBtnTextActive]}>
                      Pre-Order Pickup
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isPreOrder && (
                <View style={styles.preOrderBody}>
                  <Text style={styles.pickupLabel}>
                    Select preferred pickup time (The kitchen will prepare it in advance):
                  </Text>

                  {/* Preset quick time chips */}
                  <View style={styles.quickTimesRow}>
                    {PRE_ORDER_TIMES.map((time) => {
                      const isSelected = pickupTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                          onPress={() => setPickupTime(time)}
                          activeOpacity={0.7}
                          disabled={isSubmitting}
                        >
                          <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                            {time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom pickup time entry */}
                  <View style={styles.customTimeRow}>
                    <Text style={styles.customTimeLabel}>Or specify custom time:</Text>
                    <TextInput
                      style={styles.customTimeInput}
                      placeholder="e.g. 6:00 PM"
                      placeholderTextColor="#94a3b8"
                      value={pickupTime}
                      onChangeText={setPickupTime}
                      disableFullscreenUI={true}
                      editable={!isSubmitting}
                    />
                  </View>

                  <View style={styles.kotTimeNotice}>
                    <AppIcon name="restaurant" size={14} color="#15803d" style={{ marginRight: 6 }} />
                    <Text style={styles.kotTimeNoticeText}>
                      KOT will show <Text style={{ fontWeight: '700' }}>Pickup Time: {pickupTime || '6:00 PM'}</Text>
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right Column: Totals & Exactly 2 Main Actions */}
        <View style={styles.rightColumn}>
          {/* Order Summary Breakdown */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <AppIcon name="receipt-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.summaryTitle}>Cart Summary</Text>
            </View>

            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Subtotal ({totalCartItems})</Text>
                <Text style={styles.summaryValue}>₹{cartSubtotal}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Other Charges / Service</Text>
                <Text style={styles.summaryValue}>₹0</Text>
              </View>

              {isPreOrder && pickupTime ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scheduled Pickup</Text>
                  <Text style={[styles.summaryValue, { color: '#0d5c3a' }]}>{pickupTime}</Text>
                </View>
              ) : null}

              <View style={styles.summaryDivider} />

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>₹{cartSubtotal}</Text>
              </View>
            </View>

            {/* Exactly TWO Main Actions (Requirement 2, 12, 17) */}
            <View style={styles.actionsSection}>
              {/* 1. CHECKOUT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  (cart.length === 0 || isSubmitting) && styles.btnDisabled,
                ]}
                disabled={cart.length === 0 || isSubmitting}
                onPress={handleCheckoutClick}
                activeOpacity={0.85}
              >
                {isSubmitting && activeActionType === 'checkout' ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                ) : (
                  <AppIcon name="restaurant" size={17} color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.checkoutBtnText}>
                  {isSubmitting && activeActionType === 'checkout'
                    ? 'SENDING TO KITCHEN...'
                    : 'CHECKOUT'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.actionSubtext}>
                Sends order directly to kitchen queue (Status: PREPARING) & logs out.
              </Text>

              {/* 2. GENERATE BILL BUTTON */}
              <TouchableOpacity
                style={[
                  styles.generateBillBtn,
                  (cart.length === 0 || isSubmitting) && styles.btnDisabled,
                ]}
                disabled={cart.length === 0 || isSubmitting}
                onPress={handleGenerateBillClick}
                activeOpacity={0.85}
              >
                {isSubmitting && activeActionType === 'bill' ? (
                  <ActivityIndicator size="small" color="#0c3527" style={{ marginRight: 8 }} />
                ) : (
                  <AppIcon name="receipt-outline" size={17} color="#0c3527" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.generateBillBtnText}>
                  {isSubmitting && activeActionType === 'bill'
                    ? 'GENERATING BILL...'
                    : 'GENERATE BILL'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.actionSubtext}>
                Dispatches bill & Restaurant QR code to your registered mobile & logs out.
              </Text>
            </View>
          </View>

          {/* Info Badge */}
          <View style={styles.canteenBadge}>
            <AppIcon name="leaf" size={15} color="#15803d" style={{ marginRight: 6 }} />
            <Text style={styles.canteenBadgeText}>
              Government Canteen Services • Zero Upfront Friction
            </Text>
          </View>
        </View>
      </View>

      {/* Order Success & Immediate Logout Modal */}
      <Modal
        visible={isSuccessModalOpen}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconCircle}>
              <AppIcon name="checkmark-circle" size={44} color="#15803d" />
            </View>

            <Text style={styles.modalTitle}>
              {successActionType === 'bill' ? 'Bill Generated & Order Sent!' : 'Order Placed Successfully!'}
            </Text>

            {successOrder?.tokenNumber ? (
              <View style={styles.tokenPill}>
                <Text style={styles.tokenPillText}>
                  Token: #{successOrder.tokenNumber}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalMessage}>
              {successOrder?.orderNumber ? (
                <>Order <Text style={{ fontWeight: '700', color: '#0f172a' }}>#{successOrder.orderNumber}</Text> has</>
              ) : (
                'Your order has'
              )}{' '}
              been sent directly to the kitchen and is now{' '}
              <Text style={{ fontWeight: '800', color: '#0284c7' }}>PREPARING</Text>.{'\n\n'}
              No kitchen acceptance needed — preparation starts immediately!
            </Text>

            <View style={styles.logoutNoticeBox}>
              <AppIcon name="log-out-outline" size={16} color="#15803d" style={{ marginRight: 6 }} />
              <Text style={styles.logoutNoticeText}>
                Logging out automatically in {countdown}s to protect officer session...
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
    paddingTop: 12,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0c3527',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  clearCartHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearCartHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
  },
  mainColumns: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1.25,
  },
  rightColumn: {
    flex: 0.75,
  },
  cartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  cartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cartCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  itemsTableHead: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  itemsList: {
    paddingVertical: 4,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyCartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptyCartSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    marginBottom: 16,
  },
  browseMenuBtn: {
    backgroundColor: '#0c3527',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  browseMenuBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  itemThumb: {
    width: 48,
    height: 48,
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
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  dietDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemCategoryText: {
    fontSize: 11,
    color: '#64748b',
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
    paddingHorizontal: 6,
  },
  itemTotalBox: {
    width: 60,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  itemTotalPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  deleteBtn: {
    padding: 6,
  },
  noteSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  preOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  preOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preOrderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preOrderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0c3527',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0c3527',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  preOrderBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pickupLabel: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  quickTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  timeChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  timeChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  timeChipTextSelected: {
    color: '#166534',
    fontWeight: '700',
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTimeLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  customTimeInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: '#0f172a',
    width: 100,
  },
  kotTimeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  kotTimeNoticeText: {
    fontSize: 11,
    color: '#166534',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryRows: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0c3527',
  },
  actionsSection: {
    marginTop: 18,
    gap: 8,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c3527',
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  generateBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#0c3527',
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 4,
  },
  generateBillBtnText: {
    color: '#0c3527',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionSubtext: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  canteenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 10,
  },
  canteenBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  tokenPill: {
    backgroundColor: '#0c3527',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  tokenPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalMessage: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  logoutNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
  },
  logoutNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#15803d',
    lineHeight: 15,
  },
  modalDoneBtn: {
    width: '100%',
    backgroundColor: '#0c3527',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
