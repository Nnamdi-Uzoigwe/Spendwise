// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import { useEffect, useMemo, useState } from 'react';
// import {
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { CURRENCIES, parseAmountToMinor } from '../../src/domain/money';
// import { listCategories, type Category } from '../../src/features/categories/repository';
// import { getAccountBalances, type AccountBalance } from '../../src/features/accounts/repository';
// import { colors, spacing, typography } from '../../src/theme';
// import { useLocalSearchParams } from 'expo-router';
// import { useRef } from 'react';
// import {
//   createTransaction,
//   getTransactionDetail,
//   updateTransaction,
// } from '../../src/features/transactions/repository';

// type TxType = 'expense' | 'income' | 'transfer';

// const TYPES: { key: TxType; label: string; color: string }[] = [
//   { key: 'expense', label: 'Expense', color: colors.destructive },
//   { key: 'income', label: 'Income', color: colors.positive },
//   { key: 'transfer', label: 'Transfer', color: colors.accent },
// ];

// export default function NewTransactionScreen() {
//       const { id } = useLocalSearchParams<{ id?: string }>();
//   const isEdit = !!id;
//   const hydrated = useRef(false);
//   const [type, setType] = useState<TxType>('expense');
//   const [amount, setAmount] = useState('');
//   const [description, setDescription] = useState('');
//   const [accountId, setAccountId] = useState<string | null>(null);
//   const [destAccountId, setDestAccountId] = useState<string | null>(null);
//   const [categoryId, setCategoryId] = useState<string | null>(null);

//   const [accounts, setAccounts] = useState<AccountBalance[]>([]);
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//     (async () => {
//       const [accs, cats] = await Promise.all([
//         getAccountBalances(),
//         listCategories(),
//       ]);
//       setAccounts(accs);
//       setCategories(cats);

//       if (id) {
//         const tx = await getTransactionDetail(id);
//         if (tx) {
//           setType(tx.type);
//           setAmount(
//             (tx.amountMinor / 10 ** CURRENCIES.NGN.minorUnits).toFixed(
//               CURRENCIES.NGN.minorUnits,
//             ),
//           );
//           setDescription(tx.description);
//           setAccountId(tx.accountId);
//           setDestAccountId(tx.destinationAccountId);
//           setCategoryId(tx.categoryId);
//         }
//       } else {
//         if (accs[0]) setAccountId(accs[0].accountId);
//         if (accs[1]) setDestAccountId(accs[1].accountId);
//       }
//       hydrated.current = true;
//       setLoading(false);
//     })();
//   }, [id]);


//   const visibleCategories = useMemo(
//     () => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
//     [categories, type],
//   );

//     useEffect(() => {
//     if (hydrated.current) setCategoryId(null);
//   }, [type]);

//   const handleSave = async () => {
//     setError(null);

//     const parsed = parseAmountToMinor(amount, CURRENCIES.NGN.minorUnits);
//     if (!parsed.ok) {
//       setError(parsed.error === 'empty' ? 'Enter an amount.' : 'Invalid amount.');
//       return;
//     }
//     if (!accountId) {
//       setError('Select an account.');
//       return;
//     }
//     if (!description.trim()) {
//       setError('Enter a description.');
//       return;
//     }
//     if (type === 'transfer') {
//       if (!destAccountId || destAccountId === accountId) {
//         setError('Choose a different destination account.');
//         return;
//       }
//     } else if (!categoryId) {
//       setError('Select a category.');
//       return;
//     }

//         setSaving(true);
//     try {
//       const payload = {
//         type,
//         amountMinor: parsed.minor,
//         currencyCode: 'NGN',
//         accountId,
//         destinationAccountId: type === 'transfer' ? destAccountId : null,
//         categoryId: type === 'transfer' ? null : categoryId,
//         description: description.trim(),
//         occurredAt: new Date().toISOString().slice(0, 10),
//       };
//       if (isEdit) {
//         await updateTransaction(id!, payload);
//       } else {
//         await createTransaction(payload);
//       }
//       router.back();
//     } catch (e) {
//       setError((e as Error).message);
//       setSaving(false);
//     }

//   if (loading) {
//     return (
//       <SafeAreaView style={[styles.root, styles.center]}>
//         <ActivityIndicator color={colors.accent} />
//       </SafeAreaView>
//     );
//   }

//   const hasAccounts = accounts.length > 0;

//   return (
//     <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
//       <View style={styles.header}>
//         <Pressable onPress={() => router.back()} hitSlop={12}>
//           <Ionicons name="close" size={26} color={colors.textPrimary} />
//         </Pressable>
//         <Text style={styles.headerTitle}>
//           {isEdit ? 'Edit transaction' : 'New transaction'}
//         </Text>
//         <View style={{ width: 26 }} />
//       </View>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={{ flex: 1 }}
//       >
//         <ScrollView
//           contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}
//           keyboardShouldPersistTaps="handled"
//         >
//           {/* Type selector */}
//           <View style={styles.segRow}>
//             {TYPES.map((t) => {
//               const active = type === t.key;
//               return (
//                 <Pressable
//                   key={t.key}
//                   onPress={() => setType(t.key)}
//                   style={[
//                     styles.seg,
//                     { borderColor: active ? t.color : colors.border },
//                     active && { backgroundColor: t.color + '14' },
//                   ]}
//                 >
//                   <Text
//                     style={[
//                       styles.segText,
//                       { color: active ? t.color : colors.textSecondary },
//                     ]}
//                   >
//                     {t.label}
//                   </Text>
//                 </Pressable>
//               );
//             })}
//           </View>

//           {/* Amount */}
//           <View style={styles.amountBox}>
//             <Text style={styles.currency}>{CURRENCIES.NGN.symbol}</Text>
//             <TextInput
//               value={amount}
//               onChangeText={setAmount}
//               placeholder="0.00"
//               placeholderTextColor={colors.textTertiary}
//               keyboardType="decimal-pad"
//               style={styles.amountInput}
//             />
//           </View>

//           {!hasAccounts && (
//             <Text style={styles.error}>Create an account first (Profile tab).</Text>
//           )}

//           {/* From account */}
//           <Text style={styles.label}>
//             {type === 'transfer' ? 'From account' : 'Account'}
//           </Text>
//           <View style={styles.pillRow}>
//             {accounts.map((a) => {
//               const active = accountId === a.accountId;
//               return (
//                 <Pressable
//                   key={a.accountId}
//                   onPress={() => setAccountId(a.accountId)}
//                   style={[styles.pill, active && styles.pillActive]}
//                 >
//                   <Text
//                     style={[
//                       styles.pillText,
//                       active && { color: colors.accent },
//                     ]}
//                   >
//                     {a.name}
//                   </Text>
//                 </Pressable>
//               );
//             })}
//           </View>

//           {/* Destination account (transfer only) */}
//           {type === 'transfer' && (
//             <>
//               <Text style={styles.label}>To account</Text>
//               <View style={styles.pillRow}>
//                 {accounts.map((a) => {
//                   const active = destAccountId === a.accountId;
//                   const disabled = accountId === a.accountId;
//                   return (
//                     <Pressable
//                       key={a.accountId}
//                       onPress={() => !disabled && setDestAccountId(a.accountId)}
//                       disabled={disabled}
//                       style={[
//                         styles.pill,
//                         active && styles.pillActive,
//                         disabled && { opacity: 0.35 },
//                       ]}
//                     >
//                       <Text
//                         style={[
//                           styles.pillText,
//                           active && { color: colors.accent },
//                         ]}
//                       >
//                         {a.name}
//                       </Text>
//                     </Pressable>
//                   );
//                 })}
//               </View>
//             </>
//           )}

//           {/* Category (not for transfers) */}
//           {type !== 'transfer' && (
//             <>
//               <Text style={styles.label}>Category</Text>
//               <View style={styles.pillRow}>
//                 {visibleCategories.map((c) => {
//                   const active = categoryId === c.id;
//                   return (
//                     <Pressable
//                       key={c.id}
//                       onPress={() => setCategoryId(c.id)}
//                       style={[styles.pill, active && styles.pillActive]}
//                     >
//                       <Text
//                         style={[
//                           styles.pillText,
//                           active && { color: colors.accent },
//                         ]}
//                       >
//                         {c.name}
//                       </Text>
//                     </Pressable>
//                   );
//                 })}
//               </View>
//             </>
//           )}

//           {/* Description */}
//           <Text style={styles.label}>Description</Text>
//           <TextInput
//             value={description}
//             onChangeText={setDescription}
//             placeholder="e.g. Lunch at Café"
//             placeholderTextColor={colors.textTertiary}
//             style={styles.input}
//           />

//           {error && <Text style={styles.error}>{error}</Text>}
//         </ScrollView>

//         <Pressable
//           onPress={handleSave}
//           disabled={saving || !hasAccounts}
//           style={({ pressed }) => [
//             styles.saveBtn,
//             (saving || !hasAccounts) && { opacity: 0.4 },
//             pressed && { opacity: 0.85 },
//           ]}
//         >
//           <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save transaction'}</Text>
//         </Pressable>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl },
//   center: { justifyContent: 'center', alignItems: 'center' },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: spacing.lg,
//   },
//   headerTitle: typography.h3,
//   segRow: { flexDirection: 'row', gap: spacing.sm },
//   seg: {
//     flex: 1,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingVertical: spacing.md,
//     alignItems: 'center',
//   },
//   segText: { ...typography.body, fontFamily: 'Inter_600SemiBold' },
//   amountBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.card,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 16,
//     paddingHorizontal: spacing.lg,
//     paddingVertical: spacing.md,
//     gap: spacing.sm,
//   },
//   currency: { ...typography.amountLarge, color: colors.textSecondary },
//   amountInput: {
//     ...typography.amountLarge,
//     flex: 1,
//     paddingVertical: 0,
//   },
//   label: typography.caption,
//   pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
//   pill: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 999,
//     paddingHorizontal: spacing.lg,
//     paddingVertical: spacing.sm,
//     backgroundColor: colors.card,
//   },
//   pillActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
//   pillText: { ...typography.body, fontFamily: 'Inter_500Medium', color: colors.textPrimary },
//   input: {
//     ...typography.body,
//     backgroundColor: colors.card,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 12,
//     paddingHorizontal: spacing.lg,
//     paddingVertical: spacing.md,
//   },
//   error: { color: colors.destructive, ...typography.body },
//   saveBtn: {
//     backgroundColor: colors.accent,
//     borderRadius: 14,
//     paddingVertical: spacing.lg,
//     alignItems: 'center',
//     marginVertical: spacing.lg,
//   },
//   saveText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
// })
// }


import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { listCategories, type Category } from '../../src/features/categories/repository';
import { getAccountBalances, type AccountBalance } from '../../src/features/accounts/repository';
import {
  createTransaction,
  getTransactionDetail,
  updateTransaction,
} from '../../src/features/transactions/repository';
import { colors, spacing, typography } from '../../src/theme';

type TxType = 'expense' | 'income' | 'transfer';

const TYPES: { key: TxType; label: string; color: string }[] = [
  { key: 'expense', label: 'Expense', color: colors.destructive },
  { key: 'income', label: 'Income', color: colors.positive },
  { key: 'transfer', label: 'Transfer', color: colors.accent },
];

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const isEdit = !!id;

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accs, cats] = await Promise.all([
          getAccountBalances(),
          listCategories(),
        ]);
        if (cancelled) return;
        setAccounts(accs);
        setCategories(cats);

        if (id) {
          const tx = await getTransactionDetail(id);
          if (cancelled) return;
          if (!tx) {
            setError('Transaction not found.');
          } else {
            setType(tx.type);
            setAmount(
              (tx.amountMinor / 10 ** CURRENCIES.NGN.minorUnits).toFixed(
                CURRENCIES.NGN.minorUnits,
              ),
            );
            setDescription(tx.description);
            setAccountId(tx.accountId);
            setDestAccountId(tx.destinationAccountId);
            setCategoryId(tx.categoryId);
          }
        } else {
          if (accs[0]) setAccountId(accs[0].accountId);
          if (accs[1]) setDestAccountId(accs[1].accountId);
        }
      } catch (e) {
        if (!cancelled) setError(`Failed to load: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')),
    [categories, type],
  );

  const handleTypePress = (next: TxType) => {
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
    if (!accountId) {
      setError('Select an account.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description.');
      return;
    }
    if (type === 'transfer') {
      if (!destAccountId || destAccountId === accountId) {
        setError('Choose a different destination account.');
        return;
      }
    } else if (!categoryId) {
      setError('Select a category.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type,
        amountMinor: parsed.minor,
        currencyCode: 'NGN',
        accountId,
        destinationAccountId: type === 'transfer' ? destAccountId : null,
        categoryId: type === 'transfer' ? null : categoryId,
        description: description.trim(),
        occurredAt: new Date().toISOString().slice(0, 10),
      };
      if (isEdit && id) {
        await updateTransaction(id, payload);
      } else {
        await createTransaction(payload);
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

  const hasAccounts = accounts.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit transaction' : 'New transaction'}
        </Text>
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
            {TYPES.map((t) => {
              const active = type === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => handleTypePress(t.key)}
                  style={[
                    styles.seg,
                    { borderColor: active ? t.color : colors.border },
                    active && { backgroundColor: t.color + '14' },
                  ]}
                >
                  <Text
                    style={[
                      styles.segText,
                      { color: active ? t.color : colors.textSecondary },
                    ]}
                  >
                    {t.label}
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

          {!hasAccounts && (
            <Text style={styles.error}>Create an account first (Profile tab).</Text>
          )}

          <Text style={styles.label}>
            {type === 'transfer' ? 'From account' : 'Account'}
          </Text>
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

          {type === 'transfer' && (
            <>
              <Text style={styles.label}>To account</Text>
              <View style={styles.pillRow}>
                {accounts.map((a) => {
                  const active = destAccountId === a.accountId;
                  const disabled = accountId === a.accountId;
                  return (
                    <Pressable
                      key={a.accountId}
                      onPress={() => !disabled && setDestAccountId(a.accountId)}
                      disabled={disabled}
                      style={[
                        styles.pill,
                        active && styles.pillActive,
                        disabled && { opacity: 0.35 },
                      ]}
                    >
                      <Text style={[styles.pillText, active && { color: colors.accent }]}>
                        {a.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {type !== 'transfer' && (
            <>
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
            </>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Lunch at Café"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>

        <Pressable
          onPress={handleSave}
          disabled={saving || !hasAccounts}
          style={({ pressed }) => [
            styles.saveBtn,
            (saving || !hasAccounts) && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save transaction'}
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
  segRow: { flexDirection: 'row', gap: spacing.sm },
  seg: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  segText: { ...typography.body, fontFamily: 'Inter_600SemiBold' },
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
  amountInput: {
    ...typography.amountLarge,
    flex: 1,
    paddingVertical: 0,
  },
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
  pillText: { ...typography.body, fontFamily: 'Inter_500Medium', color: colors.textPrimary },
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
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  saveText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});