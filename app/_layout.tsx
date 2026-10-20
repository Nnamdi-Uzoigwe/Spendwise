import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '../src/database/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await getDatabase();
      } catch (e) {
        console.warn('DB init failed', e);
      } finally {
        setDbReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="transactions/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="transactions/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="budgets/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="goals/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="goals/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="goals/contribute"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="recurring/new"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}