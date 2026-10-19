export interface CurrencyMeta {
  readonly code: string;
  readonly symbol: string;
  readonly minorUnits: number; // number of decimal places
}

export const CURRENCIES = {
  NGN: { code: 'NGN', symbol: '₦', minorUnits: 2 },
  USD: { code: 'USD', symbol: '$', minorUnits: 2 },
  EUR: { code: 'EUR', symbol: '€', minorUnits: 2 },
  GBP: { code: 'GBP', symbol: '£', minorUnits: 2 },
  GHS: { code: 'GHS', symbol: '₵', minorUnits: 2 },
  KES: { code: 'KES', symbol: 'KSh', minorUnits: 2 },
  JPY: { code: 'JPY', symbol: '¥', minorUnits: 0 },
  KWD: { code: 'KWD', symbol: 'KD', minorUnits: 3 },
} as const satisfies Record<string, CurrencyMeta>;

export type CurrencyCode = keyof typeof CURRENCIES;

export function getCurrency(code: string): CurrencyMeta | null {
  return (CURRENCIES as Record<string, CurrencyMeta>)[code] ?? null;
}