import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { CURRENCIES, type CurrencyCode } from '../../src/domain/money';
import { createAccount } from '../../src/features/accounts/repository';
import { getDatabase } from '../../src/database/db';
import { colors, spacing, typography } from '../../src/theme';

const PAGES = [
  {
    icon: 'wallet-outline' as const,
    title: 'Understand your money',
    body: 'Track income and expenses in one place. See exactly where your money goes.',
  },
  {
    icon: 'pie-chart-outline' as const,
    title: 'Plan with confidence',
    body: 'Set budgets, create savings goals, and watch your progress in real time.',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'Your data stays private',
    body: 'Everything is stored on your device. No accounts, no cloud, no tracking.',
  },
];

const SETUP_STEP = PAGES.length;

const COMMON_CURRENCIES: CurrencyCode[] = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetup = step === SETUP_STEP;

  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };
  const handleSkip = () => setStep(SETUP_STEP);

  const handleFinish = async () => {
    if (!accountName.trim()) {
      setError('Give your first account a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAccount({
        name: accountName.trim(),
        type: 'cash',
        currencyCode: currency,
      });
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE profile
         SET primary_currency = ?, onboarding_complete = 1, updated_at = ?
         WHERE id = 1`,
        currency,
        new Date().toISOString(),
      );
      router.replace('/(tabs)');
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {!isSetup && step < PAGES.length - 1 && (
        <View style={styles.topBar}>
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {!isSetup ? (
          <View style={styles.pageWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name={PAGES[step].icon} size={44} color={colors.accent} />
            </View>
            <Text style={styles.pageTitle}>{PAGES[step].title}</Text>
            <Text style={styles.pageBody}>{PAGES[step].body}</Text>

            <View style={styles.dotsRow}>
              {PAGES.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>

            <View style={styles.pageButtons}>
              {step > 0 && (
                <Pressable onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              )}
              <Pressable onPress={handleNext} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable onPress={handleBack} style={styles.backRow} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <Text style={styles.setupTitle}>Set up Spendwise</Text>
            <Text style={styles.setupSubtitle}>
              Choose your primary currency and name your first account.
            </Text>

            <Text style={styles.label}>Currency</Text>
            <View style={styles.pillRow}>
              {COMMON_CURRENCIES.map((c) => {
                const active = currency === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && { color: colors.accent }]}>
                      {CURRENCIES[c].symbol} {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>First account name</Text>
            <TextInput
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. Cash, Wallet, Main account"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              autoFocus
            />

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        )}

        {isSetup && (
          <Pressable
            onPress={handleFinish}
            disabled={saving || !accountName.trim()}
            style={({ pressed }) => [
              styles.finishBtn,
              (saving || !accountName.trim()) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Get started</Text>
            )}
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
  },
  skipText: { ...typography.body, color: colors.textSecondary },
  pageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pageTitle: { ...typography.h1, textAlign: 'center' },
  pageBody: {
    ...typography.bodySecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  pageButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
    width: '100%',
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { ...typography.body, fontFamily: 'Inter_500Medium' },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.body,
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  setupTitle: { ...typography.h1, marginTop: spacing.md },
  setupSubtitle: typography.bodySecondary,
  label: typography.caption,
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
  pillText: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  error: { color: colors.destructive, ...typography.body },
  finishBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
});