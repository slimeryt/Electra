import { contextBridge, ipcRenderer } from 'electron';
import type { DisplayMediaPickerOpenPayload } from './displayMediaTypes';

contextBridge.exposeInMainWorld('electraBridge', {
  platform: process.platform,
  isElectron: true as const,

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const fn = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value);
    ipcRenderer.on('window:maximize-change', fn);
    return () => ipcRenderer.removeListener('window:maximize-change', fn);
  },

  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', { title, body }),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),

  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('updater:available', callback);
    return () => ipcRenderer.removeListener('updater:available', callback);
  },

  onDeepLink: (callback: (url: string) => void) => {
    const fn = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('deep-link', fn);
    return () => ipcRenderer.removeListener('deep-link', fn);
  },

  saveAuthSession: (tokens: { accessToken: string; refreshToken: string }) =>
    ipcRenderer.invoke('auth:session-save', tokens),

  loadAuthSession: () => ipcRenderer.invoke('auth:session-load'),

  clearAuthSession: () => ipcRenderer.invoke('auth:session-clear'),

  onDisplayMediaPickerOpen: (callback: (data: DisplayMediaPickerOpenPayload) => void) => {
    const fn = (_event: Electron.IpcRendererEvent, data: DisplayMediaPickerOpenPayload) => callback(data);
    ipcRenderer.on('display-media:picker-open', fn);
    return () => ipcRenderer.removeListener('display-media:picker-open', fn);
  },

  onDisplayMediaPickerClose: (callback: () => void) => {
    const fn = () => callback();
    ipcRenderer.on('display-media:picker-close', fn);
    return () => ipcRenderer.removeListener('display-media:picker-close', fn);
  },

  selectDisplaySource: (sourceId: string) => ipcRenderer.invoke('display-media:select', sourceId),

  cancelDisplayPicker: () => ipcRenderer.invoke('display-media:cancel'),
});
