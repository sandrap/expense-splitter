import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftCalculation } from '../useDraftCalculation';
import { useBillStore } from '../../store/billStore';
import { calculateResults } from '../../engine/calculate';

// Seed data: 2 people, 1 shared item ($20 pizza), 18% tip, 10% tax
const seedState = {
  people: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ],
  items: [
    {
      id: 'i1',
      description: 'Pizza',
      priceInCents: 2000,
      splitMode: 'shared' as const,
      assignedTo: [] as string[],
    },
  ],
  settings: { defaultTipPercent: 18, defaultTaxPercent: 10 },
  tipOverrides: {} as Record<string, number>,
};

describe('useDraftCalculation', () => {
  beforeEach(() => {
    // Reset store with seed data (merge mode to preserve actions)
    useBillStore.setState(seedState);
  });

  it('returns results equal to calculateResults() when no drafts are set', () => {
    const { result } = renderHook(() => useDraftCalculation());
    const expected = calculateResults({
      ...seedState,
    });
    expect(result.current.results).toEqual(expected);
  });

  it('setItemPriceDraft causes that item priceInCents to use draft value', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setItemPriceDraft('i1', '25.50');
    });
    // Pizza should now be 2550 cents, split between 2 people = 1275 each
    expect(result.current.results[0].subtotalInCents).toBe(1275);
    expect(result.current.results[1].subtotalInCents).toBe(1275);
  });

  it('setItemPriceDraft with empty string treats price as 0 cents', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setItemPriceDraft('i1', '');
    });
    expect(result.current.results[0].subtotalInCents).toBe(0);
    expect(result.current.results[1].subtotalInCents).toBe(0);
  });

  it('setItemPriceDraft with "." treats price as 0 cents', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setItemPriceDraft('i1', '.');
    });
    expect(result.current.results[0].subtotalInCents).toBe(0);
    expect(result.current.results[1].subtotalInCents).toBe(0);
  });

  it('setTipPercentDraft with "abc" treats tip as 0%', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setTipPercentDraft('abc');
    });
    // Each person subtotal = 1000. Tip at 0% = 0.
    expect(result.current.results[0].tipInCents).toBe(0);
    expect(result.current.results[1].tipInCents).toBe(0);
  });

  it('setTaxPercentDraft with "" treats tax as 0%', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setTaxPercentDraft('');
    });
    expect(result.current.results[0].taxInCents).toBe(0);
    expect(result.current.results[1].taxInCents).toBe(0);
  });

  it('setPersonTipDraft causes full recalculation for ALL people', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setPersonTipDraft('p1', '25');
    });
    // Alice: subtotal 1000, tip 25% = 250
    expect(result.current.results[0].tipInCents).toBe(250);
    // Bob: subtotal 1000, still default 18% = 180
    expect(result.current.results[1].tipInCents).toBe(180);
    // Both totals should be recalculated
    expect(result.current.results[0].totalInCents).toBe(1000 + 250 + 100);
    expect(result.current.results[1].totalInCents).toBe(1000 + 180 + 100);
  });

  it('clearItemPriceDraft removes draft and reverts to store value', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setItemPriceDraft('i1', '50.00');
    });
    expect(result.current.results[0].subtotalInCents).toBe(2500);
    act(() => {
      result.current.clearItemPriceDraft('i1');
    });
    // Back to store value: 2000 / 2 = 1000
    expect(result.current.results[0].subtotalInCents).toBe(1000);
  });

  it('clearTipPercentDraft reverts tip to store value', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setTipPercentDraft('10');
    });
    expect(result.current.results[0].tipInCents).toBe(100); // 10% of 1000
    act(() => {
      result.current.clearTipPercentDraft();
    });
    expect(result.current.results[0].tipInCents).toBe(180); // 18% of 1000
  });

  it('clearTaxPercentDraft reverts tax to store value', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setTaxPercentDraft('5');
    });
    // Tax at 5%: total subtotal 2000, tax = 100, each gets 50
    expect(result.current.results[0].taxInCents).toBe(50);
    act(() => {
      result.current.clearTaxPercentDraft();
    });
    // Back to 10%: total subtotal 2000, tax = 200, each gets 100
    expect(result.current.results[0].taxInCents).toBe(100);
  });

  it('clearPersonTipDraft reverts that person tip to default', () => {
    const { result } = renderHook(() => useDraftCalculation());
    act(() => {
      result.current.setPersonTipDraft('p1', '30');
    });
    expect(result.current.results[0].tipInCents).toBe(300); // 30% of 1000
    act(() => {
      result.current.clearPersonTipDraft('p1');
    });
    // Back to default 18%
    expect(result.current.results[0].tipInCents).toBe(180);
  });
});
