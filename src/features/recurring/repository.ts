import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/db';
import { nextOccurrence, type RecurrenceFrequency } from './recurrence';

export interface RecurringSchedule {
  id: string;
  type: 'income' | 'expense';
  amountMinor: number;
  currencyCode: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextOccurrenceDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInput {
  type: 'income' | 'expense';
  amountMinor: number;
  currencyCode: string;
  accountId: string;
  categoryId: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
}

interface Row {
  id: string;
  type: 'income' | 'expense';
  amount_minor: number;
  currency_code: string;
  account_id: string;
  account_name: string;
  category_id: string;
  category_name: string;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  start_date: string;
  end_date: string | null;
  next_occurrence_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const mapRow = (r: Row): RecurringSchedule => ({
  id: r.id,
  type: r.type,
  amountMinor: r.amount_minor,
  currencyCode: r.currency_code,
  accountId: r.account_id,
  accountName: r.account_name,
  categoryId: r.category_id,
  categoryName: r.category_name,
  description: r.description,
  frequency: r.frequency,
  interval: r.interval,
  startDate: r.start_date,
  endDate: r.end_date,
  nextOccurrenceDate: r.next_occurrence_date,
  isActive: r.is_active === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT_COLS = `
  rs.id, rs.type, rs.amount_minor, rs.currency_code, rs.account_id,
  a.name AS account_name, rs.category_id, c.name AS category_name,
  rs.description, rs.frequency, rs.interval, rs.start_date, rs.end_date,
  rs.next_occurrence_date, rs.is_active, rs.created_at, rs.updated_at
`;

const FROM_JOIN = `
  FROM recurring_schedules rs
  JOIN accounts a ON a.id = rs.account_id
  JOIN categories c ON c.id = rs.category_id
`;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listSchedules(): Promise<RecurringSchedule[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${SELECT_COLS} ${FROM_JOIN}
     ORDER BY rs.is_active DESC, rs.next_occurrence_date ASC, rs.description COLLATE NOCASE ASC`,
  );
  return rows.map(mapRow);
}

export async function getSchedule(id: string): Promise<RecurringSchedule | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${SELECT_COLS} ${FROM_JOIN} WHERE rs.id = ?`,
    id,
  );
  return row ? mapRow(row) : null;
}

export async function createSchedule(input: CreateRecurringInput): Promise<RecurringSchedule> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO recurring_schedules
       (id, type, amount_minor, currency_code, account_id, category_id, description,
        frequency, interval, start_date, end_date, next_occurrence_date,
        is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    input.type,
    input.amountMinor,
    input.currencyCode,
    input.accountId,
    input.categoryId,
    input.description.trim(),
    input.frequency,
    input.interval,
    input.startDate,
    input.endDate ?? null,
    input.startDate,
    now,
    now,
  );
  const created = await getSchedule(id);
  if (!created) throw new Error('Schedule not found after create.');
  return created;
}

export async function updateSchedule(id: string, input: CreateRecurringInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE recurring_schedules SET
       type = ?, amount_minor = ?, currency_code = ?, account_id = ?,
       category_id = ?, description = ?, frequency = ?, interval = ?,
       start_date = ?, end_date = ?, next_occurrence_date = ?, updated_at = ?
     WHERE id = ?`,
    input.type,
    input.amountMinor,
    input.currencyCode,
    input.accountId,
    input.categoryId,
    input.description.trim(),
    input.frequency,
    input.interval,
    input.startDate,
    input.endDate ?? null,
    input.startDate,
    new Date().toISOString(),
    id,
  );
}

export async function deleteSchedule(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM recurring_schedules WHERE id = ?`, id);
}

export async function toggleScheduleActive(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE recurring_schedules SET is_active = 1 - is_active, updated_at = ? WHERE id = ?`,
    new Date().toISOString(),
    id,
  );
}

/**
 * Creates a real transaction for the current `next_occurrence_date`, then
 * advances the schedule by one occurrence. If the schedule's end_date has
 * passed, the schedule is deactivated.
 */
export async function markSchedulePaid(id: string): Promise<{
  transactionId: string;
  nextDate: string | null;
}> {
  const db = await getDatabase();
  const schedule = await getSchedule(id);
  if (!schedule) throw new Error('Schedule not found.');

  const occurredAt = schedule.nextOccurrenceDate;
  const txnId = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execAsync('BEGIN');
  try {
    await db.runAsync(
      `INSERT INTO transactions
         (id, type, amount_minor, currency_code, account_id, destination_account_id,
          category_id, description, notes, occurred_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?)`,
      txnId,
      schedule.type,
      schedule.amountMinor,
      schedule.currencyCode,
      schedule.accountId,
      schedule.categoryId,
      schedule.description,
      occurredAt,
      now,
      now,
    );

    const candidate = nextOccurrence(
      schedule.startDate,
      schedule.frequency,
      schedule.interval,
      schedule.nextOccurrenceDate,
    );

    const shouldDeactivate = schedule.endDate !== null && candidate > schedule.endDate;

    await db.runAsync(
      `UPDATE recurring_schedules
       SET next_occurrence_date = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      candidate,
      shouldDeactivate ? 0 : 1,
      now,
      id,
    );

    await db.execAsync('COMMIT');
    return { transactionId: txnId, nextDate: shouldDeactivate ? null : candidate };
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

export interface ScheduleDueInfo {
  due: boolean;
  daysUntil: number; // <= 0 means due/overdue
}

export function getDueInfo(schedule: RecurringSchedule): ScheduleDueInfo {
  if (!schedule.isActive) return { due: false, daysUntil: Infinity };
  const today = todayStr();
  const t = new Date(today + 'T00:00:00Z').getTime();
  const n = new Date(schedule.nextOccurrenceDate + 'T00:00:00Z').getTime();
  const daysUntil = Math.round((n - t) / 86400000);
  return { due: daysUntil <= 0, daysUntil };
}