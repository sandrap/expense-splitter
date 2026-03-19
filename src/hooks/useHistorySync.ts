import { useEffect } from 'react';
import { useBillStore } from '../store/billStore';
import { loadHistory, saveHistory, upsertEntry, shouldSaveBill, createSnapshot } from '../utils/history';

// Module-level session ID -- new on every page load
let currentSessionId = crypto.randomUUID();

export function resetSession(): void {
  currentSessionId = crypto.randomUUID();
}

export function useHistorySync() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = useBillStore.subscribe((state) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!shouldSaveBill(state)) return;
        const snapshot = createSnapshot(currentSessionId, state);
        const history = loadHistory();
        const updated = upsertEntry(history, snapshot);
        saveHistory(updated);
      }, 2000);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);
}
