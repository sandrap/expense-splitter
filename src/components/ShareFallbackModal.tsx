import { useEffect } from 'react';

export function ShareFallbackModal({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-[calc(100%-32px)] shadow-xl">
        <h2 className="text-[20px] font-bold leading-[1.2] text-gray-900 dark:text-gray-100 mb-4">
          Copy this link
        </h2>
        <textarea
          readOnly
          className="w-full h-20 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 resize-none text-gray-700 dark:text-gray-300"
          value={url}
          onFocus={(e) => e.target.select()}
        />
        <div className="mt-4 flex justify-end">
          <button
            className="min-h-[44px] text-base font-bold text-blue-500 hover:text-blue-600"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
