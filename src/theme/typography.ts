import type { TextStyle } from 'react-native';

import { fonts } from '@/theme/tokens';

/**
 * Chinês, japonês e coreano: a Inter não tem esses glifos. Em vez de deixar
 * cada caractere cair numa fonte de reserva (sem o peso certo e com o
 * espaçamento apertado da Inter), o texto inteiro usa a fonte do sistema.
 */
export function usesSystemFont(language: string | undefined | null): boolean {
  return !!language && /^(zh|ja|ko)(-|$)/i.test(language);
}

const WEIGHTS: Record<string, NonNullable<TextStyle['fontWeight']>> = {
  [fonts.regular]: '400',
  [fonts.medium]: '500',
  [fonts.semibold]: '600',
  [fonts.bold]: '700',
};

/**
 * Estilo que troca uma família da Inter pela fonte do sistema, com o mesmo
 * peso. O espaçamento negativo (títulos) é zerado: aperta os ideogramas.
 * Sem Inter no estilo (fonte já trocada), não muda nada.
 */
export function systemFontStyle(
  style: Pick<TextStyle, 'fontFamily' | 'letterSpacing'>,
  systemFamily: string,
): TextStyle | null {
  const weight = style.fontFamily ? WEIGHTS[style.fontFamily] : undefined;
  if (!weight) return null;
  return {
    fontFamily: systemFamily,
    fontWeight: weight,
    ...(typeof style.letterSpacing === 'number' && style.letterSpacing < 0 ? { letterSpacing: 0 } : null),
  };
}
