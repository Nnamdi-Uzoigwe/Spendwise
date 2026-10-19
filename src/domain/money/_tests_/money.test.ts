import { CURRENCIES } from '../currency';
import { formatMinor } from '../format';
import { parseAmountToMinor } from '../parse';

describe('parseAmountToMinor', () => {
  it('parses plain decimals', () => {
    expect(parseAmountToMinor('1250.50', 2)).toEqual({ ok: true, minor: 125050 });
  });
  it('parses integers', () => {
    expect(parseAmountToMinor('1250', 2)).toEqual({ ok: true, minor: 125000 });
  });
  it('pads short fractions', () => {
    expect(parseAmountToMinor('1250.5', 2)).toEqual({ ok: true, minor: 125050 });
  });
  it('accepts comma as decimal separator', () => {
    expect(parseAmountToMinor('1250,5', 2)).toEqual({ ok: true, minor: 125050 });
  });
  it('rejects excess precision instead of rounding', () => {
    expect(parseAmountToMinor('1.239', 2)).toEqual({ ok: false, error: 'too_many_decimals' });
  });
  it('rejects empty', () => {
    expect(parseAmountToMinor('   ', 2)).toEqual({ ok: false, error: 'empty' });
  });
  it('rejects negative input', () => {
    expect(parseAmountToMinor('-5', 2)).toEqual({ ok: false, error: 'negative' });
  });
  it('rejects mixed separators', () => {
    expect(parseAmountToMinor('1.250,50', 2)).toEqual({ ok: false, error: 'invalid_format' });
  });
  it('respects 0-decimal currencies (JPY)', () => {
    expect(parseAmountToMinor('100', 0)).toEqual({ ok: true, minor: 100 });
    expect(parseAmountToMinor('100.5', 0)).toEqual({ ok: false, error: 'too_many_decimals' });
  });
  it('respects 3-decimal currencies (KWD)', () => {
    expect(parseAmountToMinor('1.234', 3)).toEqual({ ok: true, minor: 1234 });
  });
});

describe('formatMinor', () => {
  it('groups thousands and appends decimals', () => {
    expect(formatMinor(125050, CURRENCIES.NGN)).toBe('₦1,250.50');
  });
  it('formats negatives with a leading minus', () => {
    expect(formatMinor(-2500, CURRENCIES.USD)).toBe('-$25.00');
  });
  it('formats 0-decimal currencies with no dot', () => {
    expect(formatMinor(1000, CURRENCIES.JPY)).toBe('¥1,000');
  });
  it('formats 3-decimal currencies', () => {
    expect(formatMinor(1234, CURRENCIES.KWD)).toBe('KD1.234');
  });
  it('formats zero', () => {
    expect(formatMinor(0, CURRENCIES.NGN)).toBe('₦0.00');
  });
});