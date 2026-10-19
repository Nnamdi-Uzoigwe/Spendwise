import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/db';

export type BudgetPeriodType = 'monthly' | 'custom';
export type BudgetStatus = 'ok' | 'warning' | 'exceeded' | 'expired';

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  amountMinor: number;
  currencyCode: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetProgress extends Budget {
  spentMinor: number;
  remainingMinor: number; // may be negative (overspent)
  usagePct: number;       // 0 to ∞
  status: BudgetStatus;
}

export interface CreateBudgetInput {
  name: string;
  categoryId: string;
  amountMinor: number;
  currencyCode: string;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate?: string | null;
}

interface Row {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  amount_minor: number;
  currency_code: string;
  period_type: BudgetPeriodType;
  start_date: string;
  end_date: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const mapRow = (r: Row): Budget => ({
  id: r.id,
  name: r.name,
  categoryId: r.category_id,
  categoryName: r.category_name,
  amountMinor: r.amount_minor,
  currencyCode: r.currency_code,
  periodType: r.period_type,
  startDate: r.start_date,
  endDate: r.end_date,
  isActive: r.is_active === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT_COLS = `
  b.id, b.name, b.category_id, c.name AS category_name,
  b.amount_minor, b.currency_code, b.period_type,
  b.start_date, b.end_date, b.is_active, b.created_at, b.updated_at
`;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthBounds(y: number, m: number): { start: string; end: string } {
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function getBudgetPeriod(
  budget: Budget,
  today: string = todayStr(),
): { start: string; end: string } | null {
  if (budget.periodType === 'monthly') {
    const [y, m] = today.split('-').map(Number);
    return monthBounds(y, m);
  }
  if (!budget.endDate) return null;
  if (today > budget.endDate) return null; // custom period ended
  return { start: budget.startDate, end: budget.endDate };
}

async function sumCategoryExpenses(
  categoryId: string,
  currencyCode: string,
  start: string,
  end: string,
): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_minor), 0) AS total
     FROM transactions
     WHERE category_id = ?
       AND type = 'expense'
       AND currency_code = ?
       AND occurred_at BETWEEN ? AND ?`,
    categoryId,
    currencyCode,
    start,
    end,
  );
  return row?.total ?? 0;
}

export async function listBudgets(): Promise<BudgetProgress[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS}
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     ORDER BY b.is_active DESC, b.name COLLATE NOCASE ASC`,
  );

  const today = todayStr();
  const result: BudgetProgress[] = [];
  for (const row of rows) {
    const budget = mapRow(row);
    if (!budget.isActive) {
      result.push({
        ...budget,
        spentMinor: 0,
        remainingMinor: budget.amountMinor,
        usagePct: 0,
        status: 'ok',
      });
      continue;
    }
    const period = getBudgetPeriod(budget, today);
    if (!period) {
      const spent = await sumCategoryExpenses(
        budget.categoryId,
        budget.currencyCode,
        budget.startDate,
        budget.endDate ?? budget.startDate,
      );
      result.push({
        ...budget,
        spentMinor: spent,
        remainingMinor: budget.amountMinor - spent,
        usagePct: budget.amountMinor > 0 ? (spent / budget.amountMinor) * 100 : 0,
        status: 'expired',
      });
      continue;
    }
    const spent = await sumCategoryExpenses(
      budget.categoryId,
      budget.currencyCode,
      period.start,
      period.end,
    );
    const usagePct = budget.amountMinor > 0 ? (spent / budget.amountMinor) * 100 : 0;
    const status: BudgetStatus =
      usagePct >= 100 ? 'exceeded' : usagePct >= 80 ? 'warning' : 'ok';
    result.push({
      ...budget,
      spentMinor: spent,
      remainingMinor: budget.amountMinor - spent,
      usagePct,
      status,
    });
  }
  return result;
}

export async function getBudgetById(id: string): Promise<Budget | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS}
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     WHERE b.id = ?`,
    id,
  );
  return row ? mapRow(row) : null;
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO budgets
       (id, name, category_id, amount_minor, currency_code, period_type,
        start_date, end_date, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    input.name.trim(),
    input.categoryId,
    input.amountMinor,
    input.currencyCode,
    input.periodType,
    input.startDate,
    input.periodType === 'custom' ? input.endDate ?? null : null,
    now,
    now,
  );
  const created = await getBudgetById(id);
  if (!created) throw new Error('Budget not found after create.');
  return created;
}

export async function updateBudget(
  id: string,
  input: CreateBudgetInput,
): Promise<Budget> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE budgets SET
       name = ?, category_id = ?, amount_minor = ?, currency_code = ?,
       period_type = ?, start_date = ?, end_date = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.categoryId,
    input.amountMinor,
    input.currencyCode,
    input.periodType,
    input.startDate,
    input.periodType === 'custom' ? input.endDate ?? null : null,
    new Date().toISOString(),
    id,
  );
  const updated = await getBudgetById(id);
  if (!updated) throw new Error('Budget not found after update.');
  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM budgets WHERE id = ?`, id);
}

export async function toggleBudgetActive(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE budgets SET is_active = 1 - is_active, updated_at = ? WHERE id = ?`,
    new Date().toISOString(),
    id,
  );
}