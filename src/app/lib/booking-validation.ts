import type { Appointment, Office } from '../types';

export interface Conflict {
  appointment: Appointment;
  office: Office;
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
