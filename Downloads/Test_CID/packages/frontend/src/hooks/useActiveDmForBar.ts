import { useEffect, useState } from 'react';
import { dmsApi } from '../api/dms';
import { useAuthStore } from '../store/authStore';
import type { DirectMessage, User } from '../types/models';

/** Resolves DM title/subtitle for the mobile app bar (mirrors DMHeader copy). */
export function useActiveDmForBar(dmId: string | undefined) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [info, setInfo] = useState<{ title: string; subtitle: string | null } | null>(null);

  useEffect(() => {
    if (!dmId) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    dmsApi
      .list()
      .then((dms: DirectMessage[]) => {
        if (cancelled) return;
        const dm = dms.find((d) => d.id === dmId);
        if (!dm) {
          setInfo(null);
          return;
        }
        const isGroup = !!dm.is_group;
        const otherUser = !isGroup
          ? (dm.participants?.find((p: User) => p.id !== currentUserId) ?? null)
          : null;
        const title = isGroup
          ? dm.name ||
            dm.participants?.map((p: User) => p.display_name || p.username).join(', ') ||
            'Group DM'
          : otherUser?.display_name || otherUser?.username || 'Direct Message';
        const subtitle = isGroup
          ? `${dm.participants?.length ?? 0} members`
          : otherUser?.username
            ? `@${otherUser.username}`
            : null;
        setInfo({ title, subtitle });
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dmId, currentUserId]);

  return info;
}
