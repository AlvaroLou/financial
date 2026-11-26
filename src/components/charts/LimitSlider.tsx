import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanResponder, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tag, type TagTone } from '@/components/ui/primitives';
import { limitStatus, type LimitStatus } from '@/lib/finance';
import { brlShort, percent, spokenBrl } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

const STATUS_TONE: Record<LimitStatus, TagTone> = {
  none: 'neutral',
  ok: 'success',
  warn: 'installment',
  over: 'expense',
};

const THUMB = 28;

/**
 * Linha de categoria com slider de limite mensal.
 * A barra mostra o gasto; o marcador (bolinha) mostra o limite e pode ser arrastado.
 * O novo limite só é gravado ao soltar (evita escrever no armazenamento a cada pixel).
 */
export function LimitSlider({
  name,
  icon,
  spent,
  limit,
  max,
  step,
  onCommit,
}: {
  name: string;
  icon: IconName;
  spent: number;
  limit: number;
  /** valor máximo do slider (centavos) */
  max: number;
  /** passo (centavos) */
  step: number;
  onCommit: (limit: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(limit);
  const [width, setWidth] = useState(0);
  const dragging = useRef(false);
  const startLimit = useRef(limit);
  const widthRef = useRef(0);
  widthRef.current = width;

  useEffect(() => {
    if (!dragging.current) setDraft(limit);
  }, [limit]);

  // 0 = sem limite (arrastar até o início remove o limite)
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.round(v / step) * step));
  const latest = useRef(draft);
  latest.current = draft;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragging.current = true;
          startLimit.current = latest.current;
        },
        onPanResponderMove: (_e, g) => {
          if (widthRef.current <= 0) return;
          setDraft(clamp(startLimit.current + (g.dx / widthRef.current) * max));
        },
        onPanResponderRelease: () => {
          dragging.current = false;
          onCommit(latest.current);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          onCommit(latest.current);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [max, step, onCommit],
  );

  const status = limitStatus(spent, draft);
  const fill = { none: colors.accentAlt, ok: colors.accent, warn: colors.installment, over: colors.expenseFill }[status];
  const ratio = draft > 0 ? spent / draft : 0;
  const fillPct = Math.min(1, spent / max);
  const thumbPct = Math.min(1, draft / max);
  const left = Math.max(0, Math.min(width - THUMB, thumbPct * width - THUMB / 2));

  const adjust = (delta: number) => {
    const next = clamp(draft + delta);
    setDraft(next);
    onCommit(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tint }]}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" color={colors.ink2} tabular>
            {draft > 0
              ? t('limit.of', { spent: brlShort(spent), limit: brlShort(draft), pct: percent(ratio, 0) })
              : t('limit.spentNoLimit', { spent: brlShort(spent) })}
          </AppText>
        </View>
        <Tag tone={STATUS_TONE[status]}>{t(`limit.${status}`)}</Tag>
      </View>

      <View
        style={styles.sliderArea}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('limit.a11yLabel', { name })}
        accessibilityValue={{
          text:
            draft > 0
              ? t('limit.a11yValue', { limit: spokenBrl(draft), spent: spokenBrl(spent), pct: percent(ratio, 0) })
              : t('limit.a11yValueNone', { spent: spokenBrl(spent) }),
        }}
        accessibilityActions={[
          { name: 'increment', label: t('limit.increase', { step: spokenBrl(step) }) },
          { name: 'decrement', label: t('limit.decrease', { step: spokenBrl(step) }) },
        ]}
        onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === 'increment' ? step : -step)}
        {...pan.panHandlers}
      >
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <View style={[styles.fill, { width: `${fillPct * 100}%`, backgroundColor: fill }]} />
        </View>
        <View
          style={[
            styles.thumb,
            { left, backgroundColor: colors.raised, borderColor: colors.primary, shadowColor: colors.shadow },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderArea: { height: 44, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  thumb: {
    position: 'absolute',
    top: (44 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
