import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AppIcon, IconName } from './AppIcon';
import { CATEGORIES } from '../data/canteenData';
import { useCanteen } from '../context/CanteenContext';
import { CategoryId } from '../types';

export interface CategoryFilterBarProps {
  dietFilter?: 'all' | 'veg' | 'non-veg';
}

const VEG_CATEGORY_IDS: CategoryId[] = [
  'all',
  'veg-starters',
  'paneer-starters',
  'veg-curries',
  'rice-veg',
  'soups',
  'salads',
  'noodles',
  'indian-breads',
  'beverages',
  'desserts',
];

const NON_VEG_CATEGORY_IDS: CategoryId[] = [
  'all',
  'chicken-starters',
  'egg-starters',
  'fish-prawns-starters',
  'chicken-biryani',
  'chicken-curries',
  'mutton-curries',
  'fish-prawns-curries',
  'mutton-biryani',
  'fish-prawns-biryani',
  'tandoori-kebabs',
  'rice-non-veg',
  'noodles',
  'beverages',
  'desserts',
];

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({ dietFilter = 'all' }) => {
  const { activeCategory, setActiveCategory } = useCanteen();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const categoryLayouts = React.useRef<{ [key: string]: number }>({});

  // Filter categories based on diet selection
  const displayedCategories = React.useMemo(() => {
    if (dietFilter === 'veg') {
      return CATEGORIES.filter((cat) => VEG_CATEGORY_IDS.includes(cat.id));
    } else if (dietFilter === 'non-veg') {
      return CATEGORIES.filter((cat) => NON_VEG_CATEGORY_IDS.includes(cat.id));
    }
    return CATEGORIES;
  }, [dietFilter]);

  // When activeCategory changes, smoothly scroll the top category bar to that item
  React.useEffect(() => {
    if (categoryLayouts.current[activeCategory] !== undefined) {
      scrollViewRef.current?.scrollTo({
        x: Math.max(0, categoryLayouts.current[activeCategory] - 40),
        animated: true,
      });
    }
  }, [activeCategory]);

  const getIcon = (id: CategoryId): IconName => {
    switch (id) {
      case 'all':
        return 'grid';
      case 'soups':
        return 'leaf-outline';
      case 'salads':
        return 'leaf';
      case 'veg-starters':
        return 'nutrition';
      case 'paneer-starters':
        return 'restaurant-outline';
      case 'egg-starters':
        return 'nutrition';
      case 'chicken-starters':
        return 'flame';
      case 'fish-prawns-starters':
        return 'restaurant';
      case 'chicken-curries':
        return 'flame';
      case 'mutton-curries':
        return 'flame';
      case 'fish-prawns-curries':
        return 'restaurant';
      case 'veg-curries':
        return 'leaf';
      case 'rice-veg':
        return 'nutrition';
      case 'rice-non-veg':
        return 'restaurant';
      case 'noodles':
        return 'fast-food-outline';
      case 'chicken-biryani':
        return 'flame';
      case 'mutton-biryani':
        return 'flame';
      case 'fish-prawns-biryani':
        return 'restaurant';
      case 'tandoori-kebabs':
        return 'flame';
      case 'indian-breads':
        return 'cafe-outline';
      case 'beverages':
        return 'wine-outline';
      case 'desserts':
        return 'sunny-outline';
      default:
        return 'grid';
    }
  };

  const getLabel = (cat: typeof CATEGORIES[0]) => {
    if (cat.id === 'all') {
      if (dietFilter === 'veg') return 'All Veg Dishes';
      if (dietFilter === 'non-veg') return 'All Non-Veg Dishes';
      return 'All Menu';
    }
    if (cat.id === 'soups') {
      if (dietFilter === 'veg') return 'Veg Soups';
      if (dietFilter === 'non-veg') return 'Non-Veg Soups';
    }
    if (cat.id === 'noodles') {
      if (dietFilter === 'veg') return 'Veg Noodles';
      if (dietFilter === 'non-veg') return 'Non-Veg Noodles';
    }
    return cat.label;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayedCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pill, isActive && styles.pillActive]}
              onLayout={(e) => {
                categoryLayouts.current[cat.id] = e.nativeEvent.layout.x;
              }}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.75}
            >
              {cat.id !== 'all' && (
                <AppIcon
                  name={getIcon(cat.id)}
                  size={14}
                  color={isActive ? '#ffffff' : '#334155'}
                  style={styles.pillIcon}
                />
              )}
              <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {getLabel(cat)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 34,
  },
  pillActive: {
    backgroundColor: '#0d3829',
    borderColor: '#0d3829',
  },
  pillIcon: {
    marginRight: 6,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pillLabelActive: {
    color: '#ffffff',
  },
});
