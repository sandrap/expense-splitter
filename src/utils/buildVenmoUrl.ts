export function buildVenmoUrl(amountInCents: number, note: string): string {
  const amount = (amountInCents / 100).toFixed(2);
  const params = new URLSearchParams({
    txn: 'charge',
    note: note.trim() || 'Split bill',
    amount,
  });
  return `https://venmo.com/?${params.toString()}`;
}
