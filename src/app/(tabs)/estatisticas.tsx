import { View } from 'react-native';

import { DonutChart } from '@/components/charts/DonutChart';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useMonthData } from '@/hooks/useMonthData';
import { monthLabel } from '@/lib/dates';
import { PAYMENT_LABEL, PAYMENT_ORDER } from '@/lib/labels';
import { brl, brlShort, percent, spokenBrl } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { categoryColorMap, colors } from '@/theme/tokens';

export default function EstatisticasScreen() {
  const { month, prevMonth, summary, prevSummary } = useMonthData();
  const categories = useFinanceStore((s) => s.categories);

  const total = summary.despesas;
  const delta = prevSummary.despesas > 0 ? (total - prevSummary.despesas) / prevSummary.despesas : null;
  const lower = delta !== null && delta <= 0;

  const expenseCategories = categories.filter((c) => c.kind === 'despesa');
  const colorOf = categoryColorMap(expenseCategories);
  const slices = expenseCategories
    .map((c) => ({ id: c.id, nome: c.nome, value: summary.porCategoria[c.id] ?? 0, color: colorOf[c.id] }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const fixPct = total > 0 ? summary.fixos / total : 0;
  const varPct = total > 0 ? summary.variaveis / total : 0;

  const byPayment = PAYMENT_ORDER.map((p) => ({ forma: p, value: summary.porForma[p] }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxPayment = Math.max(1, ...byPayment.map((p) => p.value));

  return (
    <Screen>
      <ScreenHeader title="Estatísticas" />
      <ScreenScroll gap={20}>
        <MonthSelector />

        {/* Total + comparação com o mês anterior */}
        <Card style={{ padding: 20, gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            Despesas do mês
          </AppText>
          <AppText variant="title" tabular>
            {brl(total)}
          </AppText>
          {delta !== null ? (
            <View
              accessible
              accessibilityLabel={`${percent(Math.abs(delta))} ${lower ? 'menos' : 'mais'} que em ${monthLabel(prevMonth)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name={lower ? 'trendDown' : 'trendUp'} size={18} color={lower ? colors.primary : colors.expense} />
              <AppText variant="label" color={lower ? colors.primary : colors.expense}>
                {`${lower ? '−' : '+'}${percent(Math.abs(delta))} vs. mês anterior`}
              </AppText>
              <AppText variant="caption" color={colors.ink2}>
                {`(${brlShort(prevSummary.despesas)})`}
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color={colors.ink2}>
              Sem dados do mês anterior para comparar.
            </AppText>
          )}
        </Card>

        {/* Por categoria */}
        <View>
          <SectionHeader title="Por categoria" />
          <Card style={{ padding: 20, gap: 20, alignItems: 'center' }}>
            {slices.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                Nenhuma despesa neste mês.
              </AppText>
            ) : (
              <>
                <DonutChart
                  slices={slices}
                  accessibilityLabel={`Despesas por categoria: ${slices
                    .map((s) => `${s.nome} ${percent(s.value / total, 0)}`)
                    .join(', ')}`}
                >
                  <AppText variant="caption" color={colors.ink2}>
                    Total
                  </AppText>
                  <AppText variant="h2" tabular>
                    {brlShort(total)}
                  </AppText>
                </DonutChart>

                <View style={{ alignSelf: 'stretch', gap: 4 }}>
                  {slices.map((s) => (
                    <View
                      key={s.id}
                      accessible
                      accessibilityLabel={`${s.nome}, ${spokenBrl(s.value)}, ${percent(s.value / total, 0)}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: s.color }} />
                      <AppText variant="bodyStrong" style={{ flex: 1 }}>
                        {s.nome}
                      </AppText>
                      <AppText variant="body" color={colors.ink2} tabular>
                        {percent(s.value / total, 0)}
                      </AppText>
                      <AppText variant="bodyStrong" tabular style={{ minWidth: 84, textAlign: 'right' }}>
                        {brlShort(s.value)}
                      </AppText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Fixos x Variáveis */}
        <View>
          <SectionHeader title="Fixos x Variáveis" />
          <Card style={{ padding: 20, gap: 14 }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Fixos ${percent(fixPct)}, variáveis ${percent(varPct)}`}
              style={{ flexDirection: 'row', height: 14, gap: 2 }}
            >
              <View
                style={{
                  flex: Math.max(fixPct, 0.0001),
                  backgroundColor: colors.forest,
                  borderTopLeftRadius: 7,
                  borderBottomLeftRadius: 7,
                }}
              />
              <View
                style={{
                  flex: Math.max(varPct, 0.0001),
                  backgroundColor: colors.olive,
                  borderTopRightRadius: 7,
                  borderBottomRightRadius: 7,
                }}
              />
            </View>
            {[
              { label: 'Fixos', value: summary.fixos, pct: fixPct, color: colors.forest },
              { label: 'Variáveis', value: summary.variaveis, pct: varPct, color: colors.olive },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: row.color }} />
                <AppText variant="bodyStrong" style={{ flex: 1 }}>
                  {row.label}
                </AppText>
                <AppText variant="body" color={colors.ink2} tabular>
                  {percent(row.pct)}
                </AppText>
                <AppText variant="bodyStrong" tabular style={{ minWidth: 84, textAlign: 'right' }}>
                  {brlShort(row.value)}
                </AppText>
              </View>
            ))}
          </Card>
        </View>

        {/* Forma de pagamento */}
        <View>
          <SectionHeader title="Forma de pagamento" />
          <Card style={{ padding: 20, gap: 14 }}>
            {byPayment.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                Nenhuma despesa neste mês.
              </AppText>
            ) : (
              byPayment.map((p) => (
                <View key={p.forma} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText variant="bodyStrong">{PAYMENT_LABEL[p.forma]}</AppText>
                    <AppText variant="bodyStrong" tabular>
                      {brlShort(p.value)}
                    </AppText>
                  </View>
                  <ProgressBar
                    value={p.value / maxPayment}
                    height={10}
                    label={`${PAYMENT_LABEL[p.forma]}: ${spokenBrl(p.value)}`}
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
