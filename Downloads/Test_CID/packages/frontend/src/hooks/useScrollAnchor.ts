import { useRef, useEffect, useCallback } from 'react';

export function useScrollAnchor(deps: unknown[]) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom();
    }
  }, deps);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  return { bottomRef, containerRef, onScroll, scrollToBottom };
}
