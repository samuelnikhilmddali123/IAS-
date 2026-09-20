import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen, fetchWithFallback } from '../context/CanteenContext';

interface RestaurantQrData {
  qrDataUrl: string;
  upiPayload: string;
  upiId: string;
  payeeName: string;
  amount: number;
  paymentInstructions: string;
}

export const PaymentScreen: React.FC = () => {
  const {
    unpaidOrders,
    unpaidTotalAmount,
    isUnpaidLoading,
    fetchUnpaidOrders,
    setActiveTab,
    userProfile,
  } = useCanteen();

  const [qrData, setQrData] = useState<RestaurantQrData | null>(null);
  const [isQrLoading, setIsQrLoading] = useState<boolean>(false);
  const [verificationChecked, setVerificationChecked] = useState<boolean>(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const fetchRestaurantQr = useCallback(async (amount: number, orders: any[]) => {
    setIsQrLoading(true);
    try {
      const orderIds = orders.map((o) => o.id || o.orderNumber).join(',');
      const url = `/api/orders/restaurant-qr?amount=${encodeURIComponent(amount)}&orderIds=${encodeURIComponent(orderIds)}`;
      const res = await fetchWithFallback(url, { headers: { Accept: 'application/json' } }, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQrData({
            qrDataUrl: data.qrDataUrl,
            upiPayload: data.upiPayload,
            upiId: data.upiId,
            payeeName: data.payeeName,
            amount: data.amount,
            paymentInstructions: data.paymentInstructions,
          });
        }
      }
    } catch (err) {
      console.error('[PAYMENT] Error fetching restaurant QR:', err);
    } finally {
      setIsQrLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnpaidOrders();
  }, [fetchUnpaidOrders]);

  useEffect(() => {
    if (unpaidTotalAmount > 0 || unpaidOrders.length > 0) {
      fetchRestaurantQr(unpaidTotalAmount, unpaidOrders);
    } else {
      setQrData(null);
    }
  }, [unpaidTotalAmount, unpaidOrders, fetchRestaurantQr]);

  const handleRefreshStatus = async () => {
    setVerificationChecked(true);
    const updated = await fetchUnpaidOrders();
    if (updated.length === 0) {
      setVerificationMessage('Payment verified! All your orders are now marked as PAID.');
    } else {
      setVerificationMessage('Payment status is still PAYMENT_PENDING. Once the cashier confirms your receipt, the balance will clear.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Canteen Bill & Payment</Text>
          <Text style={styles.pageSubtitle}>
            Settle your outstanding dining orders via official Restaurant UPI QR
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefreshStatus}
          activeOpacity={0.7}
        >
          <AppIcon name="refresh" size={14} color="#0a3d31" style={{ marginRight: 5 }} />
          <Text style={styles.refreshBtnText}>
            {isUnpaidLoading ? 'Refreshing...' : 'Check Status'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Verification Toast Message */}
      {verificationMessage && (
        <View style={[styles.toastCard, unpaidOrders.length === 0 ? styles.toastSuccess : styles.toastWarning]}>
          <AppIcon
            name={unpaidOrders.length === 0 ? 'checkmark-circle' : 'time-outline'}
            size={18}
            color={unpaidOrders.length === 0 ? '#15803d' : '#b45309'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.toastText, { color: unpaidOrders.length === 0 ? '#15803d' : '#b45309' }]}>
            {verificationMessage}
          </Text>
        </View>
      )}

      {unpaidOrders.length === 0 && !isUnpaidLoading ? (
        /* ==================== NO UNPAID ORDERS ==================== */
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconCircle}>
            <AppIcon name="checkmark-done-circle" size={48} color="#15803d" />
          </View>
          <Text style={styles.emptyTitle}>All Dues Cleared</Text>
          <Text style={styles.emptySubtitle}>
            You have no pending payments. Either all your orders have been settled or no orders have been placed.
          </Text>
          <TouchableOpacity
            style={styles.browseMenuBtn}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseMenuBtnText}>Return to Home & Menu ➔</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ==================== UNPAID BILL & RESTAURANT QR ==================== */
        <View style={styles.paymentColumns}>
          {/* Left Column: QR Code & Payment Action */}
          <View style={styles.qrColumn}>
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <AppIcon name="qr-code-outline" size={18} color="#0a3d31" style={{ marginRight: 6 }} />
                <Text style={styles.qrCardTitle}>Restaurant UPI QR Code</Text>
              </View>

              <Text style={styles.qrCardDesc}>
                Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI app
              </Text>

              {/* QR Image Box */}
              <View style={styles.qrImageBox}>
                {isQrLoading ? (
                  <View style={styles.qrLoadingBox}>
                    <ActivityIndicator size="large" color="#0a3d31" />
                    <Text style={styles.qrLoadingText}>Generating payment QR...</Text>
                  </View>
                ) : qrData?.qrDataUrl ? (
                  <Image
                    source={{ uri: qrData.qrDataUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.qrPlaceholderBox}>
                    <AppIcon name="alert-circle-outline" size={32} color="#94a3b8" />
                    <Text style={styles.qrPlaceholderText}>Unable to load Restaurant QR</Text>
                  </View>
                )}
              </View>

              {/* Payee Info */}
              <View style={styles.payeeInfoBox}>
                <View style={styles.payeeRow}>
                  <Text style={styles.payeeLabel}>Payee:</Text>
                  <Text style={styles.payeeVal}>{qrData?.payeeName || 'Government Canteen Services'}</Text>
                </View>
                <View style={styles.payeeRow}>
                  <Text style={styles.payeeLabel}>UPI ID:</Text>
                  <Text style={styles.payeeVal}>{qrData?.upiId || 'canteen.services@gov'}</Text>
                </View>
                <View style={styles.payeeRow}>
                  <Text style={styles.payeeLabel}>Payable Amount:</Text>
                  <Text style={styles.payeeAmountVal}>₹{unpaidTotalAmount}</Text>
                </View>
              </View>

              <View style={styles.verificationNotice}>
                <AppIcon name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 5 }} />
                <Text style={styles.verificationNoticeText}>
                  Status stays PAYMENT PENDING until confirmed by canteen counter cashier.
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column: Unpaid Orders Breakdown */}
          <View style={styles.detailsColumn}>
            {/* Outstanding Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Outstanding Balance Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Unpaid Orders</Text>
                <Text style={styles.summaryVal}>{unpaidOrders.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount Payable</Text>
                <Text style={styles.summaryTotalAmount}>₹{unpaidTotalAmount}</Text>
              </View>
              <View style={styles.statusPillRow}>
                <Text style={styles.statusPillLabel}>Current Status:</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PAYMENT PENDING</Text>
                </View>
              </View>
            </View>

            {/* List of Orders Included */}
            <View style={styles.ordersCard}>
              <Text style={styles.ordersCardTitle}>Orders Included in this Bill</Text>
              <View style={styles.orderList}>
                {unpaidOrders.map((ord, idx) => (
                  <View key={ord.id || ord.orderNumber || idx} style={styles.orderItemCard}>
                    <View style={styles.orderItemHeader}>
                      <View>
                        <Text style={styles.orderNumberText}>{ord.orderNumber}</Text>
                        <Text style={styles.orderDateText}>
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'} • Token #{ord.tokenNumber || 'CS-24'}
                        </Text>
                      </View>
                      <Text style={styles.orderAmountText}>₹{ord.totalAmount}</Text>
                    </View>

                    <View style={styles.orderDishesList}>
                      {(ord.items || []).map((itm: any, iIdx: number) => (
                        <Text key={iIdx} style={styles.dishLine}>
                          • {itm.quantity}x {itm.name || (itm.item && itm.item.name)} (₹{itm.price || (itm.item && itm.item.price)})
                        </Text>
                      ))}
                    </View>

                    <View style={styles.orderStatusRow}>
                      <Text style={styles.orderKitchenStatus}>
                        Kitchen Status: <Text style={{ fontWeight: '700' }}>{ord.status}</Text>
                      </Text>
                      <Text style={styles.orderPaymentStatus}>
                        Payment: <Text style={{ fontWeight: '700', color: '#b45309' }}>PENDING</Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.checkPaymentBtn}
                onPress={handleRefreshStatus}
                activeOpacity={0.85}
              >
                <AppIcon name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.checkPaymentBtnText}>Refresh Payment Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backHomeBtn}
                onPress={() => setActiveTab('home')}
                activeOpacity={0.8}
              >
                <Text style={styles.backHomeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a3d31',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  toastWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  emptyStateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 18,
    marginBottom: 20,
  },
  browseMenuBtn: {
    backgroundColor: '#0a3d31',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  browseMenuBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentColumns: {
    flexDirection: 'row',
    gap: 20,
  },
  qrColumn: {
    flex: 1,
    maxWidth: 380,
  },
  detailsColumn: {
    flex: 1.2,
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  qrCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  qrCardDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
  },
  qrImageBox: {
    width: 220,
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
    marginBottom: 14,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoadingText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  qrPlaceholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  payeeInfoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  payeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payeeLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  payeeVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  payeeAmountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0a3d31',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationNoticeText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0a3d31',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusPillLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.3,
  },
  ordersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  ordersCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  orderList: {
    gap: 10,
  },
  orderItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a3d31',
  },
  orderDateText: {
    fontSize: 10,
    color: '#64748b',
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderDishesList: {
    paddingLeft: 4,
    marginBottom: 6,
  },
  dishLine: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  orderStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  orderKitchenStatus: {
    fontSize: 10,
    color: '#64748b',
  },
  orderPaymentStatus: {
    fontSize: 10,
    color: '#64748b',
  },
  actionButtons: {
    gap: 10,
  },
  checkPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a3d31',
    borderRadius: 8,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkPaymentBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  backHomeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backHomeBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
});
