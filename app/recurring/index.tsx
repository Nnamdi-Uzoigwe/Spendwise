import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import {
  getDueInfo,
  listSchedules,
  markSchedulePaid,
  type RecurringSchedule,
} from '../../src/features/recurring/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function RecurringScreen() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await listSchedules();
    setSchedules(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleMarkPaid = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await markSchedulePaid(id);
      await load();
    } catch (e) {
      // Silent — could show a toast later
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Recurring</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : schedules.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="repeat-outline" size={40} color={colors.accent} />
          <Text style={styles.emptyTitle}>No schedules yet</Text>
          <Text style={styles.emptyBody}>
            Set up recurring bills and salary so you never miss them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.huge }}
          renderItem={({ item }) => {
            const due = getDueInfo(item);
            const paused = !item.isActive;
            const overdue = item.isActive && due.daysUntil < 0;
            const today = item.isActive && due.daysUntil === 0;
            const amountColor =
              item.type === 'income' ? colors.positive : colors.destructive;
            const dueBadgeColor = overdue
              ? colors.destructive
              : today
              ? colors.warning
              : colors.textSecondary;
            const dueLabel = !item.isActive
              ? 'Paused'
              : overdue
              ? `Overdue ${-due.daysUntil}d`
              : today
              ? 'Due today'
              : `In ${due.daysUntil}d`;

            return (
              <Pressable
                onPress={() => router.push(`/recurring/new?id=${item.id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.meta}>
                      {item.categoryName} · {item.accountName}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: amountColor }]}>
                    {item.type === 'expense' ? '−' : '+'}
                    {formatMinor(item.amountMinor, CURRENCIES.NGN)}
                  </Text>
                </View>

                <View style={styles.freqRow}>
                  <Text style={styles.freqText}>
                    {labelFrequency(item.frequency, item.interval)}
                  </Text>
                  <Text
                    style={[
                      styles.dueBadge,
                      { color: dueBadgeColor, borderColor: dueBadgeColor },
                    ]}
                  >
                    {dueLabel}
                  </Text>
                </View>

                {item.isActive && due.due && (
                  <Pressable
                    onPress={() => handleMarkPaid(item.id)}
                    disabled={busyId === item.id}
                    style={[
                      styles.payBtn,
                      busyId === item.id && { opacity: 0.5 },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.payBtnText}>
                      {busyId === item.id ? 'Saving…' : 'Mark paid'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/recurring/new')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

function labelFrequency(f: RecurringSchedule['frequency'], i: number): string {
  if (i === 1) {
    return f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : f === 'monthly' ? 'Monthly' : 'Yearly';
  }
  const unit =
    f === 'daily' ? 'days' : f === 'weekly' ? 'weeks' : f === 'monthly' ? 'months' : 'years';
  return `Every ${i} ${unit}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  headerTitle: typography.h3,
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: typography.h2,
  emptyBody: { ...typography.bodySecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  desc: typography.h3,
  meta: typography.caption,
  amount: { ...typography.amount, fontSize: 16 },
  freqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  freqText: typography.caption,
  dueBadge: {
    ...typography.caption,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: 'Inter_600SemiBold',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.positive,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  payBtnText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});