export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}
