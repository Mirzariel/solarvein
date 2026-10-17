import { it } from 'vitest';
import { DEFAULT_SYSTEM } from '../hotel';
import { areaSweep, baselineInputs } from '../day';
import { compareBaselines } from '../carbon';
import type { SystemInputs } from '../contract';
it('probe', () => {
  const sys: SystemInputs = { ...DEFAULT_SYSTEM, array: { ...DEFAULT_SYSTEM.array, module: { ...DEFAULT_SYSTEM.array.module, flowLpm: 0.5 } } };
  const A = sys.array.modules * sys.array.module.areaM2;
  const t0 = performance.now();
  const pts = areaSweep(sys, [A/2, A, 2*A, 4*A], ['dhw-priority','fixed-schedule','adaptive']);
  console.log('SWEEP ms', (performance.now()-t0).toFixed(0), 'A', A);
  for (const p of pts) console.log('SWEEP', p.areaM2.toFixed(0), p.strategy, p.dhwSolarKWhThPerYear.toFixed(0), p.bypassKWhThPerYear.toFixed(0), p.netKgPerYear.toFixed(0));
  const b = baselineInputs(sys);
  const c = compareBaselines(sys, b);
  console.log('SWEEP B', b.conventionalPvKWhEPerYear.toFixed(0), b.solarvein.totals.pvKWhE.toFixed(0), JSON.stringify(Object.fromEntries(Object.entries(c.ledgers).map(([k,v])=>[k, Math.round(v.netKgPerYear)]))), c.verdict);
});
