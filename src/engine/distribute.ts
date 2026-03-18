/**
 * Distribute totalCents equally among `count` people using the largest-remainder method.
 * Ensures shares always sum exactly to totalCents.
 */
export function largestRemainderDistribute(totalCents: number, count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  // First `remainder` people get base+1, rest get base
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Distribute totalCents proportionally by weights using the full largest-remainder algorithm.
 * Ensures shares sum exactly to totalCents (handles rounding via fractional remainder sorting).
 */
export function distributeProportional(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return weights.map(() => 0);

  const exactShares = weights.map((w) => (w / totalWeight) * totalCents);
  const floors = exactShares.map(Math.floor);
  let remaining = totalCents - floors.reduce((sum, f) => sum + f, 0);

  // Sort indices by fractional remainder descending, distribute leftover cents
  const indices = exactShares
    .map((exact, i) => ({ i, remainder: exact - floors[i] }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let j = 0; j < remaining; j++) {
    floors[indices[j].i]++;
  }

  return floors;
}
