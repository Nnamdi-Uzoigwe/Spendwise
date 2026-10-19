import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
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
import { addGoalEntry } from '../../src/features/goals/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function ContributeScreen() {
  const params = useLocalSearchParams<{ goalId?: string; mode?: string }>();
  const goalId = typeof params.goalId === 'string' ? params.goalId : '';
  const mode: 'contribution' | 'withdrawal' =
    params.mode === 'withdrawal' ? 'withdrawal' : 'contribution';

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isContribution = mode === 'contribution';
  const title = isContribution ? 'Add contribution' : 'Record withdrawal';
  const cta = isContribution ? 'Add to goal' : 'Withdraw from goal';
  const btnColor = isContribution ? colors.positive : colors.destructive;

  const handleSave = async () => {
    setError(null);
    const parsed = parseAmountToMinor(amount, CURRENCIES.NGN.minorUnits);
    if (!parsed.ok) {
      setError(parsed.error === 'empty' ? 'Enter an amount.' : 'Invalid amount.');
      return;
    }
    if (!goalId) {
      setError('Missing goal.');
      return;
    }
    setSaving(true);
    try {
      await addGoalEntry(goalId, {
        amountMinor: parsed.minor,
        entryType: mode,
        occurredAt: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.amountBox}>
            <Text style={[styles.currency, { color: btnColor }]}>
              {CURRENCIES.NGN.symbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.amountInput}
            />
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={isContribution ? 'e.g. Monthly auto-save' : 'e.g. Paid for flight'}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: btnColor },
            saving && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : cta}</Text>
        </Pressable>
      </KeyboardAvoidingView>
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
  currency: { ...typography.amountLarge },
  amountInput: { ...typography.amountLarge, flex: 1, paddingVertical: 0 },
  error: { color: colors.destructive, ...typography.body },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  saveText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});