import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider, useAppTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { startOfflineSync } from './services/offlineService';
import i18n from './i18n';

// Enable Firestore offline persistence (enabled by default in @react-native-firebase)
import firestore from '@react-native-firebase/firestore';
firestore().settings({ persistence: true });

const AppContent: React.FC = () => {
  const { theme } = useAppTheme();

  useEffect(() => {
    const stopSync = startOfflineSync();
    return () => stopSync();
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
