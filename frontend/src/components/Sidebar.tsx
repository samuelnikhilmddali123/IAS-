import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AppIcon, IconName } from './AppIcon';
import { useCanteen } from '../context/CanteenContext';
import { ScreenTab } from '../types';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, totalCartItems } = useCanteen();

  const navItems: { tab: ScreenTab; label: string; icon: IconName; iconActive: IconName }[] = [
    { tab: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { tab: 'menu', label: 'Menu', icon: 'restaurant-outline', iconActive: 'restaurant' },
    { tab: 'orders', label: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
    { tab: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
  ];

  const bottomItems: { tab: ScreenTab; label: string; icon: IconName }[] = [
    { tab: 'settings', label: 'Settings', icon: 'settings-outline' },
    { tab: 'help', label: 'Help', icon: 'help-circle-outline' },
  ];

  return (
    <View style={styles.sidebar}>
      {/* Top Section Nav Items */}
      <View style={styles.navGroup}>
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <TouchableOpacity
              key={item.tab}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => setActiveTab(item.tab)}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <AppIcon
                  name={isActive ? item.iconActive : item.icon}
                  size={20}
                  color={isActive ? '#0c3527' : '#a3c9b7'}
                />
                {item.tab === 'orders' && totalCartItems > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalCartItems > 9 ? '9+' : totalCartItems}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomGroup}>
        {bottomItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <TouchableOpacity
              key={item.tab}
              style={[styles.bottomNavItem, isActive && styles.navItemActive]}
              onPress={() => setActiveTab(item.tab)}
              activeOpacity={0.8}
            >
              <AppIcon
                name={item.icon}
                size={18}
                color={isActive ? '#0c3527' : '#a3c9b7'}
              />
              <Text style={[styles.bottomNavLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Brand Stamp */}
        <View style={styles.brandStamp}>
          <AppIcon name="leaf" size={22} color="#52b788" />
          <Text style={styles.brandText}>Serve{'\n'}Nourish{'\n'}Build</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 78,
    backgroundColor: '#0c3527',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 20,
  },
  navGroup: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  navItem: {
    width: 62,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#e11d48',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a3c9b7',
    marginTop: 3,
  },
  navLabelActive: {
    color: '#0c3527',
    fontWeight: '700',
  },
  bottomGroup: {
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  bottomNavItem: {
    width: 62,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavLabel: {
    fontSize: 10,
    color: '#a3c9b7',
    marginTop: 2,
    fontWeight: '500',
  },
  brandStamp: {
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    width: 58,
  },
  brandText: {
    fontSize: 8,
    color: '#74a892',
    textAlign: 'center',
    lineHeight: 10,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
