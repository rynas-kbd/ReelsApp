import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { makeTheme, type Theme } from '@reelvault/design-tokens';

const THEME_KEY = 'reelvault_theme_scheme';
type Scheme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  scheme: Scheme;
  setScheme: (s: Scheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: makeTheme('light'),
  scheme: 'light',
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>('light');

  // Load persisted preference
  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setSchemeState(stored);
      }
    }).catch(() => {});
  }, []);

  function setScheme(s: Scheme) {
    setSchemeState(s);
    SecureStore.setItemAsync(THEME_KEY, s).catch(() => {});
  }

  const resolved: 'light' | 'dark' = scheme === 'system'
    ? (Appearance.getColorScheme() ?? 'light')
    : scheme;

  const theme = makeTheme(resolved);

  return (
    <ThemeContext.Provider value={{ theme, scheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeControl() {
  const ctx = useContext(ThemeContext);
  return { scheme: ctx.scheme, setScheme: ctx.setScheme };
}
