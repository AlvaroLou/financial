import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { GoalsSection } from '@/components/GoalsSection';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';

/** Metas (as mesmas do Orçamento), com os investimentos vinculados preenchendo o progresso. */
export default function MetasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen>
      <ScreenHeader title={t('goals.title')} subtitle={t('invest.goalsScreen.subtitle')} />
      <ScreenScroll gap={16}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.tag, borderRadius: 12, padding: 12 }}>
          <Icon name="link" size={18} color={colors.tagText} />
          <AppText variant="label" color={colors.tagText} style={{ flex: 1 }}>
            {t('invest.goalsScreen.howItWorks')}
          </AppText>
        </View>
        <GoalsSection showLinkedAssets title={t('invest.goalsScreen.listTitle')} />
      </ScreenScroll>
    </Screen>
  );
}
