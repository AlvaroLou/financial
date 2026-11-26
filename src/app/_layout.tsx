import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/BiometricGate';
import { DialogProvider } from '@/components/ui/Dialog';
import { SnackbarProvider } from '@/components/ui/Snackbar';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

/** Espera os dados salvos no aparelho serem carregados antes de mostrar a interface. */
function useHydrated() {
  const [hydrated, setHydrated] = useState(useFinanceStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useFinanceStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useFinanceStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useHydrated();
  const onboarded = useFinanceStore((s) => s.onboarded);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={onboarded ? 'dark' : 'light'} />
      <SnackbarProvider>
        <DialogProvider>
          <BiometricGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Protected guard={onboarded}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="registro" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              </Stack.Protected>
              <Stack.Protected guard={!onboarded}>
                <Stack.Screen name="boas-vindas" options={{ contentStyle: { backgroundColor: colors.forest } }} />
              </Stack.Protected>
            </Stack>
          </BiometricGate>
        </DialogProvider>
      </SnackbarProvider>
    </SafeAreaProvider>
  );
}
