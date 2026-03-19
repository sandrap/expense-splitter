import { toCompact, fromCompact } from './urlState';
import type { CompactState, ShareableState } from './urlState';
import type { AppState } from '../types/models';
import { calculateResults } from '../engine/calculate';

export interface HistoryEntry {
  sessionId: string;
  timestamp: number;
  name: string;
  totalInCents: number;
  state: CompactState;
}

export const HISTORY_KEY = 'expense-splitter-history';
export const MAX_ENTRIES = 10;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // QuotaExceededError -- evict oldest and retry
    if (entries.length > 1) {
      saveHistory(entries.slice(1));
    }
  }
}

export function upsertEntry(
  history: HistoryEntry[],
  entry: HistoryEntry
): HistoryEntry[] {
  const idx = history.findIndex((e) => e.sessionId === entry.sessionId);
  let updated: HistoryEntry[];
  if (idx >= 0) {
    updated = [...history];
    updated[idx] = entry;
  } else {
    updated = [...history, entry];
    if (updated.length > MAX_ENTRIES) {
      updated = updated.slice(updated.length - MAX_ENTRIES);
    }
  }
  return updated;
}

export function shouldSaveBill(state: { people: unknown[]; items: unknown[] }): boolean {
  return state.people.length > 0 || state.items.length > 0;
}

export function createSnapshot(
  sessionId: string,
  state: AppState
): HistoryEntry {
  const results = calculateResults(state);
  const totalInCents = results.reduce((sum, r) => sum + r.totalInCents, 0);
  const shareable: ShareableState = {
    billName: state.billName,
    people: state.people,
    items: state.items,
    settings: state.settings,
    tipOverrides: state.tipOverrides,
  };
  return {
    sessionId,
    timestamp: Date.now(),
    name: state.billName,
    totalInCents,
    state: toCompact(shareable),
  };
}

export function restoreFromEntry(entry: HistoryEntry): ShareableState {
  return fromCompact(entry.state);
}
