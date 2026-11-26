import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { systemFontStyle } from '@/theme/typography';

/** fonte do sistema (chinês, japonês, coreano); na web, o RN-web troca "System" pela pilha do sistema */
const SYSTEM_FAMILY = Platform.select({ android: 'sans-serif', default: 'System' });

export type TextVariant =
  | 'display'
  | 'title'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'captionStrong'
  | 'eyebrow';

const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** padrão: cor do texto principal do tema */
  color?: string;
  /** números alinhados em colunas (valores em R$) */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, tabular = false, align, style, ...rest }: AppTextProps) {
  const { colors, systemFont } = useTheme();
  const script = systemFont ? systemFontStyle(StyleSheet.flatten([variants[variant], style]) ?? {}, SYSTEM_FAMILY) : null;
  return (
    <Text
      {...rest}
      style={[
        variants[variant],
        { color: color ?? colors.ink },
        tabular && { fontVariant: ['tabular-nums'] },
        align ? { textAlign: align } : null,
        style,
        script,
      ]}
    />
  );
}
