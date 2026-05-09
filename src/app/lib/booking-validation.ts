import type { Appointment, Office, Break, DayOfWeek } from '../types';

export interface Conflict {
  appointment: Appointment;
  office: Office;
}

// Break-overlap conflict — separate shape from appointment conflicts so the
// existing API stays backwards-compatible. The booking flow calls both
// `findConflicts` and `findBreakConflicts`, then merges the results into the
// conflict-dialog's row list.
export interface BreakConflict {
  break: Break;
}

interface ConflictCandidate {
  staffId: string;
  start: Date;
  end: Date;
  excludeId?: string;
}

// Half-open interval overlap: back-to-back bookings (10:00-10:30 + 10:30-11:00) don't conflict
const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

// HH:mm string overlap — same half-open semantics as the Date overlap.
// Lex-compares because zero-padded HH:mm sorts correctly as strings.
const overlapsTimeOfDay = (
  aStart: string, aEnd: string,
  bStart: string, bEnd: string,
): boolean => aStart < bEnd && bStart < aEnd;

// Map JS getDay() (0=Sun..6=Sat) → our DayOfWeek string union.
const DOW_FROM_INDEX: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

// Finds all bookings for the same staff member that overlap with the candidate time.
// Deliberately spans all offices — a barber cannot be in two places at once.
export function findConflicts(
  candidate: ConflictCandidate,
  allBookings: Appointment[],
  offices: Office[],
): Conflict[] {
  const officeById = new Map(offices.map((o) => [o.id, o]));

  return allBookings
    .filter((booking) => {
      if (booking.id === candidate.excludeId) return false;
      if (booking.staffId !== candidate.staffId) return false;
      if (booking.status === 'cancelled') return false;

      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      return overlaps(candidate.start, candidate.end, bookingStart, bookingEnd);
    })
    .map((appointment) => {
      const office = officeById.get(appointment.locationId);
      if (!office) {
        return { appointment, office: { id: appointment.locationId, name: 'Unknown', address: '' } };
      }
      return { appointment, office };
    });
}

// Finds all breaks for the same staff that overlap the candidate time.
// Recurrence semantics:
//   - one-off:        match only if candidate's date == break.startDate
//   - weekly + range: match only if candidate's date is inside [startDate, endDate]
//                     AND day-of-week matches
//   - weekly forever: match only if day-of-week matches (current default behavior;
//                     used when recurrence is absent OR == 'weekly' with no dates)
export function findBreakConflicts(
  candidate: { staffId: string; start: Date; end: Date },
  breaks: Break[],
): BreakConflict[] {
  const dow = DOW_FROM_INDEX[candidate.start.getDay()];
  const pad = (n: number) => String(n).padStart(2, '0');
  const startHM = `${pad(candidate.start.getHours())}:${pad(candidate.start.getMinutes())}`;
  const endHM = `${pad(candidate.end.getHours())}:${pad(candidate.end.getMinutes())}`;
  const candidateYMD = `${candidate.start.getFullYear()}-${pad(candidate.start.getMonth() + 1)}-${pad(candidate.start.getDate())}`;

  return breaks
    .filter(b => b.staffId === candidate.staffId)
    .filter(b => {
      if (b.recurrence === 'one-off') return b.startDate === candidateYMD;
      if (b.startDate && candidateYMD < b.startDate) return false;
      if (b.endDate   && candidateYMD > b.endDate)   return false;
      // Schema v12 — drag-to-reschedule "Only this date" excludes the
      // candidate from a recurring break. The replacement one-off Break is
      // a separate row that carries the new time range.
      if (b.exceptionDates?.includes(candidateYMD)) return false;
      return b.dayOfWeek === dow;
    })
    .filter(b => overlapsTimeOfDay(startHM, endHM, b.startTime, b.endTime))
    .map(b => ({ break: b }));
}
