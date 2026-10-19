import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, parseAmountToMinor } from '../../src/domain/money';
import { listCategories, type Category } from '../../src/features/categories/repository';
import {
  createBudget,
  deleteBudget,
  getBudgetById,
  toggleBudgetActive,
  updateBudget,
  type BudgetPeriodType,
} from '../../src/features/budgets/repository';
import { colors, spacing, typography } from '../../src/theme';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BudgetFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [periodType, setPeriodType] = useState<BudgetPeriodType>('monthly');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories('expense');
        setCategories(cats);

        if (id) {
          const budget = await getBudgetById(id);
          if (!budget) {
            setError('Budget not found.');
          } else {
            setName(budget.name);
            setCategoryId(budget.categoryId);
            setAmount(
              (budget.amountMinor / 10 ** CURRENCIES.NGN.minorUnits).toFixed(
                CURRENCIES.NGN.minorUnits,
              ),
            );
            setPeriodType(budget.periodType);
            setStartDate(budget.startDate);
            setEndDate(budget.endDate ?? '');
            setIsActive(budget.isActive);
          }
        } else if (cats[0]) {
          setCategoryId(cats[0].id);
        }
      } catch (e) {
        setError(`Failed to load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    setError(null);

    const parsed = parseAmountToMinor(amount, CURRENCIES.NGN.minorUnits);
    if (!parsed.ok) {
      setError(parsed.error === 'empty' ? 'Enter an amount.' : 'Invalid amount.');
      return;
    }
    if (!categoryId) {
      setError('Select a category.');
      return;
    }
    if (periodType === 'custom') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        setError('Dates must be in YYYY-MM-DD format.');
        return;
      }
      if (endDate < startDate) {
        setError('End date must be on or after start date.');
        return;
      }
    }

    const finalName =
      name.trim() ||
      categories.find((c) => c.id === categoryId)?.name ||
      'Budget';

    setSaving(true);
    try {
      const payload = {
        name: finalName,
        categoryId,
        amountMinor: parsed.minor,
        currencyCode: 'NGN',
        periodType,
        startDate: periodType === 'monthly' ? todayStr() : startDate,
        endDate: periodType === 'custom' ? endDate : null,
      };
      if (isEdit && id) {
        await updateBudget(id, payload);
      } else {
        await createBudget(payload);
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!id) return;
    await toggleBudgetActive(id);
    setIsActive(!isActive);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete budget?',
      'The budget will be removed. Historical transactions are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(id);
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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit budget' : 'New budget'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Name (optional)</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Auto-named from category if left blank"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.pillRow}>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && { color: colors.accent }]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Limit</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>{CURRENCIES.NGN.symbol}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>Period</Text>
          <View style={styles.segRow}>
            {(['monthly', 'custom'] as const).map((p) => {
              const active = periodType === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriodType(p)}
                  style={[styles.seg, active && styles.segActive]}
                >
                  <Text style={[styles.segText, active && { color: colors.accent }]}>
                    {p === 'monthly' ? 'Monthly' : 'Custom dates'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {periodType === 'custom' && (
            <>
              <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2025-01-01"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
              <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2025-12-31"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          {isEdit && (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Pressable onPress={handlePauseToggle} style={styles.secondaryBtn}>
                <Ionicons
                  name={isActive ? 'pause-outline' : 'play-outline'}
                  size={18}
                  color={colors.textPrimary}
                />
                <Text style={styles.secondaryBtnText}>
                  {isActive ? 'Pause budget' : 'Resume budget'}
                </Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={[styles.secondaryBtn, { borderColor: colors.destructive }]}>
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>
                  Delete budget
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            saving && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create budget'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
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
    paddingVertical: spacing.lg,
  },
  headerTitle: typography.h3,
  label: typography.caption,
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  pillActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  pillText: { ...typography.body, fontFamily: 'Inter_500Medium', color: colors.textPrimary },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  currency: { ...typography.amountLarge, color: colors.textSecondary },
  amountInput: { ...typography.amountLarge, flex: 1, paddingVertical: 0 },
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  segActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  segText: { ...typography.body, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary },
  error: { color: colors.destructive, ...typography.body },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  secondaryBtnText: { ...typography.body, fontFamily: 'Inter_500Medium' },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  saveText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});