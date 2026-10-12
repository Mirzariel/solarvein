/**
 * Quality tiers for the stage. `high` = product-photo quality (marketing renders, capable desktops);
 * `medium` = default on mobile / reduced motion; `low` = automatic step-down when the frame time is bad
 * (drei PerformanceMonitor). No post-processing library is used: MSAA + baked textures carry the look.
 */
import { createContext, useContext } from 'react';

export type QualityTier = 'low' | 'medium' | 'high';

/** Minimum frame spacing [ms] of the idle ambient loop (camera at rest, no weather transition). */
export const IDLE_FRAME_MS: Record<QualityTier, number> = { low: 50, medium: 33, high: 0 };

export interface TierSpec {
  /** Max device pixel ratio. */
  dpr: number;
  /** Dynamic key-light shadow map (crisp sun shadows on the floor). 0 = off (baked contact shadow only). */
  shadowMap: number;
  /** PMREM environment resolution (cube face). Identical for every tier: changing it recompiles every PBR program. */
  env: number;
  /** MSAA. */
  antialias: boolean;
}

export const TIERS: Record<QualityTier, TierSpec> = {
  low: { dpr: 1, shadowMap: 0, env: 256, antialias: true },
  medium: { dpr: 1.5, shadowMap: 2048, env: 256, antialias: true },
  high: { dpr: 2, shadowMap: 2048, env: 256, antialias: true },
};

export const QualityContext = createContext<QualityTier>('medium');
export const useQuality = (): QualityTier => useContext(QualityContext);
export const STEP_DOWN: Record<QualityTier, QualityTier> = { high: 'medium', medium: 'low', low: 'low' };
export const STEP_UP: Record<QualityTier, QualityTier> = { low: 'medium', medium: 'high', high: 'high' };
