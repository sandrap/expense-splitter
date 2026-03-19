import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { encodeState, decodeState } from '../urlState';
import type { ShareableState } from '../urlState';

const minimalState: ShareableState = {
  billName: '',
  people: [],
  items: [],
  settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
  tipOverrides: {},
};

const fullState: ShareableState = {
  billName: 'Dinner at Luigi',
  people: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ],
  items: [
    { id: 'i1', description: 'Pizza', priceInCents: 1299, splitMode: 'shared', assignedTo: [] },
    { id: 'i2', description: 'Salad', priceInCents: 899, splitMode: 'assigned', assignedTo: ['p1'] },
  ],
  settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
  tipOverrides: { p1: 20 },
};

describe('encodeState', () => {
  it('returns a non-empty string for minimal state', () => {
    const result = encodeState(minimalState);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('decodeState(encodeState(state)) round-trip', () => {
  it('produces deep-equal state for a full bill', () => {
    const encoded = encodeState(fullState);
    const decoded = decodeState(encoded);
    expect(decoded).toEqual(fullState);
  });

  it('preserves priceInCents as integer (no float corruption)', () => {
    const encoded = encodeState(fullState);
    const decoded = decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(Number.isInteger(decoded!.items[0].priceInCents)).toBe(true);
    expect(decoded!.items[0].priceInCents).toBe(1299);
  });
});

describe('decodeState — invalid input', () => {
  it('returns null for empty string', () => {
    expect(decodeState('')).toBeNull();
  });

  it('returns null for random non-encoded string', () => {
    expect(decodeState('not-valid-base64!!')).toBeNull();
  });

  it('returns null for wrong schema version', () => {
    const badPayload = LZString.compressToEncodedURIComponent(JSON.stringify({ v: 99, n: '', p: [], t: [], s: { tp: 18, tx: 0 }, o: {} }));
    expect(decodeState(badPayload)).toBeNull();
  });
});

describe('URL length', () => {
  it('stays under 2000 chars for a 6-person 12-item bill', () => {
    const largeState: ShareableState = {
      billName: 'Big Group Dinner',
      people: Array.from({ length: 6 }, (_, i) => ({ id: `person-${i}`, name: `Person ${i + 1}` })),
      items: Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        description: `Menu Item ${i + 1} with a moderately long description`,
        priceInCents: 1200 + i * 150,
        splitMode: 'shared' as const,
        assignedTo: [],
      })),
      settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
      tipOverrides: { 'person-0': 20, 'person-1': 15 },
    };
    const encoded = encodeState(largeState);
    const fullUrl = `https://example.com/#${encoded}`;
    expect(fullUrl.length).toBeLessThan(2000);
  });
});
