import React from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';

export interface WhiteScreenLandscapeProps {
  width?: number;
  height?: number;
  isLocked?: boolean;
}

// Support both web static folder (/budda.jpeg) and native bundle asset
const BUDDHA_IMAGE_SOURCE = Platform.select({
  web: { uri: '/budha home.png' },
  default: require('../../assets/budha home.png'),
});

/**
 * Pure white screen component in fixed landscape mode with Buddha banner positioned in the top right.
 */
export const WhiteScreenLandscape: React.FC<WhiteScreenLandscapeProps> = () => {
  return (
    <View style={styles.container}>
      <View style={styles.topRightContainer}>
        <Image
          source={BUDDHA_IMAGE_SOURCE}
          style={styles.tajImage}
          resizeMode="cover"
          accessibilityLabel="Buddha Banner"
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
