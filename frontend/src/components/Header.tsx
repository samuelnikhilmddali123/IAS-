import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { useCanteen } from '../context/CanteenContext';

const EMBLEM_IMAGE = require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');

const OFFICER_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80';

export const Header: React.FC = () => {
  const { searchQuery, setSearchQuery, userProfile, setActiveTab } = useCanteen();
  const searchInputRef = useRef<TextInput>(null);
  const [timeStr, setTimeStr] = useState<string>('12:28 PM');
  const [dateStr, setDateStr] = useState<string>('Wed, 17 Sep 2026');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      setTimeStr(`${formattedHours}:${formattedMinutes} ${ampm}`);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      setDateStr(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.headerContainer}>
      {/* Top Bar Row */}
      <View style={styles.topRow}>
        {/* Left: Emblem & Canteen Services Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.emblemContainer}>
            <Image
              source={EMBLEM_IMAGE}
              style={styles.emblemImage}
              resizeMode="contain"
              accessibilityLabel="Government of India Emblem"
            />
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.govText}>Government of India</Text>
            <Text style={styles.brandTitle}>Canteen Services</Text>
            <Text style={styles.tagline}>Good Food. Greater Service.</Text>
          </View>
        </View>

        {/* Center: Search Bar */}
        <TouchableOpacity
          style={styles.searchWrapper}
          activeOpacity={1}
          onPress={() => searchInputRef.current?.focus()}
        >
          <AppIcon name="search-outline" size={17} color="#64748b" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for dishes, cuisines or dietary preferences..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            disableFullscreenUI={true}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            multiline={false}
            numberOfLines={1}
          />
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <AppIcon name="options-outline" size={17} color="#334155" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Right Section: Time, Notifications, Officer Profile */}
        <View style={styles.rightSection}>
          {/* Live Date & Time */}
          <View style={styles.timeContainer}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>

          {/* Notification Bell */}
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <AppIcon name="notifications-outline" size={18} color="#1e293b" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          {/* Officer Profile Pill */}
          <TouchableOpacity
            style={styles.profilePill}
            activeOpacity={0.85}
            onPress={() => setActiveTab('profile')}
          >
            <Image
              source={{ uri: userProfile.avatar || OFFICER_AVATAR }}
              style={styles.avatar}
            />
            <View style={styles.profileTextCol}>
              <Text style={styles.officerName}>{userProfile.name || 'Officer'}</Text>
              <Text style={styles.officerRole}>{userProfile.designation || 'Officer'}</Text>
            </View>
            <AppIcon name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 56,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 230,
  },
  emblemContainer: {
    width: 36,
    height: 48,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: 36,
    height: 48,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  govText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  tagline: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '400',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 42,
    maxWidth: 480,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    height: '100%',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  filterBtn: {
    padding: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timeContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  profileTextCol: {
    justifyContent: 'center',
  },
  officerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 15,
  },
  officerRole: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 12,
  },
});
