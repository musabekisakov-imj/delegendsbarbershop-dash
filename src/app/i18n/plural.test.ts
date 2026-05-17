import { describe, it, expect } from 'vitest';
import { pluralKey } from './plural';

describe('pluralKey — Russian', () => {
  it('1 → one', () => expect(pluralKey(1, 'ru')).toBe('one'));
  it('2 → few', () => expect(pluralKey(2, 'ru')).toBe('few'));
  it('5 → many', () => expect(pluralKey(5, 'ru')).toBe('many'));
  it('11 → many', () => expect(pluralKey(11, 'ru')).toBe('many'));
  it('21 → one', () => expect(pluralKey(21, 'ru')).toBe('one'));
  it('22 → few', () => expect(pluralKey(22, 'ru')).toBe('few'));
  it('0 → many', () => expect(pluralKey(0, 'ru')).toBe('many'));
});

describe('pluralKey — Lithuanian', () => {
  it('1 → one', () => expect(pluralKey(1, 'lt')).toBe('one'));
  it('2 → few', () => expect(pluralKey(2, 'lt')).toBe('few'));
  it('10 → other', () => expect(pluralKey(10, 'lt')).toBe('other'));
  it('11 → other', () => expect(pluralKey(11, 'lt')).toBe('other'));
});

describe('pluralKey — English', () => {
  it('1 → one', () => expect(pluralKey(1, 'en')).toBe('one'));
  it('2 → other', () => expect(pluralKey(2, 'en')).toBe('other'));
  it('5 → other', () => expect(pluralKey(5, 'en')).toBe('other'));
});
