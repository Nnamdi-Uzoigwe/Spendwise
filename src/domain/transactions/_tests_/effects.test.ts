import { accountBalanceEffect, calculateBalance, type LedgerEntry } from '../effects';

const A = 'acc_A';
const B = 'acc_B';

const income = (n: number): LedgerEntry => ({
  type: 'income', amountMinor: n, accountId: A, destinationAccountId: null,
});
const expense = (n: number): LedgerEntry => ({
  type: 'expense', amountMinor: n, accountId: A, destinationAccountId: null,
});
const transfer = (n: number): LedgerEntry => ({
  type: 'transfer', amountMinor: n, accountId: A, destinationAccountId: B,
});

describe('accountBalanceEffect', () => {
  it('income credits the account', () => {
    expect(accountBalanceEffect(income(500), A)).toBe(500);
    expect(accountBalanceEffect(income(500), B)).toBe(0);
  });
  it('expense debits the account', () => {
    expect(accountBalanceEffect(expense(500), A)).toBe(-500);
  });
  it('transfer debits source and credits destination', () => {
    expect(accountBalanceEffect(transfer(300), A)).toBe(-300);
    expect(accountBalanceEffect(transfer(300), B)).toBe(300);
  });
});

describe('calculateBalance', () => {
  it('recomputes from opening + entries', () => {
    expect(calculateBalance(10000, [income(5000), expense(2000)], A)).toBe(13000);
  });
  it('reflects an edit (no stale value)', () => {
    expect(calculateBalance(10000, [expense(2000)], A)).toBe(8000);
    expect(calculateBalance(10000, [expense(3000)], A)).toBe(7000);
  });
  it('a transfer leaves the combined balance unchanged', () => {
    const entries = [transfer(2500)];
    expect(calculateBalance(0, entries, A) + calculateBalance(0, entries, B)).toBe(0);
  });
});