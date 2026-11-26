import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { SwitchRow } from '@/components/ui/Fields';
import { Button, Card, ListRow, SectionHeader } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { deviceLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import { clearProviderKeys } from '@/invest/services/secrets';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';

/** Página pública da política de privacidade (GitHub Pages, `docs/privacidade.html`). A Play exige o link também no app. */
export const PRIVACY_POLICY_URL = 'https://alvarolou.github.io/financial/privacidade.html';

/**
 * Preferências que valem para os DOIS apps: aparência (modo e cores), idioma,
 * biometria, ocultar valores e apagar dados. Aparece em Orçamento › Ajustes e
 * em Investimentos › Mais.
 */
export function GeneralSettings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const ask = useDialog();
  const showSnackbar = useSnackbar();
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const eraseAllData = useFinanceStore((s) => s.eraseAllData);
  const resetPortfolio = useInvestStore((s) => s.resetPortfolio);
  const resetMarket = useMarketStore((s) => s.resetMarket);

  const languageName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name ?? code;
  const languageSubtitle = settings.language
    ? languageName(settings.language)
    : t('language.autoShort', { name: languageName(deviceLanguage()) });

  const toggleBiometric = async (value: boolean) => {
    if (!value) {
      updateSettings({ biometria: false });
      return;
    }
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !enrolled) {
        ask({ title: t('settings.biometricsUnavailableTitle'), message: t('settings.biometricsNotEnrolled') });
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('settings.biometricsConfirm') });
      if (result.success) updateSettings({ biometria: true });
    } catch {
      ask({ title: t('settings.biometricsUnavailableTitle'), message: t('settings.biometricsError') });
    }
  };

  const confirmErase = () =>
    ask({
      title: t('settings.eraseTitle'),
      message: t('settings.eraseMessage'),
      actions: [
        {
          label: t('settings.eraseConfirm'),
          style: 'destructive',
          onPress: () => {
            eraseAllData();
            resetPortfolio();
            resetMarket();
            void clearProviderKeys();
            useInvestStore.getState().updateInvestSettings({ hasBrapiToken: false, hasCoingeckoKey: false });
            showSnackbar({ message: t('settings.erased') });
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });

  return (
    <>
      <View>
        <SectionHeader title={t('settings.general')} />
        <Card style={{ overflow: 'hidden' }}>
          <ListRow
            first
            icon="palette"
            title={t('appearance.title')}
            subtitle={t('settings.appearanceHint', { mode: t(`appearance.${settings.themeMode}`) })}
            onPress={() => router.push('/aparencia')}
          />
          <ListRow icon="language" title={t('language.title')} subtitle={languageSubtitle} onPress={() => router.push('/idioma')} />
        </Card>
      </View>

      <View>
        <SectionHeader title={t('settings.privacy')} />
        <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <SwitchRow
            icon="fingerprint"
            label={t('settings.biometrics')}
            description={t('settings.biometricsHint')}
            value={settings.biometria}
            onChange={toggleBiometric}
          />
          <SwitchRow
            icon="eyeOff"
            label={t('settings.hideValues')}
            description={t('settings.hideValuesHint')}
            value={settings.ocultarSaldo}
            onChange={(v) => updateSettings({ ocultarSaldo: v })}
          />
        </Card>
        <Card style={{ overflow: 'hidden', marginTop: 12 }}>
          <ListRow
            first
            icon="shield"
            title={t('settings.privacyPolicy')}
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}
          />
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader title={t('settings.dataTitle')} />
        <AppText variant="caption" color={colors.ink2}>
          {t('settings.dataHint')}
        </AppText>
        <Button variant="danger" icon="trash" label={t('settings.eraseAll')} onPress={confirmErase} />
        <AppText variant="caption" color={colors.ink2} align="center">
          {t('settings.version', { app: t('app.name'), version: Constants.expoConfig?.version ?? '1.0.0' })}
        </AppText>
      </View>
    </>
  );
}
