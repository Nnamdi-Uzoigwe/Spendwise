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
import { listGoals, type GoalProgress } from '../../src/features/goals/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function GoalsScreen() {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listGoals().then((rows) => {
        setGoals(rows);
        setLoading(false);
      });
    }, []),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Goals</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : goals.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="flag-outline" size={40} color={colors.accent} />
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>
            Create a goal — emergency fund, travel, a new laptop — and track your progress.
          </Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.huge }}
          renderItem={({ item }) => {
            const reached = item.savedMinor >= item.targetAmountMinor;
            const cappedPct = Math.min(item.progressPct, 100);
            const archived = item.status === 'archived';
            const completed = item.status === 'completed' || reached;

            return (
              <Pressable
                onPress={() => router.push(`/goals/${item.id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {formatMinor(item.savedMinor, CURRENCIES.NGN)} of{' '}
                      {formatMinor(item.targetAmountMinor, CURRENCIES.NGN)}
                    </Text>
                  </View>
                  {archived ? (
                    <Text style={styles.badgeNeutral}>Archived</Text>
                  ) : completed ? (
                    <Text style={styles.badgeSuccess}>Reached</Text>
                  ) : (
                    <Text style={styles.pctText}>{Math.round(item.progressPct)}%</Text>
                  )}
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${cappedPct}%`,
                        backgroundColor: archived ? colors.textTertiary : colors.accent,
                      },
                    ]}
                  />
                </View>
                {item.targetDate && !archived && (
                  <Text style={styles.targetDate}>Target: {item.targetDate}</Text>
                )}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/goals/new')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  title: typography.h1,
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
  meta: typography.caption,
  pctText: { ...typography.amount, fontSize: 18, color: colors.accent },
  badgeSuccess: {
    ...typography.caption,
    color: colors.positive,
    borderWidth: 1,
    borderColor: colors.positive,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: 'Inter_600SemiBold',
  },
  badgeNeutral: {
    ...typography.caption,
    color: colors.textTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  targetDate: { ...typography.caption, color: colors.textTertiary },
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