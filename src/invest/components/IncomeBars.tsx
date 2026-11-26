import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { monthAbbr, monthLabel } from '@/lib/dates';
import { brlShort, compactNumber } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { YM } from '@/types';

/** Barras dos proventos mês a mês (uma série: sem legenda; tocar numa barra mostra o valor). */
export function IncomeBars({ data, height = 120, hidden }: { data: { ym: YM; total: number }[]; height?: number; hidden?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const a = active !== null ? data[active] : null;

  return (
    <View style={{ gap: 10 }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('invest.incomeScreen.barsA11y', {
          list: hidden ? '' : data.map((d) => `${monthAbbr(d.ym)} ${brlShort(d.total)}`).join(', '),
        })}
        style={styles.row}
      >
        {data.map((d, i) => {
          const h = d.total > 0 ? Math.max(4, Math.round((d.total / max) * height)) : 2;
          return (
            <Pressable key={d.ym} style={styles.col} onPress={() => setActive(active === i ? null : i)} hitSlop={4}>
              <View style={{ height, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' }}>
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: d.total > 0 ? colors.accent : colors.track, opacity: active === null || active === i ? 1 : 0.45 },
                  ]}
                />
              </View>
              <AppText variant="caption" color={colors.ink2} style={{ fontSize: 10 }} numberOfLines={1}>
                {monthAbbr(d.ym)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.tooltip, { backgroundColor: colors.segment }]} accessibilityLiveRegion="polite">
        <AppText variant="caption" color={colors.ink2}>
          {a
            ? `${monthLabel(a.ym)}: ${hidden ? '••••' : brlShort(a.total)}`
            : t('invest.incomeScreen.barsHint', { max: hidden ? '••••' : compactNumber(max) })}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', minWidth: 8, maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  tooltip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 34, justifyContent: 'center' },
});
