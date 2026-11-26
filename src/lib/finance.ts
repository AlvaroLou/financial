import { addMonths, daysInMonth, diffDays, monthIndex, parseISO, shiftMonths, ymOf } from '@/lib/dates';
import { PAYMENT_ORDER } from '@/lib/labels';
import type {
  Category,
  FinanceRecord,
  ISODate,
  MonthSummary,
  Occurrence,
  PaymentMethod,
  YM,
} from '@/types';

/* ------------------------------------------------------------------ parcelas */

/** Valor da parcela `parcela` (a última absorve o resto da divisão). */
export function installmentValue(r: FinanceRecord, parcela: number): number {
  const n = r.parcelasTotais ?? 1;
  const base = Math.floor(r.valorTotal / n);
  return parcela === n ? r.valorTotal - base * (n - 1) : base;
}

/** Valor "padrão" mensal de um lançamento (parcela ou valor total). */
export function monthlyValue(valorTotal: number, parcelasTotais: number): number {
  return parcelasTotais > 0 ? Math.round(valorTotal / parcelasTotais) : valorTotal;
}

export function isInstallment(r: FinanceRecord): r is FinanceRecord & { parcelaAtual: number; parcelasTotais: number } {
  return r.parcelado && !!r.parcelasTotais && !!r.parcelaAtual;
}

/** Etiquetas válidas do lançamento (sem repetir a categoria principal). */
export function recordTags(r: FinanceRecord): string[] {
  return (r.etiquetas ?? []).filter((id, i, all) => id !== r.categoriaId && all.indexOf(id) === i);
}

/** O lançamento pertence à categoria (como principal ou como etiqueta)? */
export function inCategory(r: FinanceRecord, categoryId: string): boolean {
  return r.categoriaId === categoryId || recordTags(r).includes(categoryId);
}

export function isRecurring(r: FinanceRecord): boolean {
  return !!r.recorrente && !isInstallment(r);
}

/** Materializa um registro em um mês (ou null se não cai nesse mês). */
export function occurrenceIn(r: FinanceRecord, ym: YM): Occurrence | null {
  const offset = monthIndex(ym) - monthIndex(ymOf(r.data));
  const base = { key: `${r.id}:${ym}`, record: r };
  const vencimento = r.vencimento ? shiftMonths(r.vencimento, offset) : undefined;

  if (isInstallment(r)) {
    const parcela = r.parcelaAtual + offset;
    if (parcela < 1 || parcela > r.parcelasTotais) return null;
    return {
      ...base,
      data: shiftMonths(r.data, offset),
      valor: installmentValue(r, parcela),
      parcela: { atual: parcela, total: r.parcelasTotais },
      vencimento,
    };
  }

  if (isRecurring(r)) {
    if (offset < 0) return null;
    if (r.recorrenteAte && monthIndex(ym) > monthIndex(r.recorrenteAte)) return null;
    return { ...base, data: shiftMonths(r.data, offset), valor: r.valorTotal, vencimento };
  }

  if (offset !== 0) return null;
  return { ...base, data: r.data, valor: r.valorTotal, vencimento: r.vencimento };
}

/** Total mensal dos lançamentos recorrentes ativos em `ym` (despesas e receitas). */
export function recurringTotals(records: FinanceRecord[], ym: YM): { despesas: number; receitas: number } {
  const totals = { despesas: 0, receitas: 0 };
  for (const r of records) {
    if (!isRecurring(r)) continue;
    const o = occurrenceIn(r, ym);
    if (!o) continue;
    if (r.kind === 'despesa') totals.despesas += o.valor;
    else totals.receitas += o.valor;
  }
  return totals;
}

/** Todos os lançamentos de um mês, do mais recente para o mais antigo. */
export function monthOccurrences(records: FinanceRecord[], ym: YM): Occurrence[] {
  const list: Occurrence[] = [];
  for (const r of records) {
    const o = occurrenceIn(r, ym);
    if (o) list.push(o);
  }
  // sort estável: em dias iguais, preserva a ordem do array (novos registros entram no início)
  return list.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

/* ------------------------------------------------------------------ resumo */

export function summarize(occurrences: Occurrence[]): MonthSummary {
  const porForma = Object.fromEntries(PAYMENT_ORDER.map((p) => [p, 0])) as Record<PaymentMethod, number>;
  const s: MonthSummary = {
    receitas: 0,
    despesas: 0,
    saldo: 0,
    fixos: 0,
    variaveis: 0,
    parcelas: 0,
    porForma,
    porCategoria: {},
    porEtiqueta: {},
  };

  for (const o of occurrences) {
    const r = o.record;
    if (r.kind === 'receita') {
      s.receitas += o.valor;
      continue;
    }
    s.despesas += o.valor;
    if (r.natureza === 'fixo') s.fixos += o.valor;
    else s.variaveis += o.valor;
    if (o.parcela) s.parcelas += o.valor;
    s.porForma[r.forma] += o.valor;
    s.porCategoria[r.categoriaId] = (s.porCategoria[r.categoriaId] ?? 0) + o.valor;
    for (const tag of recordTags(r)) s.porEtiqueta[tag] = (s.porEtiqueta[tag] ?? 0) + o.valor;
  }
  s.saldo = s.receitas - s.despesas;
  return s;
}

/* ------------------------------------------------------------------ orçamento */

export const WARN_RATIO = 0.8;

/** 'none' = categoria sem limite definido (limite 0) */
export type LimitStatus = 'none' | 'ok' | 'warn' | 'over';

export function limitStatus(spent: number, limit: number): LimitStatus {
  if (limit <= 0) return 'none';
  const ratio = spent / limit;
  if (ratio > 1) return 'over';
  if (ratio >= WARN_RATIO) return 'warn';
  return 'ok';
}

/** Orçamento mensal = soma dos limites das categorias de despesa. */
export function totalBudget(categories: Category[]): number {
  return categories.filter((c) => c.kind === 'despesa').reduce((acc, c) => acc + c.limiteMensal, 0);
}

/** Quanto ainda pode gastar por dia até o fim do mês (null se o mês não é o atual ou não há orçamento). */
export function dailyAllowance(
  budget: number,
  spent: number,
  today: ISODate,
  ym: YM,
): { perDay: number; daysLeft: number } | null {
  if (ymOf(today) !== ym || budget <= 0) return null;
  const daysLeft = Math.max(1, daysInMonth(ym) - parseISO(today).d);
  return { perDay: Math.max(0, budget - spent) / daysLeft, daysLeft };
}

/* ------------------------------------------------------------------ parcelas futuras */

export function installmentsOf(records: FinanceRecord[], ym: YM): number {
  return monthOccurrences(records, ym)
    .filter((o) => o.record.kind === 'despesa' && o.parcela)
    .reduce((acc, o) => acc + o.valor, 0);
}

/** Total de parcelas a pagar em cada um dos próximos `count` meses a partir de `start`. */
export function projectInstallments(records: FinanceRecord[], start: YM, count = 6): { ym: YM; total: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const ym = addMonths(start, i);
    return { ym, total: installmentsOf(records, ym) };
  });
}

/* ------------------------------------------------------------------ vencimentos */

export interface Due {
  occurrence: Occurrence;
  daysLeft: number;
}

/** Próximos vencimentos (parcelas/boletos) a partir de hoje, em ordem de data. */
export function upcomingDues(records: FinanceRecord[], today: ISODate, horizonDays = 45): Due[] {
  const ym = ymOf(today);
  const dues: Due[] = [];
  // o mês anterior entra porque um lançamento de lá pode vencer neste mês
  for (const m of [addMonths(ym, -1), ym, addMonths(ym, 1)]) {
    for (const o of monthOccurrences(records, m)) {
      if (o.record.kind !== 'despesa' || !o.vencimento) continue;
      const daysLeft = diffDays(today, o.vencimento);
      if (daysLeft >= 0 && daysLeft <= horizonDays) dues.push({ occurrence: o, daysLeft });
    }
  }
  return dues.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ------------------------------------------------------------------ busca / filtros */

/** Remove acentos e baixa caixa: "Alimentação" -> "alimentacao". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export type GroupFilter = 'todos' | 'fixos' | 'variaveis' | 'parcelados' | 'avista' | 'recorrentes';

export interface OccurrenceFilter {
  query: string;
  group: GroupFilter;
  forma: PaymentMethod | null;
  categories: Record<string, Category>;
  /** só lançamentos desta categoria (principal OU etiqueta) */
  categoryId?: string | null;
  /** nomes exibidos (traduzidos) das categorias, para a busca */
  names?: Record<string, string>;
}

/** Busca por texto (nome, descrição, categoria e etiquetas) + grupo + forma de pagamento + categoria. */
export function filterOccurrences(list: Occurrence[], f: OccurrenceFilter): Occurrence[] {
  const q = normalize(f.query);
  return list.filter((o) => {
    const r = o.record;
    if (f.group === 'fixos' && r.natureza !== 'fixo') return false;
    if (f.group === 'variaveis' && r.natureza !== 'variavel') return false;
    if (f.group === 'parcelados' && !o.parcela) return false;
    if (f.group === 'avista' && o.parcela) return false;
    if (f.group === 'recorrentes' && !isRecurring(r)) return false;
    if (f.forma && r.forma !== f.forma) return false;
    if (f.categoryId && !inCategory(r, f.categoryId)) return false;
    if (q) {
      const nameOf = (id: string) => f.names?.[id] ?? f.categories[id]?.nome ?? '';
      const cats = [r.categoriaId, ...recordTags(r)].map(nameOf).join(' ');
      const haystack = normalize(`${r.nome} ${r.descricao} ${cats}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export interface DaySection {
  date: ISODate;
  /** saldo do dia (receitas - despesas) */
  net: number;
  items: Occurrence[];
}

/** Agrupa (lista já ordenada por data desc) em seções por dia. */
export function groupByDay(list: Occurrence[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const o of list) {
    let s = sections[sections.length - 1];
    if (!s || s.date !== o.data) {
      s = { date: o.data, net: 0, items: [] };
      sections.push(s);
    }
    s.items.push(o);
    s.net += o.record.kind === 'receita' ? o.valor : -o.valor;
  }
  return sections;
}
