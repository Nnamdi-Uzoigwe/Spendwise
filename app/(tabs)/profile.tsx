import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import {
  createAccount,
  getAccountBalances,
  type AccountBalance,
} from '../../src/features/accounts/repository';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../src/theme';

export default function ProfileScreen() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await getAccountBalances();
    setBalances(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await createAccount({ name: trimmed, type: 'cash', currencyCode: 'NGN' });
      setName('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Profile</Text>
            <Pressable
        onPress={() => router.push('/budgets')}
        style={styles.linkRow}
      >
        <Ionicons name="pie-chart-outline" size={20} color={colors.accent} />
        <Text style={styles.linkText}>Budgets</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
            <Pressable
        onPress={() => router.push('/recurring')}
        style={styles.linkRow}
      >
        <Ionicons name="repeat-outline" size={20} color={colors.accent} />
        <Text style={styles.linkText}>Recurring bills & salary</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
            <Pressable
        onPress={() => router.push('/settings/notifications')}
        style={styles.linkRow}
      >
        <Ionicons name="notifications-outline" size={20} color={colors.accent} />
        <Text style={styles.linkText}>Notifications</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
      <Text style={styles.sectionTitle}>Accounts</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : balances.length === 0 ? (
        <Text style={styles.empty}>No accounts yet. Create one below.</Text>
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(a) => a.accountId}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.balance}>
                {formatMinor(item.balanceMinor, CURRENCIES.NGN)}
              </Text>
            </View>
          )}
        />
      )}

      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New account name"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <Pressable
          onPress={handleCreate}
          disabled={saving || !name.trim()}
          style={({ pressed }) => [
            styles.button,
            (!name.trim() || saving) && styles.buttonDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.buttonText}>{saving ? 'Creating…' : 'Add account'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.md },
  title: typography.h1,
  sectionTitle: typography.h3,
  empty: typography.bodySecondary,
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: typography.h3,
  balance: { ...typography.amount, fontSize: 16 },
  form: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
    linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  linkText: { ...typography.body, flex: 1, fontFamily: 'Inter_500Medium' },
});