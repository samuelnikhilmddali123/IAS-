import React from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';

export interface WhiteScreenLandscapeProps {
  width?: number;
  height?: number;
  isLocked?: boolean;
}

// Support both web static folder (/taj.png) and native bundle asset
const TAJ_IMAGE_SOURCE = Platform.select({
  web: { uri: '/taj.png' },
  default: require('../../assets/taj.png'),
});

/**
 * Pure white screen component in fixed landscape mode with Taj logo positioned in the top right.
 */
export const WhiteScreenLandscape: React.FC<WhiteScreenLandscapeProps> = () => {
  return (
    <View style={styles.container}>
      <View style={styles.topRightContainer}>
        <Image
          source={TAJ_IMAGE_SOURCE}
          style={styles.tajImage}
          resizeMode="contain"
          accessibilityLabel="Taj Logo"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  topRightContainer: {
    position: 'absolute',
    top: 24,
    right: 28,
    zIndex: 10,
  },
  tajImage: {
    width: 165,
    height: 55,
  },
});
