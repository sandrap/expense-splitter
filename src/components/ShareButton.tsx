import { useState } from 'react';
import { useBillStore } from '../store/billStore';
import { encodeState } from '../utils/urlState';
import { Toast } from './Toast';
import { ShareFallbackModal } from './ShareFallbackModal';

export function ShareButton({ label, className }: { label: string; className?: string }) {
  const [toast, setToast] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function handleShare() {
    const { billName, people, items, settings, tipOverrides } = useBillStore.getState();
    const encoded = encodeState({ billName, people, items, settings, tipOverrides });
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast(true);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        className={className}
        aria-label={label === '' ? 'Share bill' : undefined}
      >
        {label || (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </button>
      {toast && <Toast message="Link copied!" onDismiss={() => setToast(false)} />}
      {fallbackUrl && (
        <ShareFallbackModal url={fallbackUrl} onClose={() => setFallbackUrl(null)} />
      )}
    </>
  );
}
