import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('EUR en — symbol before number', () => {
    const result = formatPrice(45, 'en', 'EUR');
    expect(result).toContain('45');
    expect(result).toContain('€');
  });

  it('EUR lt — contains symbol and amount', () => {
    const result = formatPrice(45, 'lt', 'EUR');
    expect(result).toContain('45');
    expect(result).toContain('€');
  });

  it('EUR ru — contains symbol and amount', () => {
    const result = formatPrice(45, 'ru', 'EUR');
    expect(result).toContain('45');
    expect(result).toContain('€');
  });

  it('EUR uses 2 decimal places', () => {
    const result = formatPrice(45.5, 'en', 'EUR');
    expect(result).toContain('45.50');
  });

  it('USD en — contains amount', () => {
    const result = formatPrice(100, 'en', 'USD');
    expect(result).toContain('100');
    expect(result).toMatch(/\$|USD/);
  });

  it('GBP en — contains amount', () => {
    const result = formatPrice(80, 'en', 'GBP');
    expect(result).toContain('80');
    expect(result).toMatch(/£|GBP/);
  });

  it('UZS ru — no decimal point', () => {
    const result = formatPrice(50000, 'ru', 'UZS');
    expect(result).toContain('50');
    expect(result).not.toContain('.');
  });

  it('UZS en — no decimal point', () => {
    const result = formatPrice(50000, 'en', 'UZS');
    expect(result).not.toContain('.');
  });

  it('defaults to EUR when currency omitted', () => {
    const result = formatPrice(10, 'en');
    expect(result).toContain('€');
  });

  it('NaN returns em dash', () => {
    expect(formatPrice(NaN, 'en')).toBe('—');
  });
});
