import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { AppIcon } from './AppIcon';
import { MenuItem } from '../types';
import { useCanteen } from '../context/CanteenContext';

interface FoodCardProps {
  item: MenuItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item }) => {
  const { getItemQuantity, updateQuantity, addToCart } = useCanteen();
  const quantity = getItemQuantity(item.id);

  return (
    <View style={styles.card}>
      {/* Food Thumbnail */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      {/* Item Info */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price}</Text>
        </View>

        {/* Veg / Non-Veg Indicator */}
        <View style={styles.vegIndicatorRow}>
          <View
            style={[
              styles.dietBox,
              item.isVeg ? styles.vegBox : styles.nonVegBox,
            ]}
          >
            <View
              style={[
                styles.dietDot,
                item.isVeg ? styles.vegDot : styles.nonVegDot,
              ]}
            />
          </View>
          <Text style={styles.dietText}>{item.isVeg ? 'Veg' : 'Non-Veg'}</Text>
        </View>

        {/* Bottom Actions: Stepper and Add Button */}
        <View style={styles.actionRow}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => updateQuantity(item.id, -1)}
              disabled={quantity === 0}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepBtnText, quantity === 0 && styles.stepBtnDisabled]}>
                −
              </Text>
            </TouchableOpacity>

            <Text style={styles.qtyText}>{quantity}</Text>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => addToCart(item)}
              activeOpacity={0.6}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, quantity > 0 && styles.addBtnActive]}
            onPress={() => addToCart(item)}
            activeOpacity={0.8}
          >
            <AppIcon name="cart-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>
              {quantity > 0 ? `Add (${quantity})` : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: 110,
    backgroundColor: '#f1f5f9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  vegIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 5,
  },
  dietBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegBox: {
    borderColor: '#16a34a',
  },
  nonVegBox: {
    borderColor: '#dc2626',
  },
  dietDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vegDot: {
    backgroundColor: '#16a34a',
  },
  nonVegDot: {
    backgroundColor: '#dc2626',
  },
  dietText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    lineHeight: 16,
  },
  stepBtnDisabled: {
    color: '#cbd5e1',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 6,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d3829',
    borderRadius: 6,
    height: 28,
    paddingHorizontal: 8,
  },
  addBtnActive: {
    backgroundColor: '#15803d',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
