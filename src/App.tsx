import React, { useEffect, useRef } from 'react';
import { StatusBar, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { startOfflineSync } from './services/offlineService';
import { initializeAds, showAppOpenIfAvailable } from './services/adsService';
import i18n from './i18n';

// Enable Firestore offline persistence (enabled by default in @react-native-firebase)
import firestore from '@react-native-firebase/firestore';
firestore().settings({ persistence: true });

const AppContent: React.FC = () => {
  const { theme } = useAppTheme();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const stopSync = startOfflineSync();
    return () => stopSync();
  }, []);

  useEffect(() => {
    // Initialize Mobile Ads SDK on cold start, then attempt to show app-open ad.
    initializeAds()
      .then(() => {
        setTimeout(() => showAppOpenIfAvailable(), 1500);
      })
      .catch(e => console.warn('Mobile ads init failed:', e));

    // Show app-open ad on returning to foreground.
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        showAppOpenIfAvailable();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer
        theme={{
          dark: theme.dark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
};

const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
};

export default App;
