import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AppIcon, IconName } from './AppIcon';
import { MEAL_TIMINGS } from '../data/canteenData';

export const MealTimingsWidget: React.FC = () => {
  const getTimingIcon = (name: string): IconName => {
    switch (name.toLowerCase()) {
      case 'breakfast':
        return 'sunny-outline';
      case 'lunch':
        return 'restaurant-outline';
      case 'snacks':
        return 'cafe-outline';
      case 'dinner':
        return 'moon-outline';
      default:
        return 'time-outline';
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Wholesome Meals Card */}
      <TouchableOpacity style={styles.wholesomeCard} activeOpacity={0.85}>
        <View style={styles.leafIconCircle}>
          <AppIcon name="leaf" size={20} color="#2d6a4f" />
        </View>
        <View style={styles.wholesomeTextWrapper}>
          <Text style={styles.wholesomeTitle}>
            Wholesome Meals{'\n'}for a Productive Day
          </Text>
          <Text style={styles.wholesomeSub}>Fresh | Nutritious | Hygienic</Text>
        </View>
        <View style={styles.arrowCircle}>
          <AppIcon name="chevron-forward" size={15} color="#334155" />
        </View>
      </TouchableOpacity>

      {/* 2. Meal Timings Card */}
      <View style={styles.timingsCard}>
        <View style={styles.timingsHeader}>
          <AppIcon name="time-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.timingsTitle}>Meal Timings</Text>
        </View>

        <View style={styles.timingsList}>
          {MEAL_TIMINGS.map((timing) => (
            <View
              key={timing.name}
              style={[
                styles.timingRow,
                timing.isActive && styles.timingRowActive,
              ]}
            >
              <View style={styles.timingLeft}>
                <AppIcon
                  name={getTimingIcon(timing.name)}
                  size={14}
                  color={timing.isActive ? '#0e382b' : '#64748b'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.timingName,
                    timing.isActive && styles.timingNameActive,
                  ]}
                >
                  {timing.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.timingHours,
                  timing.isActive && styles.timingHoursActive,
                ]}
              >
                {timing.hours}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 3. Quote Card */}
      <View style={styles.quoteCard}>
        <View style={styles.quoteLeafIcon}>
          <AppIcon name="leaf-outline" size={24} color="#52b788" />
        </View>
        <Text style={styles.quoteText}>
          “Good food{'\n'}builds a better tomorrow.”
        </Text>
        <View style={styles.tagsRow}>
          <Text style={styles.hashtag}>#Seva</Text>
          <Text style={styles.hashtag}>#Sustainable</Text>
          <Text style={styles.hashtag}>#HealthyIndia</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 290,
    gap: 12,
  },
  wholesomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  leafIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eaf4ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  wholesomeTextWrapper: {
    flex: 1,
  },
  wholesomeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 16,
  },
  wholesomeSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  timingsCard: {
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
  },
  timingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  timingsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  timingsList: {
    gap: 6,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timingRowActive: {
    backgroundColor: '#eef7f2',
  },
  timingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timingName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  timingNameActive: {
    color: '#0e382b',
    fontWeight: '700',
  },
  timingHours: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  timingHoursActive: {
    color: '#0e382b',
    fontWeight: '700',
  },
  quoteCard: {
    backgroundColor: '#f6faf7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2ece4',
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteLeafIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.5,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '600',
    color: '#1e3a2f',
    lineHeight: 18,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hashtag: {
    fontSize: 9,
    fontWeight: '600',
    color: '#52796f',
  },
});
