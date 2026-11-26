import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import type { IconName } from '@/components/ui/Icon';
import { Button, IconButton } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/**
 * Tela modal de formulário (novo lançamento, meta, categoria, conta, operação…):
 * cabeçalho com X (pergunta se descarta alterações), excluir opcional, conteúdo
 * rolável que respeita o teclado e botão de salvar fixo no rodapé.
 * Com alterações não salvas, o gesto de fechar do iOS e o voltar do Android
 * também perguntam antes.
 */
export function FormScreen({
  title,
  dirty,
  onSave,
  saveLabel,
  saveIcon = 'check',
  saveDisabled,
  onDelete,
  deleteLabel,
  children,
}: {
  title: string;
  dirty: boolean;
  onSave: () => void;
  saveLabel: string;
  saveIcon?: IconName;
  saveDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const ask = useDialog();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const close = useCallback(() => {
    if (!dirtyRef.current) {
      router.back();
      return;
    }
    ask({
      title: t('common.discardTitle'),
      message: t('common.discardMessage'),
      actions: [
        { label: t('common.discard'), style: 'destructive', onPress: () => router.back() },
        { label: t('common.continue'), style: 'cancel' },
      ],
    });
  }, [ask, router, t]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirtyRef.current) return false;
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: !dirty }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon="close" label={t('common.close')} onPress={close} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
        {onDelete ? (
          <IconButton icon="trash" label={deleteLabel ?? t('common.delete')} color={colors.expense} onPress={onDelete} />
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: layout.screenPadding, gap: 18, paddingBottom: 24 }}
        >
          {children}
        </ScrollView>

        <View
          style={{
            padding: layout.screenPadding,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <Button label={saveLabel} icon={saveIcon} onPress={onSave} disabled={saveDisabled} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
