import { beforeEach, describe, expect, it } from 'vitest';
import { INPUT_LIMITS, PRESETS } from '../sim';
import { getComparison, getSimResult } from './selectors';
import { IMPACT_HOURS_DEFAULT, MODE_LABEL, useStore } from './store';

const s = () => useStore.getState();

describe('store', () => {
  beforeEach(() => s().reset());

  it('starts in sunny mode with the sunny preset', () => {
    expect(s().mode).toBe('sunny');
    expect(s().inputs.irradiance).toBe(PRESETS.sunny.irradiance);
  });

  it('auto-rotate is off by default and mode lab is shown as Kustom', () => {
    expect(s().autoRotate).toBe(false);
    expect(MODE_LABEL.lab).toBe('Kustom');
    expect(MODE_LABEL.sunny).toBe('Cerah');
    expect(MODE_LABEL.rainy).toBe('Hujan');
  });

  it('impact scaler state clamps roofs to 1..100.000 (log10) and resets', () => {
    s().setImpactLogRoofs(9);
    expect(s().impactLogRoofs).toBe(5);
    s().setImpactLogRoofs(-3);
    expect(s().impactLogRoofs).toBe(0);
    s().setImpactPanels(99);
    expect(s().impactPanels).toBe(20);
    s().setImpactHours('rainy', 250);
    s().setImpactScenario('rainy');
    expect(s().impactHours.rainy).toBe(250);
    s().reset();
    expect(s().impactScenario).toBe('sunny');
    expect(s().impactLogRoofs).toBe(4);
    expect(s().impactPanels).toBe(4);
    expect(s().impactLoadFraction).toBe(0.5);
    expect(s().impactHours).toEqual(IMPACT_HOURS_DEFAULT);
  });

  it('setMode loads presets and lab keeps current inputs', () => {
    s().setMode('rainy');
    expect(s().mode).toBe('rainy');
    expect(s().inputs.rainMmH).toBe(PRESETS.rainy.rainMmH);
    s().setMode('lab');
    expect(s().mode).toBe('lab');
    expect(s().inputs.rainMmH).toBe(PRESETS.rainy.rainMmH);
    s().setMode('sunny');
    expect(s().inputs.rainMmH).toBe(PRESETS.sunny.rainMmH);
  });

  it('setInput flips to lab when value differs from the preset', () => {
    s().setInput('irradiance', 500);
    expect(s().mode).toBe('lab');
    expect(s().inputs.irradiance).toBe(500);
  });

  it('setInput with the preset value does not leave the preset mode', () => {
    s().setInput('irradiance', PRESETS.sunny.irradiance);
    expect(s().mode).toBe('sunny');
  });

  it('setInput clamps to INPUT_LIMITS', () => {
    const lim = INPUT_LIMITS.irradiance;
    s().setInput('irradiance', lim.max + 5000);
    expect(s().inputs.irradiance).toBeLessThanOrEqual(lim.max);
    s().setInput('irradiance', lim.min - 5000);
    expect(s().inputs.irradiance).toBeGreaterThanOrEqual(lim.min);
  });

  it('setInput replaces the inputs object immutably', () => {
    const before = s().inputs;
    s().setInput('flowLpm', before.flowLpm + 0.5);
    expect(s().inputs).not.toBe(before);
    expect(before.flowLpm).not.toBe(s().inputs.flowLpm);
  });

  it('resetInputsToMode restores the preset of the current mode', () => {
    s().setMode('rainy');
    s().setInput('windMs', 9);
    expect(s().mode).toBe('lab'); // edited away from rainy
    s().setMode('rainy');
    s().resetInputsToMode();
    expect(s().inputs).toEqual(expect.objectContaining({ rainMmH: PRESETS.rainy.rainMmH }));
  });

  it('viewer toggles and layer visibility work', () => {
    s().toggleExploded();
    s().toggleLayer('glass');
    s().setFocusLayer('channel');
    expect(s().exploded).toBe(true);
    expect(s().layerVisibility.glass).toBe(false);
    expect(s().layerVisibility.cells).toBe(true);
    expect(s().focusLayer).toBe('channel');
    s().showAllLayers();
    expect(s().layerVisibility.glass).toBe(true);
  });

  it('setCarbon merges partial assumptions', () => {
    const before = s().carbon;
    s().setCarbon({ hoursPerYear: before.hoursPerYear + 100 });
    expect(s().carbon.hoursPerYear).toBe(before.hoursPerYear + 100);
    expect(s().carbon.gridKgPerKWh).toBe(before.gridKgPerKWh);
  });

  it('reset restores inputs, mode, viewer and carbon', () => {
    s().setInput('irradiance', 300);
    s().toggleCrossSection();
    s().toggleLayer('cells');
    s().setCarbon({ gridKgPerKWh: 0.1 });
    s().setFocusLayer('absorber');
    s().reset();
    expect(s().mode).toBe('sunny');
    expect(s().inputs.irradiance).toBe(PRESETS.sunny.irradiance);
    expect(s().crossSection).toBe(false);
    expect(s().layerVisibility.cells).toBe(true);
    expect(s().focusLayer).toBeNull();
    expect(s().carbon.gridKgPerKWh).not.toBe(0.1);
  });
});

describe('selectors cache', () => {
  beforeEach(() => s().reset());

  it('returns the same result object for the same inputs reference', () => {
    const a = getSimResult(s().inputs);
    expect(getSimResult(s().inputs)).toBe(a);
    expect(getComparison(s().inputs)).toBe(getComparison(s().inputs));
  });

  it('recomputes after an input change', () => {
    const a = getSimResult(s().inputs);
    s().setInput('irradiance', 400);
    const b = getSimResult(s().inputs);
    expect(b).not.toBe(a);
    expect(b.inputs.irradiance).toBe(400);
  });
});
