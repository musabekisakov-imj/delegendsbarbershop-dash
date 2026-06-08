import { describe, it, expect } from 'vitest';
import { aptTotal } from './overview';

// The live backend serializes money as numeric strings ("18.00") and leaves
// `totalPrice` null on single-service bookings. These cases lock in that summing
// over aptTotal() yields real numbers, never the "€NaN" the raw strings caused.
describe('aptTotal', () => {
  it('coerces a string totalPrice (multi-service booking)', () => {
    expect(aptTotal({ totalPrice: '67.00' })).toBe(67);
  });

  it('falls back to a string service.price when totalPrice is null', () => {
    expect(aptTotal({ totalPrice: null, service: { price: '18.00' } })).toBe(18);
  });

  it('falls back to service.price when totalPrice is undefined', () => {
    expect(aptTotal({ service: { price: '22.50' } })).toBe(22.5);
  });

  it('accepts numeric fields unchanged', () => {
    expect(aptTotal({ totalPrice: 50 })).toBe(50);
    expect(aptTotal({ service: { price: 30 } })).toBe(30);
  });

  it('returns 0 when nothing is set', () => {
    expect(aptTotal({})).toBe(0);
  });

  it('keeps a zero-price booking at 0 (not the fallback)', () => {
    expect(aptTotal({ totalPrice: 0, service: { price: '18.00' } })).toBe(0);
  });

  it('reduces a mixed list to a real number, not NaN', () => {
    const list = [
      { totalPrice: null, service: { price: '18.00' } },
      { totalPrice: '22.00' },
      { service: { price: 16 } },
    ];
    const sum = list.reduce((s, a) => s + aptTotal(a), 0);
    expect(sum).toBe(56);
    expect(Number.isNaN(sum)).toBe(false);
  });
});
