/** Usernames allowed to verify/unverify users and servers (global, not per-server). */
const rawVerifierList =
  (import.meta.env.VITE_PLATFORM_VERIFIER_USERNAMES as string | undefined) || 'slimeryt';
export const PLATFORM_VERIFIER_USERNAMES = rawVerifierList
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformVerifier(username: string | undefined | null): boolean {
  if (!username) return false;
  return PLATFORM_VERIFIER_USERNAMES.includes(username.trim().toLowerCase());
}
