import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import {
  deleteGoal,
  getGoal,
  listGoalEntries,
  setGoalStatus,
  type GoalEntry,
  type GoalProgress,
} from '../../src/features/goals/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<GoalProgress | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([getGoal(id), listGoalEntries(id)]).then(([g, e]) => {
        setGoal(g);
        setEntries(e);
        setLoading(false);
      });
    }, [id]),
  );

  const handleComplete = async () => {
    if (!id) return;
    await setGoalStatus(id, 'completed');
    const g = await getGoal(id);
    setGoal(g);
  };

  const handleArchive = async () => {
    if (!id) return;
    await setGoalStatus(id, 'archived');
    const g = await getGoal(id);
    setGoal(g);
  };

  const handleReactivate = async () => {
    if (!id) return;
    await setGoalStatus(id, 'active');
    const g = await getGoal(id);
    setGoal(g);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete goal?',
      'The goal and its entire contribution history will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(id);
            router.back();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={typography.bodySecondary}>Goal not found.</Text>
      </SafeAreaView>
    );
  }

  const reached = goal.savedMinor >= goal.targetAmountMinor;
  const cappedPct = Math.min(goal.progressPct, 100);
  const archived = goal.status === 'archived';
  const completed = goal.status === 'completed';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{goal.name}</Text>
        <Pressable
          onPress={() => router.push(`/goals/new?id=${goal.id}`)}
          hitSlop={12}
        >
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              <Text style={styles.savedLabel}>Saved</Text>
              <Text style={styles.savedValue}>
                {formatMinor(goal.savedMinor, CURRENCIES.NGN)}
              </Text>
              <Text style={styles.targetLabel}>
                of {formatMinor(goal.targetAmountMinor, CURRENCIES.NGN)} target
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${cappedPct}%`,
                      backgroundColor: reached ? colors.positive : colors.accent,
                    },
                  ]}
                />
              </View>

              <View style={styles.heroRow}>
                <Text style={styles.heroMeta}>
                  {Math.round(goal.progressPct)}% complete
                </Text>
                {reached ? (
                  <Text style={[styles.heroMeta, { color: colors.positive, fontFamily: 'Inter_600SemiBold' }]}>
                    Goal reached 🎉
                  </Text>
                ) : (
                  <Text style={styles.heroMeta}>
                    {formatMinor(goal.remainingMinor, CURRENCIES.NGN)} to go
                  </Text>
                )}
              </View>

              {goal.targetDate && (
                <Text style={styles.heroMeta}>Target date: {goal.targetDate}</Text>
              )}
              {goal.description && (
                <Text style={[styles.heroMeta, { marginTop: spacing.sm }]}>{goal.description}</Text>
              )}
            </View>

            {!archived && (
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() =>
                    router.push(`/goals/contribute?goalId=${goal.id}&mode=contribution`)
                  }
                  style={[styles.actionBtn, { backgroundColor: colors.positive }]}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Contribute</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push(`/goals/contribute?goalId=${goal.id}&mode=withdrawal`)
                  }
                  style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                >
                  <Ionicons name="remove" size={18} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Withdraw</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.statusRow}>
              {!completed && !archived && (
                <Pressable onPress={handleComplete} style={styles.statusBtn}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.statusBtnText}>Mark complete</Text>
                </Pressable>
              )}
              {completed && (
                <Pressable onPress={handleArchive} style={styles.statusBtn}>
                  <Ionicons name="archive-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.statusBtnText}>Archive goal</Text>
                </Pressable>
              )}
              {archived && (
                <Pressable onPress={handleReactivate} style={styles.statusBtn}>
                  <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.statusBtnText}>Reactivate</Text>
                </Pressable>
              )}
              <Pressable onPress={handleDelete} style={[styles.statusBtn, { borderColor: colors.destructive }]}>
                <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                <Text style={[styles.statusBtnText, { color: colors.destructive }]}>Delete</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>History</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No contributions yet.</Text>
        }
        renderItem={({ item }) => {
          const isContrib = item.entryType === 'contribution';
          return (
            <View style={styles.entryRow}>
              <Ionicons
                name={isContrib ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={22}
                color={isContrib ? colors.positive : colors.destructive}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>
                  {isContrib ? 'Contribution' : 'Withdrawal'}
                </Text>
                <Text style={styles.entryMeta}>
                  {item.occurredAt}
                  {item.notes ? ` · ${item.notes}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.entryAmount,
                  { color: isContrib ? colors.positive : colors.destructive },
                ]}
              >
                {isContrib ? '+' : '−'}
                {formatMinor(item.amountMinor, CURRENCIES.NGN)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  headerTitle: { ...typography.h3, flex: 1, textAlign: 'center' },
  editLink: { ...typography.body, color: colors.accent, fontFamily: 'Inter_600SemiBold' },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  savedLabel: typography.caption,
  savedValue: typography.amountLarge,
  targetLabel: typography.caption,
  progressTrack: {
    height: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: { height: 10, borderRadius: 5 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  heroMeta: typography.caption,
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  actionBtnText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  statusBtnText: { ...typography.caption, fontFamily: 'Inter_500Medium' },
  sectionTitle: { ...typography.h3, marginBottom: spacing.sm },
  emptyText: { ...typography.bodySecondary, paddingVertical: spacing.lg, textAlign: 'center' },
  entryRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  entryTitle: typography.body,
  entryMeta: typography.caption,
  entryAmount: { ...typography.amount, fontSize: 15 },
});