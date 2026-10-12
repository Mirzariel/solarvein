import { describe, expect, it } from 'vitest';
import { MINUS, NBSP, formatId, formatWithUnit, parseId, typo } from './numberFormat';

describe('typo()', () => {
  it('binds numbers to units and removes the space before %', () => {
    expect(typo('Daya 865 W pada 36,2 °C')).toContain(`865${NBSP}W`);
    expect(typo('Daya 865 W pada 36,2 °C')).toContain(`36,2${NBSP}°C`);
    expect(typo('naik 18 %')).toBe('naik 18%');
  });
  it('keeps short words with the next word but not at the end', () => {
    expect(typo('Di dalam SolarVein')).toBe(`Di${NBSP}dalam SolarVein`);
    expect(typo('rumah itu')).toBe('rumah itu');
  });
  it('uses real typographic characters', () => {
    expect(typo('1.200-1.600 jam')).toBe(`1.200\u20131.600${NBSP}jam`);
    expect(typo('"atap" dan ibu\'s')).toContain('\u201Catap\u201D');
    expect(typo('suhu -5 K')).toContain(`${MINUS}5`);
  });
});

describe('number helpers', () => {
  it('formats id-ID with a true minus and NBSP before the unit', () => {
    expect(formatId(-1234.5, 1)).toBe(`${MINUS}1.234,5`);
    expect(formatWithUnit(36.2, '°C', 1)).toBe(`36,2${NBSP}°C`);
  });
  it('parses id-ID input', () => {
    expect(parseId('1.200,5')).toBe(1200.5);
    expect(parseId('12,5')).toBe(12.5);
    expect(parseId('x')).toBeNaN();
  });
});
