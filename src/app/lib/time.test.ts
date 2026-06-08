import { describe, it, expect, afterEach } from 'vitest';
import { formatTime, formatHourLabel, getHoursInTz, getMinutesInTz, setDisplayTimezone, getWallDateInTz, getWallTimeInTz, wallTimeToUtc } from './time';

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

describe('display timezone (module default)', () => {
  // Always clear the module state so the runtime-local tests above and below
  // are never affected by a leaked default.
  afterEach(() => setDisplayTimezone(undefined));

  // 11:00 UTC on 8 Jun 2026 is 14:00 in Vilnius (UTC+3 in summer). This is the
  // exact bug from the report: a booking made for 14:00 must read 14:00 here.
  const utc1100 = '2026-06-08T11:00:00.000Z';

  it('formats in the configured shop timezone, not the runtime zone', () => {
    setDisplayTimezone('Europe/Vilnius');
    expect(formatTime(utc1100, '24h')).toBe('14:00');
    expect(formatTime(utc1100, '12h')).toBe('2:00 PM');
  });

  it('drives getHoursInTz / getMinutesInTz used for grid positioning', () => {
    setDisplayTimezone('Europe/Vilnius');
    expect(getHoursInTz(new Date(utc1100))).toBe(14);
    expect(getMinutesInTz(new Date(utc1100))).toBe(0);
  });

  it('lets an explicit tz argument win over the module default', () => {
    setDisplayTimezone('Europe/Vilnius');
    // 11:00 UTC is 07:00 in New York (EDT, UTC-4) in June.
    expect(formatTime(utc1100, '24h', 'America/New_York')).toBe('07:00');
    expect(getHoursInTz(new Date(utc1100), 'America/New_York')).toBe(7);
  });
});

describe('wall-time helpers (form round-trip)', () => {
  afterEach(() => setDisplayTimezone(undefined));
  // 11:00 UTC on 8 Jun 2026 = 14:00 Europe/Vilnius. The edit form must read it
  // as 14:00 and save it back to the exact same instant.
  const utc1100 = '2026-06-08T11:00:00.000Z';

  it('reads shop wall date/time from an instant', () => {
    setDisplayTimezone('Europe/Vilnius');
    expect(getWallDateInTz(new Date(utc1100))).toBe('2026-06-08');
    expect(getWallTimeInTz(new Date(utc1100))).toBe('14:00');
  });

  it('round-trips wall time back to the exact same UTC instant', () => {
    setDisplayTimezone('Europe/Vilnius');
    expect(wallTimeToUtc('2026-06-08', '14:00').toISOString()).toBe(utc1100);
  });

  it('falls back to runtime-local when no shop zone is set', () => {
    const back = wallTimeToUtc('2026-06-08', '14:00');
    expect(back.getFullYear()).toBe(2026);
    expect(back.getHours()).toBe(14); // local wall time
  });
});
