import LZString from 'lz-string';
import type { Person, Item, BillSettings } from '../types/models';

const SCHEMA_VERSION = 1;

export interface ShareableState {
  billName: string;
  people: Person[];
  items: Item[];
  settings: BillSettings;
  tipOverrides: Record<string, number>;
}

export interface CompactState {
  v: number;
  n: string;
  p: Array<{ i: string; n: string }>;
  t: Array<{
    i: string;
    d: string;
    c: number;
    m: 'S' | 'A';
    a: string[];
  }>;
  s: { tp: number; tx: number };
  o: Record<string, number>;
}

export function toCompact(state: ShareableState): CompactState {
  return {
    v: SCHEMA_VERSION,
    n: state.billName,
    p: state.people.map((p) => ({ i: p.id, n: p.name })),
    t: state.items.map((item) => ({
      i: item.id,
      d: item.description,
      c: item.priceInCents,
      m: item.splitMode === 'shared' ? 'S' : 'A',
      a: item.assignedTo,
    })),
    s: {
      tp: state.settings.defaultTipPercent,
      tx: state.settings.defaultTaxPercent,
    },
    o: state.tipOverrides,
  };
}

export function fromCompact(c: CompactState): ShareableState {
  return {
    billName: c.n ?? '',
    people: c.p.map((p) => ({ id: p.i, name: p.n })),
    items: c.t.map((item) => ({
      id: item.i,
      description: item.d,
      priceInCents: item.c,
      splitMode: item.m === 'S' ? 'shared' : 'assigned',
      assignedTo: item.a,
    })),
    settings: {
      defaultTipPercent: c.s.tp,
      defaultTaxPercent: c.s.tx,
    },
    tipOverrides: c.o,
  };
}

export function encodeState(state: ShareableState): string {
  const compact = toCompact(state);
  const json = JSON.stringify(compact);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeState(hash: string): ShareableState | null {
  if (!hash) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    const compact = JSON.parse(json) as CompactState;
    if (compact.v !== SCHEMA_VERSION) return null;
    return fromCompact(compact);
  } catch {
    return null;
  }
}
