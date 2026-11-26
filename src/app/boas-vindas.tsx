import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet, OptionList } from '@/components/ui/Fields';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { deviceLanguage } from '@/i18n';
import { LANGUAGES, type LanguageCode } from '@/i18n/languages';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius } from '@/theme/tokens';

const FEATURES: { icon: IconName; key: string }[] = [
  { icon: 'calendar', key: 'f1' },
  { icon: 'card', key: 'f2' },
  { icon: 'chartLine', key: 'f3' },
];

/** Primeira abertura: apresenta os dois apps; os dados são todos cadastrados pelo usuário. */
export default function BoasVindasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const completeOnboarding = useFinanceStore((s) => s.completeOnboarding);
  const language = useFinanceStore((s) => s.settings.language);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const [langOpen, setLangOpen] = useState(false);
  const languageName = LANGUAGES.find((l) => l.code === (language ?? deviceLanguage()))?.name ?? '';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.hero }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={[styles.logo, { backgroundColor: colors.highlight }]}>
            <Icon name="wallet" size={36} color={colors.onHighlight} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('welcome.languageButton', { name: languageName })}
            onPress={() => setLangOpen(true)}
            style={[styles.langChip, { backgroundColor: colors.heroPanelStrong }]}
          >
            <Icon name="language" size={16} color={colors.onHero} />
            <AppText variant="label" color={colors.onHero}>
              {languageName}
            </AppText>
          </Pressable>
        </View>

        <View style={{ gap: 12 }}>
          <AppText variant="title" color={colors.onHero} accessibilityRole="header">
            {t('app.name')}
          </AppText>
          <AppText variant="body" color={colors.onHeroMuted} style={{ fontSize: 16, lineHeight: 22 }}>
            {t('welcome.tagline')}
          </AppText>
        </View>

        <View style={{ gap: 12 }}>
          {FEATURES.map((f) => (
            <View key={f.key} style={[styles.feature, { backgroundColor: colors.heroPanel }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.heroPanelStrong }]}>
                <Icon name={f.icon} size={20} color={colors.highlight} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong" color={colors.onHero}>
                  {t(`welcome.${f.key}Title`)}
                </AppText>
                <AppText variant="caption" color={colors.onHeroMuted}>
                  {t(`welcome.${f.key}Text`)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="highlight" label={t('welcome.start')} icon="arrowUpRight" onPress={completeOnboarding} />
        <AppText variant="caption" color={colors.onHeroMuted} align="center">
          {t('welcome.footer')}
        </AppText>
      </View>
      <BottomSheet visible={langOpen} title={t('language.title')} onClose={() => setLangOpen(false)}>
        <OptionList
          options={[{ value: 'auto', label: t('language.auto') }, ...LANGUAGES.map((l) => ({ value: l.code as string, label: l.name }))]}
          selected={language ?? 'auto'}
          onSelect={(v) => {
            updateSettings({ language: v === 'auto' ? null : (v as LanguageCode) });
            setLangOpen(false);
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: layout.screenPadding, paddingTop: 40, gap: 28, flexGrow: 1 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: layout.screenPadding, gap: 12 },
});
