import type { Appointment } from '../types';

export type PaymentState = 'paid' | 'unpaid' | 'voided';

/**
 * Resolve the payment badge for an appointment.
 *
 * The backend's real `paymentStatus` is the source of truth. Legacy and
 * localStorage rows predate payment tracking, so we fall back to inferring
 * from the appointment `status` there. A cancelled booking always reads as
 * voided, matching the prior dashboard behavior.
 *
 * Note: `pay_at_shop` and `unpaid` both land on 'unpaid' — money hasn't been
 * collected yet, so the staff badge should say "Not paid".
 */
export function getPaymentStatus(
  apt: Pick<Appointment, 'paymentStatus' | 'status'>,
): PaymentState {
  if (apt.status === 'cancelled') return 'voided';
  if (apt.paymentStatus === 'paid') return 'paid';
  if (apt.paymentStatus === 'refunded') return 'voided';
  if (apt.status === 'completed') return 'paid';
  return 'unpaid';
}
