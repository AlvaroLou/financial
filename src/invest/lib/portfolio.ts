/**
 * Valor de cada ativo e o resumo da carteira (patrimônio, resultado, alocação,
 * vencimentos, exposição ao FGC). Funções puras: recebem cotações e taxas.
 */
import { diffDays } from '@/lib/dates';
import type { ISODate } from '@/types';

import { ASSET_TYPES, CLASS_ORDER, quoteKey } from '../catalog';
import type { Asset, AssetClass, AssetGroup, Operation, Quote, RateState } from '../types';
import { fixedIncomePosition } from './fixedIncome';
import { manualPosition, quotePosition, type QuotePosition } from './positions';

export interface MarketContext {
  quotes: Record<string, Quote>;
  rates: RateState;
  today: ISODate;
}

/** de onde veio o preço usado: cotação automática, digitado, preço médio (sem cotação) */
export type PriceSource = 'auto' | 'manual' | 'average' | 'none';

export interface AssetValuation {
  asset: Asset;
  classe: AssetClass;
  grupo: AssetGroup;
  /** valor bruto hoje (centavos) */
  valorAtual: number;
  /** renda fixa: valor estimado líquido de IR/IOF; demais = bruto */
  valorLiquido: number;
  irEstimado: number;
  /** custo do que está em carteira */
  investido: number;
  /** tudo o que já foi aplicado/comprado */
  aportado: number;
  /** ganho não realizado (valor atual − investido) */
  resultado: number;
  resultadoPct: number | null;
  realizado: number;
  proventos: number;
  taxas: number;
  /** resultado + realizado + proventos − taxas */
  retornoTotal: number;
  quantidade?: number;
  precoMedio?: number;
  preco?: number;
  precoFonte: PriceSource;
  precoEm?: string;
  /** variação do dia em centavos (cotações automáticas) */
  variacaoDia: number;
  variacaoDiaPct?: number;
  /** usou taxa estimada (sem série oficial) ou preço médio */
  approximate: boolean;
  /** posição encerrada (vendida/resgatada) */
  fechado: boolean;
  vencimento?: ISODate;
  oversold?: boolean;
  /** detalhes da posição negociada (vendas, para o IR) */
  position?: QuotePosition;
}

/** Valor atual e resultado de um ativo. `operations` = só as deste ativo. */
export function valueAsset(asset: Asset, operations: Operation[], ctx: MarketContext): AssetValuation {
  const info = ASSET_TYPES[asset.tipo];
  const base = {
    asset,
    classe: info.classe,
    grupo: info.grupo,
    variacaoDia: 0,
    precoFonte: 'none' as PriceSource,
    approximate: false,
  };

  if (info.valuation === 'quote') {
    const pos = quotePosition(operations);
    const key = quoteKey(asset);
    const auto = key ? ctx.quotes[key] : undefined;
    const manual = asset.cotacaoManual;
    // vale o mais recente entre a cotação automática e o preço digitado
    const useManual = !!manual && (!auto || manual.em >= auto.updatedAt);
    const preco = useManual ? manual.preco : auto ? auto.price : pos.precoMedio;
    const precoFonte: PriceSource = useManual ? 'manual' : auto ? 'auto' : pos.quantidade > 0 ? 'average' : 'none';
    const valorAtual = Math.round(pos.quantidade * preco * 100);
    const changePct = !useManual && auto?.changePct !== undefined ? auto.changePct : undefined;
    const variacaoDia = changePct !== undefined ? Math.round((valorAtual * changePct) / (1 + changePct)) : 0;
    const resultado = valorAtual - pos.custo;
    return {
      ...base,
      valorAtual,
      valorLiquido: valorAtual,
      irEstimado: 0,
      investido: pos.custo,
      aportado: pos.comprado,
      resultado,
      resultadoPct: pos.custo > 0 ? resultado / pos.custo : null,
      realizado: pos.realizado,
      proventos: pos.proventos,
      taxas: pos.taxas,
      retornoTotal: resultado + pos.realizado + pos.proventos - pos.taxas,
      quantidade: pos.quantidade,
      precoMedio: pos.precoMedio,
      preco,
      precoFonte,
      precoEm: useManual ? manual.em : auto?.updatedAt,
      variacaoDia,
      variacaoDiaPct: changePct,
      approximate: precoFonte === 'average',
      fechado: pos.quantidade <= 0,
      oversold: pos.oversold,
      position: pos,
    };
  }

  if (info.valuation === 'fixed') {
    const pos = fixedIncomePosition(asset, operations, ctx.rates, ctx.today, info.isentoIR);
    const taxas = operations.filter((o) => o.tipo === 'taxa').reduce((a, o) => a + o.valor, 0);
    const resultado = pos.bruto - pos.investido;
    return {
      ...base,
      valorAtual: pos.bruto,
      valorLiquido: pos.liquido,
      irEstimado: pos.irEstimado + pos.iofEstimado,
      investido: pos.investido,
      aportado: pos.aportado,
      resultado,
      resultadoPct: pos.investido > 0 ? resultado / pos.investido : null,
      realizado: pos.realizado,
      proventos: pos.proventos,
      taxas,
      retornoTotal: resultado + pos.realizado + pos.proventos - taxas,
      approximate: pos.approximate,
      fechado: pos.bruto <= 0 && pos.aportado > 0,
      vencimento: asset.rf?.vencimento,
    };
  }

  const pos = manualPosition(asset, operations);
  const resultado = pos.bruto - pos.investido;
  return {
    ...base,
    valorAtual: pos.bruto,
    valorLiquido: pos.bruto,
    irEstimado: 0,
    investido: pos.investido,
    aportado: pos.aportado,
    resultado,
    resultadoPct: pos.investido > 0 ? resultado / pos.investido : null,
    realizado: pos.realizado,
    proventos: pos.proventos,
    taxas: pos.taxas,
    retornoTotal: resultado + pos.realizado + pos.proventos - pos.taxas,
    precoFonte: asset.valorManual ? 'manual' : 'none',
    precoEm: asset.valorManual?.data,
    fechado: pos.bruto <= 0 && pos.resgatado > 0,
  };
}

export interface MaturityItem {
  valuation: AssetValuation;
  data: ISODate;
  dias: number;
}

export interface PortfolioSummary {
  valuations: AssetValuation[];
  /** posições abertas, da maior para a menor */
  abertos: AssetValuation[];
  fechados: AssetValuation[];
  patrimonio: number;
  patrimonioLiquido: number;
  investido: number;
  aportado: number;
  resultado: number;
  resultadoPct: number | null;
  realizado: number;
  proventos: number;
  taxas: number;
  retornoTotal: number;
  /** retorno total sobre tudo o que foi aplicado */
  rentabilidade: number | null;
  variacaoDia: number;
  variacaoDiaPct: number | null;
  porClasse: Record<AssetClass, number>;
  porGrupo: Record<AssetGroup, number>;
  /** '' = sem instituição */
  porInstituicao: Record<string, number>;
  /** valor coberto pelo FGC por instituição */
  fgcPorInstituicao: Record<string, number>;
  vencimentos: MaturityItem[];
  approximate: boolean;
}

/** Limite do FGC por CPF e instituição (centavos). */
export const FGC_LIMIT = 25_000_000;

export function groupOperations(operations: Operation[]): Map<string, Operation[]> {
  const map = new Map<string, Operation[]>();
  for (const o of operations) {
    const list = map.get(o.assetId);
    if (list) list.push(o);
    else map.set(o.assetId, [o]);
  }
  return map;
}

export function summarizePortfolio(assets: Asset[], operations: Operation[], ctx: MarketContext): PortfolioSummary {
  const byAsset = groupOperations(operations);
  const valuations = assets.map((a) => valueAsset(a, byAsset.get(a.id) ?? [], ctx));

  const porClasse = Object.fromEntries(CLASS_ORDER.map((c) => [c, 0])) as Record<AssetClass, number>;
  const porGrupo: Record<AssetGroup, number> = { fixa: 0, variavel: 0, outros: 0 };
  const porInstituicao: Record<string, number> = {};
  const fgcPorInstituicao: Record<string, number> = {};
  const vencimentos: MaturityItem[] = [];
  const s = {
    patrimonio: 0,
    patrimonioLiquido: 0,
    investido: 0,
    aportado: 0,
    resultado: 0,
    realizado: 0,
    proventos: 0,
    taxas: 0,
    variacaoDia: 0,
    approximate: false,
  };

  for (const v of valuations) {
    s.patrimonio += v.valorAtual;
    s.patrimonioLiquido += v.valorLiquido;
    s.investido += v.investido;
    s.aportado += v.aportado;
    s.realizado += v.realizado;
    s.proventos += v.proventos;
    s.taxas += v.taxas;
    s.variacaoDia += v.variacaoDia;
    if (v.fechado) continue;
    if (v.approximate) s.approximate = true;
    porClasse[v.classe] += v.valorAtual;
    porGrupo[v.grupo] += v.valorAtual;
    const inst = v.asset.instituicaoId ?? '';
    porInstituicao[inst] = (porInstituicao[inst] ?? 0) + v.valorAtual;
    const coveredByFgc = v.asset.fgc ?? ASSET_TYPES[v.asset.tipo].fgc;
    if (coveredByFgc && inst) fgcPorInstituicao[inst] = (fgcPorInstituicao[inst] ?? 0) + v.valorAtual;
    if (v.vencimento && v.vencimento >= ctx.today) {
      vencimentos.push({ valuation: v, data: v.vencimento, dias: diffDays(ctx.today, v.vencimento) });
    }
  }

  s.resultado = s.patrimonio - s.investido;
  const retornoTotal = s.resultado + s.realizado + s.proventos - s.taxas;
  const abertos = valuations.filter((v) => !v.fechado).sort((a, b) => b.valorAtual - a.valorAtual);
  const fechados = valuations.filter((v) => v.fechado);
  const previous = s.patrimonio - s.variacaoDia;

  return {
    valuations,
    abertos,
    fechados,
    ...s,
    resultadoPct: s.investido > 0 ? s.resultado / s.investido : null,
    retornoTotal,
    rentabilidade: s.aportado > 0 ? retornoTotal / s.aportado : null,
    variacaoDiaPct: previous > 0 && s.variacaoDia !== 0 ? s.variacaoDia / previous : null,
    porClasse,
    porGrupo,
    porInstituicao,
    fgcPorInstituicao,
    vencimentos: vencimentos.sort((a, b) => a.dias - b.dias),
  };
}

/** Investido acumulado (aportes − resgates, pelo custo) até o fim de cada mês — para o gráfico de evolução. */
export function investedUntil(operations: Operation[], iso: ISODate): number {
  let total = 0;
  for (const o of operations) {
    if (o.data > iso) continue;
    if (o.tipo === 'compra' || o.tipo === 'aporte') total += o.valor + (o.custos ?? 0);
    if (o.tipo === 'venda' || o.tipo === 'resgate') total -= o.valor;
  }
  return Math.max(0, total);
}
