/**
 * Posição de ativos negociados (ações, FIIs, ETFs, BDRs, cripto) pelo método do
 * preço médio (regra da Receita para pessoa física): custos de corretagem entram
 * no preço médio; na venda, o lucro é (valor da venda − custos) − quantidade ×
 * preço médio. Desdobramentos/grupamentos mudam a quantidade, não o custo.
 *
 * Também a posição de ativos de valor informado (fundos, previdência, outros).
 */
import type { ISODate } from '@/types';

import type { Asset, IncomeType, Operation } from '../types';

const EPS = 1e-9;

export interface Sale {
  data: ISODate;
  quantidade: number;
  /** valor bruto da venda (centavos) — conta para a isenção mensal */
  valor: number;
  custos: number;
  /** custo médio das unidades vendidas (centavos) */
  custoMedio: number;
  /** lucro (ou prejuízo) da venda (centavos) */
  lucro: number;
}

export interface QuotePosition {
  quantidade: number;
  /** custo do que está em carteira (centavos, com custos de compra) */
  custo: number;
  /** R$ por unidade */
  precoMedio: number;
  /** total comprado, com custos (centavos) */
  comprado: number;
  /** total vendido, bruto (centavos) */
  vendido: number;
  realizado: number;
  /** proventos recebidos, líquidos de IR retido */
  proventos: number;
  proventosBrutos: number;
  proventosPorTipo: Partial<Record<IncomeType, number>>;
  /** outras taxas pagas (custódia…) */
  taxas: number;
  sales: Sale[];
  /** alguma venda maior que a posição (dados incompletos) */
  oversold: boolean;
}

const byDate = (a: Operation, b: Operation) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

export function quotePosition(operations: Operation[]): QuotePosition {
  const p: QuotePosition = {
    quantidade: 0,
    custo: 0,
    precoMedio: 0,
    comprado: 0,
    vendido: 0,
    realizado: 0,
    proventos: 0,
    proventosBrutos: 0,
    proventosPorTipo: {},
    taxas: 0,
    sales: [],
    oversold: false,
  };

  for (const o of [...operations].sort(byDate)) {
    switch (o.tipo) {
      case 'compra': {
        const q = o.quantidade ?? 0;
        const total = o.valor + (o.custos ?? 0);
        p.quantidade += q;
        p.custo += total;
        p.comprado += total;
        break;
      }
      case 'venda': {
        const wanted = o.quantidade ?? 0;
        if (wanted <= 0) break;
        const q = Math.min(wanted, p.quantidade);
        if (wanted - q > EPS) p.oversold = true;
        const share = q / wanted;
        const avgUnitCost = p.quantidade > EPS ? p.custo / p.quantidade : 0;
        const custoMedio = avgUnitCost * q;
        const valor = o.valor * share;
        const custos = (o.custos ?? 0) * share;
        const lucro = valor - custos - custoMedio;
        p.realizado += lucro;
        p.vendido += o.valor;
        p.custo -= custoMedio;
        p.quantidade -= q;
        p.sales.push({
          data: o.data,
          quantidade: q,
          valor: Math.round(o.valor),
          custos: Math.round(custos),
          custoMedio: Math.round(custoMedio),
          lucro: Math.round(lucro),
        });
        break;
      }
      case 'desdobramento':
      case 'grupamento':
        if (o.fator && o.fator > 0) p.quantidade *= o.fator;
        break;
      case 'bonificacao':
        p.quantidade += o.quantidade ?? 0;
        p.custo += o.valor;
        break;
      case 'provento': {
        const net = o.valor - (o.irRetido ?? 0);
        p.proventosBrutos += o.valor;
        p.proventos += net;
        const k = o.proventoTipo ?? 'outro';
        p.proventosPorTipo[k] = (p.proventosPorTipo[k] ?? 0) + net;
        break;
      }
      case 'taxa':
        p.taxas += o.valor;
        break;
      default:
        break;
    }
    if (p.quantidade < EPS) {
      p.quantidade = 0;
      p.custo = 0;
    }
  }

  p.custo = Math.round(p.custo);
  p.realizado = Math.round(p.realizado);
  p.precoMedio = p.quantidade > EPS ? p.custo / p.quantidade / 100 : 0;
  return p;
}

export interface ManualPosition {
  bruto: number;
  investido: number;
  aportado: number;
  resgatado: number;
  realizado: number;
  proventos: number;
  taxas: number;
}

/**
 * Ativos de valor informado (fundos, previdência, outros): aportes e resgates
 * definem o investido; o valor atual é o último informado pelo usuário, somado
 * aos aportes/resgates feitos depois dele.
 */
export function manualPosition(asset: Pick<Asset, 'valorManual'>, operations: Operation[]): ManualPosition {
  let aportado = 0;
  let resgatado = 0;
  let proventos = 0;
  let taxas = 0;
  let afterManual = 0;
  const m = asset.valorManual;
  for (const o of operations) {
    const inflow = o.tipo === 'aporte' || o.tipo === 'compra';
    const outflow = o.tipo === 'resgate' || o.tipo === 'venda';
    if (inflow) aportado += o.valor + (o.custos ?? 0);
    if (outflow) resgatado += o.valor;
    if (o.tipo === 'provento') proventos += o.valor - (o.irRetido ?? 0);
    if (o.tipo === 'taxa') taxas += o.valor;
    if (m && o.data > m.data) afterManual += inflow ? o.valor : outflow ? -o.valor : 0;
  }
  const net = Math.max(0, aportado - resgatado);
  const bruto = m ? Math.max(0, m.valor + afterManual) : net;
  const closed = bruto === 0 && resgatado > 0;
  return {
    bruto,
    investido: closed ? 0 : net,
    aportado,
    resgatado,
    realizado: closed ? resgatado - aportado : 0,
    proventos,
    taxas,
  };
}
