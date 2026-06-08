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

export function formatHourLabel(hour: number, fmt: TimeFormat): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}
