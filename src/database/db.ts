import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('spendwise.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');

      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const currentVersion = row?.user_version ?? 0;

      if (currentVersion < 1) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            primary_currency TEXT NOT NULL DEFAULT 'NGN',
            onboarding_complete INTEGER NOT NULL DEFAULT 0
          );
          INSERT OR IGNORE INTO profile (id) VALUES (1);
        `);
        await db.execAsync('PRAGMA user_version = 1');
      }

      if (currentVersion < 2) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('cash','savings','checking','other')),
            currency_code TEXT NOT NULL,
            opening_balance_minor INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts(is_archived);
        `);
        await db.execAsync('PRAGMA user_version = 2');
      }

            if (currentVersion < 3) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income','expense')),
            icon_key TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          );

          INSERT OR IGNORE INTO categories (id, name, type, icon_key, is_default, created_at) VALUES
            ('cat_exp_food','Food & groceries','expense','fast-food',1,datetime('now')),
            ('cat_exp_transport','Transportation','expense','car',1,datetime('now')),
            ('cat_exp_housing','Housing & rent','expense','home',1,datetime('now')),
            ('cat_exp_utilities','Utilities','expense','flash',1,datetime('now')),
            ('cat_exp_shopping','Shopping','expense','bag',1,datetime('now')),
            ('cat_exp_health','Health','expense','heart',1,datetime('now')),
            ('cat_exp_education','Education','expense','book',1,datetime('now')),
            ('cat_exp_entertainment','Entertainment','expense','game-controller',1,datetime('now')),
            ('cat_exp_personal','Personal care','expense','sparkles',1,datetime('now')),
            ('cat_exp_travel','Travel','expense','airplane',1,datetime('now')),
            ('cat_exp_subs','Subscriptions','expense','repeat',1,datetime('now')),
            ('cat_exp_other','Other expenses','expense','ellipsis-horizontal',1,datetime('now')),
            ('cat_inc_salary','Salary','income','briefcase',1,datetime('now')),
            ('cat_inc_freelance','Freelance income','income','laptop',1,datetime('now')),
            ('cat_inc_business','Business income','income','storefront',1,datetime('now')),
            ('cat_inc_gifts','Gifts','income','gift',1,datetime('now')),
            ('cat_inc_interest','Interest','income','trending-up',1,datetime('now')),
            ('cat_inc_other','Other income','income','ellipsis-horizontal',1,datetime('now'));

          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
            amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
            currency_code TEXT NOT NULL,
            account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
            destination_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
            category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
            description TEXT NOT NULL,
            notes TEXT,
            occurred_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CHECK (
              (type = 'transfer' AND destination_account_id IS NOT NULL AND destination_account_id <> account_id AND category_id IS NULL)
              OR
              (type IN ('income','expense') AND destination_account_id IS NULL AND category_id IS NOT NULL)
            )
          );

          CREATE INDEX IF NOT EXISTS idx_txn_occurred ON transactions(occurred_at DESC);
          CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
          CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category_id);

          CREATE VIEW IF NOT EXISTS v_account_balances AS
          SELECT
            a.id AS account_id,
            a.name AS name,
            a.currency_code AS currency_code,
            a.is_archived AS is_archived,
            a.opening_balance_minor
              + COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.account_id = a.id AND t.type = 'income'), 0)
              - COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.account_id = a.id AND t.type = 'expense'), 0)
              - COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.account_id = a.id AND t.type = 'transfer'), 0)
              + COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.destination_account_id = a.id AND t.type = 'transfer'), 0)
              AS balance_minor
          FROM accounts a;
        `);
        await db.execAsync('PRAGMA user_version = 3');
      }
            if (currentVersion < 4) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
            currency_code TEXT NOT NULL,
            period_type TEXT NOT NULL CHECK (period_type IN ('monthly','custom')),
            start_date TEXT NOT NULL,
            end_date TEXT,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CHECK (
              period_type = 'monthly'
              OR (period_type = 'custom' AND end_date IS NOT NULL AND end_date >= start_date)
            )
          );
          CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
          CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active);
        `);
        await db.execAsync('PRAGMA user_version = 4');
      }
            if (currentVersion < 5) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS savings_goals (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            target_amount_minor INTEGER NOT NULL CHECK (target_amount_minor > 0),
            currency_code TEXT NOT NULL,
            target_date TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS goal_entries (
            id TEXT PRIMARY KEY NOT NULL,
            goal_id TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
            amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
            entry_type TEXT NOT NULL CHECK (entry_type IN ('contribution','withdrawal')),
            occurred_at TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_goal_entries_goal
            ON goal_entries(goal_id, occurred_at DESC);
        `);
        await db.execAsync('PRAGMA user_version = 5');
      }

            if (currentVersion < 6) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS recurring_schedules (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income','expense')),
            amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
            currency_code TEXT NOT NULL,
            account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
            category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
            description TEXT NOT NULL,
            frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','yearly')),
            interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
            start_date TEXT NOT NULL,
            end_date TEXT,
            next_occurrence_date TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_schedules(is_active);
          CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_schedules(next_occurrence_date);
        `);
        await db.execAsync('PRAGMA user_version = 6');
      }
            if (currentVersion < 7) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS notification_records (
            id TEXT PRIMARY KEY NOT NULL,
            notification_type TEXT NOT NULL,
            entity_id TEXT,
            scheduled_at TEXT NOT NULL,
            os_identifier TEXT,
            status TEXT NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled','cancelled','delivered','failed')),
            dedupe_key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_dedupe
            ON notification_records(dedupe_key);
        `);
        await db.execAsync('PRAGMA user_version = 7');
      }
            if (currentVersion < 8) {
        // v1 created profile without updated_at. Add it now so onboarding
        // (and future settings writes) can stamp modification time.
        const cols = await db.getAllAsync<{ name: string }>(
          'PRAGMA table_info(profile)',
        );
        const hasUpdatedAt = cols.some((c) => c.name === 'updated_at');
        if (!hasUpdatedAt) {
          await db.execAsync(
            `ALTER TABLE profile ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`,
          );
          await db.execAsync(
            `UPDATE profile SET updated_at = datetime('now') WHERE id = 1`,
          );
        }
        await db.execAsync('PRAGMA user_version = 8');
      }
      return db;
    })();
  }
  return dbPromise;
}