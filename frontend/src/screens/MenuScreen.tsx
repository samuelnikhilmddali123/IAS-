import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { MenuItem } from '../types';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { FoodCard } from '../components/FoodCard';
import { CartSidebar } from '../components/CartSidebar';

export const MenuScreen: React.FC = () => {
  const { activeCategory, searchQuery, menuItems, menuError, isMenuLoading, fetchMenu } = useCanteen();

  const allItems = menuItems || [];
  const breakfastItems = allItems.filter((i) => i.category === 'breakfast');
  const lunchItems = allItems.filter((i) => i.category === 'lunch');
  const dinnerItems = allItems.filter((i) => i.category === 'dinner');
  const snackItems = allItems.filter((i) => i.category === 'snacks' || i.category === 'beverages');

  const applyFilters = (items: MenuItem[]) => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' ||
        item.category === activeCategory ||
        (activeCategory === 'south-indian' && item.subCategory === 'South Indian') ||
        (activeCategory === 'north-indian' && item.subCategory === 'North Indian') ||
        (activeCategory === 'healthy' && item.subCategory === 'Healthy');

      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  };

  const visibleBreakfast = applyFilters(breakfastItems);
  const visibleLunch = applyFilters(lunchItems);
  const visibleDinner = applyFilters(dinnerItems);
  const visibleSnacks = applyFilters(snackItems);
  const hasAnyItems =
    visibleBreakfast.length > 0 ||
    visibleLunch.length > 0 ||
    visibleDinner.length > 0 ||
    visibleSnacks.length > 0;

  return (
    <View style={styles.screenContainer}>
      {/* 1. Category Filter Pills */}
      <CategoryFilterBar />

      {/* 2. Main Body: Scrollable Menu Sections on Left + Sticky Cart Sidebar on Right */}
      <View style={styles.mainLayout}>
        {/* Left Scrollable Menu Categories */}
        <ScrollView
          style={styles.menuScrollArea}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {menuError ? (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle-outline" size={36} color="#dc2626" />
              <Text style={styles.errorTitle}>Unable to Load Menu</Text>
              <Text style={styles.errorSubtitle}>{menuError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMenu} activeOpacity={0.8}>
                <AppIcon name="refresh-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : isMenuLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a3d31" />
              <Text style={styles.loadingText}>Fetching menu from canteen server...</Text>
            </View>
          ) : !hasAnyItems ? (
            <View style={styles.emptyContainer}>
              <AppIcon name="restaurant-outline" size={32} color="#94a3b8" />
              <Text style={styles.emptyText}>No menu items match your search or filter.</Text>
            </View>
          ) : (
            <>
              {/* Section 1: Breakfast */}
              {visibleBreakfast.length > 0 && (
                <View style={styles.categorySection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Breakfast{' '}
                      <Text style={styles.sectionCount}>({visibleBreakfast.length} items)</Text>
                    </Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <AppIcon name="arrow-forward" size={13} color="#0f172a" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.foodRow}>
                    {visibleBreakfast.map((item) => (
                      <View key={item.id} style={styles.cardWrapper}>
                        <FoodCard item={item} />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Section 2: Lunch */}
              {visibleLunch.length > 0 && (
                <View style={styles.categorySection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Lunch{' '}
                      <Text style={styles.sectionCount}>({visibleLunch.length} items)</Text>
                    </Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <AppIcon name="arrow-forward" size={13} color="#0f172a" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.foodRow}>
                    {visibleLunch.map((item) => (
                      <View key={item.id} style={styles.cardWrapper}>
                        <FoodCard item={item} />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Section 3: Dinner */}
              {visibleDinner.length > 0 && (
                <View style={styles.categorySection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Dinner{' '}
                      <Text style={styles.sectionCount}>({visibleDinner.length} items)</Text>
                    </Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <AppIcon name="arrow-forward" size={13} color="#0f172a" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.foodRow}>
                    {visibleDinner.map((item) => (
                      <View key={item.id} style={styles.cardWrapper}>
                        <FoodCard item={item} />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Section 4: Snacks & Beverages */}
              {visibleSnacks.length > 0 && (
                <View style={styles.categorySection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                      Snacks & Beverages{' '}
                      <Text style={styles.sectionCount}>({visibleSnacks.length} items)</Text>
                    </Text>
                    <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <AppIcon name="arrow-forward" size={13} color="#0f172a" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.foodRow}>
                    {visibleSnacks.map((item) => (
                      <View key={item.id} style={styles.cardWrapper}>
                        <FoodCard item={item} />
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Right Sticky Cart Sidebar */}
        <View style={styles.cartColumn}>
          <CartSidebar />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 20,
    alignItems: 'flex-start',
  },
  menuScrollArea: {
    flex: 1,
    height: '100%',
  },
  menuScrollContent: {
    paddingBottom: 24,
  },
  cartColumn: {
    width: 310,
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  foodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardWrapper: {
    width: 128,
    flexGrow: 1,
    maxWidth: 160,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 10,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#b91c1c',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 450,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3d31',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 10,
  },
});

