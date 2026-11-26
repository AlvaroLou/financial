import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, Chip, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { CLASS_ORDER } from '@/invest/catalog';
import { OperationRow } from '@/invest/components/OperationRow';
import { PositionRow } from '@/invest/components/PositionRow';
import { usePortfolio } from '@/invest/hooks';
import { useInvestStore } from '@/invest/store';
import type { AssetGroup, OperationType } from '@/invest/types';
import { brlShort } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'posicoes' | 'movimentacoes';
type Sort = 'valor' | 'resultado' | 'nome';
const OP_FILTERS: (OperationType | 'todas')[] = ['todas', 'compra', 'venda', 'aporte', 'resgate', 'provento'];

export default function AtivosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const summary = usePortfolio();
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const { hidden } = useHiddenValues();
  const [tab, setTab] = useState<Tab>('posicoes');
  const [group, setGroup] = useState<AssetGroup | 'todos'>('todos');
  const [sort, setSort] = useState<Sort>('valor');
  const [showClosed, setShowClosed] = useState(false);
  const [opFilter, setOpFilter] = useState<OperationType | 'todas'>('todas');

  const byClass = useMemo(() => {
    const list = summary.abertos.filter((v) => group === 'todos' || v.grupo === group);
    const sorted = [...list].sort((a, b) =>
      sort === 'nome' ? a.asset.nome.localeCompare(b.asset.nome) : sort === 'resultado' ? (b.resultadoPct ?? 0) - (a.resultadoPct ?? 0) : b.valorAtual - a.valorAtual,
    );
    return CLASS_ORDER.map((c) => ({ classe: c, items: sorted.filter((v) => v.classe === c) })).filter((g) => g.items.length > 0);
  }, [summary, group, sort]);

  const ops = useMemo(
    () => [...operations].filter((o) => opFilter === 'todas' || o.tipo === opFilter).reverse(),
    [operations, opFilter],
  );
  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);

  return (
    <Screen>
      <ScreenHeader
        title={t('invest.assets.title')}
        subtitle={t('invest.assets.subtitle', { count: summary.abertos.length })}
        right={<Button compact variant="soft" icon="plus" label={t('invest.assets.new')} onPress={() => router.push('/invest/ativo-form')} />}
      />
      <ScreenScroll gap={16}>
        <Segmented
          value={tab}
          onChange={setTab}
          accessibilityLabel={t('invest.assets.viewA11y')}
          options={[
            { value: 'posicoes', label: t('invest.assets.positions'), icon: 'chartPie' },
            { value: 'movimentacoes', label: t('invest.assets.history'), icon: 'history' },
          ]}
        />

        {tab === 'posicoes' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['todos', 'fixa', 'variavel', 'outros'] as const).map((g) => (
                <Chip key={g} label={g === 'todos' ? t('invest.assets.all') : t(`invest.groups.${g}`)} active={group === g} onPress={() => setGroup(g)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="sort" size={18} color={colors.ink2} />
              <View style={{ flex: 1 }}>
                <Segmented
                  compact
                  value={sort}
                  onChange={setSort}
                  accessibilityLabel={t('invest.assets.sortA11y')}
                  options={[
                    { value: 'valor', label: t('invest.assets.sortValue') },
                    { value: 'resultado', label: t('invest.assets.sortResult') },
                    { value: 'nome', label: t('invest.assets.sortName') },
                  ]}
                />
              </View>
            </View>

            {byClass.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center', gap: 10 }}>
                <Icon name="chartPie" size={30} color={colors.ink2} />
                <AppText variant="body" color={colors.ink2} align="center">
                  {assets.length ? t('invest.assets.emptyFilter') : t('invest.assets.empty')}
                </AppText>
              </Card>
            ) : (
              byClass.map((g) => (
                <View key={g.classe}>
                  <SectionHeader
                    title={t(`invest.classes.${g.classe}`)}
                    style={{ minHeight: 36 }}
                  />
                  <AppText variant="caption" color={colors.ink2} style={{ marginTop: -6, marginBottom: 8 }} tabular>
                    {hidden ? '••••' : brlShort(g.items.reduce((a, v) => a + v.valorAtual, 0))}
                  </AppText>
                  <Card style={{ overflow: 'hidden' }}>
                    {g.items.map((v, i) => (
                      <PositionRow
                        key={v.asset.id}
                        v={v}
                        first={i === 0}
                        hidden={hidden}
                        share={summary.patrimonio > 0 ? v.valorAtual / summary.patrimonio : undefined}
                        onPress={() => router.push(`/invest/ativo/${v.asset.id}`)}
                      />
                    ))}
                  </Card>
                </View>
              ))
            )}

            {summary.fechados.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Button
                  variant="outline"
                  compact
                  icon={showClosed ? 'chevronDown' : 'chevronRight'}
                  label={t('invest.assets.closed', { count: summary.fechados.length })}
                  onPress={() => setShowClosed((v) => !v)}
                />
                {showClosed ? (
                  <Card style={{ overflow: 'hidden' }}>
                    {summary.fechados.map((v, i) => (
                      <PositionRow key={v.asset.id} v={v} first={i === 0} hidden={hidden} onPress={() => router.push(`/invest/ativo/${v.asset.id}`)} />
                    ))}
                  </Card>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {OP_FILTERS.map((f) => (
                <Chip key={f} label={f === 'todas' ? t('invest.assets.allOps') : t(`invest.op.${f}`)} active={opFilter === f} onPress={() => setOpFilter(f)} />
              ))}
            </ScrollView>
            {ops.length === 0 ? (
              <Card style={{ padding: 20 }}>
                <AppText variant="body" color={colors.ink2} align="center">
                  {t('invest.assets.noOps')}
                </AppText>
              </Card>
            ) : (
              <Card style={{ overflow: 'hidden' }}>
                {ops.slice(0, 300).map((o, i) => (
                  <OperationRow
                    key={o.id}
                    op={o}
                    asset={assetById[o.assetId]}
                    first={i === 0}
                    onPress={() => router.push({ pathname: '/invest/operacao', params: { id: o.id } })}
                  />
                ))}
              </Card>
            )}
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
