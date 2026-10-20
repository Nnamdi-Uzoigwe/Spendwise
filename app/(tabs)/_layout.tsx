import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { getDatabase } from '../../src/database/db';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ onboarding_complete: number }>(
        'SELECT onboarding_complete FROM profile WHERE id = 1',
      );
      setOnboarded(row?.onboarding_complete === 1);
      setChecking(false);
    })();
  }, []);

  if (checking) return null;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}