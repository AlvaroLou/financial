import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { MoneyInput, TextField } from '@/components/ui/Fields';
import { Card, Chip, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { StackHeader } from '@/components/ui/StackHeader';
import { usePortfolio } from '@/invest/hooks';
import { futureValue, monthsToGoal, requiredMonthly, simulationSeries } from '@/invest/lib/simulator';
import { useMarketStore } from '@/invest/store';
import { brl, brlShort, formatDecimal, parseDecimal } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** Juros compostos: quanto vira, em quanto tempo chega na meta e quanto aportar por mês (valores brutos). */
export default function SimuladorScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rates = useMarketStore((s) => s.rates);
  const summary = usePortfolio();
  const [initial, setInitial] = useState(summary.patrimonio > 0 ? summary.patrimonio : 1_000_000);
  const [monthly, setMonthly] = useState(100_000);
  const [rateText, setRateText] = useState(formatDecimal(rates.cdiAnual * 100, 2, 2));
  const [yearsText, setYearsText] = useState('10');
  const [goal, setGoal] = useState(100_000_000);

  const rate = parseDecimal(rateText) / 100;
  const years = Math.min(60, Math.max(0, Math.round(parseDecimal(yearsText) || 0)));
  const months = years * 12;
  const valid = Number.isFinite(rate) && rate > -0.5 && rate < 5;

  const result = useMemo(() => {
    if (!valid) return null;
    const total = futureValue(initial, monthly, rate, months);
    const invested = initial + monthly * months;
    return {
      total,
      invested,
      interest: total - invested,
      toGoal: monthsToGoal(initial, monthly, rate, goal),
      needed: requiredMonthly(initial, rate, months, goal),
      series: simulationSeries(initial, monthly, rate, months, months > 120 ? 60 : 12),
    };
  }, [valid, initial, monthly, rate, months, goal]);

  const presets = [
    { label: t('invest.sim.presetCdi', { pct: formatDecimal(rates.cdiAnual * 100, 2) }), v: rates.cdiAnual },
    { label: t('invest.sim.presetIpca', { pct: formatDecimal((((1 + rates.ipca12m) * 1.06 - 1) * 100), 2) }), v: (1 + rates.ipca12m) * 1.06 - 1 },
    { label: t('invest.sim.presetPoupanca'), v: rates.selicMeta > 0.085 ? 0.0617 : rates.selicMeta * 0.7 },
  ];
  const max = result ? Math.max(1, ...result.series.map((p) => p.total)) : 1;
  const fmtMonths = (n: number) =>
    n < 12 ? t('invest.sim.months', { count: n }) : t('invest.sim.yearsMonths', { years: Math.floor(n / 12), months: n % 12 });

  return (
    <Screen>
      <StackHeader title={t('invest.more.simulator')} />
      <ScreenScroll gap={18}>
        <Card style={{ padding: 16, gap: 14 }}>
          <MoneyInput label={t('invest.sim.initial')} value={initial} onChange={setInitial} />
          <MoneyInput label={t('invest.sim.monthly')} value={monthly} onChange={setMonthly} />
          <TextField
            label={t('invest.sim.rate')}
            value={rateText}
            onChangeText={(v) => setRateText(v.replace(/[^\d.,-]/g, ''))}
            keyboardType="decimal-pad"
            error={valid ? undefined : t('invest.sim.rateError')}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {presets.map((p) => (
              <Chip key={p.label} label={p.label} onPress={() => setRateText(formatDecimal(p.v * 100, 2, 2))} />
            ))}
          </View>
          <TextField label={t('invest.sim.years')} value={yearsText} onChangeText={(v) => setYearsText(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
          <MoneyInput label={t('invest.sim.goal')} value={goal} onChange={setGoal} tone={colors.primary} />
        </Card>

        {result ? (
          <>
            <Card style={{ padding: 20, gap: 8 }}>
              <AppText variant="label" color={colors.ink2}>
                {t('invest.sim.after', { count: years })}
              </AppText>
              <AppText variant="title" tabular numberOfLines={1} adjustsFontSizeToFit>
                {brl(result.total)}
              </AppText>
              <AppText variant="caption" color={colors.ink2} tabular>
                {t('invest.sim.breakdown', { invested: brlShort(result.invested), interest: brlShort(result.interest) })}
              </AppText>
            </Card>

            <View>
              <SectionHeader title={t('invest.sim.goalTitle', { goal: brlShort(goal) })} />
              <Card style={{ padding: 16, gap: 8 }}>
                <AppText variant="bodyStrong">
                  {result.toGoal === null ? t('invest.sim.never') : result.toGoal === 0 ? t('invest.sim.already') : t('invest.sim.reachIn', { time: fmtMonths(result.toGoal) })}
                </AppText>
                <AppText variant="caption" color={colors.ink2} tabular>
                  {months > 0 ? t('invest.sim.needed', { value: brlShort(result.needed), years }) : ''}
                </AppText>
              </Card>
            </View>

            <View>
              <SectionHeader title={t('invest.sim.byYear')} />
              <Card style={{ padding: 16, gap: 10 }}>
                {result.series.slice(1).map((p) => (
                  <View key={p.month} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="label">{t('invest.sim.yearN', { count: Math.round(p.month / 12) })}</AppText>
                      <AppText variant="bodyStrong" tabular>
                        {brlShort(p.total)}
                      </AppText>
                    </View>
                    <ProgressBar value={p.total / max} label={brlShort(p.total)} />
                    <AppText variant="caption" color={colors.ink2} tabular>
                      {t('invest.sim.investedSoFar', { value: brlShort(p.investido) })}
                    </AppText>
                  </View>
                ))}
              </Card>
            </View>
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.sim.disclaimer')}
            </AppText>
          </>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
