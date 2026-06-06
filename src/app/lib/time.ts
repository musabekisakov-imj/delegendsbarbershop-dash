export type TimeFormat = '12h' | '24h';

// Default to the runtime's local timezone. Callers that need a specific office
// timezone must pass it explicitly.
export function formatTime(
  input: Date | string,
  fmt: TimeFormat,
  tz?: string,
): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-US', {
    ...(tz ? { timeZone: tz } : {}),
    hour: 'numeric',
    minute: '2-digit',
    hour12: fmt === '12h',
  }).format(d);
}

export function getHoursInTz(d: Date, tz?: string): number {
  if (!tz) return d.getHours();
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(d), 10);
}

export function getMinutesInTz(d: Date, tz?: string): number {
  if (!tz) return d.getMinutes();
  return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, minute: 'numeric' }).format(d), 10);
}

export function formatHourLabel(hour: number, fmt: TimeFormat): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}
