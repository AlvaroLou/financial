import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View } from 'react-native';

import { ModeSwitch } from '@/components/ModeSwitch';
import { AppText } from '@/components/ui/AppText';
import { Fab } from '@/components/ui/Fab';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { AllocationCard } from '@/invest/components/AllocationCard';
import { EvolutionChart, type EvolutionPoint } from '@/invest/components/EvolutionChart';
import { PortfolioHero } from '@/invest/components/PortfolioHero';
import { PositionRow } from '@/invest/components/PositionRow';
import { useGoalLinks, usePortfolio } from '@/invest/hooks';
import { goalProgress } from '@/invest/lib/goals';
import { investedUntil } from '@/invest/lib/portfolio';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { useMarketRefresh } from '@/invest/useMarketRefresh';
import { usePortfolioStatus } from '@/invest/usePortfolioStatus';
import { todayISO } from '@/lib/clock';
import { addMonths, displayDate, monthIndex, ymOf } from '@/lib/dates';
import { brlShort, percent } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function CarteiraScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const summary = usePortfolio();
  const links = useGoalLinks();
  const goals = useFinanceStore((s) => s.goals);
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const snapshots = useInvestStore((s) => s.snapshots);
  const recordSnapshot = useInvestStore((s) => s.recordSnapshot);
  const ratesOrigin = useMarketStore((s) => s.rates.origem);
  const { hidden, toggle } = useHiddenValues();
  const { loading, last, refresh } = useMarketRefresh();
  const status = usePortfolioStatus(loading, last);

  const today = todayISO();
  const currentYm = ymOf(today);
  const isEmpty = assets.length === 0;

  // foto do mês (para o gráfico de evolução): a última abertura do mês vale
  useEffect(() => {
    if (isEmpty || loading) return;
    recordSnapshot({ ym: currentYm, patrimonio: summary.patrimonio, investido: summary.investido });
  }, [isEmpty, loading, currentYm, summary.patrimonio, summary.investido, recordSnapshot]);

  const evolution = useMemo<EvolutionPoint[]>(() => {
    if (operations.length === 0) return [];
    const first = ymOf(operations.reduce((m, o) => (o.data < m ? o.data : m), operations[0].data));
    const start = monthIndex(currentYm) - monthIndex(first) > 11 ? addMonths(currentYm, -11) : first;
    const out: EvolutionPoint[] = [];
    for (let ym = start; ym <= currentYm; ym = addMonths(ym, 1)) {
      const end = ym === currentYm ? today : `${addMonths(ym, 1)}-01`;
      out.push({
        ym,
        patrimonio: ym === currentYm ? summary.patrimonio : snapshots.find((s) => s.ym === ym)?.patrimonio ?? null,
        investido: investedUntil(operations, end < today ? end : today),
      });
    }
    return out;
  }, [operations, snapshots, currentYm, today, summary.patrimonio]);

  const maturities = summary.vencimentos.slice(0, 3);
  const topPositions = summary.abertos.slice(0, 5);
  const linkedGoals = goals.filter((g) => links[g.id]);

  return (
    <Screen>
      <ScreenHeader
        top={<ModeSwitch />}
        title={t('invest.portfolio.title')}
        subtitle={t('invest.portfolio.subtitle')}
        right={
          isEmpty ? undefined : (
            <IconButton icon="refresh" label={t('invest.status.refresh')} background={colors.surface} onPress={() => void refresh(true)} disabled={loading} />
          )
        }
      />
      <ScreenScroll
        gap={20}
        withFabClearance
        refreshControl={isEmpty ? undefined : <RefreshControl refreshing={loading} onRefresh={() => void refresh(true)} tintColor={colors.primary} />}
      >
        {isEmpty ? (
          <Card style={{ padding: 20, gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chartLine" size={26} color={colors.primary} />
            </View>
            <AppText variant="h3">{t('invest.portfolio.emptyTitle')}</AppText>
            {['invest.portfolio.step1', 'invest.portfolio.step2', 'invest.portfolio.step3'].map((key, i) => (
              <View key={key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText variant="captionStrong" color={colors.primary}>
                    {String(i + 1)}
                  </AppText>
                </View>
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  {t(key)}
                </AppText>
              </View>
            ))}
            <Button icon="plus" label={t('invest.portfolio.addAsset')} onPress={() => router.push('/invest/ativo-form')} />
          </Card>
        ) : (
          <>
            <PortfolioHero summary={summary} hidden={hidden} onToggleHidden={toggle} status={status} />

            {ratesOrigin === 'padrao' || (last?.needsToken.length ?? 0) > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/invest/taxas')}
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.installmentTint, borderRadius: 12, padding: 12 }}
              >
                <Icon name="info" size={18} color={colors.installmentText} />
                <AppText variant="label" color={colors.installmentText} style={{ flex: 1 }}>
                  {(last?.needsToken.length ?? 0) > 0
                    ? t('invest.portfolio.tokenTip', { list: last!.needsToken.join(', ') })
                    : t('invest.portfolio.ratesTip')}
                </AppText>
                <Icon name="chevronRight" size={18} color={colors.installmentText} />
              </Pressable>
            ) : null}

            <View>
              <SectionHeader title={t('invest.portfolio.allocation')} />
              <AllocationCard summary={summary} hidden={hidden} />
            </View>

            {evolution.length > 0 ? (
              <View>
                <SectionHeader title={t('invest.portfolio.evolution')} />
                <Card style={{ padding: 16 }}>
                  <EvolutionChart points={evolution} hidden={hidden} />
                </Card>
              </View>
            ) : null}

            <View>
              <SectionHeader title={t('invest.portfolio.topPositions')} actionLabel={t('common.seeAll')} onAction={() => router.push('/ativos')} />
              <Card style={{ overflow: 'hidden' }}>
                {topPositions.map((v, i) => (
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

            {maturities.length > 0 ? (
              <View>
                <SectionHeader title={t('invest.portfolio.maturities')} />
                <Card style={{ overflow: 'hidden' }}>
                  {maturities.map((m, i) => (
                    <Pressable
                      key={m.valuation.asset.id}
                      accessibilityRole="button"
                      onPress={() => router.push(`/invest/ativo/${m.valuation.asset.id}`)}
                      style={({ pressed }) => [
                        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
                        pressed && { backgroundColor: colors.bg },
                      ]}
                    >
                      <Icon name="calendarClock" size={20} color={m.dias <= 30 ? colors.installmentText : colors.primary} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {m.valuation.asset.nome}
                        </AppText>
                        <AppText variant="caption" color={m.dias <= 30 ? colors.installmentText : colors.ink2}>
                          {t('invest.portfolio.maturesIn', { count: m.dias, date: displayDate(m.data) })}
                        </AppText>
                      </View>
                      <AppText variant="bodyStrong" tabular>
                        {hidden ? '••••' : brlShort(m.valuation.valorAtual)}
                      </AppText>
                    </Pressable>
                  ))}
                </Card>
              </View>
            ) : null}

            <View>
              <SectionHeader title={t('invest.portfolio.goals')} actionLabel={t('common.seeAll')} onAction={() => router.push('/metas')} />
              <Card style={{ padding: 16, gap: 14 }}>
                {linkedGoals.length === 0 ? (
                  <AppText variant="body" color={colors.ink2}>
                    {goals.length ? t('invest.portfolio.goalsLinkTip') : t('invest.portfolio.goalsEmpty')}
                  </AppText>
                ) : (
                  linkedGoals.map((g) => {
                    const p = goalProgress(g, links[g.id]);
                    return (
                      <View key={g.id} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Icon name={p.done ? 'checkCircle' : g.icone} size={18} color={p.done ? colors.income : colors.primary} />
                          <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {g.nome}
                          </AppText>
                          <AppText variant="label" color={p.done ? colors.income : colors.primary} tabular>
                            {percent(Math.min(p.ratio, 9.99), 0)}
                          </AppText>
                        </View>
                        <ProgressBar value={p.ratio} color={p.done ? colors.income : colors.accent} label={t('goals.progressA11y', { name: g.nome })} />
                      </View>
                    );
                  })
                )}
              </Card>
            </View>
          </>
        )}
      </ScreenScroll>

      <Fab
        label={isEmpty ? t('invest.portfolio.addAsset') : t('invest.portfolio.newOperation')}
        onPress={() => router.push(isEmpty ? '/invest/ativo-form' : '/invest/operacao')}
      />
    </Screen>
  );
}
