/**
 * Relatórios do Orçamento (mensal e anual) — funções puras, usadas na tela de
 * exportação (prévia) e nos arquivos CSV/PDF. Nomes de categoria chegam já
 * traduzidos (`names`).
 */
import { addMonths, monthsOfYear } from '@/lib/dates';
import { monthOccurrences, recordTags, summarize } from '@/lib/finance';
import { PAYMENT_ORDER } from '@/lib/labels';
import type { Category, FinanceRecord, MonthSummary, Occurrence, PaymentMethod, YM } from '@/types';

export interface NamedValue {
  id: string;
  nome: string;
  valor: number;
  /** fração do total (0..1) */
  pct: number;
}

export interface BudgetMonthReport {
  ym: YM;
  summary: MonthSummary;
  despesasPorCategoria: NamedValue[];
  receitasPorCategoria: NamedValue[];
  porEtiqueta: NamedValue[];
  porForma: (Omit<NamedValue, 'id' | 'nome'> & { forma: PaymentMethod })[];
  lancamentos: Occurrence[];
}

const byValueDesc = (a: { valor: number }, b: { valor: number }) => b.valor - a.valor;

function named(map: Record<string, number>, names: Record<string, string>, total: number): NamedValue[] {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([id, valor]) => ({ id, nome: names[id] ?? id, valor, pct: total > 0 ? valor / total : 0 }))
    .sort(byValueDesc);
}

function incomeByCategory(occurrences: Occurrence[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of occurrences) {
    if (o.record.kind !== 'receita') continue;
    out[o.record.categoriaId] = (out[o.record.categoriaId] ?? 0) + o.valor;
  }
  return out;
}

export function buildBudgetMonth(records: FinanceRecord[], ym: YM, names: Record<string, string>): BudgetMonthReport {
  const lancamentos = monthOccurrences(records, ym);
  const summary = summarize(lancamentos);
  return {
    ym,
    summary,
    despesasPorCategoria: named(summary.porCategoria, names, summary.despesas),
    receitasPorCategoria: named(incomeByCategory(lancamentos), names, summary.receitas),
    porEtiqueta: named(summary.porEtiqueta, names, summary.despesas),
    porForma: PAYMENT_ORDER.map((forma) => ({
      forma,
      valor: summary.porForma[forma],
      pct: summary.despesas > 0 ? summary.porForma[forma] / summary.despesas : 0,
    }))
      .filter((p) => p.valor > 0)
      .sort(byValueDesc),
    lancamentos,
  };
}

export interface YearMonthRow {
  ym: YM;
  receitas: number;
  despesas: number;
  saldo: number;
  /** saldo acumulado no ano até este mês */
  acumulado: number;
}

export interface YearTotals {
  receitas: number;
  despesas: number;
  saldo: number;
  fixos: number;
  variaveis: number;
  parcelas: number;
}

export interface BudgetYearReport {
  year: number;
  meses: YearMonthRow[];
  totais: YearTotals;
  /** meses com algum lançamento (base das médias) */
  mesesComDados: number;
  media: { receitas: number; despesas: number; saldo: number };
  despesasPorCategoria: (NamedValue & { mediaMensal: number })[];
  receitasPorCategoria: NamedValue[];
  porEtiqueta: NamedValue[];
  maioresGastos: Occurrence[];
  /** o ano anterior, se houver lançamentos nele */
  anoAnterior: YearTotals | null;
  /** taxa de poupança: saldo / receitas */
  taxaPoupanca: number | null;
}

function yearTotals(records: FinanceRecord[], year: number) {
  const totals: YearTotals = { receitas: 0, despesas: 0, saldo: 0, fixos: 0, variaveis: 0, parcelas: 0 };
  const porCategoria: Record<string, number> = {};
  const receitasCat: Record<string, number> = {};
  const porEtiqueta: Record<string, number> = {};
  const meses: YearMonthRow[] = [];
  const all: Occurrence[] = [];
  let acumulado = 0;
  let mesesComDados = 0;

  for (const ym of monthsOfYear(year)) {
    const occ = monthOccurrences(records, ym);
    const s = summarize(occ);
    if (occ.length > 0) mesesComDados++;
    totals.receitas += s.receitas;
    totals.despesas += s.despesas;
    totals.fixos += s.fixos;
    totals.variaveis += s.variaveis;
    totals.parcelas += s.parcelas;
    for (const [k, v] of Object.entries(s.porCategoria)) porCategoria[k] = (porCategoria[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.porEtiqueta)) porEtiqueta[k] = (porEtiqueta[k] ?? 0) + v;
    for (const [k, v] of Object.entries(incomeByCategory(occ))) receitasCat[k] = (receitasCat[k] ?? 0) + v;
    acumulado += s.saldo;
    meses.push({ ym, receitas: s.receitas, despesas: s.despesas, saldo: s.saldo, acumulado });
    all.push(...occ);
  }
  totals.saldo = totals.receitas - totals.despesas;
  return { totals, porCategoria, receitasCat, porEtiqueta, meses, all, mesesComDados };
}

export function buildBudgetYear(records: FinanceRecord[], year: number, names: Record<string, string>): BudgetYearReport {
  const cur = yearTotals(records, year);
  const prev = yearTotals(records, year - 1);
  const n = Math.max(1, cur.mesesComDados);
  return {
    year,
    meses: cur.meses,
    totais: cur.totals,
    mesesComDados: cur.mesesComDados,
    media: {
      receitas: Math.round(cur.totals.receitas / n),
      despesas: Math.round(cur.totals.despesas / n),
      saldo: Math.round(cur.totals.saldo / n),
    },
    despesasPorCategoria: named(cur.porCategoria, names, cur.totals.despesas).map((c) => ({
      ...c,
      mediaMensal: Math.round(c.valor / n),
    })),
    receitasPorCategoria: named(cur.receitasCat, names, cur.totals.receitas),
    porEtiqueta: named(cur.porEtiqueta, names, cur.totals.despesas),
    maioresGastos: cur.all
      .filter((o) => o.record.kind === 'despesa')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10),
    anoAnterior: prev.mesesComDados > 0 ? prev.totals : null,
    taxaPoupanca: cur.totals.receitas > 0 ? cur.totals.saldo / cur.totals.receitas : null,
  };
}

/** Variação relativa (null se a base for zero). */
export const change = (current: number, previous: number): number | null =>
  previous !== 0 ? (current - previous) / Math.abs(previous) : null;

/** Etiquetas de um lançamento como nomes. */
export const tagNames = (o: Occurrence, names: Record<string, string>) => recordTags(o.record).map((id) => names[id] ?? id);

/** Mês anterior (útil na prévia mensal). */
export const previousMonth = (ym: YM) => addMonths(ym, -1);

/** Mapa id -> nome exibido. */
export const categoryNames = (categories: Category[], nameOf: (c: Category) => string) =>
  Object.fromEntries(categories.map((c) => [c.id, nameOf(c)]));
