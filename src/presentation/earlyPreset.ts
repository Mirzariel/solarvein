/**
 * Side-effect module: applies `?skenario=...&jam=...` to the system store at import time.
 * Import it in main.tsx BEFORE `./App` so the motion engine (src/motion/engine.ts) reads the preset as its first
 * target and the page opens already in that condition (snap, no 1 s transition). PresentationRoot calls the same
 * idempotent function on mount as a fallback.
 */
import { applyUrlPreset } from './applyPreset';

if (typeof window !== 'undefined') applyUrlPreset();
