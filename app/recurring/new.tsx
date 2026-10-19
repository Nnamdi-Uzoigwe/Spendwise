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
import { getAccountBalances, type AccountBalance } from '../../src/features/accounts/repository';
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  toggleScheduleActive,
  updateSchedule,
} from '../../src/features/recurring/repository';
import type { RecurrenceFrequency } from '../../src/features/recurring/recurrence';
import { colors, spacing, typography } from '../../src/theme';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const FREQUENCIES: { key: RecurrenceFrequency; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function RecurringFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = !!id;

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [interval, setInterval] = useState('1');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [accs, cats] = await Promise.all([
          getAccountBalances(),
          listCategories(),
        ]);
        setAccounts(accs);
        setCategories(cats);

        if (id) {
          const s = await getSchedule(id);
          if (!s) {
            setError('Schedule not found.');
          } else {
            setType(s.type);
            setAmount(
              (s.amountMinor / 10 ** CURRENCIES.NGN.minorUnits).toFixed(
                CURRENCIES.NGN.minorUnits,
              ),
            );
            setDescription(s.description);
            setAccountId(s.accountId);
            setCategoryId(s.categoryId);
            setFrequency(s.frequency);
            setInterval(String(s.interval));
            setStartDate(s.startDate);
            setEndDate(s.endDate ?? '');
            setIsActive(s.isActive);
          }
        } else {
          if (accs[0]) setAccountId(accs[0].accountId);
        }
      } catch (e) {
        setError(`Failed to load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const visibleCategories = categories.filter((c) =>
    c.type === (type === 'income' ? 'income' : 'expense'),
  );

  const handleTypeChange = (next: 'expense' | 'income') => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  };

  const handleSave = async () => {
    setError(null);

    const parsed = parseAmountToMinor(amount, CURRENCIES.NGN.minorUnits);
    if (!parsed.ok) {
      setError(parsed.error === 'empty' ? 'Enter an amount.' : 'Invalid amount.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description.');
      return;
    }
    if (!accountId) {
      setError('Select an account.');
      return;
    }
    if (!categoryId) {
      setError('Select a category.');
      return;
    }
    const iv = Number(interval);
    if (!Number.isInteger(iv) || iv < 1) {
      setError('Interval must be a positive whole number.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError('Start date must be YYYY-MM-DD.');
      return;
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setError('End date must be YYYY-MM-DD.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        amountMinor: parsed.minor,
        currencyCode: 'NGN',
        accountId,
        categoryId,
        description: description.trim(),
        frequency,
        interval: iv,
        startDate,
        endDate: endDate || null,
      };
      if (isEdit && id) {
        await updateSchedule(id, payload);
      } else {
        await createSchedule(payload);
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!id) return;
    await toggleScheduleActive(id);
    setIsActive(!isActive);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete schedule?',
      'The schedule will be removed. Transactions already created from it are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSchedule(id);
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit schedule' : 'New schedule'}</Text>
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
          <View style={styles.segRow}>
            {(['expense', 'income'] as const).map((t) => {
              const active = type === t;
              const color = t === 'income' ? colors.positive : colors.destructive;
              return (
                <Pressable
                  key={t}
                  onPress={() => handleTypeChange(t)}
                  style={[
                    styles.seg,
                    { borderColor: active ? color : colors.border },
                    active && { backgroundColor: color + '14' },
                  ]}
                >
                  <Text style={[styles.segText, { color: active ? color : colors.textSecondary }]}>
                    {t === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Rent, Spotify, Salary"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>Account</Text>
          <View style={styles.pillRow}>
            {accounts.map((a) => {
              const active = accountId === a.accountId;
              return (
                <Pressable
                  key={a.accountId}
                  onPress={() => setAccountId(a.accountId)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && { color: colors.accent }]}>
                    {a.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.pillRow}>
            {visibleCategories.map((c) => {
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

          <Text style={styles.label}>Repeats</Text>
          <View style={styles.segRow}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFrequency(f.key)}
                  style={[styles.seg, active && styles.segActive]}
                >
                  <Text style={[styles.segText, active && { color: colors.accent }]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Every N periods</Text>
          <TextInput
            value={interval}
            onChangeText={setInterval}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            style={styles.input}
          />

          <Text style={styles.label}>End date (optional, YYYY-MM-DD)</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Leave blank for indefinite"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

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
                  {isActive ? 'Pause schedule' : 'Resume schedule'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={[styles.secondaryBtn, { borderColor: colors.destructive }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                <Text style={[styles.secondaryBtnText, { color: colors.destructive }]}>
                  Delete schedule
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create schedule'}
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
  segRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  seg: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  segActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  segText: { ...typography.body, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary },
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
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
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
  error: { color: colors.destructive, ...typography.body },
});