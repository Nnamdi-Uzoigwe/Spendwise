export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

function parseDate(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y: number, m: number): number {
  // m is 1-based; Date.UTC(y, m, 0) = last day of month m
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * The nth occurrence (0-based, n=0 = startDate).
 * Month-end rule: clamp to last valid day, anchor to startDate's day-of-month.
 * Yearly leap-year rule: Feb 29 → Feb 28 in non-leap years.
 */
export function nthOccurrence(
  startDate: string,
  frequency: RecurrenceFrequency,
  interval: number,
  n: number,
): string {
  const { y, m, d } = parseDate(startDate);

  if (frequency === 'daily' || frequency === 'weekly') {
    const addDays = frequency === 'daily' ? n * interval : n * interval * 7;
    const dt = new Date(Date.UTC(y, m - 1, d + addDays));
    return formatDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  if (frequency === 'monthly') {
    const totalMonths = y * 12 + (m - 1) + n * interval;
    const ny = Math.floor(totalMonths / 12);
    const nm = (totalMonths % 12) + 1;
    const nd = Math.min(d, daysInMonth(ny, nm));
    return formatDate(ny, nm, nd);
  }

  // yearly
  const ny = y + n * interval;
  const nd = Math.min(d, daysInMonth(ny, m));
  return formatDate(ny, m, nd);
}

/** Smallest occurrence strictly greater than `afterDate`. */
export function nextOccurrence(
  startDate: string,
  frequency: RecurrenceFrequency,
  interval: number,
  afterDate: string,
): string {
  // Fast path: startDate is already after
  if (startDate > afterDate) return startDate;

  // Approximate n, then verify — avoids huge loops
  const start = parseDate(startDate);
  const after = parseDate(afterDate);
  const startMs = Date.UTC(start.y, start.m - 1, start.d);
  const afterMs = Date.UTC(after.y, after.m - 1, after.d);
  const daysDiff = Math.floor((afterMs - startMs) / 86400000);

  let n: number;
  if (frequency === 'daily') n = Math.floor(daysDiff / interval);
  else if (frequency === 'weekly') n = Math.floor(daysDiff / 7 / interval);
  else if (frequency === 'monthly')
    n = Math.floor((after.y * 12 + after.m - (start.y * 12 + start.m)) / interval);
  else n = Math.floor((after.y - start.y) / interval);

  n = Math.max(0, n);
  while (nthOccurrence(startDate, frequency, interval, n) <= afterDate) n += 1;
  return nthOccurrence(startDate, frequency, interval, n);
}