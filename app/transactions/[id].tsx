import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import {
  deleteTransaction,
  getTransactionDetail,
  type TransactionDetail,
} from '../../src/features/transactions/repository';
import { colors, spacing, typography } from '../../src/theme';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getTransactionDetail(id).then((row) => {
        setTx(row);
        setLoading(false);
      });
    }, [id]),
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete transaction?',
      'This will permanently remove the transaction and update account balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
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

  if (!tx) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={typography.bodySecondary}>Transaction not found.</Text>
      </SafeAreaView>
    );
  }

  const isExpense = tx.type === 'expense';
  const isIncome = tx.type === 'income';
  const amountColor = isExpense
    ? colors.destructive
    : isIncome
    ? colors.positive
    : colors.accent;
  const sign = isExpense ? '−' : isIncome ? '+' : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/transactions/new', params: { id } })}
          hitSlop={12}
        >
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.amountBlock}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {sign}
          {formatMinor(tx.amountMinor, CURRENCIES.NGN)}
        </Text>
        <Text style={styles.typeLabel}>{tx.type.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Description" value={tx.description} />
        <Row label="Account" value={tx.accountName} />
        {tx.destinationAccountName && (
          <Row label="To account" value={tx.destinationAccountName} />
        )}
        {tx.categoryName && <Row label="Category" value={tx.categoryName} />}
        <Row label="Date" value={tx.occurredAt} />
      </View>

      <Pressable onPress={handleDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Delete transaction</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  editLink: { ...typography.body, color: colors.accent, fontFamily: 'Inter_600SemiBold' },
  amountBlock: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  amount: { ...typography.amountLarge, fontSize: 40 },
  typeLabel: { ...typography.caption, letterSpacing: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: typography.caption,
  rowValue: { ...typography.body, textAlign: 'right', flexShrink: 1 },
  deleteBtn: {
    marginTop: 'auto',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.destructive,
    marginBottom: spacing.lg,
  },
  deleteText: {
    ...typography.body,
    color: colors.destructive,
    fontFamily: 'Inter_600SemiBold',
  },
});