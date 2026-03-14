import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, LightTheme, DarkTheme } from '../theme';
import { ASYNC_STORAGE_KEYS } from '../constants';

type ThemePreference = 'default' | 'light' | 'dark';

interface ThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: LightTheme,
  preference: 'default',
  setPreference: async () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('default');

  useEffect(() => {
    AsyncStorage.getItem(ASYNC_STORAGE_KEYS.THEME).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'default') {
        setPreferenceState(saved);
      }
    });
  }, []);

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.THEME, pref);
  };

  const resolvedTheme = (() => {
    if (preference === 'light') return LightTheme;
    if (preference === 'dark') return DarkTheme;
    return systemScheme === 'dark' ? DarkTheme : LightTheme;
  })();

  return (
    <ThemeContext.Provider
      value={{ theme: resolvedTheme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};
