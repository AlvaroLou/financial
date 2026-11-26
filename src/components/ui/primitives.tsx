import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { ThemeColors } from '@/theme/palette';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { cardShadow, fonts, layout, radius } from '@/theme/tokens';

/* ------------------------------------------------------------------ Card */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ Tag */

export type TagTone = 'neutral' | 'installment' | 'success' | 'expense' | 'accent';

export function Tag({ children, tone = 'neutral', icon }: { children: string; tone?: TagTone; icon?: IconName }) {
  const { colors } = useTheme();
  const t = {
    neutral: { bg: colors.tag, fg: colors.tagText },
    installment: { bg: colors.installmentTint, fg: colors.installmentText },
    success: { bg: colors.incomeTint, fg: colors.income },
    expense: { bg: colors.expenseTint, fg: colors.expense },
    accent: { bg: colors.accentSoft, fg: colors.onAccentSoft },
  }[tone];
  return (
    <View style={[tagStyles.tag, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={12} color={t.fg} /> : null}
      <AppText
        variant="caption"
        color={t.fg}
        numberOfLines={1}
        style={{ fontFamily: tone === 'installment' ? fonts.bold : fonts.semibold, fontSize: 11 }}
      >
        {children}
      </AppText>
    </View>
  );
}

const tagStyles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    maxWidth: '100%',
  },
});

/* ------------------------------------------------------------------ ProgressBar */

interface ProgressBarProps {
  /** 0..1 (valores maiores que 1 são limitados visualmente) */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  label?: string;
}

export function ProgressBar({ value, color, trackColor, height = 8, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: trackColor ?? colors.track, overflow: 'hidden' }}
    >
      <View
        style={{ width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: color ?? colors.accent }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ Buttons */

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  background?: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  background,
  size = layout.minTouch,
  iconSize = 20,
  disabled,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon name={icon} size={iconSize} color={color ?? colors.ink} />
    </Pressable>
  );
}

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'danger' | 'highlight';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  /** highlight: cor de destaque clara sobre o cartão escuro (telas "herói") */
  variant?: ButtonVariant;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ label, onPress, icon, variant = 'primary', disabled, compact, style, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    soft: { bg: colors.accentSoft, fg: colors.onAccentSoft, border: colors.accentSoft },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.outline },
    danger: { bg: colors.surface, fg: colors.expense, border: colors.expenseTint },
    highlight: { bg: colors.highlight, fg: colors.onHighlight, border: colors.highlight },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyles.button,
        compact && { minHeight: 44, borderRadius: radius.md },
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 18 : 20} color={palette.fg} /> : null}
      <AppText variant="h3" color={palette.fg} style={{ fontSize: compact ? 15 : 16, flexShrink: 1 }} numberOfLines={2} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
});

/* ------------------------------------------------------------------ SectionHeader */

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[sectionStyles.header, style]}>
      <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </AppText>
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={6}
          style={({ pressed }) => ({ minHeight: layout.minTouch, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
        >
          <AppText variant="label" color={colors.primary} style={{ fontFamily: fonts.bold }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouch,
    gap: 12,
  },
});

/* ------------------------------------------------------------------ Segmented */

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  /** usa a cor de destaque no segmento ativo (padrão: superfície com texto escuro) */
  accentActive?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accentActive,
  compact,
  accessibilityLabel,
}: SegmentedProps<T>) {
  const { colors } = useTheme();
  const h = compact ? 34 : 40;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[segmentStyles.segment, { backgroundColor: colors.segment }]}
    >
      {options.map((o) => {
        const active = o.value === value;
        const bg = active ? (accentActive ? colors.accent : colors.segmentActive) : 'transparent';
        const fg = active ? (accentActive ? colors.onAccent : colors.ink) : colors.ink2;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[
              segmentStyles.item,
              { minHeight: h, backgroundColor: bg },
              active && !accentActive ? cardShadow(colors) : null,
            ]}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={fg} /> : null}
            <AppText
              variant="label"
              color={fg}
              numberOfLines={1}
              style={{ fontSize: compact ? 12 : 14, fontFamily: active ? fonts.bold : fonts.semibold, flexShrink: 1 }}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const segmentStyles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 14,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
});

/* ------------------------------------------------------------------ Chip */

export function Chip({
  label,
  active,
  onPress,
  icon,
  trailingIcon,
  accessibilityLabel,
  tone = 'accent',
}: {
  /** sem rótulo = chip só com ícone (informe `accessibilityLabel`) */
  label?: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  trailingIcon?: IconName;
  accessibilityLabel?: string;
  /** soft: seleção mais discreta (ex.: etiquetas) */
  tone?: 'accent' | 'soft';
}) {
  const { colors } = useTheme();
  const activeBg = tone === 'soft' ? colors.accentSoft : colors.accent;
  const activeFg = tone === 'soft' ? colors.onAccentSoft : colors.onAccent;
  const fg = active ? activeFg : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        {
          backgroundColor: active ? activeBg : colors.surface,
          borderColor: active ? (tone === 'soft' ? colors.primary : activeBg) : colors.outline,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={label ? 16 : 20} color={fg} /> : null}
      {label ? (
        <AppText variant="label" color={fg} style={{ fontFamily: fonts.semibold }} numberOfLines={1}>
          {label}
        </AppText>
      ) : null}
      {trailingIcon ? <Icon name={trailingIcon} size={16} color={fg} /> : null}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

/* ------------------------------------------------------------------ Divider / ListRow */

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

/** Linha tocável com ícone em círculo, título, subtítulo e valor (listas de ajustes, contas…). */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  trailingColor,
  first,
  onPress,
  accessibilityHint,
  chevron = true,
  iconColor,
  iconBackground,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  trailing?: string;
  trailingColor?: string;
  first?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  chevron?: boolean;
  iconColor?: string;
  iconBackground?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60 },
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.bg },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: iconBackground ?? colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={iconColor ?? colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.ink2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? (
        <AppText variant="bodyStrong" tabular color={trailingColor}>
          {trailing}
        </AppText>
      ) : null}
      {chevron && onPress ? <Icon name="chevronRight" size={20} color={colors.ink2} /> : null}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow(colors),
    },
  });
