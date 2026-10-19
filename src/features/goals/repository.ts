import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/db';

export type GoalStatus = 'active' | 'completed' | 'archived';
export type EntryType = 'contribution' | 'withdrawal';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmountMinor: number;
  currencyCode: string;
  targetDate: string | null;
  description: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress extends SavingsGoal {
  savedMinor: number;
  remainingMinor: number; // may be negative if exceeded
  progressPct: number;    // 0 to ∞
}

export interface GoalEntry {
  id: string;
  goalId: string;
  amountMinor: number;
  entryType: EntryType;
  occurredAt: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateGoalInput {
  name: string;
  targetAmountMinor: number;
  currencyCode: string;
  targetDate?: string | null;
  description?: string | null;
}

interface GoalRow {
  id: string;
  name: string;
  target_amount_minor: number;
  currency_code: string;
  target_date: string | null;
  description: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
  saved_minor: number;
}

const mapGoal = (r: GoalRow): GoalProgress => {
  const savedMinor = r.saved_minor;
  const remainingMinor = r.target_amount_minor - savedMinor;
  const progressPct =
    r.target_amount_minor > 0 ? (savedMinor / r.target_amount_minor) * 100 : 0;
  return {
    id: r.id,
    name: r.name,
    targetAmountMinor: r.target_amount_minor,
    currencyCode: r.currency_code,
    targetDate: r.target_date,
    description: r.description,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    savedMinor,
    remainingMinor,
    progressPct,
  };
};

const SELECT_WITH_PROGRESS = `
  g.id, g.name, g.target_amount_minor, g.currency_code, g.target_date,
  g.description, g.status, g.created_at, g.updated_at,
  COALESCE((
    SELECT SUM(CASE WHEN e.entry_type = 'contribution'
                    THEN e.amount_minor ELSE -e.amount_minor END)
    FROM goal_entries e
    WHERE e.goal_id = g.id
  ), 0) AS saved_minor
`;

export async function listGoals(): Promise<GoalProgress[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT ${SELECT_WITH_PROGRESS}
     FROM savings_goals g
     ORDER BY
       CASE g.status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
       g.name COLLATE NOCASE ASC`,
  );
  return rows.map(mapGoal);
}

export async function getGoal(id: string): Promise<GoalProgress | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GoalRow>(
    `SELECT ${SELECT_WITH_PROGRESS}
     FROM savings_goals g
     WHERE g.id = ?`,
    id,
  );
  return row ? mapGoal(row) : null;
}

export async function createGoal(input: CreateGoalInput): Promise<SavingsGoal> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO savings_goals
       (id, name, target_amount_minor, currency_code, target_date, description,
        status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    id,
    input.name.trim(),
    input.targetAmountMinor,
    input.currencyCode,
    input.targetDate ?? null,
    input.description ?? null,
    now,
    now,
  );
  const row = await db.getFirstAsync<GoalRow>(
    `SELECT ${SELECT_WITH_PROGRESS} FROM savings_goals g WHERE g.id = ?`,
    id,
  );
  if (!row) throw new Error('Goal not found after create.');
  return mapGoal(row);
}

export async function updateGoal(id: string, input: CreateGoalInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE savings_goals SET
       name = ?, target_amount_minor = ?, currency_code = ?,
       target_date = ?, description = ?, updated_at = ?
     WHERE id = ?`,
    input.name.trim(),
    input.targetAmountMinor,
    input.currencyCode,
    input.targetDate ?? null,
    input.description ?? null,
    new Date().toISOString(),
    id,
  );
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE savings_goals SET status = ?, updated_at = ? WHERE id = ?`,
    status,
    new Date().toISOString(),
    id,
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM savings_goals WHERE id = ?`, id);
}

export async function addGoalEntry(
  goalId: string,
  input: { amountMinor: number; entryType: EntryType; occurredAt: string; notes?: string | null },
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO goal_entries
       (id, goal_id, amount_minor, entry_type, occurred_at, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    Crypto.randomUUID(),
    goalId,
    input.amountMinor,
    input.entryType,
    input.occurredAt,
    input.notes ?? null,
    now,
  );
}

export async function listGoalEntries(goalId: string): Promise<GoalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    goal_id: string;
    amount_minor: number;
    entry_type: EntryType;
    occurred_at: string;
    notes: string | null;
    created_at: string;
  }>(
    `SELECT id, goal_id, amount_minor, entry_type, occurred_at, notes, created_at
     FROM goal_entries
     WHERE goal_id = ?
     ORDER BY occurred_at DESC, created_at DESC`,
    goalId,
  );
  return rows.map((r) => ({
    id: r.id,
    goalId: r.goal_id,
    amountMinor: r.amount_minor,
    entryType: r.entry_type,
    occurredAt: r.occurred_at,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}