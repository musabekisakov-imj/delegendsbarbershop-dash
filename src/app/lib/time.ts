export type TimeFormat = '12h' | '24h';

// The whole dashboard renders in the shop's timezone, not the viewer's. A
// manager checking the calendar from abroad still sees shop-local times. The
// app sets this once from the tenant/office on load (see App.tsx). Until then,
// and in tests, an unset value keeps the old runtime-local behavior. An
// explicit `tz` argument always wins over this default.
let displayTz: string | undefined;

export function setDisplayTimezone(tz?: string): void {
  displayTz = tz || undefined;
}

export function getDisplayTimezone(): string | undefined {
  return displayTz;
}

export function formatTime(
  input: Date | string,
  fmt: TimeFormat,
  tz?: string,
): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const zone = tz ?? displayTz;
  return new Intl.DateTimeFormat('en-US', {
    ...(zone ? { timeZone: zone } : {}),
    hour: 'numeric',
    minute: '2-digit',
    hour12: fmt === '12h',
  }).format(d);
}

export function getHoursInTz(d: Date, tz?: string): number {
  const zone = tz ?? displayTz;
  if (!zone) return d.getHours();
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).format(d), 10);
}

export function getMinutesInTz(d: Date, tz?: string): number {
  const zone = tz ?? displayTz;
  if (!zone) return d.getMinutes();
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: zone, minute: 'numeric' }).format(d), 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Wall-clock date (YYYY-MM-DD) of an instant in the display/shop timezone.
// Used to seed date inputs so an edit form reads the same day the calendar shows.
export function getWallDateInTz(d: Date, tz?: string): string {
  const zone = tz ?? displayTz;
  if (!zone) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  // en-CA renders as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// Wall-clock time (HH:mm, 24h) of an instant in the display/shop timezone.
export function getWallTimeInTz(d: Date, tz?: string): string {
  return `${pad2(getHoursInTz(d, tz))}:${pad2(getMinutesInTz(d, tz))}`;
}

// Offset (ms) of `zone` from UTC at the given instant. Positive east of UTC.
function tzOffsetMs(at: Date, zone: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const asWall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asWall - at.getTime();
}

// Build the UTC instant whose wall-clock time in `tz` equals dateStr + timeStr.
// This is the inverse of getWallDateInTz/getWallTimeInTz, so a form can read a
// booking in shop time, let the operator edit, and save the right instant back.
// dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm'. Falls back to runtime-local when no
// zone is set (preserves prior behavior and keeps tests stable).
export function wallTimeToUtc(dateStr: string, timeStr: string, tz?: string): Date {
  const zone = tz ?? displayTz;
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!zone) return new Date(y, m - 1, d, hh, mm, 0, 0);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  // Correct by the zone's offset at that instant — exact outside the rare
  // one-minute DST gap, which never coincides with a salon booking slot.
  return new Date(guess - tzOffsetMs(new Date(guess), zone));
}

export function formatHourLabel(hour: number, fmt: TimeFormat): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}
