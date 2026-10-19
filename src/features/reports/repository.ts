import { getDatabase } from '../../database/db';

export type ReportPeriod = 'month' | 'last_month' | 'year' | 'all';

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  amountMinor: number;
  percentage: number;
}

export interface TrendBucket {
  label: string;       // e.g. "Oct 1" or "Mar"
  dateKey: string;     // YYYY-MM-DD or YYYY-MM
  incomeMinor: number;
  expenseMinor: number;
}

export interface ReportsData {
  period: ReportPeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  categorySpending: CategorySpending[];
  trend: TrendBucket[];
  largestExpense: { description: string; amountMinor: number; categoryName: string } | null;
  mostUsedCategory: { name: string; count: number } | null;
  previousExpenseMinor: number | null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function monthBounds(y: number, m: number): { start: string; end: string } {
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
  };
}

function computePeriod(period: ReportPeriod): {
  startDate: string;
  endDate: string;
  periodLabel: string;
  previousStart: string | null;
  previousEnd: string | null;
  bucketMode: 'daily' | 'monthly';
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const monthName = (yy: number, mm: number) =>
    new Date(yy, mm - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

  if (period === 'month') {
    const { start, end } = monthBounds(y, m);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prev = monthBounds(prevY, prevM);
    return {
      startDate: start,
      endDate: end,
      periodLabel: monthName(y, m),
      previousStart: prev.start,
      previousEnd: prev.end,
      bucketMode: 'daily',
    };
  }
  if (period === 'last_month') {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const { start, end } = monthBounds(prevY, prevM);
    const prev2M = prevM === 1 ? 12 : prevM - 1;
    const prev2Y = prevM === 1 ? prevY - 1 : prevY;
    const prev = monthBounds(prev2Y, prev2M);
    return {
      startDate: start,
      endDate: end,
      periodLabel: monthName(prevY, prevM),
      previousStart: prev.start,
      previousEnd: prev.end,
      bucketMode: 'daily',
    };
  }
  if (period === 'year') {
    return {
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      periodLabel: String(y),
      previousStart: `${y - 1}-01-01`,
      previousEnd: `${y - 1}-12-31`,
      bucketMode: 'monthly',
    };
  }
  return {
    startDate: '1970-01-01',
    endDate: '9999-12-31',
    periodLabel: 'All time',
    previousStart: null,
    previousEnd: null,
    bucketMode: 'monthly',
  };
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function sumRange(
  currencyCode: string,
  start: string,
  end: string,
): Promise<{ income: number; expense: number }> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ inc: number; exp: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income'  THEN amount_minor END),0) AS inc,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount_minor END),0) AS exp
     FROM transactions
     WHERE currency_code = ? AND occurred_at BETWEEN ? AND ?`,
    currencyCode, start, end,
  );
  return { income: row?.inc ?? 0, expense: row?.exp ?? 0 };
}

export async function getReportsData(
  currencyCode: string,
  period: ReportPeriod,
): Promise<ReportsData> {
  const cfg = computePeriod(period);
  const db = await getDatabase();

  const [totals, catRows, trendRows, prev] = await Promise.all([
    sumRange(currencyCode, cfg.startDate, cfg.endDate),
    db.getAllAsync<{ id: string; name: string; total: number }>(
      `SELECT c.id, c.name, SUM(t.amount_minor) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'expense' AND t.currency_code = ?
         AND t.occurred_at BETWEEN ? AND ?
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      currencyCode, cfg.startDate, cfg.endDate,
    ),
    cfg.bucketMode === 'daily'
      ? db.getAllAsync<{ key: string; inc: number; exp: number }>(
          `SELECT occurred_at AS key,
                  COALESCE(SUM(CASE WHEN type='income'  THEN amount_minor END),0) AS inc,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount_minor END),0) AS exp
           FROM transactions
           WHERE currency_code = ? AND occurred_at BETWEEN ? AND ?
             AND type IN ('income','expense')
           GROUP BY occurred_at ORDER BY occurred_at ASC`,
          currencyCode, cfg.startDate, cfg.endDate,
        )
      : db.getAllAsync<{ key: string; inc: number; exp: number }>(
          `SELECT substr(occurred_at,1,7) AS key,
                  COALESCE(SUM(CASE WHEN type='income'  THEN amount_minor END),0) AS inc,
                  COALESCE(SUM(CASE WHEN type='expense' THEN amount_minor END),0) AS exp
           FROM transactions
           WHERE currency_code = ? AND occurred_at BETWEEN ? AND ?
             AND type IN ('income','expense')
           GROUP BY substr(occurred_at,1,7) ORDER BY key ASC`,
          currencyCode, cfg.startDate, cfg.endDate,
        ),
    cfg.previousStart && cfg.previousEnd
      ? sumRange(currencyCode, cfg.previousStart, cfg.previousEnd)
      : Promise.resolve(null),
  ]);

  // Fill in empty buckets so the trend axis is complete
  const trend: TrendBucket[] = [];
  if (cfg.bucketMode === 'daily') {
    const map = new Map(trendRows.map((r) => [r.key, r]));
    const [sy, sm] = cfg.startDate.split('-').map(Number);
    const lastDay = new Date(sy, sm, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const key = `${sy}-${pad(sm)}-${pad(d)}`;
      const r = map.get(key);
      trend.push({ dateKey: key, label: `${MONTH_SHORT[sm - 1]} ${d}`, incomeMinor: r?.inc ?? 0, expenseMinor: r?.exp ?? 0 });
    }
  } else {
    const map = new Map(trendRows.map((r) => [r.key, r]));
    if (period === 'year') {
      const y = Number(cfg.startDate.slice(0, 4));
      for (let mo = 1; mo <= 12; mo++) {
        const key = `${y}-${pad(mo)}`;
        const r = map.get(key);
        trend.push({ dateKey: key, label: MONTH_SHORT[mo - 1], incomeMinor: r?.inc ?? 0, expenseMinor: r?.exp ?? 0 });
      }
    } else {
      for (const r of trendRows) {
        const mo = Number(r.key.slice(5, 7));
        trend.push({ dateKey: r.key, label: `${MONTH_SHORT[mo - 1]} ${r.key.slice(2, 4)}`, incomeMinor: r.inc, expenseMinor: r.exp });
      }
    }
  }

  const totalExpense = totals.expense;
  const categorySpending: CategorySpending[] = catRows.map((r) => ({
    categoryId: r.id,
    categoryName: r.name,
    amountMinor: r.total,
    percentage: totalExpense > 0 ? (r.total / totalExpense) * 100 : 0,
  }));

  const largest = await db.getFirstAsync<{ description: string; amount_minor: number; name: string }>(
    `SELECT t.description, t.amount_minor, c.name
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.type='expense' AND t.currency_code = ?
       AND t.occurred_at BETWEEN ? AND ?
     ORDER BY t.amount_minor DESC LIMIT 1`,
    currencyCode, cfg.startDate, cfg.endDate,
  );

  const mostUsed = await db.getFirstAsync<{ name: string; cnt: number }>(
    `SELECT c.name, COUNT(*) AS cnt
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.type='expense' AND t.currency_code = ?
       AND t.occurred_at BETWEEN ? AND ?
     GROUP BY c.id, c.name ORDER BY cnt DESC, c.name ASC LIMIT 1`,
    currencyCode, cfg.startDate, cfg.endDate,
  );

  return {
    period,
    periodLabel: cfg.periodLabel,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    incomeMinor: totals.income,
    expenseMinor: totals.expense,
    netMinor: totals.income - totals.expense,
    categorySpending,
    trend,
    largestExpense: largest
      ? { description: largest.description, amountMinor: largest.amount_minor, categoryName: largest.name }
      : null,
    mostUsedCategory: mostUsed ? { name: mostUsed.name, count: mostUsed.cnt } : null,
    previousExpenseMinor: prev ? prev.expense : null,
  };
}