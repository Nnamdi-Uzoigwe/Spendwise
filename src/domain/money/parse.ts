export type ParseResult =
  | { ok: true; minor: number }
  | { ok: false; error: 'empty' | 'invalid_format' | 'negative' | 'too_many_decimals' };

const AMOUNT_RE = /^\d+(?:[.,]\d+)?$/;

export function parseAmountToMinor(input: string, minorUnits: number): ParseResult {
  const trimmed = input.trim().replace(/\s+/g, '');

  if (trimmed.length === 0) return { ok: false, error: 'empty' };
  if (trimmed.startsWith('-')) return { ok: false, error: 'negative' };
  if (!AMOUNT_RE.test(trimmed)) return { ok: false, error: 'invalid_format' };
  if (trimmed.includes('.') && trimmed.includes(',')) return { ok: false, error: 'invalid_format' };

  const sep = trimmed.includes('.') ? '.' : trimmed.includes(',') ? ',' : null;
  const [whole = '0', frac = ''] = sep ? trimmed.split(sep) : [trimmed, ''];

  if (frac.length > minorUnits) return { ok: false, error: 'too_many_decimals' };

  const padded = frac.padEnd(minorUnits, '0');
  const cleaned = whole.replace(/^0+(?=\d)/, '') || '0';
  const minor = Number(`${cleaned}${padded}`);

  if (!Number.isSafeInteger(minor)) return { ok: false, error: 'invalid_format' };
  return { ok: true, minor };
}