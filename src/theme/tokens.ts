/**
 * Tokens que NÃO dependem do tema (fontes, raios, espaçamentos, medidas) e as
 * cores dos gráficos. As cores da interface vêm de `useTheme()` (theme/ThemeProvider).
 */
import type { ThemeBase, ThemeColors } from '@/theme/palette';

/**
 * Paleta categórica dos gráficos (validada com o script do skill dataviz nas duas
 * bases: separação para daltonismo e contraste). A ORDEM dos slots é o que a torna
 * segura — não reordene. Cada base tem seus próprios tons. Sempre há legenda com
 * valores (4 tons do modo claro ficam abaixo de 3:1 sobre o branco).
 */
export const SERIES: Record<ThemeBase, readonly string[]> = {
  light: ['#257DE0', '#F47230', '#00B894', '#F2A600', '#EE7FAC', '#008A17', '#6A4CE2', '#EC4647'],
  dark: ['#338CED', '#E76624', '#00A888', '#D28E05', '#E24D8B', '#0AAC23', '#9887EF', '#EB6263'],
};

/** "Outros": tudo o que passa de 8 séries é agrupado nesse cinza (nunca uma 9ª cor). */
export const OTHER_SERIES: Record<ThemeBase, string> = { light: '#8A9590', dark: '#7F8B86' };

/** Slots fixos das categorias padrão (a cor segue a categoria, nunca o ranking). */
const CATEGORY_SLOTS: Record<string, number> = { moradia: 0, alimentacao: 1, transporte: 2, saude: 3, lazer: 4, cartao: 5 };

/**
 * id -> cor. Categorias padrão têm slot fixo; "outros" é o cinza de "Outros";
 * as criadas pelo usuário ocupam os slots livres na ordem de criação e, acabando
 * os 8, caem no cinza (o gráfico as agrupa em "Outros").
 */
export function categoryColorMap(categories: { id: string }[], base: ThemeBase): Record<string, string> {
  const series = SERIES[base];
  const taken = new Set(categories.map((c) => CATEGORY_SLOTS[c.id]).filter((s) => s !== undefined));
  const free = series.map((_, i) => i).filter((i) => !taken.has(i));
  return Object.fromEntries(
    categories.map((c) => {
      if (c.id === 'outros') return [c.id, OTHER_SERIES[base]];
      const fixed = CATEGORY_SLOTS[c.id];
      if (fixed !== undefined) return [c.id, series[fixed]];
      const slot = free.shift();
      return [c.id, slot === undefined ? OTHER_SERIES[base] : series[slot]];
    }),
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
