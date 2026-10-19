import { nthOccurrence, nextOccurrence } from '../recurrence';

describe('nthOccurrence', () => {
  it('daily adds N days', () => {
    expect(nthOccurrence('2025-03-15', 'daily', 1, 3)).toBe('2025-03-18');
  });
  it('weekly adds N weeks', () => {
    expect(nthOccurrence('2025-03-15', 'weekly', 1, 2)).toBe('2025-03-29');
  });
  it('weekly across month boundary', () => {
    expect(nthOccurrence('2025-03-29', 'weekly', 1, 1)).toBe('2025-04-05');
  });
  it('monthly from the 15th stays on the 15th', () => {
    expect(nthOccurrence('2025-01-15', 'monthly', 1, 1)).toBe('2025-02-15');
    expect(nthOccurrence('2025-01-15', 'monthly', 1, 11)).toBe('2025-12-15');
  });
  it('monthly from the 31st clamps to last day (Jan→Feb→Mar→Apr)', () => {
    expect(nthOccurrence('2025-01-31', 'monthly', 1, 1)).toBe('2025-02-28');
    expect(nthOccurrence('2025-01-31', 'monthly', 1, 2)).toBe('2025-03-31');
    expect(nthOccurrence('2025-01-31', 'monthly', 1, 3)).toBe('2025-04-30');
    expect(nthOccurrence('2025-01-31', 'monthly', 1, 4)).toBe('2025-05-31');
  });
  it('monthly crosses year boundary', () => {
    expect(nthOccurrence('2025-11-15', 'monthly', 1, 2)).toBe('2026-01-15');
  });
  it('monthly leap year Feb 29', () => {
    expect(nthOccurrence('2024-01-31', 'monthly', 1, 1)).toBe('2024-02-29');
  });
  it('yearly from Feb 29 clamps to Feb 28 in non-leap years', () => {
    expect(nthOccurrence('2024-02-29', 'yearly', 1, 1)).toBe('2025-02-28');
    expect(nthOccurrence('2024-02-29', 'yearly', 1, 4)).toBe('2028-02-29');
  });
  it('every 3 months from Jan 31', () => {
    expect(nthOccurrence('2025-01-31', 'monthly', 3, 1)).toBe('2025-04-30');
    expect(nthOccurrence('2025-01-31', 'monthly', 3, 2)).toBe('2025-07-31');
  });
});

describe('nextOccurrence', () => {
  it('returns startDate when startDate is in the future', () => {
    expect(nextOccurrence('2025-12-01', 'monthly', 1, '2025-10-01')).toBe('2025-12-01');
  });
  it('returns the smallest occurrence strictly greater than afterDate', () => {
    expect(nextOccurrence('2025-01-15', 'monthly', 1, '2025-01-15')).toBe('2025-02-15');
    expect(nextOccurrence('2025-01-15', 'monthly', 1, '2025-01-16')).toBe('2025-02-15');
    expect(nextOccurrence('2025-01-15', 'monthly', 1, '2025-02-15')).toBe('2025-03-15');
  });
  it('handles missed occurrences (skips past)', () => {
    expect(nextOccurrence('2025-01-01', 'monthly', 1, '2025-06-15')).toBe('2025-07-01');
  });
  it('daily always strictly advances', () => {
    expect(nextOccurrence('2025-01-01', 'daily', 1, '2025-01-01')).toBe('2025-01-02');
  });
});