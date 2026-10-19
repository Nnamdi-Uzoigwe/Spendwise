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
import { listBudgets, type BudgetProgress } from '../../src/features/budgets/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listBudgets().then((rows) => {
        setBudgets(rows);
        setLoading(false);
      });
    }, []),
  );

  const statusColor = (s: BudgetProgress['status']) =>
    s === 'exceeded'
      ? colors.destructive
      : s === 'warning'
      ? colors.warning
      : s === 'expired'
      ? colors.textTertiary
      : colors.positive;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Budgets</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : budgets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pie-chart-outline" size={40} color={colors.accent} />
          <Text style={styles.emptyTitle}>No budgets yet</Text>
          <Text style={styles.emptyBody}>
            Set a monthly limit on a category and watch your spending in real time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.huge }}
          renderItem={({ item }) => {
            const color = statusColor(item.status);
            const cappedPct = Math.min(item.usagePct, 100);
            const paused = !item.isActive;
            return (
              <Pressable
                onPress={() => router.push(`/budgets/new?id=${item.id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.category}>{item.categoryName}</Text>
                  </View>
                  {paused ? (
                    <Text style={styles.pausedBadge}>Paused</Text>
                  ) : item.status === 'expired' ? (
                    <Text style={styles.expiredBadge}>Expired</Text>
                  ) : (
                    <Text style={[styles.pctText, { color }]}>
                      {Math.round(item.usagePct)}%
                    </Text>
                  )}
                </View>

                {!paused && (
                  <>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${cappedPct}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountMeta}>
                        {formatMinor(item.spentMinor, CURRENCIES.NGN)} of{' '}
                        {formatMinor(item.amountMinor, CURRENCIES.NGN)}
                      </Text>
                      <Text style={[styles.amountRemaining, { color }]}>
                        {item.remainingMinor >= 0
                          ? `${formatMinor(item.remainingMinor, CURRENCIES.NGN)} left`
                          : `${formatMinor(-item.remainingMinor, CURRENCIES.NGN)} over`}
                      </Text>
                    </View>
                  </>
                )}

                {paused && (
                  <Text style={styles.pausedNote}>
                    Budget is paused — not tracking spending.
                  </Text>
                )}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/budgets/new')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
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
  name: typography.h3,
  category: typography.caption,
  pctText: { ...typography.amount, fontSize: 18 },
  pausedBadge: {
    ...typography.caption,
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiredBadge: {
    ...typography.caption,
    color: colors.textTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pausedNote: { ...typography.caption, color: colors.textTertiary },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountMeta: typography.caption,
  amountRemaining: { ...typography.caption, fontFamily: 'Inter_600SemiBold' },
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