import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import { getAccountBalances, getTotalBalance } from '../../src/features/accounts/repository';
import {
  getMonthlySummary,
  listTransactions,
  type MonthlySummary,
  type Transaction,
} from '../../src/features/transactions/repository';
import { colors, spacing, typography } from '../../src/theme';

const CURRENCY = 'NGN' as const;

export default function HomeScreen() {
  const [total, setTotal] = useState(0);
  const [accountCount, setAccountCount] = useState(0);
  const [summary, setSummary] = useState<MonthlySummary>({
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
  });
  const [recent, setRecent] = useState<Transaction[]>([]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [t, accounts, monthly, recents] = await Promise.all([
          getTotalBalance(CURRENCY),
          getAccountBalances(),
          getMonthlySummary(CURRENCY, now.getFullYear(), now.getMonth() + 1),
          listTransactions(5),
        ]);
        setTotal(t);
        setAccountCount(accounts.length);
        setSummary(monthly);
        setRecent(recents);
      })();
    }, []),
  );

  const noActivity = accountCount === 0 && recent.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.huge + spacing.xxl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>{monthLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.navigate('/profile')}
            hitSlop={10}
            style={styles.avatar}
          >
            <Ionicons name="person" size={18} color={colors.accent} />
          </Pressable>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>
            {formatMinor(total, CURRENCIES[CURRENCY])}
          </Text>
          <Text style={styles.balanceSub}>
            {accountCount === 0
              ? 'No accounts yet'
              : `${accountCount} account${accountCount === 1 ? '' : 's'}`}
          </Text>
        </View>

        {/* This month summary */}
        <View style={styles.summaryRow}>
          <SummaryTile
            label="Income"
            value={formatMinor(summary.incomeMinor, CURRENCIES[CURRENCY])}
            color={colors.positive}
            icon="arrow-down"
          />
          <SummaryTile
            label="Expenses"
            value={formatMinor(summary.expenseMinor, CURRENCIES[CURRENCY])}
            color={colors.destructive}
            icon="arrow-up"
          />
        </View>

        {/* Empty state */}
        {noActivity && (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={28} color={colors.accent} />
            <Text style={styles.emptyTitle}>Let's get started</Text>
            <Text style={styles.emptyBody}>
              {accountCount === 0
                ? 'Create your first account to start tracking money.'
                : 'Record your first transaction to see your finances here.'}
            </Text>
            <Pressable
              onPress={() =>
                router.push(
                  accountCount === 0 ? '/profile' : '/transactions/new',
                )
              }
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>
                {accountCount === 0 ? 'Create account' : 'Add transaction'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Recent activity */}
        {recent.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Pressable onPress={() => router.navigate('/activity')} hitSlop={8}>
                <Text style={styles.sectionLink}>See all</Text>
              </Pressable>
            </View>
            <View style={{ gap: spacing.sm }}>
              {recent.map((tx) => (
                <Pressable
                  key={tx.id}
                  onPress={() => router.push(`/transactions/${tx.id}`)}
                  style={({ pressed }) => [
                    styles.txRow,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.txMeta}>
                      {tx.occurredAt} · {tx.type}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color:
                          tx.type === 'income'
                            ? colors.positive
                            : tx.type === 'expense'
                            ? colors.destructive
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}
                    {formatMinor(tx.amountMinor, CURRENCIES[CURRENCY])}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating add button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/transactions/new')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

function SummaryTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  greeting: typography.h2,
  date: { ...typography.caption, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.xs,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  balanceLabel: typography.caption,
  balanceValue: typography.amountLarge,
  balanceSub: { ...typography.caption, color: colors.textTertiary },
  summaryRow: { flexDirection: 'row', gap: spacing.md },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: typography.caption,
  summaryValue: { ...typography.amount, fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sectionTitle: typography.h3,
  sectionLink: { ...typography.body, color: colors.accent },
  txRow: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  txTitle: typography.body,
  txMeta: typography.caption,
  txAmount: { ...typography.amount, fontSize: 15 },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: typography.h3,
  emptyBody: { ...typography.bodySecondary, textAlign: 'center' },
  emptyCta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  emptyCtaText: {
    ...typography.body,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
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