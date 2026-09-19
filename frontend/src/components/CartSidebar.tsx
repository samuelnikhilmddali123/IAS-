import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { useCanteen } from '../context/CanteenContext';

export const CartSidebar: React.FC = () => {
  const {
    cart,
    totalCartItems,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    orderNote,
    setOrderNote,
    setActiveTab,
    setOrderStep,
  } = useCanteen();

  const handleCheckout = () => {
    setActiveTab('orders');
    setOrderStep(1);
  };

  return (
    <View style={styles.container}>
      {/* Cart Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <AppIcon name="cart-outline" size={18} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.title}>Your Cart</Text>
          {totalCartItems > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCartItems}</Text>
            </View>
          )}
        </View>

        {cart.length > 0 && (
          <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items List */}
      <ScrollView
        style={styles.itemList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="bag-handle-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add items from the menu to get started</Text>
          </View>
        ) : (
          cart.map((cartItem) => (
            <View key={cartItem.item.id} style={styles.itemRow}>
              <Image
                source={{ uri: cartItem.item.image }}
                style={styles.itemImage}
                resizeMode="cover"
              />

              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {cartItem.item.name}
                </Text>
                <Text style={styles.itemPrice}>₹{cartItem.item.price * cartItem.quantity}</Text>
              </View>

              {/* Stepper */}
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQuantity(cartItem.item.id, -1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQuantity(cartItem.item.id, 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removeFromCart(cartItem.item.id)}
                activeOpacity={0.7}
              >
                <AppIcon name="trash-outline" size={15} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={styles.footerSection}>
          {/* Note Input */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Add a note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. Less spicy, no onion..."
              placeholderTextColor="#94a3b8"
              value={orderNote}
              onChangeText={setOrderNote}
              disableFullscreenUI={true}
            />
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.pricingSection}>
            <View style={styles.priceLine}>
              <Text style={styles.priceLineLabel}>Items ({totalCartItems})</Text>
              <Text style={styles.priceLineVal}>₹{cartSubtotal}</Text>
            </View>
            <View style={styles.priceLine}>
              <Text style={styles.priceLineLabel}>Service Charge</Text>
              <Text style={styles.priceLineVal}>₹0</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>₹{cartSubtotal}</Text>
            </View>
          </View>

          {/* Place Order CTA */}
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleCheckout}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutBtnText}>Place Order</Text>
            <AppIcon name="arrow-forward" size={15} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <View style={styles.safeFoodNotice}>
            <AppIcon name="leaf" size={13} color="#15803d" style={{ marginRight: 6 }} />
            <Text style={styles.safeFoodText}>Fresh Food. Better You.</Text>
          </View>
        </View>
      )}

      {/* Bottom Quote Card */}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>
          “Good food{'\n'}builds a better tomorrow.”
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 310,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#0d3829',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  countText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  clearAllText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  itemList: {
    paddingVertical: 4,
    maxHeight: 220,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  itemDetails: {
    flex: 1,
    paddingHorizontal: 8,
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 4,
    height: 26,
    marginRight: 6,
  },
  stepBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 5,
  },
  deleteBtn: {
    padding: 4,
  },
  footerSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  noteSection: {
    marginBottom: 10,
  },
  noteLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  noteInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#0f172a',
    outlineStyle: 'none' as any,
  },
  pricingSection: {
    gap: 4,
    marginBottom: 10,
  },
  priceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceLineLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  priceLineVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3829',
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  safeFoodNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  safeFoodText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#15803d',
  },
  quoteCard: {
    backgroundColor: '#f6faf7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2ece4',
    padding: 10,
    marginTop: 8,
  },
  quoteText: {
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1e3a2f',
    textAlign: 'center',
  },
});
