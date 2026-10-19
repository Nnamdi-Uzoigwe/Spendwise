export type TransactionType = 'income' | 'expense' | 'transfer';

export interface LedgerEntry {
  type: TransactionType;
  amountMinor: number;
  accountId: string;
  destinationAccountId: string | null;
}

/** Signed effect of one ledger entry on one account. */
export function accountBalanceEffect(entry: LedgerEntry, accountId: string): number {
  switch (entry.type) {
    case 'income':
      return entry.accountId === accountId ? entry.amountMinor : 0;
    case 'expense':
      return entry.accountId === accountId ? -entry.amountMinor : 0;
    case 'transfer': {
      let delta = 0;
      if (entry.accountId === accountId) delta -= entry.amountMinor;
      if (entry.destinationAccountId === accountId) delta += entry.amountMinor;
      return delta;
    }
  }
}

export function calculateBalance(
  openingBalanceMinor: number,
  entries: readonly LedgerEntry[],
  accountId: string,
): number {
  return entries.reduce(
    (acc, e) => acc + accountBalanceEffect(e, accountId),
    openingBalanceMinor,
  );
}