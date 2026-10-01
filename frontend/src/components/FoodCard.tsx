import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { AppIcon } from './AppIcon';
import { MenuItem } from '../types';
import { useCanteen, resolveImageUrl } from '../context/CanteenContext';

interface FoodCardProps {
  item: MenuItem;
  index?: number;
}

export const FoodCard: React.FC<FoodCardProps> = React.memo(({ item, index = 0 }) => {
  const { getItemQuantity, updateQuantity, addToCart, getItemPrice } = useCanteen();
  const quantity = getItemQuantity(item.id);
  const displayPrice = getItemPrice(item);

  const [imgUri, setImgUri] = React.useState<string>(() => resolveImageUrl(item.image));
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  const [hasImageError, setHasImageError] = React.useState<boolean>(false);

  const isAboveTheFold = index < 8;

  React.useEffect(() => {
    const resolved = resolveImageUrl(item.image);
    setImgUri(resolved);
    setIsLoaded(false);
    setHasImageError(false);
  }, [item.image]);

  const subtitle = item.portion || (item as any).description || (item.category ? `${item.category.charAt(0).toUpperCase() + item.category.slice(1)} special` : 'Freshly prepared');

  return (
    <View style={styles.card}>
      {/* Food Thumbnail & Zero-CLS Wrapper */}
      <View style={styles.imageWrapper}>
        {/* Placeholder / Skeleton Icon visible while image is loading or if failed */}
        {(!isLoaded || hasImageError || !imgUri) && (
          <View style={[StyleSheet.absoluteFill, styles.fallbackContainer]}>
            <AppIcon name="restaurant-outline" size={26} color="#94a3b8" />
          </View>
        )}

        {imgUri && !hasImageError && (
          Platform.OS === 'web' ? (
            // Native HTML5 Optimized Image for Web with eager/lazy and high priority
            <img
              src={imgUri}
              alt={item.name}
              loading={isAboveTheFold ? 'eager' : 'lazy'}
              decoding="async"
              // @ts-ignore
              fetchpriority={isAboveTheFold ? 'high' : 'low'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.22s ease-in-out',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasImageError(true)}
            />
          ) : (
            <Image
              source={{ uri: imgUri }}
              style={[styles.image, { opacity: isLoaded ? 1 : 0 }]}
              resizeMode="cover"
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasImageError(true)}
            />
          )
        )}
      </View>

      {/* Item Info */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {/* Bottom Actions: Single Applicable Price on Left, Stepper or Add Button on Right */}
        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{displayPrice}</Text>
          </View>

          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addPillBtn}
              onPress={() => addToCart(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.addPillText}>Add +</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepperPill}>
              <TouchableOpacity
                style={styles.stepperActionBtn}
                onPress={() => updateQuantity(item.id, -1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperActionText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.stepperQtyText}>{quantity}</Text>

              <TouchableOpacity
                style={styles.stepperActionBtn}
                onPress={() => addToCart(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperActionText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: 114,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  content: {
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 10,
  },
  name: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  price: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  officialPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officialPriceText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0a3d31',
  },
  officialBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#93c5fd',
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  generalPriceStrikethrough: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
    fontWeight: '600',
  },
  addPillBtn: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPillText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '700',
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d31',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  stepperActionBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  stepperQtyText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    minWidth: 12,
    textAlign: 'center',
  },
});
