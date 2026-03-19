import { useState, useEffect } from 'react';
import { loadHistory, restoreFromEntry } from '../utils/history';
import type { HistoryEntry } from '../utils/history';
import { useBillStore } from '../store/billStore';
import { resetSession } from '../hooks/useHistorySync';
import { RestoreConfirmDialog } from './RestoreConfirmDialog';
import { Toast } from './Toast';

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function HistoryDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [confirmEntry, setConfirmEntry] = useState<HistoryEntry | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Re-read localStorage every time drawer opens
  useEffect(() => {
    if (isOpen) {
      setEntries(loadHistory().slice().reverse()); // newest first
    }
  }, [isOpen]);

  // Escape key closes drawer (when no dialog open)
  useEffect(() => {
    if (!isOpen || confirmEntry) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, confirmEntry, onClose]);

  const handleRestore = () => {
    if (!confirmEntry) return;
    const restored = restoreFromEntry(confirmEntry);
    resetSession(); // new session for restored bill
    useBillStore.getState().loadBill(restored);
    setConfirmEntry(null);
    onClose();
    setToastMessage('Bill loaded');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-[20px] font-bold leading-[1.2] text-gray-900 dark:text-gray-100">
            History
          </h2>
          <button
            onClick={onClose}
            aria-label="Close history"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ height: 'calc(100% - 73px)' }}>
          {entries.length === 0 ? (
            <p className="text-base text-gray-500 dark:text-gray-400 text-center mt-8">
              No saved bills yet. Bills are auto-saved as you edit.
            </p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.sessionId + entry.timestamp}
                onClick={() => setConfirmEntry(entry)}
                className="w-full text-left p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-h-[44px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {entry.name || 'Unnamed bill'}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(entry.timestamp)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-bold">
                    {formatCents(entry.totalInCents)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmEntry && (
        <RestoreConfirmDialog
          onConfirm={handleRestore}
          onCancel={() => setConfirmEntry(null)}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage('')} />
      )}
    </>
  );
}
