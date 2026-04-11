import { create } from 'zustand';

export type Theme = 'dark' | 'amoled' | 'midnight' | 'light';

export const THEMES: { value: Theme; label: string; preview: string[] }[] = [
  { value: 'dark',     label: 'Dark',     preview: ['#060608', '#0c0c14', '#5865f2'] },
  { value: 'amoled',   label: 'AMOLED',   preview: ['#000000', '#080808', '#5865f2'] },
  { value: 'midnight', label: 'Midnight', preview: ['#0d0f1a', '#141728', '#7c8fff'] },
  { value: 'light',    label: 'Light',    preview: ['#f2f3f5', '#ffffff', '#5865f2'] },
];

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const saved = (localStorage.getItem('electra-theme') as Theme) || 'dark';
applyTheme(saved);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: saved,
  setTheme: (theme) => {
    localStorage.setItem('electra-theme', theme);
    applyTheme(theme);
    set({ theme });
  },
}));
