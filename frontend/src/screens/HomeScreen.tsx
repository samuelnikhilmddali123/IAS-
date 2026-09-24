import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { FoodCard } from '../components/FoodCard';
import { MealTimingsWidget } from '../components/MealTimingsWidget';

const TAJ_IMAGE_SOURCE = Platform.select({
  web: { uri: '/taj.png' },
  default: require('../../assets/taj.png'),
});

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: "Georgia, 'Playfair Display', 'Times New Roman', serif",
  default: 'Georgia',
});

const SANS_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  default: 'System',
});

const getTimeBasedGreeting = (): string => {
  const hours = new Date().getHours();
  if (hours >= 4 && hours < 12) {
    return 'Good Morning,';
  } else if (hours >= 12 && hours < 17) {
    return 'Good Afternoon,';
  } else if (hours >= 17 && hours < 21) {
    return 'Good Evening,';
  } else {
    return 'Good Night,';
  }
};

export const HomeScreen: React.FC = () => {
  const {
    setActiveTab,
    activeCategory,
    searchQuery,
    menuItems,
    menuError,
    isMenuLoading,
    fetchMenu,
    userProfile,
    totalCartItems,
    cartSubtotal,
  } = useCanteen();
  const [greeting, setGreeting] = React.useState<string>(getTimeBasedGreeting);

  React.useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getTimeBasedGreeting());
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter items based on active category & search query (from backend items only)
  const filteredItems = (menuItems || []).filter((item) => {
    const matchesCategory =
      activeCategory === 'all' ||
      item.category === activeCategory ||
      (activeCategory === 'south-indian' && item.subCategory === 'South Indian') ||
      (activeCategory === 'north-indian' && item.subCategory === 'North Indian') ||
      (activeCategory === 'healthy' && item.subCategory === 'Healthy');

    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Hero Greeting Banner with Rashtrapati Bhavan / Taj Artwork */}
      <View style={styles.heroBanner}>
        {/* Left: Officer Greeting */}
        <View style={styles.heroGreeting}>
          <Text style={styles.greetingSub}>{greeting}</Text>
          <Text style={styles.officerTitle}>
            {userProfile.name ? userProfile.name : 'Officer'}
          </Text>
          <Text style={styles.mottoSub}>Good food. Greater service.</Text>
          <View style={styles.greetingAccentLine} />
        </View>

        {/* Far Right: Rashtrapati Bhavan Artwork from assets/taj.png touching the right side edge */}
        <View style={styles.backdropWrapper} pointerEvents="none">
          <Image
            source={require('../../assets/taj.png')}
            style={styles.tajBackdropImage}
            resizeMode="contain"
          />
        </View>

        {/* Right Slogan */}
        <View style={styles.sloganWrapper}>
          <View style={styles.sloganRow}>
            {/* Left Vertical Line */}
            <View style={styles.sloganVerticalLine} />

            {/* Slogan Text */}
            <Text style={styles.sloganText}>
              Nourishing{'\n'}People.{'\n'}Enabling{'\n'}Progress.
            </Text>
          </View>

          {/* Bottom Two-Tone Accent Line: Orange (left) & Green (right) */}
          <View style={styles.twoToneAccentLine}>
            <View style={styles.orangeLineSegment} />
            <View style={styles.greenLineSegment} />
          </View>
        </View>
      </View>

      {/* 1.5 Quick Action Bar: Cart */}
      <View style={styles.quickActionBar}>
        <TouchableOpacity
          style={styles.cartBannerCard}
          onPress={() => setActiveTab('cart')}
          activeOpacity={0.85}
        >
          <View style={styles.cartBannerLeft}>
            <View style={styles.cartIconCircle}>
              <AppIcon name="cart-outline" size={17} color="#ffffff" />
              {totalCartItems > 0 && (
                <View style={styles.cartCircleBadge}>
                  <Text style={styles.cartCircleBadgeText}>{totalCartItems}</Text>
                </View>
              )}
            </View>
            <View style={styles.cartBannerTexts}>
              <Text style={styles.cartBannerTitle}>Food Cart</Text>
              <Text style={styles.cartBannerSubtitle}>
                {totalCartItems === 0
                  ? '0 items added'
                  : `${totalCartItems} items • ₹${cartSubtotal} total`}
              </Text>
            </View>
          </View>
          <View style={styles.cartBannerCta}>
            <Text style={styles.cartBannerCtaText}>View Cart</Text>
            <AppIcon name="arrow-forward" size={13} color="#0d3829" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Category Filter Pills */}
      <CategoryFilterBar />

      {/* 3. Main Body: Today's Menu Grid + Right Widgets */}
      <View style={styles.bodyLayout}>
        {/* Left Column: Menu Items */}
        <View style={styles.menuColumn}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Today's Menu</Text>
              <Text style={styles.sectionSubtitle}>
                Freshly prepared for a healthier, more productive day.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewFullMenuBtn}
              onPress={() => setActiveTab('menu')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewFullMenuText}>View Full Menu</Text>
              <AppIcon name="arrow-forward" size={13} color="#0f172a" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Backend Error / Loading / Menu Items */}
          {menuError ? (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle-outline" size={32} color="#dc2626" />
              <Text style={styles.errorTitle}>Unable to Load Menu</Text>
              <Text style={styles.errorSubtitle}>{menuError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMenu} activeOpacity={0.8}>
                <AppIcon name="refresh-outline" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : isMenuLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a3d31" />
              <Text style={styles.loadingText}>Loading fresh menu from canteen server...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AppIcon name="restaurant-outline" size={28} color="#94a3b8" />
              <Text style={styles.emptyText}>No menu items found</Text>
            </View>
          ) : (
            <View style={styles.foodGrid}>
              {filteredItems.slice(0, 8).map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <FoodCard item={item} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right Column: Widgets */}
        <View style={styles.widgetColumn}>
          <MealTimingsWidget />
        </View>
      </View>

      {/* 4. Bottom Footer */}
      <View style={styles.footerRow}>
        <View style={styles.footerBrand}>
          <Image
            source={require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png')}
            style={styles.footerEmblem}
            resizeMode="contain"
            accessibilityLabel="State Emblem of India"
          />
          <Text style={styles.footerLeft}>
            Canteen Services | Government of India
          </Text>
        </View>
        <Text style={styles.footerRight}>
          Healthy People. Efficient Governance. Stronger India.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 0,
    paddingTop: 8,
    paddingBottom: 0,
    height: 195,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGreeting: {
    zIndex: 2,
    transform: [{ translateY: -10 }],
  },
  greetingSub: {
    fontSize: 17,
    fontWeight: '400',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  officerTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.6,
    lineHeight: 48,
  },
  mottoSub: {
    fontSize: 14.5,
    color: '#334155',
    fontFamily: SANS_FONT,
    fontWeight: '400',
    marginTop: 4,
  },
  greetingAccentLine: {
    width: 38,
    height: 3,
    backgroundColor: '#0e4d36',
    borderRadius: 2,
    marginTop: 10,
  },
  backdropWrapper: {
    position: 'absolute',
    right: 0,
    bottom: -22,
    height: 255,
    aspectRatio: 1945 / 724,
    zIndex: 1,
  },
  tajBackdropImage: {
    width: '100%',
    height: '100%',
    opacity: 0.82,
  },
  sloganWrapper: {
    alignItems: 'flex-start',
    zIndex: 2,
    marginRight: 35,
    transform: [{ translateY: -30 }],
  },
  sloganRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  sloganVerticalLine: {
    width: 2.5,
    backgroundColor: '#0e4d36',
    borderRadius: 1.5,
    marginRight: 10,
  },
  sloganText: {
    fontSize: 15.5,
    fontWeight: '500',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  twoToneAccentLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 12.5,
    height: 3,
  },
  orangeLineSegment: {
    width: 26,
    height: 3,
    backgroundColor: '#ea580c',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  greenLineSegment: {
    width: 26,
    height: 3,
    backgroundColor: '#0e4d36',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  bodyLayout: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 20,
  },
  menuColumn: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  viewFullMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewFullMenuText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '23.4%',
    minWidth: 150,
  },
  widgetColumn: {
    alignItems: 'flex-start',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerEmblem: {
    width: 14,
    height: 18,
    marginRight: 6,
  },
  footerLeft: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  footerRight: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 420,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d31',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  quickActionBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 12,
  },
  cartBannerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  paymentBannerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cartBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a3d31',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartCircleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e11d48',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartCircleBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  cartBannerTexts: {
    justifyContent: 'center',
  },
  cartBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a3d31',
  },
  cartBannerSubtitle: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '500',
  },
  cartBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cartBannerCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a3d31',
  },
  paymentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  paymentBannerSubtitle: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '500',
  },
  paymentBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentBannerCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cartHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d3829',
  },
  cartHeaderBadge: {
    backgroundColor: '#e11d48',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginLeft: 5,
  },
  cartHeaderBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
});
