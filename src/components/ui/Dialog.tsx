import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import i18n from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radius } from '@/theme/tokens';

export interface DialogAction {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  title: string;
  message?: string;
  /** padrão: um único botão "OK" (no máximo 3 — limite do Android) */
  actions?: DialogAction[];
}

const DialogContext = createContext<(options: DialogOptions) => void>(() => {});

/**
 * Diálogo de confirmação.
 * - iOS/Android: `Alert.alert` nativo — sempre aparece por cima de tudo, inclusive
 *   de telas modais nativas e bottom sheets.
 * - Web: o `Alert` do react-native-web não mostra botões, então usamos um diálogo
 *   próprio, montado só na hora de abrir (assim fica acima de qualquer modal já aberto).
 */
export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogOptions | null>(null);

  const show = useCallback((options: DialogOptions) => {
    const actions = options.actions?.length ? options.actions : [{ label: i18n.t('common.ok') } satisfies DialogAction];
    if (Platform.OS === 'web') {
      setCurrent({ ...options, actions });
      return;
    }
    const cancel = actions.find((a) => a.style === 'cancel');
    // Android: com 3 botões, o 1º fica sozinho à esquerda e o último é o principal (direita)
    const ordered = Platform.OS === 'android' && cancel ? [cancel, ...actions.filter((a) => a !== cancel)] : actions;
    Alert.alert(
      options.title,
      options.message,
      ordered.map((a) => ({ text: a.label, style: a.style, onPress: a.onPress })),
      { cancelable: true, onDismiss: cancel?.onPress },
    );
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {current ? <WebDialog options={current} onDone={() => setCurrent(null)} /> : null}
    </DialogContext.Provider>
  );
}

function WebDialog({ options, onDone }: { options: DialogOptions; onDone: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const actions = options.actions ?? [];
  const cancel = actions.find((a) => a.style === 'cancel');
  // botões lado a lado quando são só dois e curtos; senão, empilhados (principal primeiro)
  const inline = actions.length === 2 && actions.every((a) => a.label.length <= 12);
  const ordered = [...actions.filter((a) => a.style !== 'cancel'), ...(cancel ? [cancel] : [])];

  const close = (action?: DialogAction) => {
    onDone();
    action?.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close(cancel)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => close(cancel)}
        />
        <View style={[styles.card, { backgroundColor: colors.surface }]} accessibilityViewIsModal accessibilityRole="alert">
          <AppText variant="h2" accessibilityRole="header">
            {options.title}
          </AppText>
          {options.message ? (
            <AppText variant="body" color={colors.ink2}>
              {options.message}
            </AppText>
          ) : null}
          <View style={[styles.actions, inline && { flexDirection: 'row-reverse' }]}>
            {ordered.map((a) => {
              const tone =
                a.style === 'destructive'
                  ? { bg: colors.expense, fg: colors.base === 'dark' ? '#1A0B09' : '#FFFFFF', border: colors.expense }
                  : a.style === 'cancel'
                    ? { bg: colors.surface, fg: colors.ink, border: colors.outline }
                    : { bg: colors.accent, fg: colors.onAccent, border: colors.accent };
              return (
                <Pressable
                  key={a.label}
                  accessibilityRole="button"
                  onPress={() => close(a)}
                  style={({ pressed }) => [
                    styles.button,
                    inline && { flex: 1 },
                    { backgroundColor: tone.bg, borderColor: tone.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <AppText variant="h3" color={tone.fg} style={{ fontFamily: fonts.bold }} align="center">
                    {a.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: 20,
    gap: 10,
  },
  actions: { gap: 8, marginTop: 8 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
