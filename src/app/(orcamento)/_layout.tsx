import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/components/TabBar';
import { useSyncAppMode } from '@/hooks/useSyncAppMode';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';

/** App "Orçamento": Início · Estatísticas · Planejar · Extrato · Ajustes (cor de destaque própria). */
export default function OrcamentoLayout() {
  useSyncAppMode('orcamento');
  return (
    <ThemeScope app="orcamento">
      <OrcamentoTabs />
    </ThemeScope>
  );
}

function OrcamentoTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.inicio') }} />
      <Tabs.Screen name="estatisticas" options={{ title: t('tabs.estatisticas') }} />
      <Tabs.Screen name="planejar" options={{ title: t('tabs.planejar') }} />
      <Tabs.Screen name="extrato" options={{ title: t('tabs.extrato') }} />
      <Tabs.Screen name="ajustes" options={{ title: t('tabs.ajustes') }} />
    </Tabs>
  );
}
