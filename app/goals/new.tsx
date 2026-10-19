import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  createGoal,
  getGoal,
  updateGoal,
} from '../../src/features/goals/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function GoalFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const goal = await getGoal(id);
        if (!goal) {
          setError('Goal not found.');
        } else {
          setName(goal.name);
          setTarget(
            (goal.targetAmountMinor / 10 ** CURRENCIES.NGN.minorUnits).toFixed(
              CURRENCIES.NGN.minorUnits,
            ),
          );
          setTargetDate(goal.targetDate ?? '');
          setDescription(goal.description ?? '');
        }
      } catch (e) {
        setError(`Failed to load: ${(e as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id]);

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Enter a goal name.');
      return;
    }
    const parsed = parseAmountToMinor(target, CURRENCIES.NGN.minorUnits);
    if (!parsed.ok) {
      setError(parsed.error === 'empty' ? 'Enter a target amount.' : 'Invalid amount.');
      return;
    }
    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setError('Target date must be YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        targetAmountMinor: parsed.minor,
        currencyCode: 'NGN',
        targetDate: targetDate || null,
        description: description.trim() || null,
      };
      if (isEdit && id) {
        await updateGoal(id, payload);
      } else {
        await createGoal(payload);
      }
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit goal' : 'New goal'}</Text>
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
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emergency fund"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>Target amount</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>{CURRENCIES.NGN.symbol}</Text>
            <TextInput
              value={target}
              onChangeText={setTarget}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>Target date (optional, YYYY-MM-DD)</Text>
          <TextInput
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="2026-06-30"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Why this goal matters"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          />

          {error && <Text style={styles.error}>{error}</Text>}
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
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
  error: { color: colors.destructive, ...typography.body },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  saveText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});