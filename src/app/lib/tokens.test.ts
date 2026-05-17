import { describe, it, expect } from 'vitest';
import { getCategoryColor, colorForCategoryFallback, CATEGORY_COLOR_PALETTE } from './tokens';
import type { CategoryColorKey } from '../types';

const COLOR_KEYS = Object.keys(CATEGORY_COLOR_PALETTE) as CategoryColorKey[];

describe('getCategoryColor', () => {
  it('returns palette entry for every valid key', () => {
    for (const key of COLOR_KEYS) {
      const entry = getCategoryColor(key);
      expect(entry).toBeDefined();
      expect(entry.dot).toBeTruthy();
      expect(entry.tintBg).toBeTruthy();
      expect(entry.tintText).toBeTruthy();
      expect(entry.ring).toBeTruthy();
    }
  });
});

describe('colorForCategoryFallback', () => {
  it('returns a valid palette key', () => {
    const key = colorForCategoryFallback('some-id');
    expect(COLOR_KEYS).toContain(key);
  });

  it('is deterministic — same id always returns same key', () => {
    const a = colorForCategoryFallback('cat-abc');
    const b = colorForCategoryFallback('cat-abc');
    expect(a).toBe(b);
  });

  it('different ids produce different keys', () => {
    const results = new Set(
      ['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9', 'id-10']
        .map(colorForCategoryFallback),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('empty string returns a valid key', () => {
    const key = colorForCategoryFallback('');
    expect(COLOR_KEYS).toContain(key);
  });
});
