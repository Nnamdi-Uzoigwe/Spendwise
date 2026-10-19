import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '../../src/features/notifications/service';
import { colors, spacing, typography } from '../../src/theme';

export default function NotificationSettingsScreen() {
  const [perm, setPerm] = useState<NotificationPermission>('undetermined');
  const [checking, setChecking] = useState(true);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    getNotificationPermission().then((p) => {
      setPerm(p);
      setChecking(false);
    });
  }, []);

  const handleEnable = async () => {
    if (perm === 'denied') {
      Linking.openSettings();
      return;
    }
    setAsking(true);
    const result = await requestNotificationPermission();
    setPerm(result);
    setAsking(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {checking ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          <View style={styles.card}>
            <Ionicons
              name={perm === 'granted' ? 'notifications' : 'notifications-off-outline'}
              size={28}
              color={perm === 'granted' ? colors.positive : colors.textTertiary}
            />
            <Text style={styles.cardTitle}>
              {perm === 'granted'
                ? 'Notifications are on'
                : perm === 'denied'
                ? 'Notifications are blocked'
                : 'Notifications are off'}
            </Text>
            <Text style={styles.cardBody}>
              {perm === 'granted'
                ? 'You\'ll be reminded about upcoming bills and budget limits.'
                : perm === 'denied'
                ? 'Open your device settings to allow Spendwise notifications.'
                : 'Turn on reminders for bills and budget limits. You can change this anytime.'}
            </Text>

            {perm !== 'granted' && (
              <Pressable
                onPress={handleEnable}
                disabled={asking}
                style={[styles.cta, asking && { opacity: 0.4 }]}
              >
                <Text style={styles.ctaText}>
                  {asking
                    ? 'Requesting…'
                    : perm === 'denied'
                    ? 'Open settings'
                    : 'Enable notifications'}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.note}>
            Reminders are scheduled locally on this device. Nothing is sent to a server.
          </Text>
        </View>
      )}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  cardTitle: typography.h3,
  cardBody: typography.bodySecondary,
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaText: { ...typography.body, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  note: { ...typography.caption, textAlign: 'center', paddingHorizontal: spacing.lg },
});