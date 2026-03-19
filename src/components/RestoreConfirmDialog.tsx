import { useEffect } from 'react';

export function RestoreConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-[calc(100%-32px)] shadow-xl">
        <p className="text-[20px] font-bold leading-[1.2] text-gray-900 dark:text-gray-100 mb-4">
          Load this bill?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="min-h-[44px] px-4 text-base font-bold text-gray-500 dark:text-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="min-h-[44px] px-4 text-base font-bold text-blue-500 dark:text-blue-400"
          >
            Load
          </button>
        </div>
      </div>
    </>
  );
}
