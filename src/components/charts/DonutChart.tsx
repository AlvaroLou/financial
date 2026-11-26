import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';

export interface Slice {
  id: string;
  value: number;
  color: string;
}

/**
 * Rosca de proporções. Decorativa para leitores de tela: o resumo vai em
 * `accessibilityLabel` e os valores detalhados ficam na legenda ao lado/abaixo.
 */
export function DonutChart({
  slices,
  size = 176,
  stroke = 22,
  gap = 3,
  accessibilityLabel,
  children,
}: {
  slices: Slice[];
  size?: number;
  stroke?: number;
  /** espaço (px) entre fatias, para não depender só da cor */
  gap?: number;
  accessibilityLabel: string;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const visible = slices.filter((s) => s.value > 0);
  const total = visible.reduce((acc, s) => acc + s.value, 0);
  const useGap = visible.length > 1 ? gap : 0;

  let offset = 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {total > 0
          ? visible.map((s) => {
              const len = (s.value / total) * circumference;
              const dash = Math.max(0, len - useGap);
              const el = (
                <Circle
                  key={s.id}
                  cx={c}
                  cy={c}
                  r={r}
                  stroke={s.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  rotation={-90}
                  origin={`${c}, ${c}`}
                />
              );
              offset += len;
              return el;
            })
          : null}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
