import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useFinanceStore } from '@/store/useFinanceStore';
import { buildColors, type AppId, type ThemeBase, type ThemeColors } from '@/theme/palette';

/**
 * Tema do app ("dois apps em um"): a base (claro/escuro/automático) é global e
 * cada app tem a sua cor de destaque. As telas de cada app ficam dentro de um
 * `<ThemeScope app="…">`; fora dele (telas modais), vale o app aberto por último.
 *
 * Uso: `const { colors } = useTheme()` e `useThemedStyles(makeStyles)` — os
 * estilos são recriados quando o tema muda.
 */
interface ThemeState {
  base: ThemeBase;
  palettes: Record<AppId, ThemeColors>;
}

const ThemeStateContext = createContext<ThemeState | null>(null);
const AppScopeContext = createContext<AppId | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeMode = useFinanceStore((s) => s.settings.themeMode);
  const accentOrcamento = useFinanceStore((s) => s.settings.accentOrcamento);
  const accentInvest = useFinanceStore((s) => s.settings.accentInvest);
  const appMode = useFinanceStore((s) => s.settings.appMode);
  const system = useColorScheme();

  const base: ThemeBase = themeMode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : themeMode;
  const orcamento = useMemo(() => buildColors(accentOrcamento, base), [accentOrcamento, base]);
  const investimentos = useMemo(() => buildColors(accentInvest, base), [accentInvest, base]);
  const state = useMemo(() => ({ base, palettes: { orcamento, investimentos } }), [base, orcamento, investimentos]);

  return (
    <ThemeStateContext.Provider value={state}>
      <AppScopeContext.Provider value={appMode}>{children}</AppScopeContext.Provider>
    </ThemeStateContext.Provider>
  );
}

/** Fixa o app (e a cor de destaque) de um trecho da árvore. */
export function ThemeScope({ app, children }: { app: AppId; children: ReactNode }) {
  return <AppScopeContext.Provider value={app}>{children}</AppScopeContext.Provider>;
}

export function useTheme(): { colors: ThemeColors; base: ThemeBase; app: AppId; palettes: Record<AppId, ThemeColors> } {
  const state = useContext(ThemeStateContext);
  const app = useContext(AppScopeContext) ?? 'orcamento';
  if (!state) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>.');
  return { colors: state.palettes[app], base: state.base, app, palettes: state.palettes };
}

/** `const styles = useThemedStyles(makeStyles)` — `factory` deve ser uma função de módulo (estável). */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
