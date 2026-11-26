import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { GoalsSection } from '@/components/GoalsSection';
import { LimitSlider } from '@/components/charts/LimitSlider';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useMonthData } from '@/hooks/useMonthData';
import { categoryName } from '@/i18n/labels';
import { todayISO } from '@/lib/clock';
import { addMonths, monthName, ymOf } from '@/lib/dates';
import { monthOccurrences, projectInstallments, recurringTotals, summarize } from '@/lib/finance';
import { brl, brlShort, percent } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';

const LIMIT_MAX = 300_000; // R$ 3.000 (mínimo da escala do slider)
const LIMIT_STEP = 5_000; // R$ 50
/** escala do slider: cresce com o limite/gasto da categoria (arredondada a R$ 500) */
const sliderMax = (limit: number, spent: number) =>
  Math.max(LIMIT_MAX, Math.ceil((Math.max(limit, spent) * 1.5) / 50_000) * 50_000);

export default function PlanejarScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { summary, budget } = useMonthData();
  const categories = useFinanceStore((s) => s.categories);
  const records = useFinanceStore((s) => s.records);
  const setCategoryLimit = useFinanceStore((s) => s.setCategoryLimit);

  const expenseCategories = categories.filter((c) => c.kind === 'despesa');
  const used = budget > 0 ? summary.despesas / budget : 0;
  const remaining = budget - summary.despesas;

  // projeção: a partir do mês seguinte ao mês de hoje; comprometimento sobre a renda do mês ATUAL
  const currentYm = ymOf(todayISO());
  const projectionStart = addMonths(currentYm, 1);
  const { projection, currentIncome, recurring } = useMemo(
    () => ({
      projection: projectInstallments(records, projectionStart, 6),
      currentIncome: summarize(monthOccurrences(records, currentYm)).receitas,
      recurring: recurringTotals(records, projectionStart),
    }),
    [records, projectionStart, currentYm],
  );
  const nextTotal = projection[0]?.total ?? 0;
  const nextMonthName = monthName(projectionStart, currentYm);

  return (
    <Screen>
      <ScreenHeader title={t('plan.title')} subtitle={t('plan.subtitle')} />
      <ScreenScroll gap={20}>
        <MonthSelector />

        {/* Orçamento do mês */}
        {budget <= 0 ? (
          <Card style={{ padding: 20, gap: 8 }}>
            <AppText variant="label" color={colors.ink2}>
              {t('plan.budgetTitle')}
            </AppText>
            <AppText variant="h3">{t('plan.noLimitsTitle')}</AppText>
            <AppText variant="body" color={colors.ink2}>
              {t('plan.noLimitsText')}
            </AppText>
          </Card>
        ) : (
          <Card style={{ padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ flexShrink: 1 }}>
                <AppText variant="label" color={colors.ink2}>
                  {t('plan.budgetTitle')}
                </AppText>
                <AppText variant="title" tabular numberOfLines={1} adjustsFontSizeToFit>
                  {brl(budget)}
                </AppText>
              </View>
              <AppText variant="h2" color={used > 1 ? colors.expense : colors.primary} tabular>
                {percent(used, 0)}
              </AppText>
            </View>
            <ProgressBar
              value={used}
              height={10}
              color={used > 1 ? colors.expenseFill : used >= 0.8 ? colors.installment : colors.accent}
              label={t('plan.budgetBar')}
            />
            <AppText variant="caption" color={colors.ink2} tabular>
              {remaining >= 0
                ? t('plan.remaining', { spent: brlShort(summary.despesas), left: brlShort(remaining) })
                : t('plan.exceeded', { spent: brlShort(summary.despesas), over: brlShort(-remaining) })}
            </AppText>
          </Card>
        )}

        {/* Limites por categoria */}
        <View>
          <SectionHeader title={t('plan.limitsTitle')} actionLabel={t('plan.categoriesLink')} onAction={() => router.push('/ajustes')} />
          <Card style={{ padding: 16, gap: 18 }}>
            {expenseCategories.map((c) => {
              const spent = summary.porCategoria[c.id] ?? 0;
              return (
                <LimitSlider
                  key={c.id}
                  name={categoryName(c)}
                  icon={c.icone}
                  spent={spent}
                  limit={c.limiteMensal}
                  max={sliderMax(c.limiteMensal, spent)}
                  step={LIMIT_STEP}
                  onCommit={(v) => setCategoryLimit(c.id, v)}
                />
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="info" size={16} color={colors.ink2} />
              <AppText variant="caption" color={colors.ink2} style={{ flex: 1 }}>
                {t('plan.limitsHint')}
              </AppText>
            </View>
          </Card>
        </View>

        {/* Parcelas futuras */}
        <View>
          <SectionHeader title={t('plan.installmentsTitle')} />
          <Card style={{ padding: 20, gap: 16 }}>
            <ProjectionChart data={projection} />
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                backgroundColor: colors.installmentTint,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Icon name="info" size={18} color={colors.installmentText} />
              <AppText variant="label" color={colors.installmentText} style={{ flex: 1 }}>
                {nextTotal === 0
                  ? t('plan.noInstallments', { month: nextMonthName })
                  : currentIncome > 0
                    ? t('plan.installmentsNextIncome', {
                        month: nextMonthName,
                        value: brlShort(nextTotal),
                        pct: percent(nextTotal / currentIncome),
                      })
                    : t('plan.installmentsNext', { month: nextMonthName, value: brlShort(nextTotal) })}
              </AppText>
            </View>
            {recurring.despesas > 0 || recurring.receitas > 0 ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="repeat" size={18} color={colors.ink2} />
                <AppText variant="caption" color={colors.ink2} style={{ flex: 1 }} tabular>
                  {recurring.receitas > 0
                    ? t('plan.recurringNextWithIncome', {
                        month: nextMonthName,
                        expenses: brlShort(recurring.despesas),
                        income: brlShort(recurring.receitas),
                      })
                    : t('plan.recurringNext', { month: nextMonthName, expenses: brlShort(recurring.despesas) })}
                </AppText>
              </View>
            ) : null}
          </Card>
        </View>

        {/* Metas (compartilhadas com o app Investimentos) */}
        <GoalsSection />
      </ScreenScroll>
    </Screen>
  );
}
