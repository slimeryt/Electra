export type DisplayMediaPickerSource = {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnailDataUrl: string;
};

export type ElectraBridge = {
  platform: string;
  isElectron: true;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  showNotification: (title: string, body: string) => Promise<void>;
  checkForUpdates: () => Promise<void>;
  onUpdateAvailable: (callback: () => void) => () => void;
  onDeepLink: (callback: (url: string) => void) => () => void;
  saveAuthSession: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  loadAuthSession: () => Promise<{ accessToken: string; refreshToken: string } | null>;
  clearAuthSession: () => Promise<void>;
  onDisplayMediaPickerOpen: (cb: (data: { sources: DisplayMediaPickerSource[] }) => void) => () => void;
  onDisplayMediaPickerClose: (cb: () => void) => () => void;
  selectDisplaySource: (sourceId: string) => Promise<{ ok: boolean }>;
  cancelDisplayPicker: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateReady: (callback: (version: string) => void) => () => void;
};

declare global {
  interface Window {
    electraBridge?: ElectraBridge;
  }
}

export const isElectron =
  typeof window !== 'undefined' && typeof window.electraBridge !== 'undefined';
export const bridge: ElectraBridge | null = isElectron ? window.electraBridge! : null;

export const platform = isElectron ? bridge!.platform : 'web';

// Injected at build time by vite.config.ts — shows 0.x.y to users while
// the internal package.json version increments monotonically for electron-updater.
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
