import { BrowserWindow, desktopCapturer, ipcMain, session, type WebContents } from 'electron';
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

/** Electron throws if you pass `{}` when video was requested; still deny capture without crashing main. */
function safeDenyDisplayMedia(cb: ((streams: Electron.Streams) => void) | null | undefined) {
  if (!cb) return;
  try {
    cb({});
  } catch (err) {
    console.warn('[Electra] display-media deny failed (expected on some Electron versions):', err);
  }
}

function isSenderFromMainWindow(main: BrowserWindow, sender: WebContents): boolean {
  if (main.isDestroyed()) return false;
  if (sender.id === main.webContents.id) return true;
  const fromSender = BrowserWindow.fromWebContents(sender);
  return fromSender != null && fromSender.id === main.id;
}

export function registerDisplayMediaHandler(getMainWindow: () => BrowserWindow | null) {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    if (pendingDisplayMediaCallback) {
      safeDenyDisplayMedia(callback);
      return;
    }

    pendingDisplayMediaCallback = callback;
    clearPickerTimeout();
    pickerTimeout = setTimeout(() => {
      const cb = pendingDisplayMediaCallback;
      pendingDisplayMediaCallback = null;
      pickerTimeout = null;
      safeDenyDisplayMedia(cb);
      getMainWindow()?.webContents.send('display-media:picker-close');
    }, PICKER_TIMEOUT_MS);

    try {
      const sources = (await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 200, height: 112 },
      })).slice(0, 48);

      const win = getMainWindow();
      if (!win || win.isDestroyed()) {
        pendingDisplayMediaCallback = null;
        clearPickerTimeout();
        safeDenyDisplayMedia(callback);
        return;
      }

      const payload: DisplayMediaPickerSource[] = sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.startsWith('screen:') ? 'screen' : 'window',
        thumbnailDataUrl: s.thumbnail.isEmpty() ? '' : s.thumbnail.toDataURL(),
      }));

      try {
        win.webContents.send('display-media:picker-open', { sources: payload });
      } catch (sendErr) {
        console.warn('[Electra] display-media: picker-open IPC failed', sendErr);
        pendingDisplayMediaCallback = null;
        clearPickerTimeout();
        safeDenyDisplayMedia(callback);
      }
    } catch {
      pendingDisplayMediaCallback = null;
      clearPickerTimeout();
      safeDenyDisplayMedia(callback);
    }
  });

  ipcMain.removeHandler('display-media:select');
  ipcMain.removeHandler('display-media:cancel');

  ipcMain.handle('display-media:select', async (event, sourceId: string) => {
    const main = getMainWindow();
    if (!main || !isSenderFromMainWindow(main, event.sender)) return { ok: false };

    const cb = pendingDisplayMediaCallback;
    pendingDisplayMediaCallback = null;
    clearPickerTimeout();
    if (!cb) return { ok: false };

    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 200, height: 112 },
      });
      const picked = sources.find((s) => s.id === sourceId);
      if (picked) {
        try {
          // Video only — renderer uses getDisplayMedia({ audio: false }) on Electron (loopback is flaky on Windows).
          cb({ video: picked });
          return { ok: true };
        } catch (err) {
          console.warn('[Electra] display-media: start capture failed', err);
          return { ok: false };
        }
      }
    } catch {
      /* fall through */
    }
    safeDenyDisplayMedia(cb);
    return { ok: false };
  });

  ipcMain.handle('display-media:cancel', (event) => {
    const main = getMainWindow();
    if (!main || !isSenderFromMainWindow(main, event.sender)) return;
    const cb = pendingDisplayMediaCallback;
    pendingDisplayMediaCallback = null;
    clearPickerTimeout();
    safeDenyDisplayMedia(cb);
  });
}
