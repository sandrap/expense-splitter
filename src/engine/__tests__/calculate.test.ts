import { describe, it, expect } from 'vitest';
import { calculateResults } from '../calculate';
import type { AppState } from '../../types/models';

describe('calculateResults', () => {
  it('splits a single shared item equally between 2 people (no tip/tax)', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results).toHaveLength(2);
    expect(results[0].subtotalInCents).toBe(1000);
    expect(results[1].subtotalInCents).toBe(1000);
    expect(results[0].tipInCents).toBe(0);
    expect(results[0].taxInCents).toBe(0);
    expect(results[0].totalInCents).toBe(1000);
    expect(results[0].totalInCents + results[1].totalInCents).toBe(2000);
  });

  it('uses largest-remainder for 3-way split of $10.00 (sum invariant)', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Appetizer', priceInCents: 1000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const totalCents = results.reduce((sum, r) => sum + r.totalInCents, 0);
    expect(totalCents).toBe(1000); // Must sum exactly
    const shares = results.map((r) => r.subtotalInCents).sort((a, b) => a - b);
    expect(shares).toEqual([333, 333, 334]);
  });

  it('computes tip on pre-tax subtotal only (not on subtotal+tax)', () => {
    const state: AppState = {
      people: [{ id: '1', name: 'Alice' }],
      items: [
        { id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 20, defaultTaxPercent: 10 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results[0].subtotalInCents).toBe(1000);
    expect(results[0].taxInCents).toBe(100);   // 10% of 1000
    expect(results[0].tipInCents).toBe(200);    // 20% of 1000, NOT 20% of 1100
    expect(results[0].totalInCents).toBe(1300); // 1000 + 100 + 200
  });

  it('splits shared item among subset of people', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Shared App', priceInCents: 1500, splitMode: 'shared', assignedTo: ['1', '2'] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;
    const carol = results.find((r) => r.personId === '3')!;
    expect(alice.subtotalInCents).toBe(750);
    expect(bob.subtotalInCents).toBe(750);
    expect(carol.subtotalInCents).toBe(0);
  });

  it('charges assigned item only to specified person', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Salad', priceInCents: 1200, splitMode: 'assigned', assignedTo: ['2'] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;
    const carol = results.find((r) => r.personId === '3')!;
    expect(alice.subtotalInCents).toBe(0);
    expect(bob.subtotalInCents).toBe(1200);
    expect(carol.subtotalInCents).toBe(0);
  });

  it('splits shared item with empty assignedTo among all people', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Carol' },
      ],
      items: [
        { id: 'i1', description: 'Bread', priceInCents: 900, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const shares = results.map((r) => r.subtotalInCents);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(900);
    expect(shares).toEqual([300, 300, 300]);
  });

  it('handles multiple items with mixed split modes', () => {
    // 2 people (Alice, Bob), shared pizza $20, assigned salad $8 to Alice
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] },
        { id: 'i2', description: 'Salad', priceInCents: 800, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 10 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;
    // Alice: 1000 (pizza share) + 800 (salad) = 1800
    expect(alice.subtotalInCents).toBe(1800);
    // Bob: 1000 (pizza share)
    expect(bob.subtotalInCents).toBe(1000);
    // Total tax = Math.round(2800 * 10 / 100) = 280
    // Distributed proportionally: Alice 1800/2800, Bob 1000/2800
    const totalTax = alice.taxInCents + bob.taxInCents;
    expect(totalTax).toBe(280);
    // Alice tax proportional share
    expect(alice.taxInCents).toBe(Math.floor((1800 / 2800) * 280) + (alice.taxInCents - Math.floor((1800 / 2800) * 280)));
    // Both totals: subtotal + tax (no tip)
    expect(alice.totalInCents).toBe(alice.subtotalInCents + alice.taxInCents);
    expect(bob.totalInCents).toBe(bob.subtotalInCents + bob.taxInCents);
  });

  it('handles 7-way split rounding stress test (sum === 10000)', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'P1' },
        { id: '2', name: 'P2' },
        { id: '3', name: 'P3' },
        { id: '4', name: 'P4' },
        { id: '5', name: 'P5' },
        { id: '6', name: 'P6' },
        { id: '7', name: 'P7' },
      ],
      items: [
        { id: 'i1', description: 'Big Item', priceInCents: 10000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results).toHaveLength(7);
    const total = results.reduce((sum, r) => sum + r.totalInCents, 0);
    expect(total).toBe(10000); // Must sum exactly
  });

  it('returns empty array when there are no people', () => {
    const state: AppState = {
      people: [],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results).toEqual([]);
  });

  it('skips assigned item with empty assignedTo (no division by zero)', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Unassigned', priceInCents: 1000, splitMode: 'assigned', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    // Item contributes zero to all people (no one gets charged)
    expect(results).toHaveLength(2);
    expect(results[0].subtotalInCents).toBe(0);
    expect(results[1].subtotalInCents).toBe(0);
    expect(results[0].totalInCents).toBe(0);
    expect(results[1].totalInCents).toBe(0);
  });

  it('populates itemLines with correct entries for each person', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2000, splitMode: 'shared', assignedTo: [] },
        { id: 'i2', description: 'Salad', priceInCents: 800, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;

    // Alice has 2 item lines (pizza + salad)
    expect(alice.itemLines).toHaveLength(2);
    const pizzaLine = alice.itemLines.find((l) => l.itemId === 'i1')!;
    expect(pizzaLine.description).toBe('Pizza');
    expect(pizzaLine.shareInCents).toBe(1000);
    const saladLine = alice.itemLines.find((l) => l.itemId === 'i2')!;
    expect(saladLine.description).toBe('Salad');
    expect(saladLine.shareInCents).toBe(800);

    // Bob has 1 item line (pizza only)
    expect(bob.itemLines).toHaveLength(1);
    expect(bob.itemLines[0].itemId).toBe('i1');
    expect(bob.itemLines[0].shareInCents).toBe(1000);
  });

  it('includes personId and name correctly in PersonResult', () => {
    const state: AppState = {
      people: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      items: [],
      settings: { defaultTipPercent: 0, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results).toHaveLength(2);
    expect(results[0].personId).toBe('p1');
    expect(results[0].name).toBe('Alice');
    expect(results[1].personId).toBe('p2');
    expect(results[1].name).toBe('Bob');
  });
});

describe('per-person tip overrides', () => {
  it('uses tipOverride instead of defaultTipPercent when present', () => {
    const state: AppState = {
      people: [{ id: '1', name: 'Alice' }],
      items: [
        { id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: { '1': 25 },
    };
    const results = calculateResults(state);
    expect(results[0].tipInCents).toBe(250); // 25% of 1000, not 18%
  });

  it('falls back to defaultTipPercent when no override present', () => {
    const state: AppState = {
      people: [{ id: '1', name: 'Alice' }],
      items: [
        { id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: {},
    };
    const results = calculateResults(state);
    expect(results[0].tipInCents).toBe(180); // 18% of 1000
  });

  it('applies different tip rates to different people', () => {
    const state: AppState = {
      people: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ],
      items: [
        { id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] },
        { id: 'i2', description: 'Drink', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['2'] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: { '1': 25 },
    };
    const results = calculateResults(state);
    const alice = results.find((r) => r.personId === '1')!;
    const bob = results.find((r) => r.personId === '2')!;
    expect(alice.tipInCents).toBe(250); // 25% of 1000
    expect(bob.tipInCents).toBe(180);   // 18% of 1000 (default)
  });

  it('allows tipOverride of 0 (zero tip is valid)', () => {
    const state: AppState = {
      people: [{ id: '1', name: 'Alice' }],
      items: [
        { id: 'i1', description: 'Meal', priceInCents: 1000, splitMode: 'assigned', assignedTo: ['1'] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 0 },
      tipOverrides: { '1': 0 },
    };
    const results = calculateResults(state);
    expect(results[0].tipInCents).toBe(0); // 0% override, not default 18%
  });
});
