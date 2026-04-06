import { useEffect, useRef } from 'react';
import { Message, DmMessage } from '../../types/models';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { Spinner } from '../ui/Spinner';
import { useScrollAnchor } from '../../hooks/useScrollAnchor';

interface TypingUser {
  user_id: string;
  display_name: string;
}

interface MessageListProps {
  messages: (Message | DmMessage)[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  typingUsers: TypingUser[];
  isDm?: boolean;
}

function shouldGroup(prev: Message | DmMessage, curr: Message | DmMessage): boolean {
  const prevAuthorId = (prev as any).author_id || (prev as any).author?.id;
  const currAuthorId = (curr as any).author_id || (curr as any).author?.id;
  if (prevAuthorId !== currAuthorId) return false;
  if (curr.created_at - prev.created_at > 7 * 60) return false;
  return true;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  typingUsers,
  isDm = false,
}: MessageListProps) {
  const { bottomRef, containerRef, onScroll } = useScrollAnchor([messages.length]);
  const topRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!topRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          Promise.resolve(onLoadMore()).finally(() => {
            loadingMoreRef.current = false;
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(topRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (isLoading && messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 16,
      }}
    >
      {/* Load more trigger */}
      <div ref={topRef} style={{ height: 1 }} />

      {isLoading && messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
          <Spinner size={16} />
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}>
          No messages yet. Say hello!
        </div>
      )}

      {/* Message items */}
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const grouped = prev ? shouldGroup(prev, msg) : false;
        return (
          <MessageItem
            key={msg.id}
            message={msg}
            isGrouped={grouped}
            isDm={isDm}
          />
        );
      })}

      <TypingIndicator typingUsers={typingUsers} />
      <div ref={bottomRef} style={{ height: 4 }} />
    </div>
  );
}
