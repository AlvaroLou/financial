import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DateField } from '@/components/ui/DateField';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, MoneyInput, TextField } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, SectionHeader, Tag } from '@/components/ui/primitives';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { ASSET_TYPES } from '@/invest/catalog';
import { OperationRow } from '@/invest/components/OperationRow';
import { usePortfolio } from '@/invest/hooks';
import { rateText } from '@/invest/labels';
import { cdiReturn } from '@/invest/lib/fixedIncome';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { todayISO } from '@/lib/clock';
import { diffDays, displayDate } from '@/lib/dates';
import { brl, brlDelta, formatDecimal, parseDecimal, percent, percentSigned } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

export default function AtivoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const summary = usePortfolio();
  const v = summary.valuations.find((x) => x.asset.id === id);
  const operations = useInvestStore((s) => s.operations);
  const institutions = useInvestStore((s) => s.institutions);
  const goals = useFinanceStore((s) => s.goals);
  const rates = useMarketStore((s) => s.rates);
  const store = useInvestStore.getState;
  const { hidden, toggle } = useHiddenValues();
  const ask = useDialog();
  const showSnackbar = useSnackbar();
  const [sheet, setSheet] = useState<'price' | 'value' | null>(null);
  const [priceText, setPriceText] = useState('');
  const [manualValue, setManualValue] = useState(0);
  const [manualDate, setManualDate] = useState(todayISO());

  const ops = useMemo(() => operations.filter((o) => o.assetId === id).reverse(), [operations, id]);
  const today = todayISO();

  const vsCdi = useMemo(() => {
    if (!v?.asset.rf || ops.length === 0 || v.investido <= 0) return null;
    const first = ops[ops.length - 1].data;
    const cdi = cdiReturn(rates, first, today);
    const own = v.valorAtual / v.investido - 1;
    return cdi.value > 0 ? own / cdi.value : null;
  }, [v, ops, rates, today]);

  if (!v) {
    return (
      <Screen>
        <View style={styles.header}>
          <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <AppText variant="body" color={colors.ink2} align="center" style={{ marginTop: 40 }}>
          {t('invest.detail.notFound')}
        </AppText>
      </Screen>
    );
  }

  const a = v.asset;
  const info = ASSET_TYPES[a.tipo];
  const show = (cents: number) => (hidden ? '••••' : brl(cents));
  const goal = goals.find((g) => g.id === a.metaId);
  const inst = institutions.find((i) => i.id === a.instituicaoId);

  const remove = () =>
    ask({
      title: t('invest.detail.deleteTitle', { name: a.nome }),
      message: t('invest.detail.deleteMessage', { count: ops.length }),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const removed = store().removeAsset(a.id);
            router.back();
            if (removed) {
              showSnackbar({
                message: t('invest.detail.deleted', { name: a.nome }),
                actionLabel: t('common.undo'),
                onAction: () => store().restoreAsset(removed.asset, removed.operations),
              });
            }
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });

  const savePrice = () => {
    const p = parseDecimal(priceText);
    if (!(p > 0)) return;
    store().updateAsset(a.id, { cotacaoManual: { preco: p, em: new Date().toISOString() } });
    setSheet(null);
    showSnackbar({ message: t('invest.detail.priceSaved') });
  };

  const saveValue = () => {
    if (manualValue <= 0) return;
    store().updateAsset(a.id, { valorManual: { valor: manualValue, data: manualDate } });
    setSheet(null);
    showSnackbar({ message: t('invest.detail.valueSaved') });
  };

  const rows: [string, string][] = [
    [t('invest.form.type'), t(`invest.types.${a.tipo}`)],
    ...(a.ticker ? [[t('invest.form.ticker'), a.ticker] as [string, string]] : []),
    ...(a.coingeckoId ? [['CoinGecko', a.coingeckoId] as [string, string]] : []),
    [t('invest.form.institution'), inst?.nome ?? '—'],
    [t('invest.detail.taxStatus'), info.isentoIR ? t('invest.detail.exempt') : t('invest.detail.taxable')],
    [t('invest.detail.fgc'), (a.fgc ?? info.fgc) ? t('invest.detail.fgcYes') : t('invest.detail.fgcNo')],
  ];
  if (a.rf) {
    rows.push([t('invest.detail.rate'), rateText(a.rf)]);
    rows.push([t('invest.detail.start'), displayDate(a.rf.dataInicio)]);
    rows.push([
      t('invest.form.maturity'),
      a.rf.vencimento ? `${displayDate(a.rf.vencimento)} · ${t('invest.detail.daysLeft', { count: Math.max(0, diffDays(today, a.rf.vencimento)) })}` : '—',
    ]);
    rows.push([t('invest.form.dailyLiquidity'), a.rf.liquidezDiaria ? t('common.yes') : t('common.no')]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
          {a.nome}
        </AppText>
        <IconButton icon={hidden ? 'eyeOff' : 'eye'} label={hidden ? t('common.showValues') : t('common.hideValues')} onPress={toggle} />
        <IconButton icon="edit" label={t('common.edit')} onPress={() => router.push({ pathname: '/invest/ativo-form', params: { id: a.id } })} />
        <IconButton icon="trash" label={t('common.delete')} color={colors.expense} onPress={remove} />
      </View>
      <ScreenScroll gap={18}>
        <Card style={{ padding: 20, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Tag icon={info.icon}>{t(`invest.classes.${info.classe}`)}</Tag>
            {v.fechado ? <Tag tone="installment">{t('invest.detail.closed')}</Tag> : null}
            {v.approximate ? <Tag>{t('invest.estimated')}</Tag> : null}
          </View>
          <AppText variant="label" color={colors.ink2}>
            {t('invest.detail.currentValue')}
          </AppText>
          <AppText variant="title" tabular numberOfLines={1} adjustsFontSizeToFit>
            {show(v.valorAtual)}
          </AppText>
          <View style={styles.grid}>
            <Metric label={t('invest.hero.invested')} value={show(v.investido)} />
            <Metric
              label={t('invest.result')}
              value={hidden ? '••••' : `${brlDelta(v.resultado)}${v.resultadoPct !== null ? ` (${percentSigned(v.resultadoPct)})` : ''}`}
              color={v.resultado < 0 ? colors.expense : colors.income}
            />
            {a.rf ? <Metric label={t('invest.detail.net')} value={show(v.valorLiquido)} hint={t('invest.detail.netHint', { value: hidden ? '••••' : brl(v.irEstimado) })} /> : null}
            {vsCdi !== null ? <Metric label={t('invest.detail.vsCdi')} value={percent(vsCdi, 0)} /> : null}
            {v.realizado !== 0 ? <Metric label={t('invest.detail.realized')} value={hidden ? '••••' : brlDelta(v.realizado)} color={v.realizado < 0 ? colors.expense : colors.income} /> : null}
            {v.proventos > 0 ? <Metric label={t('tabs.proventos')} value={show(v.proventos)} color={colors.income} /> : null}
          </View>
        </Card>

        {info.valuation === 'quote' ? (
          <Card style={{ padding: 16, gap: 10 }}>
            <View style={styles.grid}>
              <Metric label={t('invest.form.quantity')} value={formatDecimal(v.quantidade ?? 0, 8)} />
              <Metric label={t('invest.detail.avgPrice')} value={hidden ? '••••' : brl(Math.round((v.precoMedio ?? 0) * 100))} />
              <Metric
                label={t('invest.detail.price')}
                value={v.preco !== undefined ? `R$ ${formatDecimal(v.preco, v.preco < 1 ? 8 : 2, 2)}` : '—'}
                hint={t(`invest.detail.priceSource.${v.precoFonte}`, { time: v.precoEm ? displayDate(v.precoEm.slice(0, 10)) : '' })}
              />
              {v.variacaoDiaPct !== undefined ? (
                <Metric label={t('invest.detail.today')} value={percentSigned(v.variacaoDiaPct)} color={v.variacaoDiaPct < 0 ? colors.expense : colors.income} />
              ) : null}
            </View>
            <Button
              compact
              variant="outline"
              icon="edit"
              label={t('invest.detail.setPrice')}
              onPress={() => {
                setPriceText(v.preco ? formatDecimal(v.preco, 8, 2) : '');
                setSheet('price');
              }}
            />
            {a.cotacaoManual ? (
              <Button compact variant="outline" icon="undo" label={t('invest.detail.clearPrice')} onPress={() => store().updateAsset(a.id, { cotacaoManual: undefined })} />
            ) : null}
          </Card>
        ) : (
          <Card style={{ padding: 16, gap: 10 }}>
            <AppText variant="caption" color={colors.ink2}>
              {a.valorManual
                ? t('invest.detail.manualValueInfo', { value: hidden ? '••••' : brl(a.valorManual.valor), date: displayDate(a.valorManual.data) })
                : info.valuation === 'fixed'
                  ? t('invest.detail.fixedInfo')
                  : t('invest.detail.manualInfo')}
            </AppText>
            <Button
              compact
              variant="outline"
              icon="edit"
              label={t('invest.detail.setValue')}
              onPress={() => {
                setManualValue(v.valorAtual);
                setManualDate(today);
                setSheet('value');
              }}
            />
            {a.valorManual ? (
              <Button compact variant="outline" icon="undo" label={t('invest.detail.clearValue')} onPress={() => store().updateAsset(a.id, { valorManual: undefined })} />
            ) : null}
          </Card>
        )}

        <Card style={{ overflow: 'hidden' }}>
          {rows.map(([k, val], i) => (
            <View key={k} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                {k}
              </AppText>
              <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
                {val}
              </AppText>
            </View>
          ))}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <Icon name="target" size={18} color={colors.primary} />
            <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
              {t('invest.form.goal')}
            </AppText>
            <AppText variant="bodyStrong">{goal?.nome ?? t('invest.form.noGoal')}</AppText>
          </View>
        </Card>

        <View>
          <SectionHeader
            title={t('invest.detail.operations')}
            actionLabel={t('invest.portfolio.newOperation')}
            onAction={() => router.push({ pathname: '/invest/operacao', params: { assetId: a.id } })}
          />
          <Card style={{ overflow: 'hidden' }}>
            {ops.map((o, i) => (
              <OperationRow
                key={o.id}
                op={o}
                first={i === 0}
                showAsset={false}
                onPress={() => router.push({ pathname: '/invest/operacao', params: { id: o.id } })}
              />
            ))}
          </Card>
        </View>
        {a.notas ? (
          <AppText variant="caption" color={colors.ink2}>
            {a.notas}
          </AppText>
        ) : null}
      </ScreenScroll>

      <BottomSheet visible={sheet === 'price'} title={t('invest.detail.setPrice')} onClose={() => setSheet(null)}>
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <TextField
            label={t('invest.form.unitPrice')}
            value={priceText}
            onChangeText={(x) => setPriceText(x.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            hint={t('invest.detail.setPriceHint')}
          />
          <Button label={t('common.save')} icon="check" onPress={savePrice} />
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'value'} title={t('invest.detail.setValue')} onClose={() => setSheet(null)}>
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <MoneyInput label={t('invest.detail.currentValue')} value={manualValue} onChange={setManualValue} tone={colors.primary} />
          <DateField label={t('invest.detail.valueDate')} value={manualDate} onChange={setManualDate} />
          <AppText variant="caption" color={colors.ink2}>
            {info.valuation === 'fixed' ? t('invest.detail.setValueFixedHint') : t('invest.detail.setValueHint')}
          </AppText>
          <Button label={t('common.save')} icon="check" onPress={saveValue} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

function Metric({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <AppText variant="caption" color={colors.ink2}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" color={color} tabular numberOfLines={2}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" color={colors.ink2} numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 12 },
  metric: { width: '47%', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: layout.screenPadding - 4, paddingVertical: 12 },
});
