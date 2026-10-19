import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/db';

export type AccountType = 'cash' | 'savings' | 'checking' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  openingBalanceMinor: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  currencyCode: string;
  openingBalanceMinor?: number;
}

interface Row {
  id: string;
  name: string;
  type: AccountType;
  currency_code: string;
  opening_balance_minor: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

const mapRow = (r: Row): Account => ({
  id: r.id,
  name: r.name,
  type: r.type,
  currencyCode: r.currency_code,
  openingBalanceMinor: r.opening_balance_minor,
  isArchived: r.is_archived === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const account: Account = {
    id: Crypto.randomUUID(),
    name: input.name.trim(),
    type: input.type,
    currencyCode: input.currencyCode,
    openingBalanceMinor: input.openingBalanceMinor ?? 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO accounts
       (id, name, type, currency_code, opening_balance_minor, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    account.id,
    account.name,
    account.type,
    account.currencyCode,
    account.openingBalanceMinor,
    account.createdAt,
    account.updatedAt,
  );

  return account;
}

export async function listAccounts(): Promise<Account[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, name, type, currency_code, opening_balance_minor, is_archived, created_at, updated_at
     FROM accounts
     WHERE is_archived = 0
     ORDER BY name COLLATE NOCASE ASC`,
  );
  return rows.map(mapRow);
}

export interface AccountBalance {
  accountId: string;
  name: string;
  currencyCode: string;
  balanceMinor: number;
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    account_id: string;
    name: string;
    currency_code: string;
    balance_minor: number;
  }>(
    `SELECT account_id, name, currency_code, balance_minor
     FROM v_account_balances
     WHERE is_archived = 0
     ORDER BY name COLLATE NOCASE ASC`,
  );
  return rows.map((r) => ({
    accountId: r.account_id,
    name: r.name,
    currencyCode: r.currency_code,
    balanceMinor: r.balance_minor,
  }));
}

export async function getTotalBalance(currencyCode: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(balance_minor), 0) AS total
     FROM v_account_balances
     WHERE is_archived = 0 AND currency_code = ?`,
    currencyCode,
  );
  return row?.total ?? 0;
}