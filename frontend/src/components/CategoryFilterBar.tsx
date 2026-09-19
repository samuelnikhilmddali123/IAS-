import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AppIcon, IconName } from './AppIcon';
import { CATEGORIES } from '../data/canteenData';
import { useCanteen } from '../context/CanteenContext';
import { CategoryId } from '../types';

export const CategoryFilterBar: React.FC = () => {
  const { activeCategory, setActiveCategory } = useCanteen();

  const getIcon = (id: CategoryId): IconName => {
    switch (id) {
      case 'all':
        return 'grid';
      case 'breakfast':
        return 'sunny-outline';
      case 'lunch':
        return 'restaurant-outline';
      case 'snacks':
        return 'cafe-outline';
      case 'beverages':
        return 'wine-outline';
      case 'healthy':
        return 'leaf-outline';
      case 'south-indian':
        return 'triangle-outline';
      case 'north-indian':
        return 'business-outline';
      default:
        return 'grid';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pill, isActive && styles.pillActive]}
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
                {cat.label}
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
