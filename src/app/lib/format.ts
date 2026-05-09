import type { Language } from '../types';

/**
 * Human-readable duration. 45 → "45m", 60 → "1h", 90 → "1.5h", 75 → "1h 15m".
 * Applied everywhere durations show: day agenda, grid tiles, week tiles.
 */
export function formatDuration(min: number): string {
  if (min <= 0) return '—';
  if (min < 60) return `${min}m`;
  if (min % 60 === 0) return `${min / 60}h`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 30) return `${h}.5h`;
  return `${h}h ${m}m`;
}

/**
 * Currency formatting — Lithuanian barbershop client uses Euros.
 * Kept minimal: all call sites previously used `$${value.toLocaleString()}` or `$${value}`
 * so this function accepts both styles via the options.
 *
 * Prefer `formatPrice(amount, language)` for new code — it's locale-correct
 * (LT puts the symbol after the number with a space, EN keeps it before,
 * RU uses Russian conventions). `formatMoney` stays for backwards compat
 * with code that doesn't have a language in scope.
 */
export function formatMoney(amount: number, opts: { compact?: boolean } = {}): string {
  if (Number.isNaN(amount)) return '—';
  if (opts.compact) return `€${amount}`;
  return `€${amount.toLocaleString()}`;
}

// Cache Intl.NumberFormat instances per locale — constructing is surprisingly
// slow when called once per tile across hundreds of bookings.
const priceFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Locale-aware currency formatter. `formatPrice(45, 'en')` → "€45",
 * `formatPrice(1250, 'lt')` → "1 250 €", etc. Always EUR; no fractional
 * digits (barbershop pricing is whole euros).
 */
export function formatPrice(amount: number, language: Language): string {
  if (Number.isNaN(amount)) return '—';
  const locale =
    language === 'ru' ? 'ru-RU'
    : language === 'lt' ? 'lt-LT'
    : 'en-US';

  let fmt = priceFormatterCache.get(locale);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });
    priceFormatterCache.set(locale, fmt);
  }
  return fmt.format(amount);
}
