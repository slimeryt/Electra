import { BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import type { DisplayMediaPickerSource } from './displayMediaTypes';

let pendingDisplayMediaCallback: ((streams: Electron.Streams) => void) | null = null;
let pickerTimeout: ReturnType<typeof setTimeout> | null = null;

const PICKER_TIMEOUT_MS = 120_000;

function clearPickerTimeout() {
  if (pickerTimeout) {
    clearTimeout(pickerTimeout);
    pickerTimeout = null;
  }
}

export function registerDisplayMediaHandler(getMainWindow: () => BrowserWindow | null) {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    if (pendingDisplayMediaCallback) {
      callback({});
      return;
    }

    pendingDisplayMediaCallback = callback;
    clearPickerTimeout();
    pickerTimeout = setTimeout(() => {
      const cb = pendingDisplayMediaCallback;
      pendingDisplayMediaCallback = null;
      pickerTimeout = null;
      cb?.({});
      getMainWindow()?.webContents.send('display-media:picker-close');
    }, PICKER_TIMEOUT_MS);

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true,
      });

      const win = getMainWindow();
      if (!win || win.isDestroyed()) {
        pendingDisplayMediaCallback = null;
        clearPickerTimeout();
        callback({});
        return;
      }

      const payload: DisplayMediaPickerSource[] = sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.startsWith('screen:') ? 'screen' : 'window',
        thumbnailDataUrl: s.thumbnail.isEmpty() ? '' : s.thumbnail.toDataURL(),
      }));

      win.webContents.send('display-media:picker-open', { sources: payload });
    } catch {
      pendingDisplayMediaCallback = null;
      clearPickerTimeout();
      callback({});
    }
  });

  ipcMain.removeHandler('display-media:select');
  ipcMain.removeHandler('display-media:cancel');

  ipcMain.handle('display-media:select', async (event, sourceId: string) => {
    const main = getMainWindow();
    if (!main || event.sender !== main.webContents) return { ok: false };

    const cb = pendingDisplayMediaCallback;
    pendingDisplayMediaCallback = null;
    clearPickerTimeout();
    if (!cb) return { ok: false };

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      });
      const picked = sources.find((s) => s.id === sourceId);
      if (picked) {
        cb({ video: picked, audio: 'loopback' });
        return { ok: true };
      }
    } catch {
      /* fall through */
    }
    cb({});
    return { ok: false };
  });

  ipcMain.handle('display-media:cancel', (event) => {
    const main = getMainWindow();
    if (!main || event.sender !== main.webContents) return;
    const cb = pendingDisplayMediaCallback;
    pendingDisplayMediaCallback = null;
    clearPickerTimeout();
    cb?.({});
  });
}
