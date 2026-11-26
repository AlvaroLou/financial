import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { monthAbbr, monthLabel } from '@/lib/dates';
import { brlShort, compactNumber } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import { SERIES } from '@/theme/tokens';
import type { YM } from '@/types';

export interface EvolutionPoint {
  ym: YM;
  /** patrimônio no fim do mês (null = sem foto daquele mês) */
  patrimonio: number | null;
  investido: number;
}

const H = 160;
const PAD = { top: 12, right: 8, bottom: 22, left: 44 };

/**
 * Evolução da carteira: patrimônio (fotos mensais) × total investido (das
 * operações). Linhas de 2px, um eixo só, legenda sempre visível; tocar/arrastar
 * mostra os valores do mês (cruz + dica).
 */
export function EvolutionChart({ points, hidden }: { points: EvolutionPoint[]; hidden?: boolean }) {
  const { t } = useTranslation();
  const { colors, base } = useTheme();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const cPat = SERIES[base][0];
  const cInv = SERIES[base][1];

  const geo = useMemo(() => {
    const values = points.flatMap((p) => [p.investido, p.patrimonio ?? 0]);
    const max = Math.max(1, ...values) * 1.08;
    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const path = (get: (p: EvolutionPoint) => number | null) => {
      let d = '';
      let pen = false;
      points.forEach((p, i) => {
        const v = get(p);
        if (v === null) {
          pen = false;
          return;
        }
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      return d;
    };
    const ticks = [0, 0.5, 1].map((f) => ({ v: (max / 1.08) * f, y: y((max / 1.08) * f) }));
    return { x, y, patPath: path((p) => p.patrimonio), invPath: path((p) => p.investido), ticks };
  }, [points, width]);

  const pick = (e: GestureResponderEvent) => {
    if (points.length === 0 || width === 0) return;
    const innerW = width - PAD.left - PAD.right;
    const rel = (e.nativeEvent.locationX - PAD.left) / Math.max(1, innerW);
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };

  const a = active !== null ? points[active] : null;
  const summary = points
    .filter((p) => p.patrimonio !== null)
    .slice(-3)
    .map((p) => `${monthLabel(p.ym)}: ${brlShort(p.patrimonio ?? 0)}`)
    .join('; ');

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: cPat }]} />
          <AppText variant="caption" color={colors.ink2}>
            {t('invest.evolution.patrimony')}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: cInv }]} />
          <AppText variant="caption" color={colors.ink2}>
            {t('invest.evolution.invested')}
          </AppText>
        </View>
      </View>

      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('invest.evolution.a11y', { list: hidden ? '' : summary })}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
        style={{ height: H }}
      >
        {width > 0 ? (
          <Svg width={width} height={H}>
            {geo.ticks.map((tk) => (
              <Line key={tk.y} x1={PAD.left} x2={width - PAD.right} y1={tk.y} y2={tk.y} stroke={colors.line} strokeWidth={1} />
            ))}
            <Path d={geo.invPath} stroke={cInv} strokeWidth={2} fill="none" strokeDasharray="5 4" />
            <Path d={geo.patPath} stroke={cPat} strokeWidth={2} fill="none" />
            {points.map((p, i) =>
              p.patrimonio !== null ? (
                <Circle key={p.ym} cx={geo.x(i)} cy={geo.y(p.patrimonio)} r={active === i ? 5 : 3} fill={cPat} stroke={colors.surface} strokeWidth={2} />
              ) : null,
            )}
            {a ? (
              <Line x1={geo.x(active!)} x2={geo.x(active!)} y1={PAD.top} y2={H - PAD.bottom} stroke={colors.ink2} strokeWidth={1} />
            ) : null}
          </Svg>
        ) : null}
        {/* eixo y (rótulos compactos) */}
        {geo.ticks.map((tk) => (
          <AppText key={`l${tk.y}`} variant="caption" color={colors.ink2} style={[styles.yLabel, { top: tk.y - 8 }]} tabular>
            {hidden ? '' : compactNumber(tk.v)}
          </AppText>
        ))}
        {/* eixo x: primeiro, meio e último mês */}
        {points.length > 0
          ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((i) => (
                <AppText
                  key={`x${i}`}
                  variant="caption"
                  color={colors.ink2}
                  style={[styles.xLabel, { left: Math.max(0, geo.x(i) - 20) }]}
                >
                  {monthAbbr(points[i].ym)}
                </AppText>
              ))
          : null}
      </View>

      <View style={[styles.tooltip, { backgroundColor: colors.segment }]} accessibilityLiveRegion="polite">
        <AppText variant="caption" color={colors.ink2}>
          {a ? monthLabel(a.ym) : t('invest.evolution.hint')}
        </AppText>
        {a && !hidden ? (
          <AppText variant="captionStrong" tabular>
            {`${t('invest.evolution.patrimony')}: ${a.patrimonio === null ? '—' : brlShort(a.patrimonio)} · ${t('invest.evolution.invested')}: ${brlShort(a.investido)}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 3, borderRadius: 2 },
  yLabel: { position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', fontSize: 10 },
  xLabel: { position: 'absolute', bottom: 0, width: 40, textAlign: 'center', fontSize: 10 },
  tooltip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 2, minHeight: 36, justifyContent: 'center' },
});
