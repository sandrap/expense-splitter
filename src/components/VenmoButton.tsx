import { buildVenmoUrl } from '../utils/buildVenmoUrl';
import { useBillStore } from '../store/billStore';

interface VenmoButtonProps {
  amountInCents: number;
  personName: string;
}

export function VenmoButton({ amountInCents, personName }: VenmoButtonProps) {
  const billName = useBillStore((state) => state.billName);

  if (amountInCents === 0) return null;

  const href = buildVenmoUrl(amountInCents, billName);
  const formattedAmount = `$${(amountInCents / 100).toFixed(2)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Pay ${personName} ${formattedAmount} with Venmo`}
      className="mt-2 w-full min-h-[44px] flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-bold rounded-lg active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.27 2c.94 1.55 1.37 3.15 1.37 5.17 0 6.44-5.5 14.81-9.97 20.67H3.24L.36 3.3l7.05-.65 1.83 14.68c1.7-2.77 3.8-7.14 3.8-10.13 0-1.92-.33-3.23-.93-4.28L19.27 2z" />
      </svg>
      Pay with Venmo
    </a>
  );
}
