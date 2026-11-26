import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/primitives';
import { monthLabel } from '@/lib/dates';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';
import type { YM } from '@/types';

/** Fundo + área segura. A barra de abas já cuida da margem inferior. */
export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: colors.bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Tela rolável padrão. Nas telas com botão "+" (FAB), use `withFabClearance`. */
export function ScreenScroll({
  children,
  gap = 16,
  withFabClearance = false,
  refreshControl,
}: {
  children: ReactNode;
  gap?: number;
  withFabClearance?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingHorizontal: layout.screenPadding,
        paddingTop: 4,
        paddingBottom: withFabClearance ? layout.fabClearance + 16 : 32,
        gap,
      }}
    >
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  top,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** conteúdo acima do título (ex.: seletor Orçamento | Investimentos) */
  top?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerWrap}>
      {top}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="body" color={colors.ink2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Seletor de mês. Sem props, usa o mês global da store (compartilhado entre as telas). */
export function MonthSelector({
  value,
  onShift,
  label,
}: {
  value?: YM;
  onShift?: (delta: number) => void;
  /** texto no lugar de "Novembro 2026" (ex.: o ano, no seletor anual) */
  label?: string;
} = {}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const storeMonth = useFinanceStore((s) => s.month);
  const shiftMonth = useFinanceStore((s) => s.shiftMonth);
  const month = value ?? storeMonth;
  const shift = onShift ?? shiftMonth;
  const text = label ?? monthLabel(month);
  const yearly = label !== undefined;

  return (
    <View style={styles.monthRow}>
      <IconButton
        icon="chevronLeft"
        label={yearly ? t('common.previousYear') : t('common.previousMonth')}
        onPress={() => shift(-1)}
        background={colors.surface}
        iconSize={22}
      />
      <AppText variant="h2" accessibilityLiveRegion="polite" accessibilityLabel={t('common.selectedPeriod', { period: text })}>
        {text}
      </AppText>
      <IconButton
        icon="chevronRight"
        label={yearly ? t('common.nextYear') : t('common.nextMonth')}
        onPress={() => shift(1)}
        background={colors.surface}
        iconSize={22}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerWrap: { paddingHorizontal: layout.screenPadding, paddingTop: 12, paddingBottom: 8, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
