import { describe, it, expect } from 'vitest';
import { buildVenmoUrl } from '../buildVenmoUrl';

describe('buildVenmoUrl', () => {
  it('constructs URL with correct base and txn=charge', () => {
    const url = buildVenmoUrl(4250, 'Dinner');
    expect(url).toMatch(/^https:\/\/venmo\.com\/\?/);
    expect(url).toContain('txn=charge');
  });

  it('formats amount as decimal dollars with 2 decimal places', () => {
    expect(buildVenmoUrl(4250, 'Test')).toContain('amount=42.50');
    expect(buildVenmoUrl(1010, 'Test')).toContain('amount=10.10');
    expect(buildVenmoUrl(500, 'Test')).toContain('amount=5.00');
  });

  it('URL-encodes the note parameter', () => {
    const url = buildVenmoUrl(100, 'Lunch & Drinks');
    expect(url).toContain('note=Lunch');
    expect(url).toContain('%26'); // & encoded
  });

  it('uses "Split bill" fallback for empty note', () => {
    expect(buildVenmoUrl(100, '')).toContain('note=Split+bill');
  });

  it('uses "Split bill" fallback for whitespace-only note', () => {
    expect(buildVenmoUrl(100, '   ')).toContain('note=Split+bill');
  });

  it('returns full correct URL for typical case', () => {
    const url = buildVenmoUrl(4250, 'Dinner at Olive Garden');
    expect(url).toBe('https://venmo.com/?txn=charge&note=Dinner+at+Olive+Garden&amount=42.50');
  });
});
