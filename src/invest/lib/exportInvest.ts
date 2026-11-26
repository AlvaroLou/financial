/**
 * Arquivos do relatório de Investimentos (CSV e HTML do PDF), mensal ou anual.
 * Puras: recebem o relatório (lib/reports), os ativos e `t`.
 */
import { esc, htmlCards, htmlDocument, htmlTable, toCsv, csvMoney, type HtmlTheme, type Translate } from '@/lib/export';
import { displayDate, monthLabel } from '@/lib/dates';
import { brl, brlDelta, formatDecimal, percent, percentSigned } from '@/lib/money';

import type { Asset, IncomeType } from '../types';
import type { InvestReport } from './reports';

const INCOME_ORDER: IncomeType[] = ['dividendo', 'jcp', 'rendimento', 'juros', 'amortizacao', 'outro'];

function summaryRows(r: InvestReport, t: Translate): [string, string, 'pos' | 'neg' | undefined][] {
  const opt = (v: number | null, fmt: (n: number) => string) => (v === null ? '—' : fmt(v));
  const tone = (v: number | null) => (v === null ? undefined : v < 0 ? 'neg' : 'pos');
  return [
    [t('invest.report.startValue') + (r.inicialEstimado ? ' *' : ''), opt(r.patrimonioInicial, brl), undefined],
    [t('invest.report.endValue') + (r.finalEstimado ? ' *' : ''), opt(r.patrimonioFinal, brl), undefined],
    [t('invest.report.contributions'), brl(r.aportes), undefined],
    [t('invest.report.withdrawals'), brl(r.resgates), undefined],
    [t('invest.report.income'), brl(r.proventos), 'pos'],
    [t('invest.report.realized'), brlDelta(r.realizado), tone(r.realizado)],
    [t('invest.report.appreciation'), opt(r.valorizacao, brlDelta), tone(r.valorizacao)],
    [t('invest.report.result'), opt(r.resultado, brlDelta), tone(r.resultado)],
    [t('invest.report.return'), r.rentabilidade === null ? '—' : percentSigned(r.rentabilidade), tone(r.rentabilidade)],
    [t('invest.report.taxEstimate'), brl(r.impostoEstimado), undefined],
  ];
}

export function investCsv(r: InvestReport, assets: Asset[], title: string, t: Translate): string {
  const name = (id: string) => assets.find((a) => a.id === id)?.nome ?? '';
  const ticker = (id: string) => assets.find((a) => a.id === id)?.ticker ?? '';
  const money = (v: number | null) => (v === null ? '' : csvMoney(v));
  const rows: (string | number)[][] = [
    [title],
    [],
    [t('export.summary')],
    [t('invest.report.startValue') + (r.inicialEstimado ? ' *' : ''), money(r.patrimonioInicial)],
    [t('invest.report.endValue') + (r.finalEstimado ? ' *' : ''), money(r.patrimonioFinal)],
    [t('invest.report.contributions'), csvMoney(r.aportes)],
    [t('invest.report.withdrawals'), csvMoney(r.resgates)],
    [t('invest.report.income'), csvMoney(r.proventos)],
    [t('invest.report.realized'), csvMoney(r.realizado)],
    [t('invest.report.appreciation'), money(r.valorizacao)],
    [t('invest.report.result'), money(r.resultado)],
    [t('invest.report.return'), r.rentabilidade === null ? '' : percent(r.rentabilidade, 2)],
    [t('invest.report.taxEstimate'), csvMoney(r.impostoEstimado)],
    ...(r.inicialEstimado || r.finalEstimado ? [[t('invest.report.estimatedNote')]] : []),
    [],
    [t('invest.report.incomeByType'), t('export.col.amount')],
    ...INCOME_ORDER.filter((k) => r.proventosPorTipo[k]).map((k) => [t(`invest.income.${k}`), csvMoney(r.proventosPorTipo[k] ?? 0)]),
  ];
  if (r.taxMonths.length) {
    rows.push(
      [],
      [t('invest.report.taxByMonth')],
      [
        t('export.col.month'),
        t('invest.report.col.stockSales'),
        t('invest.report.col.stockProfit'),
        t('invest.report.col.etfBdrProfit'),
        t('invest.report.col.fiiProfit'),
        t('invest.report.col.cryptoSales'),
        t('invest.report.col.cryptoProfit'),
        t('invest.report.col.tax'),
        t('invest.report.col.darf'),
        t('invest.report.col.due'),
      ],
      ...r.taxMonths.map((m) => [
        monthLabel(m.ym),
        csvMoney(m.vendasAcoes),
        csvMoney(m.lucroAcoes),
        csvMoney(m.lucroEtfBdr),
        csvMoney(m.lucroFii),
        csvMoney(m.vendasCripto),
        csvMoney(m.lucroCripto),
        csvMoney(m.impostoComum + m.impostoFii + m.impostoCripto),
        csvMoney(m.darfB3 + m.darfCripto),
        displayDate(m.vencimento),
      ]),
    );
  }
  if (r.rendimentos) {
    const y = r.rendimentos;
    rows.push(
      [],
      [t('invest.tax.declaration')],
      [t('invest.tax.exemptStocks'), csvMoney(y.lucroAcoesIsento)],
      [t('invest.tax.dividends'), csvMoney(y.dividendos)],
      [t('invest.tax.fiiIncome'), csvMoney(y.rendimentosFii)],
      [t('invest.tax.jcp'), csvMoney(y.jcp)],
      [t('invest.tax.interest'), csvMoney(y.juros)],
      [t('invest.tax.otherIncome'), csvMoney(y.outros)],
    );
  }
  rows.push(
    [],
    [t('invest.report.positionsAt', { date: displayDate(r.to) })],
    [t('invest.report.col.asset'), t('invest.form.ticker'), t('invest.form.type'), t('invest.form.quantity'), t('invest.report.col.cost')],
    ...r.posicoes.map((p) => [p.asset.nome, p.asset.ticker ?? p.asset.coingeckoId ?? '', t(`invest.types.${p.asset.tipo}`), p.quantidade === null ? '' : formatDecimal(p.quantidade, 8), csvMoney(p.custo)]),
    [],
    [t('invest.report.operations')],
    [
      t('export.col.date'),
      t('invest.report.col.asset'),
      t('invest.form.ticker'),
      t('invest.report.col.operation'),
      t('invest.form.quantity'),
      t('invest.form.unitPrice'),
      t('export.col.amount'),
      t('invest.form.costs'),
      t('invest.opForm.irWithheld'),
    ],
    ...r.operacoes.map((o) => [
      displayDate(o.data),
      name(o.assetId),
      ticker(o.assetId),
      o.tipo === 'provento' && o.proventoTipo ? `${t('invest.op.provento')} (${t(`invest.income.${o.proventoTipo}`)})` : t(`invest.op.${o.tipo}`),
      o.quantidade !== undefined ? formatDecimal(o.quantidade, 8) : o.fator ? `× ${formatDecimal(o.fator, 6)}` : '',
      o.preco !== undefined ? formatDecimal(o.preco, 8, 2) : '',
      csvMoney(o.valor),
      o.custos ? csvMoney(o.custos) : '',
      o.irRetido ? csvMoney(o.irRetido) : '',
    ]),
  );
  return toCsv(rows);
}

export function investHtml(
  r: InvestReport,
  assets: Asset[],
  title: string,
  t: Translate,
  ctx: { lang: string; theme: HtmlTheme; generatedAt: string },
): string {
  const name = (id: string) => assets.find((a) => a.id === id)?.nome ?? '';
  const s = summaryRows(r, t);
  const body = [
    htmlCards(s.slice(0, 4).map(([label, value, tone]) => ({ label, value, tone }))),
    htmlCards(s.slice(4, 9).map(([label, value, tone]) => ({ label, value, tone }))),
    `<p class="muted">${esc(t('invest.report.returnNote'))}${r.inicialEstimado || r.finalEstimado ? ` ${esc(t('invest.report.estimatedNote'))}` : ''}</p>`,
    Object.keys(r.proventosPorTipo).length
      ? `<h2>${esc(t('invest.report.incomeByType'))}</h2>${htmlTable(
          [t('invest.opForm.incomeType'), t('export.col.amount')],
          INCOME_ORDER.filter((k) => r.proventosPorTipo[k]).map((k) => [t(`invest.income.${k}`), brl(r.proventosPorTipo[k] ?? 0)]),
          [1],
        )}`
      : '',
    r.taxMonths.length
      ? `<h2>${esc(t('invest.report.taxByMonth'))}</h2>${htmlTable(
          [t('export.col.month'), t('invest.report.col.stockSales'), t('invest.report.col.profit'), t('invest.report.col.tax'), t('invest.report.col.darf'), t('invest.report.col.due')],
          r.taxMonths.map((m) => [
            monthLabel(m.ym),
            brl(m.vendasAcoes + m.vendasFii + m.vendasCripto),
            brlDelta(m.lucroAcoes + m.lucroEtfBdr + m.lucroFii + m.lucroCripto),
            brl(m.impostoComum + m.impostoFii + m.impostoCripto),
            brl(m.darfB3 + m.darfCripto),
            displayDate(m.vencimento),
          ]),
          [1, 2, 3, 4],
        )}<p class="muted">${esc(t('invest.tax.disclaimer'))}</p>`
      : '',
    r.rendimentos
      ? `<h2>${esc(t('invest.tax.declaration'))}</h2>${htmlTable(
          ['', t('export.col.amount')],
          [
            [t('invest.tax.exemptStocks'), brl(r.rendimentos.lucroAcoesIsento)],
            [t('invest.tax.dividends'), brl(r.rendimentos.dividendos)],
            [t('invest.tax.fiiIncome'), brl(r.rendimentos.rendimentosFii)],
            [t('invest.tax.jcp'), brl(r.rendimentos.jcp)],
            [t('invest.tax.interest'), brl(r.rendimentos.juros)],
            [t('invest.tax.otherIncome'), brl(r.rendimentos.outros)],
          ],
          [1],
        )}`
      : '',
    `<h2>${esc(t('invest.report.positionsAt', { date: displayDate(r.to) }))}</h2>`,
    r.posicoes.length
      ? htmlTable(
          [t('invest.report.col.asset'), t('invest.form.type'), t('invest.form.quantity'), t('invest.report.col.cost')],
          r.posicoes.map((p) => [
            p.asset.ticker ? `${p.asset.ticker} — ${p.asset.nome}` : p.asset.nome,
            t(`invest.types.${p.asset.tipo}`),
            p.quantidade === null ? '—' : formatDecimal(p.quantidade, 8),
            brl(p.custo),
          ]),
          [2, 3],
        )
      : `<p class="muted">${esc(t('export.none'))}</p>`,
    `<h2>${esc(t('invest.report.operations'))}</h2>`,
    r.operacoes.length
      ? htmlTable(
          [t('export.col.date'), t('invest.report.col.asset'), t('invest.report.col.operation'), t('export.col.amount')],
          r.operacoes.map((o) => [
            displayDate(o.data),
            name(o.assetId),
            o.tipo === 'provento' && o.proventoTipo ? t(`invest.income.${o.proventoTipo}`) : t(`invest.op.${o.tipo}`),
            o.tipo === 'desdobramento' || o.tipo === 'grupamento' ? `× ${formatDecimal(o.fator ?? 1, 6)}` : brl(o.valor),
          ]),
          [3],
        )
      : `<p class="muted">${esc(t('export.none'))}</p>`,
  ].join('');
  return htmlDocument({ lang: ctx.lang, title, subtitle: t('app.name'), body, theme: ctx.theme, footer: t('export.generatedAt', { date: ctx.generatedAt }) });
}
