import { describe, expect, it } from 'vitest';
import { PRESENTATION_SCENES } from '../sections/nav';
import { appMode, flag } from './appMode';
import { resolveKey, type TargetInfo } from './keys';
import { parsePreset } from './preset';
import { SCENES, cursorFromTops, stepCursor } from './scenes';

const body: TargetInfo = { tag: 'body', role: '', typing: false };
const slider: TargetInfo = { tag: 'input', role: '', typing: true };
const key = (k: string, t: TargetInfo = body, extra: object = {}) => resolveKey({ key: k, ...extra }, t, SCENES.length);

describe('appMode', () => {
  it('reads query params only', () => {
    expect(appMode('')).toBe('site');
    expect(appMode('?presentasi=1')).toBe('presentation');
    expect(appMode('?presentasi')).toBe('presentation');
    expect(appMode('?presentasi=0')).toBe('site');
    expect(appMode('?export=1&static=1')).toBe('export');
    expect(appMode('?export=1&presentasi=1')).toBe('export');
    expect(flag('?static=true', 'static')).toBe(true);
    expect(flag('?static=false', 'static')).toBe(false);
  });
});

describe('scenes', () => {
  it('follows the registry and appends the 3-day rain backup', () => {
    expect(SCENES.slice(0, PRESENTATION_SCENES.length).map((s) => s.id)).toEqual([...PRESENTATION_SCENES]);
    const last = SCENES[SCENES.length - 1]!;
    expect(last).toMatchObject({ id: 'sehari', rain3: true, demo: false });
    expect(SCENES.filter((s) => s.demo).map((s) => s.id)).toEqual(['masalah', 'sistem', 'sehari', 'dampak']);
  });
  it('steps and clamps', () => {
    expect(stepCursor(-1, -1, 9)).toBe(-1);
    expect(stepCursor(-1, 1, 9)).toBe(0);
    expect(stepCursor(8, 1, 9)).toBe(8);
  });
  it('derives the cursor from section tops and keeps the rain backup on Sehari', () => {
    const tops = SCENES.map((s) => (s.id === 'masalah' ? -800 : s.id === 'sistem' ? -200 : s.id === 'sehari' ? -10 : 900));
    const sehari = SCENES.findIndex((s) => s.id === 'sehari' && !s.rain3);
    expect(cursorFromTops(tops, 250, SCENES, 0)).toBe(sehari);
    expect(cursorFromTops(tops, 250, SCENES, SCENES.length - 1)).toBe(SCENES.length - 1);
    expect(cursorFromTops(SCENES.map(() => 900), 250, SCENES, 3)).toBe(-1);
  });
});

describe('keys', () => {
  it('steps with arrows, Page keys and Space', () => {
    expect(key('ArrowRight')).toEqual({ type: 'step', delta: 1 });
    expect(key('ArrowLeft')).toEqual({ type: 'step', delta: -1 });
    expect(key('PageDown')).toEqual({ type: 'step', delta: 1 });
    expect(key('PageUp')).toEqual({ type: 'step', delta: -1 });
    expect(key(' ')).toEqual({ type: 'step', delta: 1 });
    expect(key(' ', body, { shift: true })).toEqual({ type: 'step', delta: -1 });
  });
  it('jumps with 1-9 within the scene count and 0 goes to the opening', () => {
    expect(key('1')).toEqual({ type: 'jump', index: 0 });
    expect(key('8')).toEqual({ type: 'jump', index: 7 });
    expect(key('9')).toEqual({ type: 'jump', index: 8 });
    expect(key('0')).toEqual({ type: 'top' });
  });
  it('maps R, L, A/B/C, H and Esc', () => {
    expect(key('R')).toEqual({ type: 'reset' });
    expect(key('l')).toEqual({ type: 'lab' });
    expect(key('b')).toEqual({ type: 'mode', mode: 'B' });
    expect(key('C')).toEqual({ type: 'mode', mode: 'C' });
    expect(key('h')).toEqual({ type: 'hints' });
    expect(key('Escape')).toEqual({ type: 'exit' });
  });
  it('never fights sliders and inputs', () => {
    for (const k of ['ArrowRight', 'ArrowLeft', 'PageDown', ' ', '1', 'r', 'a']) expect(key(k, slider)).toBeNull();
    expect(key('ArrowRight', { tag: 'div', role: 'slider', typing: false })).toBeNull();
    expect(key('Escape', slider)).toEqual({ type: 'release-focus' });
  });
  it('leaves radio groups, buttons and browser shortcuts alone', () => {
    expect(key('ArrowRight', { tag: 'button', role: 'radio', typing: false })).toBeNull();
    expect(key(' ', { tag: 'button', role: '', typing: false })).toBeNull();
    expect(key('ArrowRight', { tag: 'button', role: '', typing: false })).toEqual({ type: 'step', delta: 1 });
    expect(key('r', body, { ctrl: true })).toBeNull();
    expect(key('ArrowRight', body, { alt: true })).toBeNull();
  });
});

describe('preset', () => {
  it('maps skenario names to condition targets', () => {
    expect(parsePreset('?skenario=terik')).toEqual({ kind: 'target', target: 'A' });
    expect(parsePreset('?skenario=lembap')).toEqual({ kind: 'target', target: 'B' });
    expect(parsePreset('?skenario=malam')).toEqual({ kind: 'target', target: 'C' });
  });
  it('lets jam override the preset hour', () => {
    expect(parsePreset('?skenario=terik&jam=13')).toEqual({ kind: 'custom', scenario: 'terik', hour: 13 });
    expect(parsePreset('?skenario=lembap&jam=9,5')).toEqual({ kind: 'custom', scenario: 'hujan', hour: 9.5 });
    expect(parsePreset('?jam=7')).toEqual({ kind: 'custom', scenario: undefined, hour: 7 });
  });
  it('ignores unknown input', () => {
    expect(parsePreset('')).toBeNull();
    expect(parsePreset('?skenario=salju')).toBeNull();
    expect(parsePreset('?jam=abc')).toBeNull();
  });
});
