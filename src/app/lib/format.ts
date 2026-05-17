import type { Language } from '../types';

const HOUR_LABELS: Record<Language, string> = { en: 'h', ru: 'ч', lt: 'h' };
const MIN_LABELS: Record<Language, string> = { en: 'min', ru: 'мин', lt: 'min' };

/**
 * Locale-aware duration. 45 → "45 мин", 60 → "1 ч", 90 → "1 ч 30 мин".
 * Falls back to English when language is unknown.
 */
export function formatDurationLocalized(min: number, language: Language): string {
  if (min <= 0) return '—';
  const h = HOUR_LABELS[language] ?? HOUR_LABELS.en;
  const m = MIN_LABELS[language] ?? MIN_LABELS.en;
  if (min < 60) return `${min} ${m}`;
  if (min % 60 === 0) return `${min / 60} ${h}`;
  return `${Math.floor(min / 60)} ${h} ${min % 60} ${m}`;
}

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

// Cache keyed by `${locale}:${currency}` — avoids collision when currency changes.
const priceFormatterCache = new Map<string, Intl.NumberFormat>();

export type TenantCurrency = 'EUR' | 'USD' | 'GBP' | 'UZS';

/**
 * Locale-aware currency formatter. Defaults to EUR (backwards-compatible).
 * `formatPrice(45, 'en')` → "€45", `formatPrice(1250, 'lt')` → "1 250 €",
 * `formatPrice(50000, 'ru', 'UZS')` → "50 000 UZS".
 */
export function formatPrice(amount: number, language: Language, currency: TenantCurrency = 'EUR'): string {
  if (Number.isNaN(amount)) return '—';
  const locale =
    language === 'ru' ? 'ru-RU'
    : language === 'lt' ? 'lt-LT'
    : 'en-US';

  const cacheKey = `${locale}:${currency}`;
  let fmt = priceFormatterCache.get(cacheKey);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    });
    priceFormatterCache.set(cacheKey, fmt);
  }
  return fmt.format(amount);
}
