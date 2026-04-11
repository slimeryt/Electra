import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Drawer + top app bar + mobile chrome.
 * Uses CSS breakpoint in the browser; on Capacitor (APK/IPA) always true so Android WebViews
 * that report a width >768px still get the mobile shell (otherwise the new layout never applies).
 */
export function usePhoneLayout() {
  const narrowViewport = useMediaQuery('(max-width: 768px)');
  return narrowViewport || Capacitor.isNativePlatform();
}
