import { parseISO } from 'date-fns';
import { overlaps } from './booking-validation';
import type { AppointmentWithDetails, WorkingHoursDay } from '../types';
import type { TranslationKey } from '../i18n';

export type WarningSeverity = 'low' | 'medium' | 'high';

export type WarningCode =
  | 'time_conflict'
  | 'break_overlap'
  | 'outside_hours'
  | 'unconfirmed_soon'
  | 'break_touch'
  | 'no_buffer';

export interface AppointmentWarning {
  severity: WarningSeverity;
  code: WarningCode;
  message: string;
}

export interface BreakSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface WarningContext {
  peerAppointments: AppointmentWithDetails[];
  staffBreaks: BreakSlot[];
  workingHours?: Pick<WorkingHoursDay, 'isOpen' | 'openTime' | 'closeTime'>;
  bufferMinutes?: number;
  now: Date;
  t: (key: TranslationKey) => string;
}

function toMins(hhmm: string | undefined): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function aptToMins(isoStr: string): number {
  const d = parseISO(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

export function getAppointmentWarning(
  apt: AppointmentWithDetails,
  ctx: WarningContext,
): AppointmentWarning | null {
  if (apt.status === 'cancelled' || apt.status === 'completed') return null;

  const aptStart = parseISO(apt.startTime);
  const aptEnd = parseISO(apt.endTime);
  const selfDuration = (aptEnd.getTime() - aptStart.getTime()) / 60_000;

  // Rule 1 — time_conflict (high): overlaps another appointment for the same staff
  for (const peer of ctx.peerAppointments) {
    if (peer.id === apt.id) continue;
    if (peer.staffId !== apt.staffId) continue;
    if (peer.status === 'cancelled' || peer.status === 'completed') continue;
    if (overlaps(aptStart, aptEnd, parseISO(peer.startTime), parseISO(peer.endTime))) {
      const clientName = peer.client?.firstName
        ? `${peer.client.firstName} ${peer.client.lastName ?? ''}`.trim()
        : '—';
      return {
        severity: 'high',
        code: 'time_conflict',
        message: ctx.t('warning.timeConflict').replace('{client}', clientName),
      };
    }
  }

  // Rule 2 — break_overlap (high): overlaps a break by >50% of self-duration
  const aptStartMins = aptToMins(apt.startTime);
  const aptEndMins = aptToMins(apt.endTime);

  for (const brk of ctx.staffBreaks) {
    const brkStart = toMins(brk.startTime);
    const brkEnd = toMins(brk.endTime);
    const overlapMins = Math.max(0, Math.min(aptEndMins, brkEnd) - Math.max(aptStartMins, brkStart));
    if (overlapMins > selfDuration / 2) {
      return {
        severity: 'high',
        code: 'break_overlap',
        message: ctx.t('warning.breakOverlap')
          .replace('{start}', brk.startTime)
          .replace('{end}', brk.endTime),
      };
    }
  }

  // Rule 3 — outside_hours (medium)
  if (ctx.workingHours) {
    const wh = ctx.workingHours;
    if (!wh.isOpen) {
      return { severity: 'medium', code: 'outside_hours', message: ctx.t('warning.outsideClosed') };
    }
    // Guard: old localStorage schema may have isOpen without time strings.
    if (!wh.openTime || !wh.closeTime) return null;
    const openMins = toMins(wh.openTime);
    const closeMins = toMins(wh.closeTime);
    if (aptStartMins < openMins || aptEndMins > closeMins) {
      return {
        severity: 'medium',
        code: 'outside_hours',
        message: ctx.t('warning.outsideHours')
          .replace('{open}', wh.openTime)
          .replace('{close}', wh.closeTime),
      };
    }
  }

  // Rule 4 — unconfirmed_soon (medium): status=scheduled AND starts within 2h
  if (apt.status === 'scheduled') {
    const minsUntil = (aptStart.getTime() - ctx.now.getTime()) / 60_000;
    if (minsUntil >= 0 && minsUntil <= 120) {
      return {
        severity: 'medium',
        code: 'unconfirmed_soon',
        message: ctx.t('warning.unconfirmedSoon').replace('{minutes}', String(Math.round(minsUntil))),
      };
    }
  }

  // Rule 5 — break_touch (low): any overlap ≤50% OR back-to-back with a break
  for (const brk of ctx.staffBreaks) {
    const brkStart = toMins(brk.startTime);
    const brkEnd = toMins(brk.endTime);
    const overlapMins = Math.max(0, Math.min(aptEndMins, brkEnd) - Math.max(aptStartMins, brkStart));
    const backToBack = aptEndMins === brkStart || brkEnd === aptStartMins;
    if (overlapMins > 0 || backToBack) {
      return {
        severity: 'low',
        code: 'break_touch',
        message: ctx.t('warning.breakTouch')
          .replace('{start}', brk.startTime)
          .replace('{end}', brk.endTime),
      };
    }
  }

  // Rule 6 — no_buffer (low): gap to a peer is less than bufferMinutes
  const buf = ctx.bufferMinutes ?? 0;
  if (buf > 0) {
    for (const peer of ctx.peerAppointments) {
      if (peer.id === apt.id) continue;
      if (peer.staffId !== apt.staffId) continue;
      if (peer.status === 'cancelled' || peer.status === 'completed') continue;
      const peerStart = parseISO(peer.startTime);
      const peerEnd = parseISO(peer.endTime);
      // Skip if already overlapping (caught by rule 1)
      if (overlaps(aptStart, aptEnd, peerStart, peerEnd)) continue;
      const gapMs = Math.min(
        Math.abs(aptStart.getTime() - peerEnd.getTime()),
        Math.abs(peerStart.getTime() - aptEnd.getTime()),
      );
      const gapMins = gapMs / 60_000;
      if (gapMins < buf) {
        return {
          severity: 'low',
          code: 'no_buffer',
          message: ctx.t('warning.noBuffer').replace('{minutes}', String(buf)),
        };
      }
    }
  }

  return null;
}
