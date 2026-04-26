// Lithuanian / EU-specific formatting helpers.
// Used across Hero, Footer, Locations, Confirmation — single source of truth.

/**
 * Format a phone number for display in the Lithuanian convention.
 * `+370 600 00 001` (3 + 2 + 3 grouping after the +370 prefix).
 *
 * Accepts any input shape — strips non-digits, then re-groups.
 * Falls through unchanged if the input doesn't match `+370` Lithuanian shape.
 */
export function formatLtPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  // Lithuanian numbers are +370 followed by 8 digits — 11 total.
  if (digits.startsWith('370') && digits.length === 11) {
    const a = digits.slice(3, 6);
    const b = digits.slice(6, 8);
    const c = digits.slice(8);
    return `+370 ${a} ${b} ${c}`;
  }
  return raw;
}

/**
 * `tel:` URL — strip everything except + and digits.
 * Browsers/iOS dial it correctly with the spaces stripped.
 */
export function telHref(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : undefined;
}

/**
 * Google Maps search URL for an address.
 * Universal Lithuanian salon-site convention — every address link opens Maps.
 */
export function mapsHref(address?: string | null): string | undefined {
  if (!address) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
