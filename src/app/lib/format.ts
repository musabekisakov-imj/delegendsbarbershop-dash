/**
 * Currency formatting — Lithuanian barbershop client uses Euros.
 * Kept minimal: all call sites previously used `$${value.toLocaleString()}` or `$${value}`
 * so this function accepts both styles via the options.
 */
export function formatMoney(amount: number, opts: { compact?: boolean } = {}): string {
  if (Number.isNaN(amount)) return '—';
  if (opts.compact) return `€${amount}`;
  return `€${amount.toLocaleString()}`;
}
