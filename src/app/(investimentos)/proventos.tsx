import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, ProgressBar, SectionHeader, Segmented } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { IncomeBars } from '@/invest/components/IncomeBars';
import { OperationRow } from '@/invest/components/OperationRow';
import { usePortfolio } from '@/invest/hooks';
import { DIVIDEND_WITHHOLDING_THRESHOLD } from '@/invest/lib/tax';
import { useInvestStore } from '@/invest/store';
import type { IncomeType } from '@/invest/types';
import { todayISO } from '@/lib/clock';
import { addMonths, monthLabel, monthsOfYear, ymOf } from '@/lib/dates';
import { brl, brlShort, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { YM } from '@/types';

type Period = 'mes' | 'ano' | '12m';
const TYPES: IncomeType[] = ['dividendo', 'jcp', 'rendimento', 'juros', 'amortizacao', 'outro'];

export default function ProventosScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const operations = useInvestStore((s) => s.operations);
  const assets = useInvestStore((s) => s.assets);
  const summary = usePortfolio();
  const { hidden } = useHiddenValues();
  const currentYm = ymOf(todayISO());
  const [period, setPeriod] = useState<Period>('12m');
  const [ym, setYm] = useState<YM>(currentYm);
  const [year, setYear] = useState(Number(currentYm.slice(0, 4)));
  const show = (cents: number) => (hidden ? '••••' : brlShort(cents));

  const months: YM[] = useMemo(() => {
    if (period === 'mes') return [ym];
    if (period === 'ano') return monthsOfYear(year);
    return Array.from({ length: 12 }, (_, i) => addMonths(currentYm, i - 11));
  }, [period, ym, year, currentYm]);

  const data = useMemo(() => {
    const set = new Set(months);
    const list = operations.filter((o) => o.tipo === 'provento' && set.has(ymOf(o.data)));
    const net = (o: (typeof list)[number]) => o.valor - (o.irRetido ?? 0);
    const total = list.reduce((a, o) => a + net(o), 0);
    const byType = TYPES.map((k) => ({ k, v: list.filter((o) => (o.proventoTipo ?? 'outro') === k).reduce((a, o) => a + net(o), 0) })).filter((x) => x.v > 0);
    const byAssetMap = new Map<string, number>();
    for (const o of list) byAssetMap.set(o.assetId, (byAssetMap.get(o.assetId) ?? 0) + net(o));
    const byAsset = [...byAssetMap.entries()].sort((a, b) => b[1] - a[1]);
    const bars = (period === 'mes' ? Array.from({ length: 12 }, (_, i) => addMonths(ym, i - 11)) : months).map((m) => ({
      ym: m,
      total: operations.filter((o) => o.tipo === 'provento' && ymOf(o.data) === m).reduce((a, o) => a + net(o), 0),
    }));
    // dividendos acima de R$ 50 mil no mês, da mesma empresa (retenção de 10% desde 2026)
    const perAssetMonth = new Map<string, number>();
    for (const o of list.filter((x) => x.proventoTipo === 'dividendo')) {
      const key = `${o.assetId}|${ymOf(o.data)}`;
      perAssetMonth.set(key, (perAssetMonth.get(key) ?? 0) + o.valor);
    }
    const overLimit = [...perAssetMonth.entries()].filter(([, v]) => v > DIVIDEND_WITHHOLDING_THRESHOLD);
    return { list: [...list].reverse(), total, byType, byAsset, bars, overLimit };
  }, [operations, months, period, ym]);

  const count = period === 'mes' ? 1 : months.filter((m) => m <= currentYm).length || 1;
  const average = Math.round(data.total / count);
  const costHeld = summary.abertos.filter((v) => v.grupo !== 'fixa').reduce((a, v) => a + v.investido, 0);
  const yieldOnCost = period !== 'mes' && costHeld > 0 ? (data.total / count) * 12 / costHeld : null;
  const assetName = (id: string) => assets.find((a) => a.id === id)?.nome ?? '—';
  const maxAsset = Math.max(1, ...data.byAsset.map(([, v]) => v));

  return (
    <Screen>
      <ScreenHeader title={t('invest.incomeScreen.title')} subtitle={t('invest.incomeScreen.subtitle')} />
      <ScreenScroll gap={18}>
        <Segmented
          value={period}
          onChange={setPeriod}
          accessibilityLabel={t('invest.incomeScreen.periodA11y')}
          options={[
            { value: 'mes', label: t('export.month') },
            { value: 'ano', label: t('export.year') },
            { value: '12m', label: t('invest.incomeScreen.last12') },
          ]}
        />
        {period === 'mes' ? <MonthSelector value={ym} onShift={(d) => setYm((m) => addMonths(m, d))} /> : null}
        {period === 'ano' ? <MonthSelector value={`${year}-01`} label={String(year)} onShift={(d) => setYear((y) => y + d)} /> : null}

        <Card style={{ padding: 20, gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            {period === 'mes' ? monthLabel(ym) : period === 'ano' ? String(year) : t('invest.incomeScreen.last12')}
          </AppText>
          <AppText variant="title" tabular color={colors.income}>
            {hidden ? '••••' : brl(data.total)}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            {period !== 'mes' ? (
              <AppText variant="caption" color={colors.ink2} tabular>
                {t('invest.incomeScreen.average', { value: show(average) })}
              </AppText>
            ) : null}
            {yieldOnCost !== null ? (
              <AppText variant="caption" color={colors.ink2} tabular>
                {t('invest.incomeScreen.yieldOnCost', { pct: percent(yieldOnCost) })}
              </AppText>
            ) : null}
          </View>
        </Card>

        <Card style={{ padding: 16 }}>
          <IncomeBars data={data.bars} hidden={hidden} />
        </Card>

        {data.overLimit.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.installmentTint, borderRadius: 12, padding: 12 }}>
            <Icon name="info" size={18} color={colors.installmentText} />
            <AppText variant="label" color={colors.installmentText} style={{ flex: 1 }}>
              {t('invest.incomeScreen.withholdingNote', {
                list: data.overLimit.map(([k]) => `${assetName(k.split('|')[0])} (${monthLabel(k.split('|')[1])})`).join(', '),
              })}
            </AppText>
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('invest.incomeScreen.byType')} />
          <Card style={{ padding: 16, gap: 10 }}>
            {data.byType.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                {t('invest.incomeScreen.none')}
              </AppText>
            ) : (
              data.byType.map((x) => (
                <View key={x.k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="bodyStrong">{t(`invest.income.${x.k}`)}</AppText>
                  <AppText variant="bodyStrong" tabular>
                    {show(x.v)}
                  </AppText>
                </View>
              ))
            )}
          </Card>
        </View>

        {data.byAsset.length > 0 ? (
          <View>
            <SectionHeader title={t('invest.incomeScreen.byAsset')} />
            <Card style={{ padding: 16, gap: 12 }}>
              {data.byAsset.slice(0, 10).map(([id, v]) => (
                <View key={id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {assetName(id)}
                    </AppText>
                    <AppText variant="bodyStrong" tabular>
                      {show(v)}
                    </AppText>
                  </View>
                  <ProgressBar value={v / maxAsset} label={assetName(id)} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('invest.incomeScreen.received')} />
          <Button
            variant="soft"
            compact
            icon="plus"
            label={t('invest.incomeScreen.register')}
            onPress={() => router.push({ pathname: '/invest/operacao', params: { tipo: 'provento' } })}
            style={{ marginBottom: 12 }}
          />
          {data.list.length > 0 ? (
            <Card style={{ overflow: 'hidden' }}>
              {data.list.map((o, i) => (
                <OperationRow
                  key={o.id}
                  op={o}
                  asset={assets.find((a) => a.id === o.assetId)}
                  first={i === 0}
                  onPress={() => router.push({ pathname: '/invest/operacao', params: { id: o.id } })}
                />
              ))}
            </Card>
          ) : null}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
