import { useState, useEffect } from 'react';
import { useBillStore } from '../store/billStore';

export function BillName() {
  const billName = useBillStore((s) => s.billName);
  const setBillName = useBillStore((s) => s.setBillName);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(billName);

  useEffect(() => {
    if (!isEditing) {
      setDraft(billName);
    }
  }, [billName, isEditing]);

  const commit = () => {
    const trimmed = draft.trim();
    setBillName(trimmed);
    setIsEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      setDraft(billName);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base bg-white dark:bg-gray-800 text-center text-gray-900 dark:text-gray-100"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
      />
    );
  }

  return (
    <div
      className="min-h-[44px] inline-flex items-center justify-center cursor-pointer"
      onClick={() => setIsEditing(true)}
    >
      {billName ? (
        <span className="text-base text-gray-900 dark:text-gray-100 max-w-xs truncate">
          {billName}
        </span>
      ) : (
        <span className="text-base text-gray-400 dark:text-gray-500">
          Tap to name this bill
        </span>
      )}
    </div>
  );
}
