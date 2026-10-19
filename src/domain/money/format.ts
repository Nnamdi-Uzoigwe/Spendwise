import type { CurrencyMeta } from './currency';

export function formatMinor(
  minor: number,
  currency: Pick<CurrencyMeta, 'symbol' | 'minorUnits'>,
  locale = 'en-NG',
): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const str = String(abs).padStart(currency.minorUnits + 1, '0');
  const cut = str.length - currency.minorUnits;
  const whole = str.slice(0, cut);
  const frac = str.slice(cut);
  const sign = negative ? '-' : '';

  try {
    const grouped = new Intl.NumberFormat(locale, { useGrouping: true }).format(BigInt(whole));
    return currency.minorUnits === 0
      ? `${sign}${currency.symbol}${grouped}`
      : `${sign}${currency.symbol}${grouped}.${frac}`;
  } catch {
    return currency.minorUnits === 0
      ? `${sign}${currency.symbol}${whole}`
      : `${sign}${currency.symbol}${whole}.${frac}`;
  }
}