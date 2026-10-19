import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDatabase } from '../../database/db';

// SDK 57 handler shape: shouldShowBanner / shouldShowList
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return 'granted';
  const req = await Notifications.requestPermissionsAsync();
  if (req.status === 'granted') return 'granted';
  if (req.status === 'denied') return 'denied';
  return 'undetermined';
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });
}

interface ScheduleRecordInput {
  notificationType: 'recurring_due' | 'budget_threshold';
  entityId: string;
  scheduledAt: Date;
  dedupeKey: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Schedules a one-off notification and records it. If a record with the same
 * dedupe_key exists, it is cancelled first so we never double-notify.
 */
export async function scheduleNotification(input: ScheduleRecordInput): Promise<string | null> {
  const perm = await getNotificationPermission();
  if (perm !== 'granted') return null;

  await ensureAndroidChannel();

  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string; os_identifier: string | null }>(
    `SELECT id, os_identifier FROM notification_records WHERE dedupe_key = ?`,
    input.dedupeKey,
  );
  if (existing?.os_identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existing.os_identifier);
    } catch {
      // Already fired or invalid — ignore
    }
    await db.runAsync(
      `UPDATE notification_records SET status = 'cancelled', updated_at = ? WHERE id = ?`,
      new Date().toISOString(),
      existing.id,
    );
  }

  let osId: string | null = null;
  try {
    osId = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: input.scheduledAt,
      },
    });
  } catch {
    return null;
  }

  const now = new Date().toISOString();
  const id = Crypto.randomUUID();

  if (existing) {
    await db.runAsync(
      `UPDATE notification_records SET
         os_identifier = ?, scheduled_at = ?, status = 'scheduled', updated_at = ?
       WHERE id = ?`,
      osId,
      input.scheduledAt.toISOString(),
      now,
      existing.id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO notification_records
         (id, notification_type, entity_id, scheduled_at, os_identifier,
          status, dedupe_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
      id,
      input.notificationType,
      input.entityId,
      input.scheduledAt.toISOString(),
      osId,
      input.dedupeKey,
      now,
      now,
    );
  }
  return osId;
}

export async function cancelNotificationByDedupe(dedupeKey: string): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; os_identifier: string | null }>(
    `SELECT id, os_identifier FROM notification_records WHERE dedupe_key = ?`,
    dedupeKey,
  );
  if (!row) return;
  if (row.os_identifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(row.os_identifier);
    } catch {
      // ignore
    }
  }
  await db.runAsync(
    `UPDATE notification_records SET status = 'cancelled', updated_at = ? WHERE id = ?`,
    new Date().toISOString(),
    row.id,
  );
}

/**
 * Schedules a reminder the morning of the next occurrence.
 * Dedupe key includes the date so editing a schedule cancels only its own prior reminder.
 */
export async function scheduleRecurringReminder(params: {
  scheduleId: string;
  nextDate: string; // YYYY-MM-DD
  description: string;
  amountLabel: string;
  type: 'income' | 'expense';
}): Promise<void> {
  const dedupeKey = `recurring:${params.scheduleId}:${params.nextDate}`;

  // Reminder fires at 09:00 local on the occurrence date
  const [y, m, d] = params.nextDate.split('-').map(Number);
  const when = new Date(y, m - 1, d, 9, 0, 0);
  if (when.getTime() <= Date.now()) return; // past — nothing to schedule

  await scheduleNotification({
    notificationType: 'recurring_due',
    entityId: params.scheduleId,
    scheduledAt: when,
    dedupeKey,
    title: params.type === 'expense' ? 'Bill due today' : 'Expected income today',
    body: `${params.description} · ${params.amountLabel}`,
    data: { scheduleId: params.scheduleId },
  });
}

/**
 * Fires when a budget crosses 80% or 100%. Dedupe per budget+period+threshold,
 * so it never re-fires within the same period.
 */
export async function checkBudgetThresholdNotification(params: {
  budgetId: string;
  budgetName: string;
  periodStart: string; // YYYY-MM-DD
  usagePct: number;
  spentLabel: string;
  limitLabel: string;
}): Promise<void> {
  const threshold = params.usagePct >= 100 ? 100 : params.usagePct >= 80 ? 80 : null;
  if (threshold === null) return;

  const dedupeKey = `budget:${params.budgetId}:${params.periodStart}:${threshold}`;

  await scheduleNotification({
    notificationType: 'budget_threshold',
    entityId: params.budgetId,
    scheduledAt: new Date(Date.now() + 1000), // fire immediately-ish
    dedupeKey,
    title: threshold === 100 ? 'Budget exceeded' : 'Budget at 80%',
    body: `${params.budgetName}: ${params.spentLabel} of ${params.limitLabel}`,
    data: { budgetId: params.budgetId },
  });
}