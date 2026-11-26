import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, IconButton } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { deviceLanguage } from '@/i18n';
import { LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

/** Idioma do app (vale para os dois apps). Valores continuam em reais. */
export default function IdiomaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const language = useFinanceStore((s) => s.settings.language);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const device = LANGUAGES.find((l) => l.code === deviceLanguage())?.name ?? '';

  const options: { code: LanguageCode | null; label: string; hint?: string }[] = [
    { code: null, label: t('language.auto'), hint: device },
    ...LANGUAGES.map((l) => ({ code: l.code as LanguageCode, label: l.name })),
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {t('language.title')}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={{ padding: layout.screenPadding, gap: 12, paddingBottom: 40 }}>
        <Card style={{ overflow: 'hidden' }}>
          {options.map((o, i) => {
            const selected = language === o.code;
            return (
              <Pressable
                key={o.code ?? 'auto'}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={o.hint ? `${o.label}, ${o.hint}` : o.label}
                onPress={() => updateSettings({ language: o.code })}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                  pressed && { backgroundColor: colors.bg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{o.label}</AppText>
                  {o.hint ? (
                    <AppText variant="caption" color={colors.ink2}>
                      {o.hint}
                    </AppText>
                  ) : null}
                </View>
                {selected ? <Icon name="check" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Card>
        <AppText variant="caption" color={colors.ink2}>
          {t('language.note')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56, paddingVertical: 8 },
});
