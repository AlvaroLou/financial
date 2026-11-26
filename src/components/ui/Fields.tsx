import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/primitives';
import { centsToInput, digitsToCents } from '@/lib/money';
import type { ThemeColors } from '@/theme/palette';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { fonts, layout, radius } from '@/theme/tokens';

// O campo de data fica em DateField.tsx / DateField.web.tsx (implementação por plataforma).

/** a web não tem driver nativo de animação */
const NATIVE_DRIVER = Platform.OS !== 'web';

/* ------------------------------------------------------------------ Field */

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" color={colors.ink2}>
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" color={colors.expense} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.ink2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/** Estilo da caixa de seleção (Select, Data) — compartilhado com DateField. */
export function useSelectStyle(): ViewStyle {
  const styles = useThemedStyles(makeStyles);
  return styles.select;
}

/* ------------------------------------------------------------------ TextField */

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, multiline, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.ink2}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && { minHeight: 88, paddingTop: 14, textAlignVertical: 'top' },
          focused && { borderColor: colors.primary },
          !!error && { borderColor: colors.expense },
        ]}
      />
    </Field>
  );
}

/* ------------------------------------------------------------------ MoneyInput */

/** Campo de valor em R$ com máscara de centavos (digite 24000 -> 240,00). */
export function MoneyInput({
  label,
  value,
  onChange,
  error,
  hint,
  tone,
}: {
  label?: string;
  value: number;
  onChange: (cents: number) => void;
  error?: string;
  hint?: string;
  tone?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const text = label ?? t('common.value');
  return (
    <Field label={text} error={error} hint={hint}>
      <View style={[styles.moneyBox, !!error && { borderColor: colors.expense }]}>
        <AppText variant="h2" color={colors.ink2}>
          R$
        </AppText>
        <TextInput
          accessibilityLabel={t('common.inReais', { label: text })}
          value={centsToInput(value)}
          onChangeText={(v) => onChange(digitsToCents(v))}
          keyboardType="number-pad"
          inputMode="numeric"
          selectTextOnFocus
          style={[styles.moneyText, { color: tone ?? colors.ink }]}
        />
      </View>
    </Field>
  );
}

/* ------------------------------------------------------------------ BottomSheet */

/**
 * Janela inferior com gestos:
 * - arrastar a alça/título para baixo fecha (passou de 25% da altura ou soltou rápido);
 * - arrastar para cima expande para a tela cheia (tocar na alça alterna);
 * - X, toque fora, voltar do Android e Esc na web fecham — sempre com animação.
 * Para formulários longos, prefira uma tela modal (ver FormScreen).
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;

  const [mounted, setMounted] = useState(visible);
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const sheetHeight = useRef(0);
  const closing = useRef(false);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const animateOut = (after: () => void) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start(() => {
      drag.setValue(0);
      after();
    });
  };

  useEffect(() => {
    if (visible) {
      closing.current = false;
      drag.setValue(0);
      setExpanded(false);
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    } else if (mounted) {
      animateOut(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** fecha pelo próprio sheet (gesto, X, fundo, voltar): anima e só então avisa o pai */
  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    animateOut(() => {
      setMounted(false);
      onCloseRef.current();
    });
  };

  const setExpandedAnimated = (next: boolean) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {
      // sem suporte: muda sem animação
    }
    setExpanded(next);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          // para baixo acompanha o dedo; para cima, só uma resistência (expande ao soltar)
          drag.setValue(g.dy > 0 ? g.dy : Math.max(-32, g.dy * 0.35));
        },
        onPanResponderRelease: (_e, g) => {
          const h = sheetHeight.current || windowHeight * 0.5;
          const shouldClose = expandedRef.current ? g.dy > h * 0.45 || g.vy > 1.4 : g.dy > h * 0.25 || g.vy > 1;
          if (shouldClose) {
            requestClose();
            return;
          }
          if (!expandedRef.current && (g.dy < -40 || g.vy < -0.8)) setExpandedAnimated(true);
          else if (expandedRef.current && g.dy > 60) setExpandedAnimated(false);
          Animated.spring(drag, { toValue: 0, useNativeDriver: NATIVE_DRIVER, bounciness: 0, speed: 18 }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: 0, useNativeDriver: NATIVE_DRIVER, bounciness: 0 }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [windowHeight],
  );

  if (!mounted) return null;

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] });
  const fullHeight = windowHeight - insets.top - 8;

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flexEnd} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          onLayout={(e) => {
            sheetHeight.current = e.nativeEvent.layout.height;
          }}
          style={[
            styles.sheet,
            expanded ? { height: fullHeight + 40 } : { maxHeight: windowHeight * 0.85 + 40 },
            { paddingBottom: insets.bottom + 16 + 40, transform: [{ translateY: Animated.add(slide, drag) }] },
          ]}
        >
          {/* área de arraste: alça + título */}
          <View {...pan.panHandlers} style={styles.dragArea}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? t('sheet.collapse') : t('sheet.expand')}
              accessibilityHint={t('sheet.grabberHint')}
              onPress={() => setExpandedAnimated(!expanded)}
              hitSlop={{ top: 10, bottom: 10, left: 40, right: 40 }}
              style={styles.grabberHit}
            >
              <View style={styles.grabber} />
            </Pressable>
            <View style={styles.titleRow}>
              <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={2}>
                {title}
              </AppText>
              <IconButton icon="close" label={t('common.close')} onPress={requestClose} size={36} iconSize={20} background={colors.segment} />
            </View>
          </View>

          <ScrollView
            style={expanded ? { flex: 1 } : undefined}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ SelectField */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? t('common.select')}`}
        accessibilityHint={t('common.opensList')}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.select, pressed && { opacity: 0.8 }]}
      >
        {current?.icon ? <Icon name={current.icon} size={20} color={colors.primary} /> : null}
        <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {current?.label ?? t('common.select')}
        </AppText>
        <Icon name="chevronDown" size={20} color={colors.ink2} />
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <OptionList
          options={options}
          selected={value}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </Field>
  );
}

/** Lista de opções com check (dentro de um BottomSheet). */
export function OptionList<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: SelectOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ paddingBottom: 8 }}>
      {options.map((o) => {
        const isSelected = o.value === selected;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(o.value)}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.tint }]}
          >
            {o.icon ? <Icon name={o.icon} size={20} color={colors.primary} /> : null}
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {o.label}
            </AppText>
            {isSelected ? <Icon name="check" size={20} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ SwitchRow */

export function SwitchRow({
  label,
  description,
  value,
  onChange,
  icon,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.switchRow}>
      {icon ? (
        <View style={styles.switchIcon}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" color={colors.ink2}>
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.outline, true: colors.accent }}
        thumbColor={colors.switchThumb}
        ios_backgroundColor={colors.outline}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    select: {
      minHeight: 52,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    input: {
      minHeight: 52,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      fontFamily: fonts.medium,
      fontSize: 15,
      color: colors.ink,
    },
    moneyBox: {
      minHeight: 64,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    moneyText: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: 30,
      letterSpacing: -0.6,
      paddingVertical: 8,
      minWidth: 0,
    },
    flexEnd: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: layout.screenPadding,
      // sobra escondida abaixo da tela: o arraste para cima não revela um vão
      marginBottom: -40,
    },
    dragArea: { paddingTop: 6, paddingBottom: 8 },
    grabberHit: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 24 },
    grabber: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.outline,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    option: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 8,
      borderRadius: radius.md,
    },
    switchRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    switchIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
