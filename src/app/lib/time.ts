import { format, parseISO } from 'date-fns';

export type TimeFormat = '12h' | '24h';

export function formatTime(input: Date | string, fmt: TimeFormat): string {
  const d = typeof input === 'string' ? parseISO(input) : input;
  return format(d, fmt === '12h' ? 'h:mm a' : 'HH:mm');
}

export function formatHourLabel(hour: number, fmt: TimeFormat): string {
  if (fmt === '24h') return `${String(hour).padStart(2, '0')}:00`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}
