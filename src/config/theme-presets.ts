export type ThemeMode = 'light' | 'dark';

export type ThemePresetKey = 'ocean' | 'forest' | 'ember' | 'graphite';

export type ThemePreset = {
  key: ThemePresetKey;
  label: string;
  description: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  light: {
    shellBg: string;
    shellBgAccent: string;
    surface: string;
    surfaceStrong: string;
    surfaceMuted: string;
    border: string;
    text: string;
    textSoft: string;
    textMuted: string;
    navActiveBg: string;
    navActiveText: string;
    navInactiveText: string;
    shadow: string;
  };
  dark: {
    shellBg: string;
    shellBgAccent: string;
    surface: string;
    surfaceStrong: string;
    surfaceMuted: string;
    border: string;
    text: string;
    textSoft: string;
    textMuted: string;
    navActiveBg: string;
    navActiveText: string;
    navInactiveText: string;
    shadow: string;
  };
};

export const themePresets: ThemePreset[] = [
  {
    key: 'ocean',
    label: 'Oceano',
    description: 'Azul técnico para operação contínua.',
    primary: '196 89% 48%',
    primaryForeground: '210 40% 98%',
    ring: '196 89% 48%',
    light: {
      shellBg: 'linear-gradient(180deg, #edf7ff 0%, #dceefe 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(14,165,233,0.18), transparent 36%)',
      surface: 'rgba(255,255,255,0.84)',
      surfaceStrong: 'rgba(255,255,255,0.96)',
      surfaceMuted: 'rgba(226,242,255,0.88)',
      border: 'rgba(125,170,205,0.35)',
      text: '#0f172a',
      textSoft: '#1e3a5f',
      textMuted: '#5f7388',
      navActiveBg: '#0f172a',
      navActiveText: '#f8fafc',
      navInactiveText: '#24425c',
      shadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
    },
    dark: {
      shellBg: 'linear-gradient(180deg, #06111f 0%, #07192d 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 36%)',
      surface: 'rgba(9,23,40,0.82)',
      surfaceStrong: 'rgba(6,18,32,0.94)',
      surfaceMuted: 'rgba(12,31,54,0.82)',
      border: 'rgba(148, 203, 255, 0.14)',
      text: '#f8fafc',
      textSoft: '#d6ebff',
      textMuted: '#8fa8c2',
      navActiveBg: '#e0f2fe',
      navActiveText: '#0b1a2b',
      navInactiveText: '#c8d9ea',
      shadow: '0 20px 60px rgba(2, 12, 24, 0.42)',
    },
  },
  {
    key: 'forest',
    label: 'Bosque',
    description: 'Verde sóbrio para condomínios residenciais.',
    primary: '158 64% 40%',
    primaryForeground: '210 40% 98%',
    ring: '158 64% 40%',
    light: {
      shellBg: 'linear-gradient(180deg, #effaf5 0%, #def4e7 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(16,185,129,0.16), transparent 36%)',
      surface: 'rgba(255,255,255,0.86)',
      surfaceStrong: 'rgba(255,255,255,0.96)',
      surfaceMuted: 'rgba(228,247,239,0.88)',
      border: 'rgba(108,166,133,0.32)',
      text: '#12281d',
      textSoft: '#1d4631',
      textMuted: '#617766',
      navActiveBg: '#123524',
      navActiveText: '#f0fdf4',
      navInactiveText: '#244f37',
      shadow: '0 18px 50px rgba(16, 43, 30, 0.12)',
    },
    dark: {
      shellBg: 'linear-gradient(180deg, #07150f 0%, #0b1f16 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(16,185,129,0.16), transparent 36%)',
      surface: 'rgba(10,29,20,0.84)',
      surfaceStrong: 'rgba(8,23,16,0.96)',
      surfaceMuted: 'rgba(16,40,29,0.82)',
      border: 'rgba(158, 223, 188, 0.12)',
      text: '#f4fff8',
      textSoft: '#d8f3e3',
      textMuted: '#93b8a1',
      navActiveBg: '#d1fae5',
      navActiveText: '#0d1f16',
      navInactiveText: '#d6eadf',
      shadow: '0 20px 60px rgba(3, 15, 10, 0.42)',
    },
  },
  {
    key: 'ember',
    label: 'Âmbar',
    description: 'Tons quentes para operação de destaque.',
    primary: '24 95% 53%',
    primaryForeground: '210 40% 98%',
    ring: '24 95% 53%',
    light: {
      shellBg: 'linear-gradient(180deg, #fff8f1 0%, #ffe9d2 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(249,115,22,0.16), transparent 36%)',
      surface: 'rgba(255,255,255,0.86)',
      surfaceStrong: 'rgba(255,255,255,0.96)',
      surfaceMuted: 'rgba(255,241,225,0.9)',
      border: 'rgba(211,154,98,0.34)',
      text: '#331b0f',
      textSoft: '#6f3414',
      textMuted: '#8d6a54',
      navActiveBg: '#431407',
      navActiveText: '#fff7ed',
      navInactiveText: '#6f3414',
      shadow: '0 18px 50px rgba(62, 25, 8, 0.12)',
    },
    dark: {
      shellBg: 'linear-gradient(180deg, #1b0d06 0%, #261208 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(249,115,22,0.18), transparent 36%)',
      surface: 'rgba(34,16,8,0.84)',
      surfaceStrong: 'rgba(27,12,6,0.95)',
      surfaceMuted: 'rgba(50,24,12,0.82)',
      border: 'rgba(255, 190, 138, 0.14)',
      text: '#fff7ed',
      textSoft: '#ffe0c2',
      textMuted: '#c8a28b',
      navActiveBg: '#ffedd5',
      navActiveText: '#3b1306',
      navInactiveText: '#f1d5c1',
      shadow: '0 20px 60px rgba(24, 10, 4, 0.42)',
    },
  },
  {
    key: 'graphite',
    label: 'Grafite',
    description: 'Neutro corporativo para white label.',
    primary: '222 47% 52%',
    primaryForeground: '210 40% 98%',
    ring: '222 47% 52%',
    light: {
      shellBg: 'linear-gradient(180deg, #f6f7fb 0%, #eceff5 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(71,85,105,0.16), transparent 36%)',
      surface: 'rgba(255,255,255,0.88)',
      surfaceStrong: 'rgba(255,255,255,0.97)',
      surfaceMuted: 'rgba(240,243,248,0.9)',
      border: 'rgba(137,148,171,0.32)',
      text: '#111827',
      textSoft: '#334155',
      textMuted: '#667085',
      navActiveBg: '#111827',
      navActiveText: '#f9fafb',
      navInactiveText: '#334155',
      shadow: '0 18px 50px rgba(15, 23, 42, 0.10)',
    },
    dark: {
      shellBg: 'linear-gradient(180deg, #090c12 0%, #111827 100%)',
      shellBgAccent: 'radial-gradient(circle at top left, rgba(148,163,184,0.12), transparent 36%)',
      surface: 'rgba(17,24,39,0.84)',
      surfaceStrong: 'rgba(10,14,24,0.96)',
      surfaceMuted: 'rgba(23,33,54,0.82)',
      border: 'rgba(181, 194, 219, 0.12)',
      text: '#f9fafb',
      textSoft: '#e5e7eb',
      textMuted: '#94a3b8',
      navActiveBg: '#f8fafc',
      navActiveText: '#111827',
      navInactiveText: '#d8dee8',
      shadow: '0 20px 60px rgba(5, 10, 18, 0.42)',
    },
  },
];

export const defaultThemePreset: ThemePresetKey = 'ocean';
export const defaultThemeMode: ThemeMode = 'dark';

export function getThemePreset(preset: ThemePresetKey) {
  return themePresets.find((item) => item.key === preset) ?? themePresets[0];
}
