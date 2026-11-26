import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { GeneralSettings } from '@/components/GeneralSettings';
import { SwitchRow } from '@/components/ui/Fields';
import type { IconName } from '@/components/ui/Icon';
import { Card, ListRow, SectionHeader } from '@/components/ui/primitives';
import { Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useInvestStore } from '@/invest/store';

const TOOLS: { icon: IconName; key: string; href: string }[] = [
  { icon: 'percent', key: 'rates', href: '/invest/taxas' },
  { icon: 'scale', key: 'rebalance', href: '/invest/rebalanceamento' },
  { icon: 'calculator', key: 'simulator', href: '/invest/simulador' },
  { icon: 'receipt', key: 'tax', href: '/invest/imposto-de-renda' },
  { icon: 'bank', key: 'institutions', href: '/invest/instituicoes' },
];

/** Investimentos › Mais: ferramentas, exportação e as preferências gerais (comuns aos dois apps). */
export default function MaisScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const autoRefresh = useInvestStore((s) => s.settings.autoRefresh);
  const updateInvestSettings = useInvestStore((s) => s.updateInvestSettings);

  return (
    <Screen>
      <ScreenHeader title={t('tabs.mais')} subtitle={t('settings.subtitleInvest')} />
      <ScreenScroll gap={20}>
        <View>
          <SectionHeader title={t('invest.more.tools')} />
          <Card style={{ overflow: 'hidden' }}>
            {TOOLS.map((tool, i) => (
              <ListRow
                key={tool.key}
                first={i === 0}
                icon={tool.icon}
                title={t(`invest.more.${tool.key}`)}
                subtitle={t(`invest.more.${tool.key}Hint`)}
                onPress={() => router.push(tool.href)}
              />
            ))}
          </Card>
        </View>

        <View>
          <SectionHeader title={t('export.title')} />
          <Card style={{ overflow: 'hidden' }}>
            <ListRow
              first
              icon="download"
              title={t('export.investRow')}
              subtitle={t('export.investRowHint')}
              onPress={() => router.push({ pathname: '/exportar', params: { app: 'investimentos' } })}
            />
          </Card>
        </View>

        <View>
          <SectionHeader title={t('invest.more.quotes')} />
          <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <SwitchRow
              icon="refresh"
              label={t('invest.more.autoRefresh')}
              description={t('invest.more.autoRefreshHint')}
              value={autoRefresh}
              onChange={(v) => updateInvestSettings({ autoRefresh: v })}
            />
          </Card>
        </View>

        <GeneralSettings />
      </ScreenScroll>
    </Screen>
  );
}
