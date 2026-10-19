import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENCIES, formatMinor } from '../../src/domain/money';
import { listTransactions, type Transaction } from '../../src/features/transactions/repository';
import { colors, spacing, typography } from '../../src/theme';


export default function ActivityScreen() {
  const [items, setItems] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      listTransactions().then(setItems);
    }, []),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Activity</Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet.</Text>
          <Text style={styles.emptyHint}>Add your first one from the Home tab.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
                    renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/transactions/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.description}</Text>
                <Text style={styles.rowMeta}>{item.occurredAt} · {item.type}</Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  {
                    color:
                      item.type === 'income'
                        ? colors.positive
                        : item.type === 'expense'
                        ? colors.destructive
                        : colors.textSecondary,
                  },
                ]}
              >
                {item.type === 'expense' ? '−' : item.type === 'income' ? '+' : ''}
                {formatMinor(item.amountMinor, CURRENCIES.NGN)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  title: typography.h1,
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: typography.h3,
  emptyHint: typography.bodySecondary,
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowTitle: typography.h3,
  rowMeta: typography.caption,
  rowAmount: { ...typography.amount, fontSize: 16 },
});