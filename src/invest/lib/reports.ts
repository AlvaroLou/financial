/**
 * Relatórios de Investimentos (mês ou ano): patrimônio inicial e final, aportes
 * e resgates, proventos por tipo, lucro realizado, valorização, resultado,
 * rentabilidade (método de Dietz, aproximada), IR estimado e posições.
 */
import { addDays, addMonths, ymOf } from '@/lib/dates';
import type { ISODate, YM } from '@/types';

import { ASSET_TYPES } from '../catalog';
import type { Asset, IncomeType, Operation, RateState, Snapshot } from '../types';
import { fixedIncomePosition } from './fixedIncome';
import type { PortfolioSummary } from './portfolio';
import { manualPosition, quotePosition } from './positions';
import { monthlyTax, positionsAt, yearIncome, type TaxMonth, type YearEndPosition, type YearIncome } from './tax';

export interface InvestReport {
  from: ISODate;
  to: ISODate;
  patrimonioInicial: number | null;
  patrimonioFinal: number | null;
  /** sem foto mensal: renda fixa recalculada na data e renda variável pelo custo */
  inicialEstimado: boolean;
  finalEstimado: boolean;
  aportes: number;
  resgates: number;
  proventos: number;
  proventosPorTipo: Partial<Record<IncomeType, number>>;
  realizado: number;
  /** final − inicial − (aportes − resgates): juros, cotações, marcação */
  valorizacao: number | null;
  /** valorização + proventos */
  resultado: number | null;
  rentabilidade: number | null;
  impostoEstimado: number;
  taxMonths: TaxMonth[];
  operacoes: Operation[];
  /** posições no fim do período, pelo custo */
  posicoes: YearEndPosition[];
  /** só no relatório anual */
  rendimentos?: YearIncome;
}

function realizedUntil(asset: Asset, ops: Operation[], date: ISODate, rates: RateState): number {
  const upTo = ops.filter((o) => o.data <= date);
  if (upTo.length === 0) return 0;
  const info = ASSET_TYPES[asset.tipo];
  if (info.valuation === 'quote') return quotePosition(upTo).realizado;
  if (info.valuation === 'fixed') return fixedIncomePosition(asset, upTo, rates, date, info.isentoIR).realizado;
  return 0;
}

/**
 * Patrimônio estimado numa data passada (quando não há foto mensal): renda fixa
 * recalculada pela curva até a data; renda variável e fundos pelo custo.
 */
export function estimatedValueAt(assets: Asset[], operations: Operation[], date: ISODate, rates: RateState): number {
  let total = 0;
  for (const a of assets) {
    const ops = operations.filter((o) => o.assetId === a.id && o.data <= date);
    if (ops.length === 0) continue;
    const info = ASSET_TYPES[a.tipo];
    if (info.valuation === 'fixed') total += fixedIncomePosition({ rf: a.rf }, ops, rates, date, info.isentoIR).bruto;
    else if (info.valuation === 'quote') total += quotePosition(ops).custo;
    else total += manualPosition({ valorManual: a.valorManual && a.valorManual.data <= date ? a.valorManual : undefined }, ops).bruto;
  }
  return total;
}

export function buildInvestReport(opts: {
  assets: Asset[];
  operations: Operation[];
  snapshots: Snapshot[];
  rates: RateState;
  summary: PortfolioSummary;
  today: ISODate;
  from: ISODate;
  to: ISODate;
  annual?: boolean;
}): InvestReport {
  const { assets, operations, snapshots, rates, summary, today, from, to } = opts;
  const inPeriod = operations.filter((o) => o.data >= from && o.data <= to);
  const before = operations.some((o) => o.data < from);

  let aportes = 0;
  let resgates = 0;
  let proventos = 0;
  const proventosPorTipo: Partial<Record<IncomeType, number>> = {};
  for (const o of inPeriod) {
    if (o.tipo === 'compra' || o.tipo === 'aporte') aportes += o.valor + (o.custos ?? 0);
    if (o.tipo === 'venda' || o.tipo === 'resgate') resgates += o.valor;
    if (o.tipo === 'provento') {
      const net = o.valor - (o.irRetido ?? 0);
      proventos += net;
      const k = o.proventoTipo ?? 'outro';
      proventosPorTipo[k] = (proventosPorTipo[k] ?? 0) + net;
    }
  }

  // lucro realizado no período = realizado até o fim − realizado até a véspera do início
  const dayBefore = addDays(from, -1);
  let realizado = 0;
  for (const a of assets) {
    const ops = operations.filter((o) => o.assetId === a.id);
    if (!ops.some((o) => o.data >= from && o.data <= to)) continue;
    realizado += realizedUntil(a, ops, to, rates) - realizedUntil(a, ops, dayBefore, rates);
  }

  const snap = (ym: YM) => snapshots.find((s) => s.ym === ym)?.patrimonio ?? null;
  const startSnap = before ? snap(addMonths(ymOf(from), -1)) : 0;
  const endSnap = to >= today ? summary.patrimonio : snap(ymOf(to));
  const inicialEstimado = startSnap === null;
  const finalEstimado = endSnap === null;
  const patrimonioInicial = startSnap ?? estimatedValueAt(assets, operations, addDays(from, -1), rates);
  const patrimonioFinal = endSnap ?? estimatedValueAt(assets, operations, to, rates);

  const valorizacao =
    patrimonioInicial !== null && patrimonioFinal !== null ? patrimonioFinal - patrimonioInicial - (aportes - resgates) : null;
  const resultado = valorizacao !== null ? valorizacao + proventos : null;
  const base = patrimonioInicial !== null ? patrimonioInicial + (aportes - resgates) / 2 : 0;
  const rentabilidade = resultado !== null && base > 0 ? resultado / base : null;

  const allTax = monthlyTax(assets, operations, ymOf(to));
  const taxMonths = allTax.filter((m) => m.ym >= ymOf(from) && m.ym <= ymOf(to));
  const impostoEstimado = taxMonths.reduce((a, m) => a + m.impostoComum + m.impostoFii + m.impostoCripto, 0);

  return {
    from,
    to,
    patrimonioInicial,
    patrimonioFinal,
    inicialEstimado,
    finalEstimado,
    aportes,
    resgates,
    proventos,
    proventosPorTipo,
    realizado,
    valorizacao,
    resultado,
    rentabilidade,
    impostoEstimado,
    taxMonths,
    operacoes: inPeriod,
    posicoes: positionsAt(assets, operations, to),
    rendimentos: opts.annual ? yearIncome(assets, operations, Number(from.slice(0, 4)), allTax) : undefined,
  };
}
