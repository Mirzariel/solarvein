import { useEffect, useState } from 'react';

let cached: boolean | null = null;

/** One-shot, cached WebGL2 / WebGL1 feature detection. Safe to call outside React. */
export function detectWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    cached = !!gl;
    // Release the probe context immediately so it does not count against the browser's limit.
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/** `null` while checking (first render), then `true` / `false`. Detection runs once per page. */
export function useWebGLAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(cached);
  useEffect(() => {
    if (cached !== null) {
      setAvailable(cached);
      return;
    }
    setAvailable(detectWebGL());
  }, []);
  return available;
}
