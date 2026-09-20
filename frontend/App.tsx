import React from 'react';
import { StyleSheet, View, SafeAreaView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useLandscapeOrientation } from './src/hooks/useLandscapeOrientation';
import { PortraitPrompt } from './src/components/PortraitPrompt';
import { CanteenProvider, useCanteen } from './src/context/CanteenContext';
import { Sidebar } from './src/components/Sidebar';
import { Header } from './src/components/Header';
import { HomeScreen } from './src/screens/HomeScreen';
import { MenuScreen } from './src/screens/MenuScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen, SettingsScreen, HelpScreen } from './src/screens/OtherScreens';

function MainLandscapeApp(): React.JSX.Element {
  const { activeTab } = useCanteen();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'menu':
        return <MenuScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'payment':
        return <PaymentScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'help':
        return <HelpScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.appShell}>
      {/* Left Dark Forest Green Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <Header />
        <View style={styles.screenContainer}>{renderActiveScreen()}</View>
      </View>
    </View>
  );
}

function AppContent(): React.JSX.Element {
  const { isAuthenticated } = useCanteen();
  const { isPortrait, requestFullscreenLandscape } = useLandscapeOrientation();

  // If viewport is currently in portrait on web, prompt to rotate to landscape
  if (isPortrait && Platform.OS === 'web') {
    return <PortraitPrompt onRequestFullscreen={requestFullscreenLandscape} />;
  }

  // If not logged in, render LoginScreen edge-to-edge without SafeAreaView insets
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainLandscapeApp />
    </SafeAreaView>
  );
}

function MainAppShell(): React.JSX.Element {
  return (
    <View style={styles.rootShell}>
      <StatusBar style="dark" />
      <AppContent />
    </View>
  );
}

export default function App(): React.JSX.Element {
  return (
    <CanteenProvider>
      <MainAppShell />
    </CanteenProvider>
  );
}

const styles = StyleSheet.create({
  rootShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  appShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    height: '100%',
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
