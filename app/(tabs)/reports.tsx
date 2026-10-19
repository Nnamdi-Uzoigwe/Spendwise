import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import {
  getReportsData,
  type ReportPeriod,
  type ReportsData,
} from '../../src/features/reports/repository';
import { colors, spacing, typography } from '../../src/theme';

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getReportsData('NGN', period).then((d) => {
        setData(d);
        setLoading(false);
      });
    }, [period]),
  );

  const hasData = !!data && (data.incomeMinor > 0 || data.expenseMinor > 0);
  const prevChangePct =
    data && data.previousExpenseMinor !== null && data.previousExpenseMinor > 0
      ? ((data.expenseMinor - data.previousExpenseMinor) / data.previousExpenseMinor) * 100
      : null;

  const maxTrendValue =
    data && data.trend.length > 0
      ? Math.max(...data.trend.map((t) => Math.max(t.expenseMinor, t.incomeMinor)), 1)
      : 1;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Reports</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {PERIODS.map((p) => {
          const active = period === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodPill, active && styles.periodPillActive]}
            >
              <Text style={[styles.periodText, active && { color: colors.accent }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading || !data ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.huge }}
          showsVerticalScrollIndicator={false}
        >
          {!hasData ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.accent} />
              <Text style={styles.emptyTitle}>No activity</Text>
              <Text style={styles.emptyBody}>
                No transactions in {data.periodLabel.toLowerCase()}.
              </Text>
            </View>
          ) : (
            <>
              {/* Net cash flow */}
              <View style={styles.netCard}>
                <Text style={styles.netLabel}>Net cash flow · {data.periodLabel}</Text>
                <Text
                  style={[
                    styles.netValue,
                    { color: data.netMinor >= 0 ? colors.positive : colors.destructive },
                  ]}
                >
                  {data.netMinor >= 0 ? '+' : '−'}
                  {formatMinor(Math.abs(data.netMinor), CURRENCIES.NGN)}
                </Text>
                <View style={styles.netSubRow}>
                  <View style={styles.netSubItem}>
                    <Text style={styles.netSubLabel}>Income</Text>
                    <Text style={[styles.netSubValue, { color: colors.positive }]}>
                      {formatMinor(data.incomeMinor, CURRENCIES.NGN)}
                    </Text>
                  </View>
                  <View style={styles.netDivider} />
                  <View style={styles.netSubItem}>
                    <Text style={styles.netSubLabel}>Expenses</Text>
                    <Text style={[styles.netSubValue, { color: colors.destructive }]}>
                      {formatMinor(data.expenseMinor, CURRENCIES.NGN)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Category breakdown */}
              {data.categorySpending.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Spending by category</Text>
                  <View style={{ gap: spacing.md }}>
                    {data.categorySpending.map((c) => (
                      <View key={c.categoryId} style={styles.catRow}>
                        <View style={styles.catTop}>
                          <Text style={styles.catName} numberOfLines={1}>{c.categoryName}</Text>
                          <Text style={styles.catAmount}>
                            {formatMinor(c.amountMinor, CURRENCIES.NGN)}
                          </Text>
                        </View>
                        <View style={styles.catBarTrack}>
                          <View
                            style={[
                              styles.catBarFill,
                              { width: `${Math.max(2, c.percentage)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.catPct}>{c.percentage.toFixed(1)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Trend */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trend</Text>
                <View style={styles.chartBox}>
                  <View style={styles.chartRow}>
                    {data.trend.map((t) => {
                      const expH = (t.expenseMinor / maxTrendValue) * 100;
                      const incH = (t.incomeMinor / maxTrendValue) * 100;
                      return (
                        <View key={t.dateKey} style={styles.chartCol}>
                          <View style={styles.chartBars}>
                            <View
                              style={[
                                styles.barExpense,
                                { height: `${Math.max(expH, t.expenseMinor > 0 ? 4 : 0)}%` },
                              ]}
                            />
                            <View
                              style={[
                                styles.barIncome,
                                { height: `${Math.max(incH, t.incomeMinor > 0 ? 4 : 0)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.chartLabels}>
                    {data.trend.map((t, i) => {
                      const showEvery =
                        data.trend.length <= 12 ? 1 : Math.ceil(data.trend.length / 6);
                      const show = i % showEvery === 0 || i === data.trend.length - 1;
                      return (
                        <Text key={t.dateKey} style={[styles.chartLabel, { opacity: show ? 1 : 0 }]}>
                          {t.label}
                        </Text>
                      );
                    })}
                  </View>
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
                      <Text style={styles.legendText}>Expenses</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
                      <Text style={styles.legendText}>Income</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Insights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={{ gap: spacing.sm }}>
                  {data.largestExpense && (
                    <View style={styles.insightCard}>
                      <Text style={styles.insightLabel}>Largest expense</Text>
                      <Text style={styles.insightValue} numberOfLines={1}>
                        {data.largestExpense.description}
                      </Text>
                      <Text style={styles.insightSub}>
                        {formatMinor(data.largestExpense.amountMinor, CURRENCIES.NGN)} · {data.largestExpense.categoryName}
                      </Text>
                    </View>
                  )}
                  {data.mostUsedCategory && (
                    <View style={styles.insightCard}>
                      <Text style={styles.insightLabel}>Most used category</Text>
                      <Text style={styles.insightValue}>{data.mostUsedCategory.name}</Text>
                      <Text style={styles.insightSub}>
                        {data.mostUsedCategory.count} transaction{data.mostUsedCategory.count === 1 ? '' : 's'}
                      </Text>
                    </View>
                  )}
                  {prevChangePct !== null && (
                    <View style={styles.insightCard}>
                      <Text style={styles.insightLabel}>vs. previous period</Text>
                      <Text
                        style={[
                          styles.insightValue,
                          { color: prevChangePct > 0 ? colors.destructive : colors.positive },
                        ]}
                      >
                        {prevChangePct > 0 ? '+' : ''}{prevChangePct.toFixed(1)}% spending
                      </Text>
                      <Text style={styles.insightSub}>
                        {prevChangePct > 0 ? 'More than' : 'Less than'} the previous period
                      </Text>
                    </View>
                  )}
                  {prevChangePct === null && data.previousExpenseMinor !== null && (
                    <View style={styles.insightCard}>
                      <Text style={styles.insightLabel}>vs. previous period</Text>
                      <Text style={styles.insightSub}>No previous period data to compare.</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  title: typography.h1,
  periodRow: { gap: spacing.sm, paddingVertical: spacing.md },
  periodPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  periodPillActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  periodText: { ...typography.body, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  emptyTitle: typography.h3,
  emptyBody: { ...typography.bodySecondary, textAlign: 'center' },
  netCard: {
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
  netLabel: typography.caption,
  netValue: { ...typography.amountLarge, fontSize: 38 },
  netSubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  netSubItem: { flex: 1, gap: 2 },
  netSubLabel: typography.caption,
  netSubValue: { ...typography.amount, fontSize: 15 },
  netDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionTitle: typography.h3,
  catRow: { gap: 4 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  catName: { ...typography.body, flex: 1 },
  catAmount: { ...typography.amount, fontSize: 14 },
  catBarTrack: {
    height: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  catBarFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  catPct: { ...typography.caption, color: colors.textTertiary },
  chartBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
  },
  chartCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 1,
  },
  barExpense: {
    flex: 1,
    backgroundColor: colors.destructive,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 0,
  },
  barIncome: {
    flex: 1,
    backgroundColor: colors.positive,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 0,
  },
  chartLabels: { flexDirection: 'row', gap: 2 },
  chartLabel: { ...typography.caption, fontSize: 9, flex: 1, textAlign: 'center', color: colors.textTertiary },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: typography.caption,
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 2,
  },
  insightLabel: typography.caption,
  insightValue: { ...typography.h3, color: colors.textPrimary },
  insightSub: { ...typography.caption, color: colors.textSecondary },
});