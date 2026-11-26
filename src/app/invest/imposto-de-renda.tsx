import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, SectionHeader, Tag } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenScroll } from '@/components/ui/Screen';
import { StackHeader } from '@/components/ui/StackHeader';
import { DARF_CODE_B3, DARF_CODE_CRYPTO, monthlyTax, positionsAt, yearIncome } from '@/invest/lib/tax';
import { useInvestStore } from '@/invest/store';
import { todayISO } from '@/lib/clock';
import { displayDate, monthLabel } from '@/lib/dates';
import { brl, brlDelta, formatDecimal } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** IR estimado sobre vendas (mês a mês) e o resumo do ano para a declaração. */
export default function ImpostoDeRendaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const [year, setYear] = useState(Number(todayISO().slice(0, 4)));

  const { months, income, positions } = useMemo(() => {
    const all = monthlyTax(assets, operations, `${year}-12`);
    return {
      months: all.filter((m) => m.ym.startsWith(String(year))),
      income: yearIncome(assets, operations, year, all),
      positions: positionsAt(assets, operations, `${year}-12-31`),
    };
  }, [assets, operations, year]);

  const totalDarf = months.reduce((a, m) => a + m.darfB3 + m.darfCripto, 0);
  const assetName = (id: string) => assets.find((a) => a.id === id)?.nome ?? '—';

  return (
    <Screen>
      <StackHeader title={t('invest.more.tax')} />
      <ScreenScroll gap={18}>
        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.installmentTint, borderRadius: 12, padding: 12 }}>
          <Icon name="info" size={18} color={colors.installmentText} />
          <AppText variant="caption" color={colors.installmentText} style={{ flex: 1 }}>
            {t('invest.tax.disclaimer')}
          </AppText>
        </View>

        <MonthSelector value={`${year}-01`} label={String(year)} onShift={(d) => setYear((y) => y + d)} />

        <View>
          <SectionHeader title={t('invest.tax.monthly')} />
          {months.length === 0 ? (
            <Card style={{ padding: 16 }}>
              <AppText variant="body" color={colors.ink2}>
                {t('invest.tax.noSales')}
              </AppText>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {months.map((m) => {
                const due = m.darfB3 + m.darfCripto;
                return (
                  <Card key={m.ym} style={{ padding: 14, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AppText variant="bodyStrong" style={{ flex: 1 }}>
                        {monthLabel(m.ym)}
                      </AppText>
                      {due > 0 ? <Tag tone="expense">{t('invest.tax.darfDue', { value: brl(due) })}</Tag> : <Tag tone="success">{t('invest.tax.nothingDue')}</Tag>}
                    </View>
                    {m.vendasAcoes > 0 ? (
                      <AppText variant="caption" color={colors.ink2} tabular>
                        {t('invest.tax.stocks', { sales: brl(m.vendasAcoes), profit: brlDelta(m.lucroAcoes) })}
                        {m.acoesIsentas && m.lucroAcoes > 0 ? ` · ${t('invest.tax.exempt')}` : ''}
                      </AppText>
                    ) : null}
                    {m.lucroEtfBdr !== 0 ? (
                      <AppText variant="caption" color={colors.ink2} tabular>
                        {t('invest.tax.etfBdr', { profit: brlDelta(m.lucroEtfBdr) })}
                      </AppText>
                    ) : null}
                    {m.vendasFii > 0 ? (
                      <AppText variant="caption" color={colors.ink2} tabular>
                        {t('invest.tax.fii', { sales: brl(m.vendasFii), profit: brlDelta(m.lucroFii) })}
                      </AppText>
                    ) : null}
                    {m.vendasCripto > 0 ? (
                      <AppText variant="caption" color={colors.ink2} tabular>
                        {t('invest.tax.crypto', { sales: brl(m.vendasCripto), profit: brlDelta(m.lucroCripto) })}
                        {m.criptoIsenta ? ` · ${t('invest.tax.exempt')}` : ''}
                      </AppText>
                    ) : null}
                    {m.prejuizoComum > 0 || m.prejuizoFii > 0 ? (
                      <AppText variant="caption" color={colors.installmentText} tabular>
                        {t('invest.tax.losses', { common: brl(m.prejuizoComum), fii: brl(m.prejuizoFii) })}
                      </AppText>
                    ) : null}
                    {due > 0 ? (
                      <AppText variant="captionStrong" tabular>
                        {[
                          m.darfB3 ? t('invest.tax.darfLine', { code: DARF_CODE_B3, value: brl(m.darfB3) }) : null,
                          m.darfCripto ? t('invest.tax.darfLine', { code: DARF_CODE_CRYPTO, value: brl(m.darfCripto) }) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') + ` · ${t('invest.tax.dueDate', { date: displayDate(m.vencimento) })}`}
                      </AppText>
                    ) : null}
                  </Card>
                );
              })}
              <AppText variant="label" tabular>
                {t('invest.tax.yearTotal', { value: brl(totalDarf) })}
              </AppText>
            </View>
          )}
        </View>

        <View>
          <SectionHeader title={t('invest.tax.declaration')} />
          <Card style={{ padding: 16, gap: 8 }}>
            {[
              [t('invest.tax.exemptStocks'), income.lucroAcoesIsento],
              [t('invest.tax.dividends'), income.dividendos],
              [t('invest.tax.fiiIncome'), income.rendimentosFii],
              [t('invest.tax.jcp'), income.jcp],
              [t('invest.tax.interest'), income.juros],
              [t('invest.tax.otherIncome'), income.outros],
            ].map(([label, value]) => (
              <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  {label as string}
                </AppText>
                <AppText variant="bodyStrong" tabular>
                  {brl(value as number)}
                </AppText>
              </View>
            ))}
            {income.dividendosAcimaLimite.length > 0 ? (
              <AppText variant="caption" color={colors.installmentText}>
                {t('invest.tax.dividendWithholding', {
                  list: income.dividendosAcimaLimite.map((d) => `${assetName(d.assetId)} (${monthLabel(d.ym)})`).join(', '),
                })}
              </AppText>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionHeader title={t('invest.tax.positions', { year })} />
          <Card style={{ overflow: 'hidden' }}>
            {positions.length === 0 ? (
              <AppText variant="body" color={colors.ink2} style={{ padding: 16 }}>
                {t('invest.tax.noPositions')}
              </AppText>
            ) : (
              positions.map((p, i) => (
                <View key={p.asset.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {p.asset.ticker ? `${p.asset.ticker} — ${p.asset.nome}` : p.asset.nome}
                    </AppText>
                    <AppText variant="caption" color={colors.ink2}>
                      {p.quantidade !== null ? `${formatDecimal(p.quantidade, 8)} ${t('invest.units')}` : t(`invest.types.${p.asset.tipo}`)}
                    </AppText>
                  </View>
                  <AppText variant="bodyStrong" tabular>
                    {brl(p.custo)}
                  </AppText>
                </View>
              ))
            )}
          </Card>
          <AppText variant="caption" color={colors.ink2} style={{ marginTop: 8 }}>
            {t('invest.tax.positionsHint')}
          </AppText>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
