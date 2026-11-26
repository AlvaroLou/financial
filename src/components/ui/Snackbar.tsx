import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius } from '@/theme/tokens';

interface SnackbarOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms (padrão 5000 — tempo suficiente para desfazer) */
  duration?: number;
}

/** a web não tem driver nativo de animação */
const NATIVE_DRIVER = Platform.OS !== 'web';

const SnackbarContext = createContext<(options: SnackbarOptions) => void>(() => {});

export const useSnackbar = () => useContext(SnackbarContext);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<SnackbarOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: NATIVE_DRIVER }).start(({ finished }) => {
      if (finished) setCurrent(null);
    });
  }, [opacity]);

  const show = useCallback(
    (options: SnackbarOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent(options);
      AccessibilityInfo.announceForAccessibility(
        options.actionLabel
          ? t('common.actionAvailable', { message: options.message, action: options.actionLabel })
          : options.message,
      );
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: NATIVE_DRIVER }).start();
      timer.current = setTimeout(hide, options.duration ?? 5000);
    },
    [hide, opacity, t],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => show, [show]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current ? (
        <View
          pointerEvents="box-none"
          // acima da barra de abas e do botão "+" das telas iniciais
          style={[styles.host, { bottom: insets.bottom + layout.tabBarHeight + layout.fabSize + 28 }]}
        >
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.bar,
              {
                backgroundColor: colors.inverse,
                opacity,
                transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <AppText variant="label" color={colors.onInverse} style={{ flex: 1 }}>
              {current.message}
            </AppText>
            {current.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  current.onAction?.();
                  hide();
                }}
                style={styles.action}
              >
                <AppText variant="label" color={colors.inverseAction} style={{ textTransform: 'uppercase' }}>
                  {current.actionLabel}
                </AppText>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
  },
  bar: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: { minHeight: layout.minTouch, paddingHorizontal: 12, justifyContent: 'center' },
});
