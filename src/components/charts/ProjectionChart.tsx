import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { monthAbbr } from '@/lib/dates';
import { brlShort, compactNumber } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import type { YM } from '@/types';

/** Barras das parcelas dos próximos meses (âmbar = parcelas, em todo o app). */
export function ProjectionChart({
  data,
  height = 120,
}: {
  data: { ym: YM; total: number }[];
  height?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.total));
  const summary = data.map((d) => `${monthAbbr(d.ym)} ${brlShort(d.total)}`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t('plan.projectionA11y', { list: summary })} style={styles.row}>
      {data.map((d) => {
        const h = Math.max(4, Math.round((d.total / max) * height));
        return (
          <View key={d.ym} style={styles.col}>
            <AppText variant="caption" color={colors.installmentText} tabular style={{ fontSize: 11 }} numberOfLines={1}>
              {d.total > 0 ? compactNumber(d.total) : '—'}
            </AppText>
            <View style={{ height, justifyContent: 'flex-end', alignSelf: 'stretch' }}>
              <View style={[styles.bar, { height: h, backgroundColor: colors.installment }]} />
            </View>
            <AppText variant="caption" color={colors.ink2} numberOfLines={1}>
              {monthAbbr(d.ym)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: {
    width: '100%',
    minWidth: 20,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
});
