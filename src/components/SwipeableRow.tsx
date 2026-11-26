import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export interface SwipeAction {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  background: string;
  onPress: () => void;
}

const ACTION_WIDTH = 72;
/** a web não tem driver nativo de animação */
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Linha com ações reveladas ao deslizar para a esquerda (Editar / Duplicar / Excluir).
 * Implementado só com Animated + PanResponder (sem dependências nativas extras).
 * Para leitores de tela, as mesmas ações ficam disponíveis como ações de acessibilidade.
 */
export function SwipeableRow({
  actions,
  onPress,
  accessibilityLabel,
  children,
}: {
  actions: SwipeAction[];
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const total = actions.length * ACTION_WIDTH;
  const x = useRef(new Animated.Value(0)).current;
  const base = useRef(0);
  const openRef = useRef(false);

  const animateTo = (to: number) => {
    openRef.current = to !== 0;
    base.current = to;
    Animated.spring(x, { toValue: to, useNativeDriver: NATIVE_DRIVER, bounciness: 0, speed: 20 }).start();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_e, g) => {
          x.setValue(Math.max(-total, Math.min(0, base.current + g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          const end = Math.max(-total, Math.min(0, base.current + g.dx));
          animateTo(end < -total / 2 || g.vx < -0.6 ? -total : 0);
        },
        onPanResponderTerminate: () => animateTo(openRef.current ? -total : 0),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.actions, { width: total }]} pointerEvents="box-none">
        {actions.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => {
              animateTo(0);
              a.onPress();
            }}
            style={[styles.action, { backgroundColor: a.background }]}
          >
            <Icon name={a.icon} size={20} color={a.color} />
            <AppText variant="caption" color={a.color} style={{ fontSize: 11 }} numberOfLines={1}>
              {a.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Animated.View
        style={[styles.front, { backgroundColor: colors.surface, transform: [{ translateX: x }] }]}
        {...pan.panHandlers}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
          onAccessibilityAction={(e) => actions.find((a) => a.key === e.nativeEvent.actionName)?.onPress()}
          onPress={() => (openRef.current ? animateTo(0) : onPress?.())}
          style={({ pressed }) => [styles.pressable, pressed && { backgroundColor: colors.bg }]}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  actions: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  front: {},
  pressable: { minHeight: layout.minTouch + 24, backgroundColor: 'transparent' },
});
