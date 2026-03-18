import { describe, it, expect } from 'vitest';
import { toCents, fromCents } from '../cents';
import { largestRemainderDistribute, distributeProportional } from '../distribute';

describe('toCents', () => {
  it('converts whole dollars', () => {
    expect(toCents(10.00)).toBe(1000);
  });

  it('handles floating-point edge case (1.1)', () => {
    expect(toCents(1.1)).toBe(110); // NOT 110.00000000000001
  });

  it('converts zero', () => {
    expect(toCents(0)).toBe(0);
  });

  it('converts 19.99', () => {
    expect(toCents(19.99)).toBe(1999);
  });
});

describe('fromCents', () => {
  it('converts 1000 cents to 10.00', () => {
    expect(fromCents(1000)).toBe(10.00);
  });

  it('converts 1 cent to 0.01', () => {
    expect(fromCents(1)).toBe(0.01);
  });

  it('converts 0 cents to 0', () => {
    expect(fromCents(0)).toBe(0);
  });
});

describe('largestRemainderDistribute', () => {
  it('splits 1000 into 2 equal shares', () => {
    const result = largestRemainderDistribute(1000, 2);
    expect(result).toEqual([500, 500]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('splits 1000 into 3 shares with remainder (sum invariant)', () => {
    const result = largestRemainderDistribute(1000, 3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(result.sort()).toEqual([333, 333, 334]);
  });

  it('splits 100 into 7 shares (sum invariant)', () => {
    const result = largestRemainderDistribute(100, 7);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    // should be [15, 15, 14, 14, 14, 14, 14]
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted[0]).toBe(15);
    expect(sorted[1]).toBe(15);
    expect(sorted[2]).toBe(14);
  });

  it('splits 0 into 3 shares', () => {
    const result = largestRemainderDistribute(0, 3);
    expect(result).toEqual([0, 0, 0]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('returns empty array for count 0', () => {
    const result = largestRemainderDistribute(1000, 0);
    expect(result).toEqual([]);
  });

  it('maintains sum invariant for various inputs', () => {
    const cases: [number, number][] = [
      [333, 3],
      [100, 7],
      [999, 4],
      [1, 2],
      [10000, 9],
    ];
    for (const [total, count] of cases) {
      const result = largestRemainderDistribute(total, count);
      expect(result.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
});

describe('distributeProportional', () => {
  it('splits 1000 with equal weights [500, 500]', () => {
    const result = distributeProportional(1000, [500, 500]);
    expect(result).toEqual([500, 500]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('splits 1000 with weights [700, 300]', () => {
    const result = distributeProportional(1000, [700, 300]);
    expect(result).toEqual([700, 300]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('splits 100 with equal unit weights [1, 1, 1] (sum invariant)', () => {
    const result = distributeProportional(100, [1, 1, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    // [34, 33, 33] or similar valid distribution
    const sorted = [...result].sort((a, b) => b - a);
    expect(sorted[0]).toBe(34);
    expect(sorted[1]).toBe(33);
    expect(sorted[2]).toBe(33);
  });

  it('splits 0 among any weights returns all zeros', () => {
    const result = distributeProportional(0, [1, 2, 3]);
    expect(result).toEqual([0, 0, 0]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('handles zero total weight — returns all zeros', () => {
    const result = distributeProportional(1000, [0, 0, 0]);
    expect(result).toEqual([0, 0, 0]);
  });

  it('maintains sum invariant for various proportional inputs', () => {
    const cases: [number, number[]][] = [
      [1000, [1, 2, 3]],
      [999, [1, 1]],
      [100, [3, 7]],
      [50, [1, 1, 1, 1]],
    ];
    for (const [total, weights] of cases) {
      const result = distributeProportional(total, weights);
      expect(result.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
});
