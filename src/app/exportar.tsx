import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { Button, Card, IconButton, SectionHeader, Segmented } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenScroll } from '@/components/ui/Screen';
import { categoryName } from '@/i18n/labels';
import { usePortfolio } from '@/invest/hooks';
import { investCsv, investHtml } from '@/invest/lib/exportInvest';
import { buildInvestReport } from '@/invest/lib/reports';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { todayISO } from '@/lib/clock';
import { addMonths, daysInMonth, displayDate, monthLabel, ymOf } from '@/lib/dates';
import { budgetMonthCsv, budgetMonthHtml, budgetYearCsv, budgetYearHtml, exportFileName, type Translate } from '@/lib/export';
import { brl, brlDelta, percent } from '@/lib/money';
import { buildBudgetMonth, buildBudgetYear } from '@/lib/reports';
import { shareCsv, sharePdf } from '@/lib/share';
import { useFinanceStore } from '@/store/useFinanceStore';
import { buildColors, type AppId } from '@/theme/palette';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';
import type { YM } from '@/types';

type Period = 'mes' | 'ano';
type Format = 'csv' | 'pdf';

/** Exportar relatórios (`?app=orcamento|investimentos`): mês ou ano, CSV ou PDF, com totais. */
export default function ExportarRoute() {
  const { app } = useLocalSearchParams<{ app?: AppId }>();
  const which: AppId = app === 'investimentos' ? 'investimentos' : 'orcamento';
  return (
    <ThemeScope app={which}>
      <ExportarScreen app={which} />
    </ThemeScope>
  );
}

function ExportarScreen({ app }: { app: AppId }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const ask = useDialog();
  const records = useFinanceStore((s) => s.records);
  const categories = useFinanceStore((s) => s.categories);
  const storeMonth = useFinanceStore((s) => s.month);
  const settings = useFinanceStore((s) => s.settings);
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const snapshots = useInvestStore((s) => s.snapshots);
  const rates = useMarketStore((s) => s.rates);
  const summary = usePortfolio();
  const today = todayISO();

  const [period, setPeriod] = useState<Period>('mes');
  const [ym, setYm] = useState<YM>(app === 'orcamento' ? storeMonth : ymOf(today));
  const [year, setYear] = useState(Number((app === 'orcamento' ? storeMonth : today).slice(0, 4)));
  const [format, setFormat] = useState<Format>('pdf');
  const [busy, setBusy] = useState(false);

  const names = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, categoryName(c)])),
    // nomes traduzidos mudam com o idioma
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, i18n.language],
  );
  const periodLabel = period === 'mes' ? monthLabel(ym) : String(year);
  const range = period === 'mes' ? { from: `${ym}-01`, to: `${ym}-${String(daysInMonth(ym)).padStart(2, '0')}` } : { from: `${year}-01-01`, to: `${year}-12-31` };

  const budget = useMemo(() => {
    if (app !== 'orcamento') return null;
    return period === 'mes' ? { kind: 'mes' as const, r: buildBudgetMonth(records, ym, names) } : { kind: 'ano' as const, r: buildBudgetYear(records, year, names) };
  }, [app, period, records, ym, year, names]);

  const invest = useMemo(() => {
    if (app !== 'investimentos') return null;
    return buildInvestReport({ assets, operations, snapshots, rates, summary, today, ...range, annual: period === 'ano' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, assets, operations, snapshots, rates, summary, today, range.from, range.to, period]);

  const empty = budget
    ? budget.kind === 'mes'
      ? budget.r.lancamentos.length === 0
      : budget.r.mesesComDados === 0
    : !invest || (invest.operacoes.length === 0 && invest.posicoes.length === 0);

  const title =
    app === 'orcamento'
      ? period === 'mes'
        ? t('export.budgetMonthTitle', { period: periodLabel })
        : t('export.budgetYearTitle', { period: periodLabel })
      : period === 'mes'
        ? t('export.investMonthTitle', { period: periodLabel })
        : t('export.investYearTitle', { period: periodLabel });

  const run = async () => {
    if (empty) {
      ask({ title: t('export.nothingTitle'), message: t('export.nothingMessage', { period: periodLabel }) });
      return;
    }
    setBusy(true);
    try {
      const accent = app === 'orcamento' ? settings.accentOrcamento : settings.accentInvest;
      const pal = buildColors(accent, 'light');
      const ctx = { lang: i18n.language, theme: { accent: pal.primary, income: pal.income, expense: pal.expense }, generatedAt: displayDate(today) };
      const fileName = exportFileName(app, period === 'mes' ? ym : String(year), format);
      const tr = t as unknown as Translate;
      let ok: boolean;
      if (budget) {
        if (format === 'csv') {
          const csv = budget.kind === 'mes' ? budgetMonthCsv(budget.r, names, tr) : budgetYearCsv(budget.r, names, tr);
          ok = await shareCsv(csv, fileName, title);
        } else {
          const html = budget.kind === 'mes' ? budgetMonthHtml(budget.r, names, tr, ctx) : budgetYearHtml(budget.r, names, tr, ctx);
          ok = await sharePdf(html, fileName, title);
        }
      } else {
        ok = format === 'csv' ? await shareCsv(investCsv(invest!, assets, title, tr), fileName, title) : await sharePdf(investHtml(invest!, assets, title, tr, ctx), fileName, title);
      }
      if (!ok) ask({ title: t('export.unavailableTitle'), message: t('export.unavailableMessage') });
    } catch {
      ask({ title: t('export.errorTitle'), message: t('export.errorMessage') });
    } finally {
      setBusy(false);
    }
  };

  const preview: [string, string, string?][] = [];
  if (budget?.kind === 'mes') {
    const s = budget.r.summary;
    preview.push([t('export.income'), brl(s.receitas), colors.income], [t('export.expenses'), brl(s.despesas), colors.expense], [t('export.balance'), brl(s.saldo)]);
    preview.push([t('export.entriesCount'), String(budget.r.lancamentos.length)]);
  } else if (budget?.kind === 'ano') {
    const r = budget.r;
    preview.push([t('export.income'), brl(r.totais.receitas), colors.income], [t('export.expenses'), brl(r.totais.despesas), colors.expense], [t('export.balance'), brl(r.totais.saldo)]);
    preview.push([t('export.avgExpenses'), brl(r.media.despesas)], [t('export.savingsRate'), r.taxaPoupanca === null ? '—' : percent(r.taxaPoupanca)]);
  } else if (invest) {
    preview.push(
      [t('invest.report.endValue'), invest.patrimonioFinal === null ? '—' : brl(invest.patrimonioFinal)],
      [t('invest.report.contributions'), brl(invest.aportes)],
      [t('invest.report.withdrawals'), brl(invest.resgates)],
      [t('invest.report.income'), brl(invest.proventos), colors.income],
      [t('invest.report.result'), invest.resultado === null ? '—' : brlDelta(invest.resultado)],
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {app === 'orcamento' ? t('export.budgetRow') : t('export.investRow')}
        </AppText>
      </View>
      <ScreenScroll gap={18}>
        <View style={{ gap: 8 }}>
          <SectionHeader title={t('export.period')} />
          <Segmented
            value={period}
            onChange={setPeriod}
            accessibilityLabel={t('export.period')}
            options={[
              { value: 'mes', label: t('export.month'), icon: 'calendar' },
              { value: 'ano', label: t('export.year'), icon: 'calendarClock' },
            ]}
          />
          {period === 'mes' ? (
            <MonthSelector value={ym} onShift={(d) => setYm((m) => addMonths(m, d))} />
          ) : (
            <MonthSelector value={`${year}-01`} label={String(year)} onShift={(d) => setYear((y) => y + d)} />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <SectionHeader title={t('export.format')} />
          <Segmented
            value={format}
            onChange={setFormat}
            accessibilityLabel={t('export.format')}
            options={[
              { value: 'pdf', label: 'PDF', icon: 'receipt' },
              { value: 'csv', label: t('export.csvLabel'), icon: 'statement' },
            ]}
          />
          <AppText variant="caption" color={colors.ink2}>
            {format === 'pdf' ? t('export.pdfHint') : t('export.csvHint')}
          </AppText>
        </View>

        <View>
          <SectionHeader title={t('export.preview')} />
          <Card style={{ padding: 16, gap: 10 }}>
            <AppText variant="bodyStrong">{title}</AppText>
            {empty ? (
              <AppText variant="body" color={colors.ink2}>
                {t('export.nothingMessage', { period: periodLabel })}
              </AppText>
            ) : (
              preview.map(([label, value, color]) => (
                <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <AppText variant="body" color={colors.ink2}>
                    {label}
                  </AppText>
                  <AppText variant="bodyStrong" tabular color={color}>
                    {value}
                  </AppText>
                </View>
              ))
            )}
            <AppText variant="caption" color={colors.ink2}>
              {app === 'orcamento' ? t('export.budgetContents') : t('export.investContents')}
            </AppText>
          </Card>
        </View>

        <Button icon="download" label={busy ? t('common.generating') : t('export.exportButton', { format: format.toUpperCase() })} disabled={busy} onPress={() => void run()} />
      </ScreenScroll>
    </Screen>
  );
}
