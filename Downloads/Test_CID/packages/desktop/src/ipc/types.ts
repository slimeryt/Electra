export type IpcChannels =
  | 'window:minimize'
  | 'window:maximize'
  | 'window:unmaximize'
  | 'window:close'
  | 'window:is-maximized'
  | 'notification:show'
  | 'updater:check'
  | 'updater:available'
  | 'deep-link';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
}
