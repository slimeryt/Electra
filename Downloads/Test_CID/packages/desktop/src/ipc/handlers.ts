import { ipcMain, BrowserWindow, Notification } from 'electron';
import { NotificationPayload } from './types';
import { saveSessionTokens, loadSessionTokens, clearSessionTokens } from '../sessionPersist';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const w = getMainWindow();
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return getMainWindow()?.isMaximized() ?? false;
  });

  ipcMain.handle('notification:show', (_event, payload: NotificationPayload) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: payload.title,
        body: payload.body,
      });
      notification.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
      });
      notification.show();
    }
  });

  ipcMain.handle('updater:check', () => {
    console.log('[updater] Check for updates triggered');
  });

  ipcMain.handle('auth:session-save', (_e, tokens: { accessToken: string; refreshToken: string }) => {
    if (!tokens?.accessToken || !tokens?.refreshToken) return;
    saveSessionTokens(tokens.accessToken, tokens.refreshToken);
  });

  ipcMain.handle('auth:session-load', () => loadSessionTokens());

  ipcMain.handle('auth:session-clear', () => {
    clearSessionTokens();
  });
}
