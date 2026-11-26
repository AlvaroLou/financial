/**
 * Conteúdo dos arquivos exportados (CSV e HTML do PDF) — funções puras.
 * Recebem `t` (tradução) e usam a formatação do idioma atual (lib/money, lib/dates).
 * Salvar/compartilhar fica em lib/share.ts (nativo) e lib/share.web.ts (navegador).
 */
import { displayDate, monthLabel } from '@/lib/dates';
import { brl, formatNumber, percent } from '@/lib/money';
import type { BudgetMonthReport, BudgetYearReport } from '@/lib/reports';
import { change, tagNames } from '@/lib/reports';
import type { Occurrence } from '@/types';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

/* ================================================================== CSV */

/** Idiomas com vírgula decimal usam ";" (padrão do Excel nesses idiomas); os demais, ",". */
export const csvSeparator = () => (formatNumber(1).includes(',') ? ';' : ',');

export function csvCell(value: string | number, sep = csvSeparator()): string {
  const s = String(value);
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Valor sem "R$", com sinal: -12345 -> "-123,45" */
export const csvMoney = (cents: number) => `${cents < 0 ? '-' : ''}${formatNumber(cents)}`;

/** Linhas -> CSV com BOM UTF-8 (acentos corretos no Excel) e quebras CRLF. */
export function toCsv(rows: (string | number)[][]): string {
  const sep = csvSeparator();
  return `﻿${rows.map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\r\n')}`;
}

function occurrenceRows(list: Occurrence[], names: Record<string, string>, t: Translate): (string | number)[][] {
  return [
    [
      t('export.col.date'),
      t('export.col.type'),
      t('export.col.name'),
      t('export.col.category'),
      t('export.col.tags'),
      t('export.col.nature'),
      t('export.col.payment'),
      t('export.col.installment'),
      t('export.col.amount'),
    ],
    ...list.map((o) => [
      displayDate(o.data),
      t(`kind.${o.record.kind}`),
      o.record.nome,
      names[o.record.categoriaId] ?? '',
      tagNames(o, names).join(', '),
      t(`nature.${o.record.natureza}`),
      t(`payment.${o.record.forma}`),
      o.parcela ? `${o.parcela.atual}/${o.parcela.total}` : '',
      csvMoney(o.record.kind === 'despesa' ? -o.valor : o.valor),
    ]),
  ];
}

export function budgetMonthCsv(r: BudgetMonthReport, names: Record<string, string>, t: Translate): string {
  const s = r.summary;
  const rows: (string | number)[][] = [
    [t('export.budgetMonthTitle', { period: monthLabel(r.ym) })],
    [],
    [t('export.summary')],
    [t('export.income'), csvMoney(s.receitas)],
    [t('export.expenses'), csvMoney(s.despesas)],
    [t('export.balance'), csvMoney(s.saldo)],
    [t('export.fixed'), csvMoney(s.fixos)],
    [t('export.variable'), csvMoney(s.variaveis)],
    [t('export.installments'), csvMoney(s.parcelas)],
    [],
    [t('export.expensesByCategory'), t('export.col.amount'), '%'],
    ...r.despesasPorCategoria.map((c) => [c.nome, csvMoney(c.valor), percent(c.pct)]),
    [],
    [t('export.incomeByCategory'), t('export.col.amount'), '%'],
    ...r.receitasPorCategoria.map((c) => [c.nome, csvMoney(c.valor), percent(c.pct)]),
    [],
    [t('export.byTag'), t('export.col.amount')],
    ...r.porEtiqueta.map((c) => [c.nome, csvMoney(c.valor)]),
    [],
    [t('export.byPayment'), t('export.col.amount'), '%'],
    ...r.porForma.map((p) => [t(`payment.${p.forma}`), csvMoney(p.valor), percent(p.pct)]),
    [],
    [t('export.entries')],
    ...occurrenceRows(r.lancamentos, names, t),
  ];
  return toCsv(rows);
}

export function budgetYearCsv(r: BudgetYearReport, names: Record<string, string>, t: Translate): string {
  const rows: (string | number)[][] = [
    [t('export.budgetYearTitle', { period: r.year })],
    [],
    [t('export.col.month'), t('export.income'), t('export.expenses'), t('export.balance'), t('export.accumulated')],
    ...r.meses.map((m) => [monthLabel(m.ym), csvMoney(m.receitas), csvMoney(m.despesas), csvMoney(m.saldo), csvMoney(m.acumulado)]),
    [t('export.total'), csvMoney(r.totais.receitas), csvMoney(r.totais.despesas), csvMoney(r.totais.saldo), ''],
    [t('export.monthlyAverage', { count: r.mesesComDados }), csvMoney(r.media.receitas), csvMoney(r.media.despesas), csvMoney(r.media.saldo), ''],
    [],
    [t('export.summary')],
    [t('export.fixed'), csvMoney(r.totais.fixos)],
    [t('export.variable'), csvMoney(r.totais.variaveis)],
    [t('export.installments'), csvMoney(r.totais.parcelas)],
    [t('export.savingsRate'), r.taxaPoupanca === null ? '—' : percent(r.taxaPoupanca)],
    [],
    [t('export.expensesByCategory'), t('export.total'), '%', t('export.monthlyAverageShort')],
    ...r.despesasPorCategoria.map((c) => [c.nome, csvMoney(c.valor), percent(c.pct), csvMoney(c.mediaMensal)]),
    [],
    [t('export.incomeByCategory'), t('export.total'), '%'],
    ...r.receitasPorCategoria.map((c) => [c.nome, csvMoney(c.valor), percent(c.pct)]),
    [],
    [t('export.byTag'), t('export.total')],
    ...r.porEtiqueta.map((c) => [c.nome, csvMoney(c.valor)]),
    [],
    [t('export.topExpenses')],
    [t('export.col.date'), t('export.col.name'), t('export.col.category'), t('export.col.amount')],
    ...r.maioresGastos.map((o) => [displayDate(o.data), o.record.nome, names[o.record.categoriaId] ?? '', csvMoney(o.valor)]),
  ];
  if (r.anoAnterior) {
    const p = r.anoAnterior;
    const pct = (a: number, b: number) => {
      const c = change(a, b);
      return c === null ? '—' : percent(c);
    };
    rows.push(
      [],
      [t('export.vsPreviousYear', { year: r.year - 1 }), String(r.year - 1), String(r.year), t('export.variation')],
      [t('export.income'), csvMoney(p.receitas), csvMoney(r.totais.receitas), pct(r.totais.receitas, p.receitas)],
      [t('export.expenses'), csvMoney(p.despesas), csvMoney(r.totais.despesas), pct(r.totais.despesas, p.despesas)],
      [t('export.balance'), csvMoney(p.saldo), csvMoney(r.totais.saldo), pct(r.totais.saldo, p.saldo)],
    );
  }
  return toCsv(rows);
}

/* ================================================================== HTML (PDF) */

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface HtmlTheme {
  accent: string;
  income: string;
  expense: string;
}

/** Documento HTML para impressão/PDF (tipografia do sistema, A4). */
export function htmlDocument(opts: {
  lang: string;
  title: string;
  subtitle: string;
  body: string;
  theme: HtmlTheme;
  footer: string;
}): string {
  const { accent, income, expense } = opts.theme;
  return `<!doctype html><html lang="${esc(opts.lang)}"><head><meta charset="utf-8" /><title>${esc(opts.title)}</title>
  <style>
    @page{size:A4;margin:16mm}
    body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,"Noto Sans","PingFang SC","Hiragino Sans","Apple SD Gothic Neo",sans-serif;color:#172E28;margin:0;padding:24px;font-size:12px}
    header{border-bottom:3px solid ${accent};padding-bottom:10px;margin-bottom:18px}
    h1{margin:0 0 4px;font-size:22px} h2{font-size:15px;margin:22px 0 8px;color:${accent}}
    .sub{color:#5C6D65;margin:0}
    .cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}
    .card{flex:1;min-width:120px;border:1px solid #E1E8DF;border-radius:10px;padding:10px 12px}
    .card span{display:block;color:#5C6D65;font-size:11px}
    .card b{display:block;font-size:16px;margin-top:3px;font-variant-numeric:tabular-nums}
    table{width:100%;border-collapse:collapse;font-size:11.5px;page-break-inside:auto}
    tr{page-break-inside:avoid}
    th{text-align:left;color:#5C6D65;border-bottom:2px solid #E1E8DF;padding:6px 4px;font-weight:600}
    td{border-bottom:1px solid #EEF2EC;padding:5px 4px;vertical-align:top}
    .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
    .pos{color:${income}} .neg{color:${expense}}
    tfoot td{font-weight:700;border-top:2px solid #E1E8DF}
    .bar{height:8px;border-radius:4px;background:${accent}}
    .bars td{border:none;padding:2px 4px}
    .muted{color:#5C6D65}
    footer{margin-top:24px;color:#5C6D65;font-size:10px;border-top:1px solid #E1E8DF;padding-top:8px}
  </style></head><body>
  <header><h1>${esc(opts.title)}</h1><p class="sub">${esc(opts.subtitle)}</p></header>
  ${opts.body}
  <footer>${esc(opts.footer)}</footer>
  </body></html>`;
}

export function htmlCards(items: { label: string; value: string; tone?: 'pos' | 'neg' }[]): string {
  return `<div class="cards">${items
    .map((i) => `<div class="card"><span>${esc(i.label)}</span><b class="${i.tone ?? ''}">${esc(i.value)}</b></div>`)
    .join('')}</div>`;
}

/** Tabela; `numeric` = índices das colunas numéricas (alinhadas à direita). */
export function htmlTable(
  headers: string[],
  rows: (string | { text: string; tone?: 'pos' | 'neg' })[][],
  numeric: number[] = [],
  footer?: string[],
): string {
  const cell = (c: string | { text: string; tone?: 'pos' | 'neg' }, i: number, tag: 'td' | 'th') => {
    const text = typeof c === 'string' ? c : c.text;
    const tone = typeof c === 'string' ? '' : c.tone ?? '';
    const cls = [numeric.includes(i) ? 'num' : '', tone].filter(Boolean).join(' ');
    return `<${tag}${cls ? ` class="${cls}"` : ''}>${esc(text)}</${tag}>`;
  };
  return `<table><thead><tr>${headers.map((h, i) => cell(h, i, 'th')).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => cell(c, i, 'td')).join('')}</tr>`)
    .join('')}</tbody>${footer ? `<tfoot><tr>${footer.map((c, i) => cell(c, i, 'td')).join('')}</tr></tfoot>` : ''}</table>`;
}

const signed = (cents: number) => ({ text: brl(cents), tone: cents < 0 ? ('neg' as const) : undefined });

export function budgetMonthHtml(
  r: BudgetMonthReport,
  names: Record<string, string>,
  t: Translate,
  ctx: { lang: string; theme: HtmlTheme; generatedAt: string },
): string {
  const s = r.summary;
  const body = [
    htmlCards([
      { label: t('export.income'), value: brl(s.receitas), tone: 'pos' },
      { label: t('export.expenses'), value: brl(s.despesas), tone: 'neg' },
      { label: t('export.balance'), value: brl(s.saldo), tone: s.saldo < 0 ? 'neg' : 'pos' },
    ]),
    htmlCards([
      { label: t('export.fixed'), value: brl(s.fixos) },
      { label: t('export.variable'), value: brl(s.variaveis) },
      { label: t('export.installments'), value: brl(s.parcelas) },
    ]),
    `<h2>${esc(t('export.expensesByCategory'))}</h2>`,
    r.despesasPorCategoria.length
      ? htmlTable([t('export.col.category'), t('export.col.amount'), '%'], r.despesasPorCategoria.map((c) => [c.nome, brl(c.valor), percent(c.pct)]), [1, 2])
      : `<p class="muted">${esc(t('export.none'))}</p>`,
    r.porEtiqueta.length
      ? `<h2>${esc(t('export.byTag'))}</h2>${htmlTable([t('export.col.tag'), t('export.col.amount')], r.porEtiqueta.map((c) => [c.nome, brl(c.valor)]), [1])}`
      : '',
    r.receitasPorCategoria.length
      ? `<h2>${esc(t('export.incomeByCategory'))}</h2>${htmlTable(
          [t('export.col.category'), t('export.col.amount'), '%'],
          r.receitasPorCategoria.map((c) => [c.nome, brl(c.valor), percent(c.pct)]),
          [1, 2],
        )}`
      : '',
    r.porForma.length
      ? `<h2>${esc(t('export.byPayment'))}</h2>${htmlTable(
          [t('export.col.payment'), t('export.col.amount'), '%'],
          r.porForma.map((p) => [t(`payment.${p.forma}`), brl(p.valor), percent(p.pct)]),
          [1, 2],
        )}`
      : '',
    `<h2>${esc(t('export.entries'))}</h2>`,
    r.lancamentos.length
      ? htmlTable(
          [t('export.col.date'), t('export.col.name'), t('export.col.category'), t('export.col.payment'), t('export.col.amount')],
          r.lancamentos.map((o) => [
            displayDate(o.data),
            `${o.record.nome}${o.parcela ? ` (${o.parcela.atual}/${o.parcela.total})` : ''}${
              tagNames(o, names).length ? ` · ${tagNames(o, names).join(', ')}` : ''
            }`,
            names[o.record.categoriaId] ?? '',
            t(`payment.${o.record.forma}`),
            { text: `${o.record.kind === 'despesa' ? '−' : '+'} ${brl(o.valor)}`, tone: o.record.kind === 'despesa' ? 'neg' : 'pos' },
          ]),
          [4],
        )
      : `<p class="muted">${esc(t('export.none'))}</p>`,
  ].join('');
  return htmlDocument({
    lang: ctx.lang,
    title: t('export.budgetMonthTitle', { period: monthLabel(r.ym) }),
    subtitle: t('app.name'),
    body,
    theme: ctx.theme,
    footer: t('export.generatedAt', { date: ctx.generatedAt }),
  });
}

export function budgetYearHtml(
  r: BudgetYearReport,
  names: Record<string, string>,
  t: Translate,
  ctx: { lang: string; theme: HtmlTheme; generatedAt: string },
): string {
  const maxBar = Math.max(1, ...r.meses.map((m) => Math.max(m.receitas, m.despesas)));
  const bars = `<table class="bars">${r.meses
    .map(
      (m) => `<tr><td style="width:90px">${esc(monthLabel(m.ym))}</td><td>
      <div class="bar" style="width:${(m.receitas / maxBar) * 100}%;background:${ctx.theme.income}"></div>
      <div class="bar" style="width:${(m.despesas / maxBar) * 100}%;background:${ctx.theme.expense};margin-top:2px"></div></td></tr>`,
    )
    .join('')}</table><p class="muted">■ <span class="pos">${esc(t('export.income'))}</span> ■ <span class="neg">${esc(
    t('export.expenses'),
  )}</span></p>`;

  const prev = r.anoAnterior;
  const pct = (a: number, b: number) => {
    const c = change(a, b);
    return c === null ? '—' : percent(c);
  };

  const body = [
    htmlCards([
      { label: t('export.income'), value: brl(r.totais.receitas), tone: 'pos' },
      { label: t('export.expenses'), value: brl(r.totais.despesas), tone: 'neg' },
      { label: t('export.balance'), value: brl(r.totais.saldo), tone: r.totais.saldo < 0 ? 'neg' : 'pos' },
      { label: t('export.savingsRate'), value: r.taxaPoupanca === null ? '—' : percent(r.taxaPoupanca) },
    ]),
    htmlCards([
      { label: t('export.avgIncome'), value: brl(r.media.receitas) },
      { label: t('export.avgExpenses'), value: brl(r.media.despesas) },
      { label: t('export.avgBalance'), value: brl(r.media.saldo) },
    ]),
    `<h2>${esc(t('export.monthByMonth'))}</h2>`,
    htmlTable(
      [t('export.col.month'), t('export.income'), t('export.expenses'), t('export.balance'), t('export.accumulated')],
      r.meses.map((m) => [monthLabel(m.ym), brl(m.receitas), brl(m.despesas), signed(m.saldo), signed(m.acumulado)]),
      [1, 2, 3, 4],
      [t('export.total'), brl(r.totais.receitas), brl(r.totais.despesas), brl(r.totais.saldo), ''],
    ),
    bars,
    `<h2>${esc(t('export.expensesByCategory'))}</h2>`,
    r.despesasPorCategoria.length
      ? htmlTable(
          [t('export.col.category'), t('export.total'), '%', t('export.monthlyAverageShort')],
          r.despesasPorCategoria.map((c) => [c.nome, brl(c.valor), percent(c.pct), brl(c.mediaMensal)]),
          [1, 2, 3],
        )
      : `<p class="muted">${esc(t('export.none'))}</p>`,
    r.porEtiqueta.length
      ? `<h2>${esc(t('export.byTag'))}</h2>${htmlTable([t('export.col.tag'), t('export.total')], r.porEtiqueta.map((c) => [c.nome, brl(c.valor)]), [1])}`
      : '',
    r.receitasPorCategoria.length
      ? `<h2>${esc(t('export.incomeByCategory'))}</h2>${htmlTable(
          [t('export.col.category'), t('export.total'), '%'],
          r.receitasPorCategoria.map((c) => [c.nome, brl(c.valor), percent(c.pct)]),
          [1, 2],
        )}`
      : '',
    r.maioresGastos.length
      ? `<h2>${esc(t('export.topExpenses'))}</h2>${htmlTable(
          [t('export.col.date'), t('export.col.name'), t('export.col.category'), t('export.col.amount')],
          r.maioresGastos.map((o) => [displayDate(o.data), o.record.nome, names[o.record.categoriaId] ?? '', brl(o.valor)]),
          [3],
        )}`
      : '',
    prev
      ? `<h2>${esc(t('export.vsPreviousYear', { year: r.year - 1 }))}</h2>${htmlTable(
          ['', String(r.year - 1), String(r.year), t('export.variation')],
          [
            [t('export.income'), brl(prev.receitas), brl(r.totais.receitas), pct(r.totais.receitas, prev.receitas)],
            [t('export.expenses'), brl(prev.despesas), brl(r.totais.despesas), pct(r.totais.despesas, prev.despesas)],
            [t('export.balance'), brl(prev.saldo), brl(r.totais.saldo), pct(r.totais.saldo, prev.saldo)],
          ],
          [1, 2, 3],
        )}`
      : '',
  ].join('');
  return htmlDocument({
    lang: ctx.lang,
    title: t('export.budgetYearTitle', { period: r.year }),
    subtitle: t('app.name'),
    body,
    theme: ctx.theme,
    footer: t('export.generatedAt', { date: ctx.generatedAt }),
  });
}

/** "dinheiro-em-dia-orcamento-2026-11.csv" */
export const exportFileName = (app: 'orcamento' | 'investimentos', period: string, ext: 'csv' | 'pdf') =>
  `dinheiro-em-dia-${app}-${period}.${ext}`;
