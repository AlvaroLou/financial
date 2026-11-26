import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/components/TabBar';
import { useSyncAppMode } from '@/hooks/useSyncAppMode';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';

/** App "Investimentos": Carteira · Ativos · Proventos · Metas · Mais (cor de destaque própria). */
export default function InvestimentosLayout() {
  useSyncAppMode('investimentos');
  return (
    <ThemeScope app="investimentos">
      <InvestTabs />
    </ThemeScope>
  );
}

function InvestTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="carteira" options={{ title: t('tabs.carteira') }} />
      <Tabs.Screen name="ativos" options={{ title: t('tabs.ativos') }} />
      <Tabs.Screen name="proventos" options={{ title: t('tabs.proventos') }} />
      <Tabs.Screen name="metas" options={{ title: t('tabs.metas') }} />
      <Tabs.Screen name="mais" options={{ title: t('tabs.mais') }} />
    </Tabs>
  );
}
