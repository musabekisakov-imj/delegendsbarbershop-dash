import { describe, it, expect } from 'vitest';
import { formatTime, formatHourLabel } from './time';

describe('formatTime', () => {
  it('formats 24h with leading zero on the hour', () => {
    const d = new Date(2026, 4, 5, 9, 0);
    expect(formatTime(d, '24h')).toBe('09:00');
  });

  it('formats 24h with leading zero on the minute', () => {
    const d = new Date(2026, 4, 5, 13, 5);
    expect(formatTime(d, '24h')).toBe('13:05');
  });

  it('formats 12h with AM suffix before noon', () => {
    const d = new Date(2026, 4, 5, 9, 30);
    expect(formatTime(d, '12h')).toBe('9:30 AM');
  });

  it('formats 12h with PM suffix after noon', () => {
    const d = new Date(2026, 4, 5, 14, 30);
    expect(formatTime(d, '12h')).toBe('2:30 PM');
  });

  it('renders 12 PM (noon) correctly — not 0 PM, not 12 AM', () => {
    const d = new Date(2026, 4, 5, 12, 0);
    expect(formatTime(d, '12h')).toBe('12:00 PM');
  });

  it('renders 12 AM (midnight) correctly — not 0 AM, not 12 PM', () => {
    const d = new Date(2026, 4, 5, 0, 0);
    expect(formatTime(d, '12h')).toBe('12:00 AM');
  });

  it('accepts ISO strings, not just Date objects', () => {
    expect(formatTime('2026-05-05T14:30:00.000Z', '24h')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('formatHourLabel', () => {
  it('formats 24h hours with :00 suffix and leading zero', () => {
    expect(formatHourLabel(9, '24h')).toBe('09:00');
    expect(formatHourLabel(13, '24h')).toBe('13:00');
    expect(formatHourLabel(0, '24h')).toBe('00:00');
  });

  it('formats 12h hours with AM suffix in the morning', () => {
    expect(formatHourLabel(9, '12h')).toBe('9 AM');
  });

  it('formats 12h hours with PM suffix in the afternoon', () => {
    expect(formatHourLabel(14, '12h')).toBe('2 PM');
    expect(formatHourLabel(18, '12h')).toBe('6 PM');
  });

  it('handles noon and midnight edge cases (1-12 not 0)', () => {
    // Hour 0 = midnight = 12 AM (not 0 AM)
    expect(formatHourLabel(0, '12h')).toBe('12 AM');
    // Hour 12 = noon = 12 PM (not 0 PM)
    expect(formatHourLabel(12, '12h')).toBe('12 PM');
  });

  it('does not include minutes — only the hour label', () => {
    // Hour granularity, used for time-axis labels in calendar grid
    expect(formatHourLabel(15, '24h')).not.toContain(':30');
    expect(formatHourLabel(15, '12h')).toBe('3 PM');
  });
});
