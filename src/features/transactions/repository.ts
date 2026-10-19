import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/db';
import { checkAllBudgetThresholds } from '../budgets/repository';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  description: string;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amountMinor: number;
  currencyCode: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  description: string;
  notes?: string | null;
  occurredAt: string;
}

interface Row {
  id: string;
  type: TransactionType;
  amount_minor: number;
  currency_code: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  description: string;
  notes: string | null;
  occurred_at: string;
  created_at: string;
}

const mapRow = (r: Row): Transaction => ({
  id: r.id,
  type: r.type,
  amountMinor: r.amount_minor,
  currencyCode: r.currency_code,
  accountId: r.account_id,
  destinationAccountId: r.destination_account_id,
  categoryId: r.category_id,
  description: r.description,
  notes: r.notes,
  occurredAt: r.occurred_at,
  createdAt: r.created_at,
});

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const txn: Transaction = {
    id: Crypto.randomUUID(),
    type: input.type,
    amountMinor: input.amountMinor,
    currencyCode: input.currencyCode,
    accountId: input.accountId,
    destinationAccountId: input.destinationAccountId ?? null,
    categoryId: input.categoryId ?? null,
    description: input.description.trim(),
    notes: input.notes ?? null,
    occurredAt: input.occurredAt,
    createdAt: now,
  };
  await db.runAsync(
    `INSERT INTO transactions
       (id, type, amount_minor, currency_code, account_id, destination_account_id,
        category_id, description, notes, occurred_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    txn.id,
    txn.type,
    txn.amountMinor,
    txn.currencyCode,
    txn.accountId,
    txn.destinationAccountId,
    txn.categoryId,
    txn.description,
    txn.notes,
    txn.occurredAt,
    txn.createdAt,
    now,
  );

  if (txn.type === 'expense') {
    await checkAllBudgetThresholds(txn.currencyCode);
  }

  return txn;
}

export async function listTransactions(limit = 100): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, type, amount_minor, currency_code, account_id, destination_account_id,
            category_id, description, notes, occurred_at, created_at
     FROM transactions
     ORDER BY occurred_at DESC, created_at DESC
     LIMIT ?`,
    limit,
  );
  return rows.map(mapRow);
}

export interface TransactionDetail extends Transaction {
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
}

export async function getTransactionDetail(id: string): Promise<TransactionDetail | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    type: TransactionType;
    amount_minor: number;
    currency_code: string;
    account_id: string;
    destination_account_id: string | null;
    category_id: string | null;
    description: string;
    notes: string | null;
    occurred_at: string;
    created_at: string;
    account_name: string;
    destination_account_name: string | null;
    category_name: string | null;
  }>(
    `SELECT t.id, t.type, t.amount_minor, t.currency_code, t.account_id,
            t.destination_account_id, t.category_id, t.description, t.notes,
            t.occurred_at, t.created_at,
            a.name  AS account_name,
            d.name  AS destination_account_name,
            c.name  AS category_name
     FROM transactions t
     JOIN accounts a     ON a.id = t.account_id
     LEFT JOIN accounts d ON d.id = t.destination_account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    id,
  );
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    accountId: row.account_id,
    destinationAccountId: row.destination_account_id,
    categoryId: row.category_id,
    description: row.description,
    notes: row.notes,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    accountName: row.account_name,
    destinationAccountName: row.destination_account_name,
    categoryName: row.category_name,
  };
}

export async function updateTransaction(
  id: string,
  input: CreateTransactionInput,
): Promise<Transaction> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE transactions SET
       type = ?, amount_minor = ?, currency_code = ?, account_id = ?,
       destination_account_id = ?, category_id = ?, description = ?, notes = ?,
       occurred_at = ?, updated_at = ?
     WHERE id = ?`,
    input.type,
    input.amountMinor,
    input.currencyCode,
    input.accountId,
    input.destinationAccountId ?? null,
    input.categoryId ?? null,
    input.description.trim(),
    input.notes ?? null,
    input.occurredAt,
    now,
    id,
  );

  if (input.type === 'expense') {
    await checkAllBudgetThresholds(input.currencyCode);
  }

  const updated = await getTransactionDetail(id);
  if (!updated) throw new Error('Transaction not found after update.');
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();
  const before = await db.getFirstAsync<{ type: TransactionType; currency_code: string }>(
    `SELECT type, currency_code FROM transactions WHERE id = ?`,
    id,
  );
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);

  if (before?.type === 'expense') {
    await checkAllBudgetThresholds(before.currency_code);
  }
}

export interface MonthlySummary {
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
}

export async function getMonthlySummary(
  currencyCode: string,
  year: number,
  month: number, // 1-12
): Promise<MonthlySummary> {
  const db = await getDatabase();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = `${year}-${String(month).padStart(2, '0')}-31`;

  const row = await db.getFirstAsync<{ inc: number; exp: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income'  THEN amount_minor END), 0) AS inc,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor END), 0) AS exp
     FROM transactions
     WHERE currency_code = ?
       AND occurred_at BETWEEN ? AND ?`,
    currencyCode,
    start,
    end,
  );

  const incomeMinor = row?.inc ?? 0;
  const expenseMinor = row?.exp ?? 0;
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor };
}