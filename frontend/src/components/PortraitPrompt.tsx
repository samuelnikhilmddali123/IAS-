import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';

export interface PortraitPromptProps {
  onRequestFullscreen: () => Promise<void>;
}

/**
 * TypeScript React Component displayed when web viewport is portrait,
 * prompting the user to rotate their device/browser to landscape mode.
 */
export const PortraitPrompt: React.FC<PortraitPromptProps> = ({ onRequestFullscreen }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [rotateAnim]);

  const rotationInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.deviceWrapper,
          { transform: [{ rotate: rotationInterpolation }] },
        ]}
      >
        <View style={styles.phoneFrame}>
          <View style={styles.phoneScreen} />
          <View style={styles.phoneNotch} />
        </View>
      </Animated.View>

      <Text style={styles.title}>Landscape Mode Required</Text>
      <Text style={styles.subtitle}>
        Please rotate your device horizontally. This web app is locked in landscape mode.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onRequestFullscreen}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Enter Fullscreen Landscape</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    maxWidth: 440,
    backgroundColor: '#ffffff',
  },
  deviceWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  phoneFrame: {
    width: 44,
    height: 74,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneScreen: {
    width: 32,
    height: 54,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  phoneNotch: {
    width: 12,
    height: 3,
    backgroundColor: '#0f172a',
    borderRadius: 2,
    position: 'absolute',
    top: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
