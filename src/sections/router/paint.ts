/**
 * Imperative painter for RouterDiagram: one engine frame in, direct DOM writes out (no React render per tick).
 *
 * The React component renders the static skeleton once (every dynamic element carries `data-p="id"`); this module
 * finds those elements and sets only the attributes that CHANGED since the last frame (widths, opacities, path
 * `d` of the four branch slabs, fill level, text of the readouts).
 *
 * Data per frame:
 *  - the engine's `VisualFrame.router` (valves, allocW, tank SoC and top temperature, mode, pump, reason),
 *    `climate` and `result` (collector outlet): already smoothed by the system engine;
 *  - the DayStep at the frame's hour (`stepAt` on the cached day) for the quantities the snapshot does not carry
 *    (hot-water demand split, electricity, desiccant, heat pump). Those are glided with a short first-order
 *    follower so that a preset switch never makes them jump.
 * Nothing is computed here beyond layout: every number is a sim number.
 */
import { stepAt, getSystemView, routerSnapshot, type ControllerMode, type DayStep, type RegenAirSource, type RouterReason, type SystemInputs } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import type { VisualFrame } from '../../motion';
import { formatId } from '../../ui';
import { diagramDescription } from './captions';
import { HX_DHW, OUT, PATHS, ROUTER, TANK, TRUNK_Y, W_TOT, branchPath, branchPoints, head, outputStrips, slabs, SINK_ORDER, E_Y, ROW, BYPASS_Y, DHW_Y, DRY, HX_REGEN } from './layout';
import type { Palette } from './palette';
import { budget, createPacketLoop, trackFromPair, trackFromPath, type PacketLoop, type PacketStream, type Track } from './usePackets';

export interface PaintStatic {
  electricalRefW: number;
}

export interface PaintState {
  mode: ControllerMode;
  pumpOn: boolean;
  reason: RouterReason;
  vBypass: number;
  vDhw: number;
  vTank: number;
  vDesiccant: number;
  qLiquidW: number;
  soc: number;
  topC: number;
  outletC: number;
  irradiance: number;
  ambientC: number;
  rh: number;
  demandW: number;
  directW: number;
  dischargeW: number;
  backupW: number;
  potableOutC: number;
  electricalW: number;
  desOn: number;
  moistureKgH: number;
  hpOn: number;
  hpSourceW: number;
  hpCop: number;
  regenAir: RegenAirSource;
  supplyDewPointC: number;
  hpEnabled: boolean;
}

const GLIDE = ['demandW', 'directW', 'dischargeW', 'backupW', 'potableOutC', 'electricalW', 'desOn', 'moistureKgH', 'hpOn', 'hpSourceW', 'hpCop'] as const;
type GlideKey = (typeof GLIDE)[number];

/** Engine frame → paint state (uses the cached day; allocation-light). */
export function stateFromFrame(f: VisualFrame, glide: Glider): PaintState | null {
  const r = f.router;
  const c = f.climate;
  if (!r || !c) return null;
  const st = useSystemStore.getState();
  const day = getSystemView(st.sys).day(st.scenario, st.strategy);
  const step = stepAt(day, f.hour ?? st.hour);
  const hp = step.heatPump;
  const g = glide.update({
    demandW: step.dhw.demandW,
    directW: step.dhw.fromCollectorW,
    dischargeW: step.dhw.fromTankW,
    backupW: step.dhw.backupW,
    potableOutC: step.dhw.potableOutC ?? step.dhw.tankSourceC ?? step.collector.outletC,
    electricalW: step.collector.electricalW,
    desOn: step.desiccant.available && step.desiccant.moistureRemovedKgH > 1e-3 ? 1 : 0,
    moistureKgH: step.desiccant.moistureRemovedKgH,
    hpOn: hp?.on ? 1 : 0,
    hpSourceW: hp?.sourceW ?? 0,
    hpCop: hp?.cop ?? 0,
  });
  return {
    mode: r.mode,
    pumpOn: r.pumpOn,
    reason: r.reason,
    vBypass: r.valves.bypass,
    vDhw: r.valves.dhw,
    vTank: r.valves.tank,
    vDesiccant: r.valves.desiccant,
    qLiquidW: r.allocW.bypass + r.allocW.dhw + r.allocW.tank + r.allocW.desiccant,
    soc: r.tankSoc,
    topC: r.tankTopC,
    outletC: f.result.outletC,
    irradiance: c.irradiance,
    ambientC: c.ambientC,
    rh: c.rh,
    ...g,
    regenAir: st.sys.desiccant.regenAir,
    supplyDewPointC: st.sys.hotel.supplyDewPointC,
    hpEnabled: st.sys.heatPumpSource.enabled,
  };
}

/** Static paint state straight from a DayStep (exports / static views: no engine frame, no glide). */
export function stateFromStep(step: DayStep, sys: SystemInputs): PaintState {
  const r = routerSnapshot(step);
  const hp = step.heatPump;
  return {
    mode: r.mode,
    pumpOn: r.pumpOn,
    reason: r.reason,
    vBypass: r.valves.bypass,
    vDhw: r.valves.dhw,
    vTank: r.valves.tank,
    vDesiccant: r.valves.desiccant,
    qLiquidW: r.allocW.bypass + r.allocW.dhw + r.allocW.tank + r.allocW.desiccant,
    soc: r.tankSoc,
    topC: r.tankTopC,
    outletC: step.collector.outletC,
    irradiance: step.climate.irradiance,
    ambientC: step.climate.ambientC,
    rh: step.climate.rh,
    demandW: step.dhw.demandW,
    directW: step.dhw.fromCollectorW,
    dischargeW: step.dhw.fromTankW,
    backupW: step.dhw.backupW,
    potableOutC: step.dhw.potableOutC ?? step.dhw.tankSourceC ?? step.collector.outletC,
    electricalW: step.collector.electricalW,
    desOn: step.desiccant.available && step.desiccant.moistureRemovedKgH > 1e-3 ? 1 : 0,
    moistureKgH: step.desiccant.moistureRemovedKgH,
    hpOn: hp?.on ? 1 : 0,
    hpSourceW: hp?.sourceW ?? 0,
    hpCop: hp?.cop ?? 0,
    regenAir: sys.desiccant.regenAir,
    supplyDewPointC: sys.hotel.supplyDewPointC,
    hpEnabled: sys.heatPumpSource.enabled,
  };
}

/** First-order follower for the non-engine quantities (snaps on the first call). */
export class Glider {
  private cur: Record<GlideKey, number> | null = null;
  private t = 0;
  update(goal: Record<GlideKey, number>): Record<GlideKey, number> {
    const now = performance.now();
    if (!this.cur) {
      this.cur = { ...goal };
    } else {
      const dt = Math.min(0.1, (now - this.t) / 1000);
      const k = 1 - Math.exp(-14 * dt);
      for (const key of GLIDE) this.cur[key] += (goal[key] - this.cur[key]) * k;
    }
    this.t = now;
    return this.cur;
  }
}

export interface Layers {
  termal: boolean;
  listrik: boolean;
  udara: boolean;
}

export interface Painter {
  paint(s: PaintState): void;
  setMoving(on: boolean): void;
  setLayers(l: Layers): void;
  destroy(): void;
}

const kw = (w: number): string => formatId(w / 1000, 1);

export function createPainter(svg: SVGSVGElement, P: Palette, stat: PaintStatic): Painter {
  const els = new Map<string, Element | null>();
  const attrs = new WeakMap<Element, Map<string, string>>();
  const texts = new Map<string, string>();
  let layers: Layers = { termal: true, listrik: true, udara: true };
  let streams: PacketStream[] = [];
  let lastDesc = '';
  let yc = { bypass: TRUNK_Y, dhw: TRUNK_Y, tank: TRUNK_Y, desiccant: TRUNK_Y };

  const q = (id: string): Element | null => {
    if (!els.has(id)) els.set(id, svg.querySelector(`[data-p="${id}"]`));
    return els.get(id) ?? null;
  };
  const set = (id: string, name: string, v: string | number): void => {
    const el = q(id);
    if (!el) return;
    const s = typeof v === 'number' ? (Math.round(v * 100) / 100).toString() : v;
    let m = attrs.get(el);
    if (!m) attrs.set(el, (m = new Map()));
    if (m.get(name) === s) return;
    m.set(name, s);
    el.setAttribute(name, s);
  };
  const op = (id: string, v: number): void => set(id, 'opacity', Math.max(0, Math.min(1, v)));
  const txt = (id: string, s: string): void => {
    if (texts.get(id) === s) return;
    texts.set(id, s);
    const el = q(id);
    if (el) el.textContent = s;
  };

  // pre-split flow tracks (sampled once)
  const tracks = new Map<string, Track>();
  for (const id of ['trunk', 'discharge', 'hpIn', 'hpOut', 'elec', 'feed', 'coilRow', 'supply', 'regenIn', 'exhaust']) {
    const el = svg.querySelector<SVGPathElement>(`[data-flow="${id}"]`);
    if (el) tracks.set(id, trackFromPath(el));
  }
  for (const k of SINK_ORDER) tracks.set(`b-${k}`, trackFromPair(branchPoints(k, 0), branchPoints(k, 1), branchPoints(k, TRUNK_Y)));
  const pool = svg.querySelector<SVGGElement>('[data-p="pool"]');
  const loop: PacketLoop | null = pool ? createPacketLoop(pool, tracks, () => streams) : null;

  const paint = (s: PaintState): void => {
    const sumV = s.vBypass + s.vDhw + s.vTank + s.vDesiccant;
    const trunkW = sumV * W_TOT;
    const sl = slabs({ bypass: s.vBypass, dhw: s.vDhw, tank: s.vTank, desiccant: s.vDesiccant });
    yc = { bypass: sl.bypass.yc, dhw: sl.dhw.yc, tank: sl.tank.yc, desiccant: sl.desiccant.yc };
    const strips = outputStrips(s.directW, s.dischargeW, s.demandW);
    const disW = s.demandW > 1 ? Math.min(1, s.dischargeW / s.demandW) * W_TOT : 0;
    const elecW = stat.electricalRefW > 0 ? Math.min(1, s.electricalW / stat.electricalRefW) : 0;
    const hpLive = s.hpEnabled && s.hpOn > 0.5;
    const hpAbs = (s.hpSourceW / 25000) * W_TOT;

    // ── thermal ──
    set('trunk', 'stroke-width', trunkW);
    op('trunk', trunkW > 0.3 ? 1 : 0);
    op('trunkHair', 1 - sumV);
    set('trunkHead', 'd', head(ROUTER.x - ROUTER.r, TRUNK_Y, 'r', trunkW));
    op('trunkHead', trunkW > 3 ? Math.min(1, sumV) : 0);
    op('keluar', sumV);
    txt('outletV', formatId(s.outletC, 1));
    op('outletG', sumV);
    txt('qV', kw(s.qLiquidW));
    op('qG', sumV > 0.05 ? 1 : 0);
    op('pumpOff', 1 - sumV);
    txt('mode', s.mode);
    set('mode', 'fill', sumV > 0.05 ? P.ink : P.ink3);
    txt('G', formatId(s.irradiance, 0));

    for (const k of SINK_ORDER) {
      set(`p-${k}`, 'd', branchPath(k, sl[k].yc));
      set(`p-${k}`, 'stroke-width', sl[k].w);
      op(`p-${k}`, sl[k].w > 0.25 ? 1 : 0);
    }
    const headOn = (id: string, w: number, d: string) => {
      set(id, 'd', d);
      op(id, w > 2 ? 1 : 0);
    };
    headOn('hDhw', sl.dhw.w, head(HX_DHW.x - 1, DHW_Y, 'r', sl.dhw.w));
    headOn('hTank', sl.tank.w, head(TANK.x - 1, TRUNK_Y, 'r', sl.tank.w));
    headOn('hDes', sl.desiccant.w, head(420, HX_REGEN.y - 1, 'd', sl.desiccant.w));
    headOn('hByp', sl.bypass.w, head(DRY.x - 1, BYPASS_Y, 'r', sl.bypass.w));
    txt('bypV', kw(s.qLiquidW * s.vBypass));
    op('bypG', s.vBypass > 0.01 ? 1 : 0);

    const fillH = Math.max(0, Math.min(1, s.soc)) * TANK.h;
    set('tankFill', 'y', TANK.y + TANK.h - fillH);
    set('tankFill', 'height', fillH);
    set('tankLevel', 'd', `M${TANK.x + 1},${TANK.y + TANK.h - fillH} H${TANK.x + TANK.w - 1}`);
    op('tankLevel', fillH > 1 ? 1 : 0);
    txt('socV', formatId(s.soc * 100, 0));
    txt('topV', formatId(s.topC, 1));

    set('discharge', 'stroke-width', disW);
    op('discharge', disW > 0.3 ? 0.55 : 0);
    set('hDis', 'd', head(HX_DHW.x - 1, 124, 'r', disW));
    op('hDis', disW > 2 ? 0.55 : 0);

    const outY = OUT.yc - W_TOT / 2;
    set('sDirect', 'y', outY);
    set('sDirect', 'height', strips.direct);
    set('sTank', 'y', outY + strips.direct);
    set('sTank', 'height', strips.tank);
    set('sBackup', 'y', outY + strips.direct + strips.tank);
    set('sBackup', 'height', strips.backup);
    txt('potV', formatId(s.potableOutC, 1));
    txt('dirV', kw(s.directW));
    txt('disV', kw(s.dischargeW));
    txt('bakV', kw(s.backupW));

    // heat-pump source option: a ghost unless the research option is enabled; only a live run is emphasised
    op('hpG', hpLive ? 1 : 0.22);
    set('hpIn', 'stroke', hpLive ? P.heat : P.ink3);
    set('hpOut', 'stroke', hpLive ? P.heat : P.ink3);
    set('hpIn', 'stroke-width', hpLive ? Math.max(1.5, hpAbs) : 1);
    set('hpOut', 'stroke-width', hpLive ? Math.max(1.5, hpAbs * 0.7) : 1);
    op('hpLive', hpLive ? 1 : 0);
    op('hpGhost', hpLive ? 0 : 1);
    txt('hpCop', formatId(s.hpCop, 1));
    txt('hpSrc', kw(s.hpSourceW));

    // ── electrical ──
    set('elec', 'stroke-width', 1 + 3.5 * elecW);
    op('elec', elecW > 0.01 ? 1 : 0);
    set('elecHead', 'd', head(OUT.x1, E_Y, 'r', 2 + 3.5 * elecW));
    op('elecHead', elecW > 0.01 ? 1 : 0);
    txt('elecV', kw(s.electricalW));

    // ── air ──
    op('desG', 0.3 + 0.7 * s.desOn);
    op('coilG', 0.35 + 0.65 * (1 - s.desOn));
    const cool = s.mode === 'B';
    set('supply', 'stroke', cool ? P.cool : P.ink2);
    set('coilOut', 'stroke', cool ? P.coolInk : P.ink2);
    set('supplyHead', 'fill', cool ? P.cool : P.ink2);
    txt('ambV', formatId(s.ambientC, 1));
    txt('rhV', formatId(s.rh * 100, 0));
    op('moistG', s.desOn > 0.5 ? 1 : 0);
    txt('moistV', formatId(s.moistureKgH, 1));
    txt('dewV', formatId(s.supplyDewPointC, 0));
    txt('regenLbl', s.regenAir === 'exhaust' ? 'regenerasi · udara buang hotel' : 'regenerasi · udara luar');

    // ── accessible description (only when the rounded shares change) ──
    const desc = diagramDescription({
      mode: s.mode,
      pumpOn: s.pumpOn,
      shares: { bypass: s.vBypass, dhw: s.vDhw, tank: s.vTank, desiccant: s.vDesiccant },
      soc: s.soc,
    });
    if (desc !== lastDesc) {
      lastDesc = desc;
      const d = q('desc');
      if (d) d.textContent = desc;
    }

    // ── packets: only on flows the model computes ──
    const next: PacketStream[] = [];
    const heatDot = (w: number) => (w >= 5 ? P.paper : P.heatInk);
    if (layers.termal) {
      if (sumV > 0.05) next.push({ id: 'trunk', count: Math.round(8 * sumV), speed: 70, fill: heatDot(trunkW), r: 2.2, opacity: 0.9 });
      for (const k of SINK_ORDER) {
        const v = k === 'dhw' ? s.vDhw : k === 'tank' ? s.vTank : k === 'desiccant' ? s.vDesiccant : s.vBypass;
        if (v < 0.02) continue;
        const w = v * W_TOT;
        next.push({ id: `b-${k}`, yc: yc[k], count: Math.max(2, Math.round(26 * v)), speed: 70, fill: k === 'bypass' ? P.ink2 : heatDot(w), r: w >= 5 ? 2.2 : 1.8, opacity: k === 'bypass' ? 0.6 : 0.9 });
      }
      if (disW > 1.2) next.push({ id: 'discharge', count: Math.max(2, Math.round(9 * (disW / W_TOT))), speed: 60, fill: heatDot(disW), r: 2, opacity: 0.8 });
      if (hpLive) {
        next.push({ id: 'hpIn', count: 5, speed: 50, fill: P.heatInk, r: 1.8, opacity: 0.8 });
        next.push({ id: 'hpOut', count: 3, speed: 50, fill: P.heatInk, r: 1.8, opacity: 0.8 });
      }
    }
    if (layers.listrik && elecW > 0.01) next.push({ id: 'elec', count: Math.max(2, Math.round(10 * elecW)), speed: 140, fill: P.ink, r: 2, opacity: 0.85 });
    if (layers.udara) {
      next.push({ id: 'supply', count: 4, speed: 60, fill: cool ? P.coolInk : P.ink2, r: 1.8, opacity: 0.85 });
      next.push({ id: 'coilRow', count: Math.round(4 * (1 - s.desOn)), speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
      if (s.desOn > 0.5) {
        next.push({ id: 'feed', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
        next.push({ id: 'regenIn', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
        next.push({ id: 'exhaust', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
      }
    }
    streams = budget(next);
  };

  void PATHS;
  void ROW;
  return {
    paint,
    setMoving(on) {
      if (!loop) return;
      if (on) loop.start();
      else loop.stop();
    },
    setLayers(l) {
      layers = l;
    },
    destroy() {
      loop?.stop();
    },
  };
}
