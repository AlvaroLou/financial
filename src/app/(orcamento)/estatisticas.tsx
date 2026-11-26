import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DonutChart } from '@/components/charts/DonutChart';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useMonthData } from '@/hooks/useMonthData';
import { categoryName, paymentLabel } from '@/i18n/labels';
import { monthLabel } from '@/lib/dates';
import { PAYMENT_ORDER } from '@/lib/labels';
import { brl, brlShort, percent, spokenBrl } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { categoryColorMap, OTHER_SERIES } from '@/theme/tokens';

function LegendRow({ color, label, pct, value }: { color: string; label: string; pct: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${spokenBrl(value)}, ${pct}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="body" color={colors.ink2} tabular>
        {pct}
      </AppText>
      <AppText variant="bodyStrong" tabular style={{ minWidth: 84, textAlign: 'right' }}>
        {brlShort(value)}
      </AppText>
    </View>
  );
}

export default function EstatisticasScreen() {
  const { t } = useTranslation();
  const { colors, base } = useTheme();
  const { month, prevMonth, summary, prevSummary } = useMonthData();
  const categories = useFinanceStore((s) => s.categories);

  const total = summary.despesas;
  const delta = prevSummary.despesas > 0 ? (total - prevSummary.despesas) / prevSummary.despesas : null;
  const lower = delta !== null && delta <= 0;

  const expenseCategories = categories.filter((c) => c.kind === 'despesa');
  const colorOf = categoryColorMap(expenseCategories, base);
  const all = expenseCategories
    .map((c) => ({ id: c.id, nome: categoryName(c), value: summary.porCategoria[c.id] ?? 0, color: colorOf[c.id] }))
    .filter((s) => s.value > 0);
  // categorias sem cor própria (passaram de 8 ou "Outros") viram uma fatia só, em cinza
  const others = all.filter((s) => s.color === OTHER_SERIES[base]);
  const slices = [
    ...all.filter((s) => s.color !== OTHER_SERIES[base]).sort((a, b) => b.value - a.value),
    ...(others.length
      ? [
          {
            id: '__outros__',
            nome: others.length === 1 ? others[0].nome : t('stats.others', { count: others.length }),
            value: others.reduce((a, s) => a + s.value, 0),
            color: OTHER_SERIES[base],
          },
        ]
      : []),
  ];

  const tags = expenseCategories
    .map((c) => ({ id: c.id, nome: categoryName(c), icon: c.icone, value: summary.porEtiqueta[c.id] ?? 0 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxTag = Math.max(1, ...tags.map((x) => x.value));

  const fixPct = total > 0 ? summary.fixos / total : 0;
  const varPct = total > 0 ? summary.variaveis / total : 0;

  const byPayment = PAYMENT_ORDER.map((p) => ({ forma: p, value: summary.porForma[p] }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxPayment = Math.max(1, ...byPayment.map((p) => p.value));

  return (
    <Screen>
      <ScreenHeader title={t('stats.title')} />
      <ScreenScroll gap={20}>
        <MonthSelector />

        {/* Total + comparação com o mês anterior */}
        <Card style={{ padding: 20, gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            {t('stats.monthExpenses')}
          </AppText>
          <AppText variant="title" tabular numberOfLines={1} adjustsFontSizeToFit>
            {brl(total)}
          </AppText>
          {delta !== null ? (
            <View
              accessible
              accessibilityLabel={t('stats.vsPrevA11y', {
                pct: percent(Math.abs(delta)),
                direction: lower ? t('stats.less') : t('stats.more'),
                month: monthLabel(prevMonth),
              })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
            >
              <Icon name={lower ? 'trendDown' : 'trendUp'} size={18} color={lower ? colors.income : colors.expense} />
              <AppText variant="label" color={lower ? colors.income : colors.expense}>
                {t('stats.vsPrev', { delta: `${lower ? '−' : '+'}${percent(Math.abs(delta))}` })}
              </AppText>
              <AppText variant="caption" color={colors.ink2}>
                {`(${brlShort(prevSummary.despesas)})`}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color={colors.ink2}>
              {t('stats.noPrev')}
            </AppText>
          )}
        </Card>

        {/* Por categoria */}
        <View>
          <SectionHeader title={t('stats.byCategory')} />
          <Card style={{ padding: 20, gap: 20, alignItems: 'center' }}>
            {slices.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                {t('stats.noExpenses')}
              </AppText>
            ) : (
              <>
                <DonutChart
                  slices={slices}
                  accessibilityLabel={t('stats.donutA11y', {
                    list: slices.map((s) => `${s.nome} ${percent(s.value / total, 0)}`).join(', '),
                  })}
                >
                  <AppText variant="caption" color={colors.ink2}>
                    {t('common.total')}
                  </AppText>
                  <AppText variant="h2" tabular>
                    {brlShort(total)}
                  </AppText>
                </DonutChart>

                <View style={{ alignSelf: 'stretch', gap: 4 }}>
                  {slices.map((s) => (
                    <LegendRow key={s.id} color={s.color} label={s.nome} pct={percent(s.value / total, 0)} value={s.value} />
                  ))}
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Por etiqueta (ex.: Cartão) */}
        <View>
          <SectionHeader title={t('stats.byTag')} />
          <Card style={{ padding: 20, gap: 14 }}>
            <AppText variant="caption" color={colors.ink2}>
              {t('stats.byTagHint')}
            </AppText>
            {tags.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                {t('stats.noTags')}
              </AppText>
            ) : (
              tags.map((x) => (
                <View key={x.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name={x.icon} size={18} color={colors.primary} />
                    <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {x.nome}
                    </AppText>
                    <AppText variant="bodyStrong" tabular>
                      {brlShort(x.value)}
                    </AppText>
                  </View>
                  <ProgressBar value={x.value / maxTag} height={10} label={`${x.nome}: ${spokenBrl(x.value)}`} />
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Fixos x Variáveis */}
        <View>
          <SectionHeader title={t('stats.fixedVsVariable')} />
          <Card style={{ padding: 20, gap: 14 }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('stats.fixedVsVariableA11y', { fixed: percent(fixPct), variable: percent(varPct) })}
              style={{ flexDirection: 'row', height: 14, gap: 2 }}
            >
              <View
                style={{
                  flex: Math.max(fixPct, 0.0001),
                  backgroundColor: colors.seriesStrong,
                  borderTopLeftRadius: 7,
                  borderBottomLeftRadius: 7,
                }}
              />
              <View
                style={{
                  flex: Math.max(varPct, 0.0001),
                  backgroundColor: colors.accentAlt,
                  borderTopRightRadius: 7,
                  borderBottomRightRadius: 7,
                }}
              />
            </View>
            <LegendRow color={colors.seriesStrong} label={t('stats.fixed')} pct={percent(fixPct)} value={summary.fixos} />
            <LegendRow color={colors.accentAlt} label={t('stats.variable')} pct={percent(varPct)} value={summary.variaveis} />
          </Card>
        </View>

        {/* Forma de pagamento */}
        <View>
          <SectionHeader title={t('stats.byPayment')} />
          <Card style={{ padding: 20, gap: 14 }}>
            {byPayment.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                {t('stats.noExpenses')}
              </AppText>
            ) : (
              byPayment.map((p) => (
                <View key={p.forma} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="bodyStrong">{paymentLabel(p.forma)}</AppText>
                    <AppText variant="bodyStrong" tabular>
                      {brlShort(p.value)}
                    </AppText>
                  </View>
                  <ProgressBar value={p.value / maxPayment} height={10} label={`${paymentLabel(p.forma)}: ${spokenBrl(p.value)}`} />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
