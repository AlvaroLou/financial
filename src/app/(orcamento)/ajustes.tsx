import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { GeneralSettings } from '@/components/GeneralSettings';
import { AppText } from '@/components/ui/AppText';
import { SwitchRow } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, ListRow, SectionHeader } from '@/components/ui/primitives';
import { Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { categoryName, natureLabel } from '@/i18n/labels';
import { brlShort } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { RecordKind } from '@/types';

export default function AjustesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const cards = useFinanceStore((s) => s.cards);
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);

  const groups: { kind: RecordKind; title: string }[] = [
    { kind: 'despesa', title: t('settings.expenses') },
    { kind: 'receita', title: t('settings.incomes') },
  ];

  return (
    <Screen>
      <ScreenHeader title={t('settings.title')} subtitle={t('settings.subtitleBudget')} />
      <ScreenScroll gap={20}>
        {/* Contas e cartões */}
        <View>
          <SectionHeader title={t('settings.accountsTitle')} />
          <Card style={{ overflow: 'hidden' }}>
            {accounts.length === 0 && cards.length === 0 ? (
              <View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Icon name="bank" size={20} color={colors.ink2} />
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  {t('settings.accountsEmpty')}
                </AppText>
              </View>
            ) : null}
            {accounts.map((a, i) => (
              <ListRow
                key={a.id}
                first={i === 0}
                icon={a.tipo === 'conta' ? 'bank' : 'wallet'}
                title={a.nome}
                trailing={brlShort(a.saldo)}
                trailingColor={a.saldo < 0 ? colors.expense : undefined}
                accessibilityHint={t('common.tapToEdit')}
                onPress={() => router.push({ pathname: '/conta', params: { tipo: 'conta', id: a.id } })}
              />
            ))}
            {cards.map((k, i) => (
              <ListRow
                key={k.id}
                first={accounts.length === 0 && i === 0}
                icon="card"
                title={k.final ? `${k.nome} •••• ${k.final}` : k.nome}
                subtitle={t('account.cardSubtitle', { limit: brlShort(k.limite), close: k.diaFechamento, due: k.diaVencimento })}
                accessibilityHint={t('common.tapToEdit')}
                onPress={() => router.push({ pathname: '/conta', params: { tipo: 'cartao', id: k.id } })}
              />
            ))}
          </Card>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Button
              style={{ flex: 1 }}
              variant="outline"
              icon="plus"
              label={t('settings.addAccount')}
              onPress={() => router.push({ pathname: '/conta', params: { tipo: 'conta' } })}
            />
            <Button
              style={{ flex: 1 }}
              variant="outline"
              icon="plus"
              label={t('settings.addCard')}
              onPress={() => router.push({ pathname: '/conta', params: { tipo: 'cartao' } })}
            />
          </View>
        </View>

        {/* Categorias */}
        <View>
          <SectionHeader
            title={t('settings.categoriesTitle')}
            actionLabel={t('settings.newCategory')}
            onAction={() => router.push({ pathname: '/categoria', params: { tipo: 'despesa' } })}
          />
          <View style={{ gap: 12 }}>
            {groups.map((g) => (
              <Card key={g.kind} style={{ overflow: 'hidden' }}>
                <AppText variant="eyebrow" color={colors.ink2} style={{ paddingHorizontal: 14, paddingTop: 12 }}>
                  {g.title}
                </AppText>
                {categories
                  .filter((c) => c.kind === g.kind)
                  .map((c, i) => {
                    const parts = [natureLabel(c.naturezaPadrao)];
                    if (g.kind === 'despesa') {
                      parts.push(c.limiteMensal > 0 ? t('settings.limitValue', { value: brlShort(c.limiteMensal) }) : t('settings.noLimit'));
                    }
                    if (c.fixa) parts.push(t('settings.systemTag'));
                    return (
                      <ListRow
                        key={c.id}
                        first={i === 0}
                        icon={c.icone}
                        title={categoryName(c)}
                        subtitle={parts.join(' · ')}
                        accessibilityHint={t('common.tapToEdit')}
                        onPress={() => router.push({ pathname: '/categoria', params: { id: c.id } })}
                      />
                    );
                  })}
              </Card>
            ))}
            <AppText variant="caption" color={colors.ink2}>
              {t('settings.categoriesHint')}
            </AppText>
          </View>
        </View>

        {/* Alertas */}
        <View>
          <SectionHeader title={t('settings.alertsTitle')} />
          <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <SwitchRow
              icon="clock"
              label={t('settings.dueAlerts')}
              description={t('settings.dueAlertsHint')}
              value={settings.alertaVencimento}
              onChange={(v) => updateSettings({ alertaVencimento: v })}
            />
            <SwitchRow
              icon="bell"
              label={t('settings.budgetAlerts')}
              description={t('settings.budgetAlertsHint')}
              value={settings.alertaOrcamento}
              onChange={(v) => updateSettings({ alertaOrcamento: v })}
            />
          </Card>
        </View>

        {/* Exportar */}
        <View>
          <SectionHeader title={t('export.title')} />
          <Card style={{ overflow: 'hidden' }}>
            <ListRow
              first
              icon="download"
              title={t('export.budgetRow')}
              subtitle={t('export.budgetRowHint')}
              onPress={() => router.push({ pathname: '/exportar', params: { app: 'orcamento' } })}
            />
          </Card>
        </View>

        <GeneralSettings />
      </ScreenScroll>
    </Screen>
  );
}
