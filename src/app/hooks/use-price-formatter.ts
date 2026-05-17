import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../lib/api';
import { useLanguageStore } from '../store/language-store';
import { formatPrice, type TenantCurrency } from '../lib/format';

/**
 * Returns a stable price formatter bound to the current tenant currency and UI language.
 * Usage: `const fmt = usePriceFormatter(); fmt(45)` → "€45" / "45 €" / "45 000 UZS"
 */
export function usePriceFormatter(): (amount: number) => string {
  const language = useLanguageStore(s => s.language);
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: tenantApi.get });
  const currency = (tenant?.currency ?? 'EUR') as TenantCurrency;

  return useMemo(
    () => (amount: number) => formatPrice(amount, language, currency),
    [language, currency],
  );
}
