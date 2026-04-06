import { ipcMain, BrowserWindow, Notification, app } from 'electron';
import { NotificationPayload } from './types';

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return mainWindow.isMaximized();
  });

  // Notifications
  ipcMain.handle('notification:show', (_event, payload: NotificationPayload) => {
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

  // Auto-updater check (placeholder — add electron-updater when ready)
  ipcMain.handle('updater:check', () => {
    // electron-updater integration point
    console.log('[updater] Check for updates triggered');
  });
}
