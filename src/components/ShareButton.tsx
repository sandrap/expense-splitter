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
        {label}
      </button>
      {toast && <Toast message="Link copied!" onDismiss={() => setToast(false)} />}
      {fallbackUrl && (
        <ShareFallbackModal url={fallbackUrl} onClose={() => setFallbackUrl(null)} />
      )}
    </>
  );
}
