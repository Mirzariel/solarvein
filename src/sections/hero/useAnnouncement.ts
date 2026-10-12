import { useEffect, useRef, useState } from 'react';

/**
 * Throttled text for an aria-live region. `signature` identifies the state worth announcing
 * (e.g. regime kind + advisory codes). The text is published ~0.8 s after the signature changes,
 * never on first render, and never for changes that only alter numbers.
 */
export function useAnnouncement(signature: string, text: string, delayMs = 800): string {
  const [message, setMessage] = useState('');
  const latest = useRef(text);
  const first = useRef(true);

  useEffect(() => {
    latest.current = text;
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => setMessage(latest.current), delayMs);
    return () => window.clearTimeout(id);
  }, [signature, delayMs]);

  return message;
}
