import { describe, expect, it } from 'vitest';
import { springStep } from './spring';

describe('spring', () => {
  it('critically damped: no overshoot, settles', () => {
    const s = { x: 0, v: 0 };
    let max = 0;
    for (let i = 0; i < 240; i++) max = Math.max(max, springStep(s, 1, 9, 1 / 120));
    expect(max).toBeLessThanOrEqual(1 + 1e-9);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  });
});
