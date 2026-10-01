import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCanteen, fetchWithFallback } from '../context/CanteenContext';
import { getDisplayImageUrl } from '../utils/imageUtils';

const EMBLEM_IMAGE = require('../../assets/6a72e4e7-5e3f-43cb-bd57-bac2a1fcb7f4.png');

const getStatusInfo = (status: string | undefined) => {
  const s = (status || '').toUpperCase();
  if (s === 'READY' || s === 'ALMOST_READY') {
    return { text: 'Ready', emoji: '🔔' };
  }
  if (s === 'PREPARING' || s === 'COOKING' || s === 'IN_PROGRESS') {
    return { text: 'Preparing Food', emoji: '🍳' };
  }
  if (s === 'NEW' || s === 'PENDING' || s === 'PRE_ORDERED' || s === 'PLACED' || s === 'ORDER_PLACED' || s === 'ACCEPTED') {
    return { text: 'Order Placed', emoji: '📋' };
  }
  return { text: 'No active orders', emoji: '✨' };
};

const AnimatedBubble = ({ status }: { status?: string }) => {
  const { text, emoji } = getStatusInfo(status);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [floatAnim]);

  return (
    <Animated.View style={[styles.bubble, { transform: [{ translateY: floatAnim }] }]}>
      <Text style={styles.bubbleText}>{text} <Text style={{ fontSize: 16 }}>{emoji}</Text></Text>
      <View style={styles.bubbleArrow} />
    </Animated.View>
  );
};

export const RecentSessionsBar = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const { quickLogin } = useCanteen();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const usersRes = await fetchWithFallback('/api/auth/users', {}, 3000);
        const usersData = await usersRes.json().catch(() => ({}));
        const validDbUsers = Array.isArray(usersData?.users) ? usersData.users : [];

        if (validDbUsers.length === 0) {
          setSessions([]);
          await AsyncStorage.removeItem('@recent_sessions');
          return;
        }

        const stored = await AsyncStorage.getItem('@recent_sessions');
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          // Filter valid sessions (strictly active within 1 hour based on DB pinExpiresAt)
          const valid = parsed.filter((s: any) => {
            const sPhone = (s.phone || '').replace(/\D/g, '').slice(-10);
            const dbUser = validDbUsers.find((u: any) => {
              const uPhone = (u.phone || '').replace(/\D/g, '').slice(-10);
              return (uPhone && uPhone === sPhone) || String(u.id) === String(s.id) || String(u._id) === String(s.id);
            });
            if (!dbUser) return false;
            const expTime = dbUser.pinExpiresAt ? new Date(dbUser.pinExpiresAt).getTime() : 0;
            if (!expTime || now >= expTime) return false;
            return true;
          });
          
          await AsyncStorage.setItem('@recent_sessions', JSON.stringify(valid));

          if (valid.length === 0) {
            setSessions([]);
            return;
          }

          // Fetch order statuses
          const withStatus = await Promise.all(valid.map(async (s: any) => {
            try {
              const rawPhone = (s.phone || '').replace(/\D/g, '').slice(-10);
              const queryParam = rawPhone ? ('phone=' + rawPhone) : ('userId=' + s.id);
              const res = await fetchWithFallback(`/api/orders?${queryParam}`, {}, 3000);
              const resData: any = await res.json().catch(() => ({}));
              if (resData.success && resData.orders && resData.orders.length > 0) {
                const sorted = resData.orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const active = sorted.find((o: any) => {
                  const st = (o.kitchenStatus || o.status || '').toUpperCase();
                  return ['NEW', 'ACCEPTED', 'PENDING', 'PRE_ORDERED', 'PLACED', 'ORDER_PLACED', 'PREPARING', 'COOKING', 'IN_PROGRESS', 'ALMOST_READY', 'READY'].includes(st);
                });
                if (active) {
                  const kSt = (active.kitchenStatus || '').toUpperCase();
                  const oSt = (active.status || '').toUpperCase();
                  if (kSt === 'NEW' || kSt === 'ACCEPTED' || oSt === 'NEW' || oSt === 'PENDING' || oSt === 'PRE_ORDERED' || oSt === 'PLACED' || oSt === 'ORDER_PLACED') {
                    s.orderStatus = 'NEW';
                  } else if (kSt === 'PREPARING' || kSt === 'COOKING' || oSt === 'PREPARING' || oSt === 'COOKING' || oSt === 'IN_PROGRESS') {
                    s.orderStatus = 'PREPARING';
                  } else if (kSt === 'READY' || kSt === 'ALMOST_READY' || oSt === 'READY' || oSt === 'ALMOST_READY') {
                    s.orderStatus = 'READY';
                  } else {
                    s.orderStatus = null;
                  }

                  if (active.userName && active.userName.trim() && active.userName !== 'IAS Officer') {
                    s.name = active.userName;
                  }
                  if (active.userAvatar && active.userAvatar.trim() && !active.userAvatar.includes('photo-1507003211169')) {
                    s.avatar = active.userAvatar;
                  }
                } else {
                  s.orderStatus = null;
                }
              } else {
                s.orderStatus = null;
              }
            } catch (e) {}
            return s;
          }));

          setSessions(withStatus);
        } else {
          setSessions([]);
        }
      } catch (e) {
        setSessions([]);
      }
    };

    loadSessions();
    const interval = setInterval(loadSessions, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (sessions.length === 0) return null;

  return (
    <View style={styles.container}>
      {sessions.map((s) => {
        const displayAvatar = getDisplayImageUrl(s.avatar);
        const hasCustomAvatar = Boolean(displayAvatar && !displayAvatar.includes('photo-1507003211169'));
        return (
          <View key={s.id} style={styles.sessionItem}>
            <AnimatedBubble status={s.orderStatus} />
            <TouchableOpacity 
              style={styles.avatarBtn} 
              onPress={() => quickLogin(s.token, s)}
            >
              <Image 
                source={hasCustomAvatar ? { uri: displayAvatar } : EMBLEM_IMAGE} 
                style={styles.avatarImg}
                resizeMode={hasCustomAvatar ? 'cover' : 'contain'} 
              />
              <View style={styles.statusDot} />
            </TouchableOpacity>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{s.designation || 'IAS'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 40,
    top: '30%',
    alignItems: 'flex-end',
    gap: 30,
    zIndex: 100,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  bubble: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleText: {
    fontSize: 12,
    color: '#0d3829',
    fontWeight: '600',
  },
  bubbleArrow: {
    position: 'absolute',
    right: -6,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    borderLeftWidth: 6,
    borderLeftColor: '#ffffff',
  },
  avatarBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    backgroundColor: '#fff',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
    right: 15,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  }
});
