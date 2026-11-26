/**
 * Tokens que NÃO dependem do tema (fontes, raios, espaçamentos, medidas) e as
 * cores dos gráficos. As cores da interface vêm de `useTheme()` (theme/ThemeProvider).
 */
import type { ThemeColors } from '@/theme/palette';

/**
 * Cores de categoria nos gráficos (validadas p/ daltonismo e distinção, ordem fixa;
 * a cor segue a categoria, nunca o ranking). Âmbar e vermelho ficam reservados
 * para parcelas/despesas. Funcionam sobre fundo claro e escuro e sempre vêm com
 * legenda e valores.
 */
export const chartColors = {
  moradia: '#257DE0',
  alimentacao: '#008A17',
  transporte: '#6A4CE2',
  lazer: '#EE7FAC',
  saude: '#00B894',
  cartao: '#0B8BA8',
  outros: '#7D8C85',
} as const;

/** Reserva para categorias criadas pelo usuário (ordem fixa de criação). */
export const chartFallback = ['#F47230', '#EC4647', '#F2A600', '#9B59B6'] as const;

/**
 * id -> cor. Categorias padrão têm cor fixa; as criadas pelo usuário recebem a
 * paleta de reserva na ordem em que aparecem na lista (= ordem de criação), então
 * a cor de uma categoria não muda quando o ranking de gastos muda.
 */
export function categoryColorMap(categories: { id: string }[]): Record<string, string> {
  const fixed = chartColors as Record<string, string>;
  let custom = 0;
  return Object.fromEntries(
    categories.map((c) => [c.id, fixed[c.id] ?? chartFallback[custom++ % chartFallback.length]]),
  );
}

export const radius = { sm: 6, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const layout = {
  screenPadding: 20,
  tabBarHeight: 64,
  fabSize: 56,
  /** espaço extra no fim das telas iniciais para o FAB nunca cobrir conteúdo */
  fabClearance: 88,
  minTouch: 44,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export function cardShadow(colors: ThemeColors) {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: colors.base === 'dark' ? 0 : 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: colors.base === 'dark' ? 0 : 1,
  };
}

export function fabShadow(colors: ThemeColors) {
  return {
    shadowColor: colors.base === 'dark' ? '#000000' : colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  };
}
