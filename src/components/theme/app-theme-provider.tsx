'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  defaultThemeMode,
  defaultThemePreset,
  getThemePreset,
  type ThemeMode,
  type ThemePresetKey,
} from '@/config/theme-presets';

const THEME_MODE_KEY = 'portaria-theme-mode';
const THEME_PRESET_KEY = 'portaria-theme-preset';

type AppThemeContextValue = {
  mode: ThemeMode;
  preset: ThemePresetKey;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePresetKey) => void;
  toggleMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function applyTheme(mode: ThemeMode, preset: ThemePresetKey) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const presetConfig = getThemePreset(preset);
  const palette = presetConfig[mode];

  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
  root.setAttribute('data-theme-mode', mode);
  root.setAttribute('data-theme-preset', preset);
  root.style.colorScheme = mode;
  root.style.setProperty('--primary', presetConfig.primary);
  root.style.setProperty('--primary-foreground', presetConfig.primaryForeground);
  root.style.setProperty('--ring', presetConfig.ring);
  root.style.setProperty('--shell-bg', palette.shellBg);
  root.style.setProperty('--shell-bg-accent', palette.shellBgAccent);
  root.style.setProperty('--surface', palette.surface);
  root.style.setProperty('--surface-strong', palette.surfaceStrong);
  root.style.setProperty('--surface-muted', palette.surfaceMuted);
  root.style.setProperty('--surface-border', palette.border);
  root.style.setProperty('--text-main', palette.text);
  root.style.setProperty('--text-soft', palette.textSoft);
  root.style.setProperty('--text-muted', palette.textMuted);
  root.style.setProperty('--nav-active-bg', palette.navActiveBg);
  root.style.setProperty('--nav-active-text', palette.navActiveText);
  root.style.setProperty('--nav-inactive-text', palette.navInactiveText);
  root.style.setProperty('--shadow-elevated', palette.shadow);
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(defaultThemeMode);
  const [preset, setPresetState] = useState<ThemePresetKey>(defaultThemePreset);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMode = window.localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;
    const storedPreset = window.localStorage.getItem(THEME_PRESET_KEY) as ThemePresetKey | null;
    const nextMode = storedMode === 'light' || storedMode === 'dark' ? storedMode : defaultThemeMode;
    const nextPreset = storedPreset ? getThemePreset(storedPreset).key : defaultThemePreset;

    setModeState(nextMode);
    setPresetState(nextPreset);
    applyTheme(nextMode, nextPreset);
  }, []);

  useEffect(() => {
    applyTheme(mode, preset);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(THEME_MODE_KEY, mode);
    window.localStorage.setItem(THEME_PRESET_KEY, preset);
  }, [mode, preset]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      preset,
      setMode: (nextMode) => setModeState(nextMode),
      setPreset: (nextPreset) => setPresetState(getThemePreset(nextPreset).key),
      toggleMode: () => setModeState((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [mode, preset]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme deve ser usado dentro de AppThemeProvider.');
  }

  return context;
}
