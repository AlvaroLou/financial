import '@/i18n';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricGate } from '@/components/BiometricGate';
import { DialogProvider } from '@/components/ui/Dialog';
import { SnackbarProvider } from '@/components/ui/Snackbar';
import { applyLanguage } from '@/i18n';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

type PersistedStore = {
  persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void };
};
const STORES: PersistedStore[] = [useFinanceStore, useInvestStore, useMarketStore];

/** Espera os dados salvos no aparelho (orçamento, carteira e cotações) antes de mostrar a interface. */
function useHydrated() {
  const all = () => STORES.every((s) => s.persist.hasHydrated());
  const [hydrated, setHydrated] = useState(all);
  useEffect(() => {
    const unsubs = STORES.map((s) => s.persist.onFinishHydration(() => setHydrated(all())));
    setHydrated(all());
    return () => unsubs.forEach((u) => u());
  }, []);
  return hydrated;
}

const MODAL = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hydrated = useHydrated();
  const language = useFinanceStore((s) => s.settings.language);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  // idioma salvo (ou do aparelho) — também muda a formatação de valores e datas.
  // A 1ª vez é aplicada já no render (antes de qualquer tela aparecer); depois, por efeito.
  const firstApply = useRef(false);
  if (hydrated && !firstApply.current) {
    firstApply.current = true;
    applyLanguage(language);
  }
  useEffect(() => {
    if (hydrated) applyLanguage(language);
  }, [hydrated, language]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { colors, base } = useTheme();
  const onboarded = useFinanceStore((s) => s.onboarded);
  const router = useRouter();
  const pathname = usePathname();
  // o app reabre no último usado (lido antes que as telas atualizem o modo)
  const initialMode = useRef(useFinanceStore.getState().settings.appMode).current;

  useEffect(() => {
    if (onboarded && initialMode === 'investimentos' && pathname === '/') router.replace('/carteira');
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fundo nativo da janela (atrás das telas, do teclado e das transições) na cor do tema
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const navTheme = useMemo(() => {
    const nav = base === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...nav,
      colors: { ...nav.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.primary },
    };
  }, [base, colors]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={!onboarded || base === 'dark' ? 'light' : 'dark'} />
      <SnackbarProvider>
        <DialogProvider>
          <BiometricGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Protected guard={onboarded}>
                <Stack.Screen name="(orcamento)" options={{ animation: 'fade' }} />
                <Stack.Screen name="(investimentos)" options={{ animation: 'fade' }} />
                <Stack.Screen name="registro" options={MODAL} />
                <Stack.Screen name="meta" options={MODAL} />
                <Stack.Screen name="categoria" options={MODAL} />
                <Stack.Screen name="conta" options={MODAL} />
                <Stack.Screen name="exportar" options={MODAL} />
                <Stack.Screen name="aparencia" options={MODAL} />
                <Stack.Screen name="idioma" options={MODAL} />
                <Stack.Screen name="invest/ativo/[id]" />
                <Stack.Screen name="invest/ativo-form" options={MODAL} />
                <Stack.Screen name="invest/operacao" options={MODAL} />
                <Stack.Screen name="invest/taxas" />
                <Stack.Screen name="invest/rebalanceamento" />
                <Stack.Screen name="invest/simulador" />
                <Stack.Screen name="invest/imposto-de-renda" />
                <Stack.Screen name="invest/instituicoes" />
              </Stack.Protected>
              <Stack.Protected guard={!onboarded}>
                <Stack.Screen name="boas-vindas" options={{ contentStyle: { backgroundColor: colors.hero } }} />
              </Stack.Protected>
            </Stack>
          </BiometricGate>
        </DialogProvider>
      </SnackbarProvider>
    </NavThemeProvider>
  );
}
