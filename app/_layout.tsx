import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDatabase } from "../src/database/db";
import { colors } from "../src/theme";

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
    getDatabase()
      .then(() => setDbReady(true))
      .catch((e) => console.warn("DB init failed", e));
  }, []);

  if (!fontsLoaded || !dbReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="transactions/new"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="transactions/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="budgets/new"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="goals/new"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen name="goals/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="goals/contribute"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="recurring/new"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
