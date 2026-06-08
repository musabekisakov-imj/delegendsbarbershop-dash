import { describe, it, expect } from 'vitest';
import { getPaymentStatus } from './payment';

describe('getPaymentStatus', () => {
  it('reads the real backend flag — a confirmed online-paid booking is paid', () => {
    // The reported bug: status 'confirmed' (not 'completed') but paid online.
    expect(getPaymentStatus({ status: 'confirmed', paymentStatus: 'paid' })).toBe('paid');
  });

  it('treats pay-at-shop and unpaid as not paid (money not collected yet)', () => {
    expect(getPaymentStatus({ status: 'confirmed', paymentStatus: 'pay_at_shop' })).toBe('unpaid');
    expect(getPaymentStatus({ status: 'scheduled', paymentStatus: 'unpaid' })).toBe('unpaid');
  });

  it('maps a refund to voided', () => {
    expect(getPaymentStatus({ status: 'confirmed', paymentStatus: 'refunded' })).toBe('voided');
  });

  it('a cancelled booking always reads voided, regardless of payment', () => {
    expect(getPaymentStatus({ status: 'cancelled', paymentStatus: 'paid' })).toBe('voided');
    expect(getPaymentStatus({ status: 'cancelled' })).toBe('voided');
  });

  it('falls back to status for legacy rows with no paymentStatus', () => {
    expect(getPaymentStatus({ status: 'completed' })).toBe('paid');
    expect(getPaymentStatus({ status: 'scheduled' })).toBe('unpaid');
    expect(getPaymentStatus({ status: 'confirmed' })).toBe('unpaid');
  });
});
