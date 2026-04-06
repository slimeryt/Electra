import { useState, useCallback } from 'react';
import { channelsApi } from '../api/channels';
import { dmsApi } from '../api/dms';
import { useMessageStore } from '../store';

export function useMessages(channelId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { getMessages, setMessages, prependMessages, hasMoreByChannel } = useMessageStore();

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const messages = await channelsApi.getMessages(channelId);
      setMessages(channelId, messages);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  const loadMore = useCallback(async () => {
    const existing = getMessages(channelId);
    if (!existing.length) return;
    const oldest = existing[0];
    const older = await channelsApi.getMessages(channelId, oldest.id);
    prependMessages(channelId, older, older.length === 50);
  }, [channelId]);

  return {
    messages: getMessages(channelId),
    isLoading,
    hasMore: hasMoreByChannel[channelId] ?? true,
    loadMessages,
    loadMore,
  };
}

export function useDmMessages(dmId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { getDmMessages, setDmMessages, prependDmMessages, hasMoreByChannel } = useMessageStore();

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const messages = await dmsApi.getMessages(dmId);
      setDmMessages(dmId, messages);
    } finally {
      setIsLoading(false);
    }
  }, [dmId]);

  const loadMore = useCallback(async () => {
    const existing = getDmMessages(dmId);
    if (!existing.length) return;
    const oldest = existing[0];
    const older = await dmsApi.getMessages(dmId, oldest.id);
    prependDmMessages(dmId, older, older.length === 50);
  }, [dmId]);

  return {
    messages: getDmMessages(dmId),
    isLoading,
    hasMore: hasMoreByChannel[`dm:${dmId}`] ?? true,
    loadMessages,
    loadMore,
  };
}
