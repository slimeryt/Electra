import type { User } from '../types/models';

export interface SavedAccount {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
}

export function getSavedAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem('electra_saved_accounts') || '[]'); }
  catch { return []; }
}

export function upsertSavedAccount(user: User) {
  const at = localStorage.getItem('accessToken');
  const rt = localStorage.getItem('refreshToken');
  if (!at || !rt) return;
  const accounts = getSavedAccounts();
  const idx = accounts.findIndex(a => a.userId === user.id);
  const entry: SavedAccount = {
    userId: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    avatarUrl: (user as any).avatar_url ?? null,
    accessToken: at,
    refreshToken: rt,
  };
  if (idx >= 0) {
    accounts[idx] = entry;
  } else {
    if (accounts.length >= 5) return; // max 5 accounts
    accounts.push(entry);
  }
  localStorage.setItem('electra_saved_accounts', JSON.stringify(accounts));
}

export function removeSavedAccount(userId: string) {
  const accounts = getSavedAccounts().filter(a => a.userId !== userId);
  localStorage.setItem('electra_saved_accounts', JSON.stringify(accounts));
}

export function switchToAccount(account: SavedAccount) {
  localStorage.setItem('accessToken', account.accessToken);
  localStorage.setItem('refreshToken', account.refreshToken);
  window.location.reload();
}
