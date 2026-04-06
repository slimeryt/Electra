import { contextBridge, ipcRenderer } from 'electron';

// Expose safe bridge to renderer (React app)
contextBridge.exposeInMainWorld('electraBridge', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Window controls (for custom titlebar)
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Listen for maximize state changes
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window:maximize-change', (_event, value: boolean) => callback(value));
    return () => ipcRenderer.removeAllListeners('window:maximize-change');
  },

  // OS notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', { title, body }),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('updater:available', callback);
    return () => ipcRenderer.removeListener('updater:available', callback);
  },

  // Deep links (electra://invite/CODE)
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url: string) => callback(url));
    return () => ipcRenderer.removeAllListeners('deep-link');
  },
});
