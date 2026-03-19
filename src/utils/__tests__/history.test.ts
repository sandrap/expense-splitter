import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadHistory,
  saveHistory,
  upsertEntry,
  shouldSaveBill,
  createSnapshot,
  restoreFromEntry,
  HISTORY_KEY,
  MAX_ENTRIES,
} from '../history';
import type { HistoryEntry } from '../history';
import type { AppState } from '../../types/models';

beforeEach(() => {
  localStorage.clear();
});

function makeEntry(sessionId: string, overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    sessionId,
    timestamp: Date.now(),
    name: 'Test Bill',
    totalInCents: 5000,
    state: {
      v: 1,
      n: 'Test Bill',
      p: [{ i: 'p1', n: 'Alice' }],
      t: [{ i: 'i1', d: 'Pizza', c: 1200, m: 'S', a: [] }],
      s: { tp: 18, tx: 8 },
      o: {},
    },
    ...overrides,
  };
}

describe('loadHistory', () => {
  it('returns [] when localStorage has no key', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns parsed HistoryEntry[] when valid JSON exists', () => {
    const entries = [makeEntry('s1')];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    expect(loadHistory()).toEqual(entries);
  });

  it('returns [] when localStorage contains corrupted JSON', () => {
    localStorage.setItem(HISTORY_KEY, 'not-valid-json{{{');
    expect(loadHistory()).toEqual([]);
  });

  it('returns [] when localStorage contains non-array JSON', () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ not: 'array' }));
    expect(loadHistory()).toEqual([]);
  });
});

describe('saveHistory', () => {
  it('writes JSON.stringify(entries) to localStorage', () => {
    const entries = [makeEntry('s1')];
    saveHistory(entries);
    expect(localStorage.getItem(HISTORY_KEY)).toBe(JSON.stringify(entries));
  });

  it('catches QuotaExceededError and retries with entries.slice(1)', () => {
    let callCount = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      callCount++;
      if (callCount === 1) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      original.call(this, key, value);
    };

    const entries = [makeEntry('s1'), makeEntry('s2')];
    saveHistory(entries);
    // Should have retried with just s2
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].sessionId).toBe('s2');

    Storage.prototype.setItem = original;
  });
});

describe('upsertEntry', () => {
  it('with existing sessionId overwrites that entry in place', () => {
    const existing = [makeEntry('s1', { name: 'Old' }), makeEntry('s2')];
    const updated = upsertEntry(existing, makeEntry('s1', { name: 'New' }));
    expect(updated).toHaveLength(2);
    expect(updated[0].name).toBe('New');
    expect(updated[0].sessionId).toBe('s1');
  });

  it('with new sessionId appends to array', () => {
    const existing = [makeEntry('s1')];
    const updated = upsertEntry(existing, makeEntry('s2'));
    expect(updated).toHaveLength(2);
    expect(updated[1].sessionId).toBe('s2');
  });

  it('evicts oldest (index 0) when array exceeds MAX_ENTRIES after append', () => {
    const existing = Array.from({ length: MAX_ENTRIES }, (_, i) =>
      makeEntry(`s${i}`)
    );
    const updated = upsertEntry(existing, makeEntry('new-session'));
    expect(updated).toHaveLength(MAX_ENTRIES);
    // oldest (s0) should be gone
    expect(updated.find((e) => e.sessionId === 's0')).toBeUndefined();
    // new entry should be present
    expect(updated[updated.length - 1].sessionId).toBe('new-session');
  });

  it('with 10 existing entries + new sessionId results in 10 entries', () => {
    const existing = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`s${i}`)
    );
    const updated = upsertEntry(existing, makeEntry('s-new'));
    expect(updated).toHaveLength(10);
  });
});

describe('shouldSaveBill', () => {
  it('returns false when people=[] AND items=[]', () => {
    expect(shouldSaveBill({ people: [], items: [] })).toBe(false);
  });

  it('returns true when people.length > 0 (even if items=[])', () => {
    expect(shouldSaveBill({ people: [{ id: 'p1', name: 'A' }], items: [] })).toBe(true);
  });

  it('returns true when items.length > 0 (even if people=[])', () => {
    expect(
      shouldSaveBill({
        people: [],
        items: [{ id: 'i1', description: 'X', priceInCents: 100, splitMode: 'shared', assignedTo: [] }],
      })
    ).toBe(true);
  });
});

describe('createSnapshot', () => {
  it('produces HistoryEntry with correct fields', () => {
    const state: AppState = {
      billName: 'Dinner',
      people: [{ id: 'p1', name: 'Alice' }],
      items: [
        { id: 'i1', description: 'Pizza', priceInCents: 2400, splitMode: 'shared', assignedTo: [] },
      ],
      settings: { defaultTipPercent: 18, defaultTaxPercent: 8 },
      tipOverrides: {},
    };
    const entry = createSnapshot('sess-1', state);
    expect(entry.sessionId).toBe('sess-1');
    expect(entry.name).toBe('Dinner');
    expect(typeof entry.timestamp).toBe('number');
    expect(entry.totalInCents).toBeGreaterThan(0);
    // state should be compact format
    expect(entry.state.v).toBe(1);
    expect(entry.state.n).toBe('Dinner');
  });
});

describe('restoreFromEntry', () => {
  it('converts compact state back to ShareableState', () => {
    const entry = makeEntry('s1');
    const restored = restoreFromEntry(entry);
    expect(restored.billName).toBe('Test Bill');
    expect(restored.people).toHaveLength(1);
    expect(restored.people[0].name).toBe('Alice');
    expect(restored.items).toHaveLength(1);
  });
});
