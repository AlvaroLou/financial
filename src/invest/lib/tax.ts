/**
 * Estimativa do IR mensal sobre vendas (pessoa física, operações comuns — sem
 * day trade), regras vigentes em 2026:
 * - Ações: isentas se as VENDAS de ações no mês somarem até R$ 20 mil; acima, 15% do lucro.
 * - ETFs e BDRs: 15%, sem isenção. Prejuízos de ações/ETFs/BDRs se compensam entre si.
 * - FIIs: 20%, sem isenção; prejuízo de FII só compensa lucro de FII.
 * - Cripto: isento se as vendas no mês somarem até R$ 35 mil; acima, 15% (ganho de capital, sem compensação).
 * - DARF: código 6015 (bolsa) e 4600 (cripto), vence no último dia útil do mês seguinte;
 *   valores abaixo de R$ 10 acumulam para o mês seguinte.
 * - Dividendos acima de R$ 50 mil por mês da mesma empresa: retenção de 10% (Lei 15.270/2025).
 * É uma ESTIMATIVA para conferência — o app avisa isso na tela.
 */
import { addMonths, ymOf } from '@/lib/dates';
import type { YM } from '@/types';

import { ASSET_TYPES } from '../catalog';
import type { Asset, AssetType, Operation } from '../types';
import { lastBusinessDayOfMonth } from './calendar';
import { quotePosition } from './positions';

export const STOCK_EXEMPTION = 2_000_000; // R$ 20.000 em vendas de ações no mês
export const CRYPTO_EXEMPTION = 3_500_000; // R$ 35.000 em vendas de cripto no mês
export const DARF_MINIMUM = 1_000; // R$ 10,00
export const DIVIDEND_WITHHOLDING_THRESHOLD = 5_000_000; // R$ 50.000 por empresa no mês
export const RATE_COMMON = 0.15;
export const RATE_FII = 0.2;
export const RATE_CRYPTO = 0.15;
export const DARF_CODE_B3 = '6015';
export const DARF_CODE_CRYPTO = '4600';

type Bucket = 'acao' | 'etfBdr' | 'fii' | 'cripto';

const bucketOf = (tipo: AssetType): Bucket | null => {
  if (tipo === 'acao') return 'acao';
  if (tipo === 'etf' || tipo === 'bdr') return 'etfBdr';
  if (tipo === 'fii') return 'fii';
  if (tipo === 'cripto') return 'cripto';
  return null;
};

export interface TaxMonth {
  ym: YM;
  vendasAcoes: number;
  lucroAcoes: number;
  /** lucro de ações isento (vendas até R$ 20 mil) */
  acoesIsentas: boolean;
  lucroEtfBdr: number;
  vendasFii: number;
  lucroFii: number;
  vendasCripto: number;
  lucroCripto: number;
  criptoIsenta: boolean;
  /** prejuízo a compensar depois deste mês (ações/ETFs/BDRs) */
  prejuizoComum: number;
  prejuizoFii: number;
  impostoComum: number;
  impostoFii: number;
  impostoCripto: number;
  /** DARF 6015 a pagar (com saldo abaixo de R$ 10 acumulado de meses anteriores) */
  darfB3: number;
  darfCripto: number;
  vencimento: string;
}

/** Meses com alguma venda, do primeiro até `untilYm`, com o IR estimado. */
export function monthlyTax(assets: Asset[], operations: Operation[], untilYm: YM): TaxMonth[] {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const perMonth = new Map<YM, { vendas: Record<Bucket, number>; lucro: Record<Bucket, number> }>();
  const blank = () => ({
    vendas: { acao: 0, etfBdr: 0, fii: 0, cripto: 0 },
    lucro: { acao: 0, etfBdr: 0, fii: 0, cripto: 0 },
  });

  // vendas de cada ativo, com o lucro pelo preço médio (calculado sobre todo o histórico)
  const opsByAsset = new Map<string, Operation[]>();
  for (const o of operations) {
    const list = opsByAsset.get(o.assetId);
    if (list) list.push(o);
    else opsByAsset.set(o.assetId, [o]);
  }
  for (const [assetId, ops] of opsByAsset) {
    const asset = byId.get(assetId);
    if (!asset || ASSET_TYPES[asset.tipo].valuation !== 'quote') continue;
    const bucket = bucketOf(asset.tipo);
    if (!bucket) continue;
    for (const sale of quotePosition(ops).sales) {
      const ym = ymOf(sale.data);
      const m = perMonth.get(ym) ?? blank();
      m.vendas[bucket] += sale.valor;
      m.lucro[bucket] += sale.lucro;
      perMonth.set(ym, m);
    }
  }

  const months = [...perMonth.keys()].filter((ym) => ym <= untilYm).sort();
  if (months.length === 0) return [];

  const out: TaxMonth[] = [];
  let prejuizoComum = 0;
  let prejuizoFii = 0;
  let pendingB3 = 0;
  let pendingCripto = 0;

  for (let ym = months[0]; ym <= untilYm; ym = addMonths(ym, 1)) {
    const m = perMonth.get(ym);
    if (!m) {
      continue;
    }
    const acoesIsentas = m.vendas.acao <= STOCK_EXEMPTION;
    // lucro isento de ações sai da conta; prejuízo de ações sempre entra (pode ser compensado)
    let comum = (acoesIsentas && m.lucro.acao > 0 ? 0 : m.lucro.acao) + m.lucro.etfBdr;
    if (comum > 0) {
      const used = Math.min(comum, prejuizoComum);
      comum -= used;
      prejuizoComum -= used;
    } else {
      prejuizoComum += -comum;
      comum = 0;
    }

    let fii = m.lucro.fii;
    if (fii > 0) {
      const used = Math.min(fii, prejuizoFii);
      fii -= used;
      prejuizoFii -= used;
    } else {
      prejuizoFii += -fii;
      fii = 0;
    }

    const criptoIsenta = m.vendas.cripto <= CRYPTO_EXEMPTION;
    const impostoComum = Math.round(comum * RATE_COMMON);
    const impostoFii = Math.round(fii * RATE_FII);
    const impostoCripto = criptoIsenta || m.lucro.cripto <= 0 ? 0 : Math.round(m.lucro.cripto * RATE_CRYPTO);

    pendingB3 += impostoComum + impostoFii;
    pendingCripto += impostoCripto;
    const darfB3 = pendingB3 >= DARF_MINIMUM ? pendingB3 : 0;
    const darfCripto = pendingCripto >= DARF_MINIMUM ? pendingCripto : 0;
    if (darfB3) pendingB3 = 0;
    if (darfCripto) pendingCripto = 0;

    const next = addMonths(ym, 1);
    const [ny, nm] = next.split('-').map(Number);
    out.push({
      ym,
      vendasAcoes: m.vendas.acao,
      lucroAcoes: m.lucro.acao,
      acoesIsentas,
      lucroEtfBdr: m.lucro.etfBdr,
      vendasFii: m.vendas.fii,
      lucroFii: m.lucro.fii,
      vendasCripto: m.vendas.cripto,
      lucroCripto: m.lucro.cripto,
      criptoIsenta,
      prejuizoComum,
      prejuizoFii,
      impostoComum,
      impostoFii,
      impostoCripto,
      darfB3,
      darfCripto,
      vencimento: lastBusinessDayOfMonth(ny, nm),
    });
  }
  return out;
}

export interface YearIncome {
  /** dividendos recebidos (isentos até R$ 50 mil/mês por empresa) */
  dividendos: number;
  /** rendimentos de FII (isentos para pessoa física, nas regras gerais) */
  rendimentosFii: number;
  /** JCP líquido (tributação exclusiva) */
  jcp: number;
  /** juros/amortizações de renda fixa */
  juros: number;
  outros: number;
  /** lucro de ações em meses isentos (ficha de rendimentos isentos) */
  lucroAcoesIsento: number;
  /** meses em que a mesma empresa pagou mais de R$ 50 mil (retenção de 10%) */
  dividendosAcimaLimite: { ym: YM; assetId: string; valor: number }[];
}

/** Rendimentos do ano para a declaração (proventos por tipo + lucro isento de ações). */
export function yearIncome(assets: Asset[], operations: Operation[], year: number, tax: TaxMonth[]): YearIncome {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const out: YearIncome = {
    dividendos: 0,
    rendimentosFii: 0,
    jcp: 0,
    juros: 0,
    outros: 0,
    lucroAcoesIsento: 0,
    dividendosAcimaLimite: [],
  };
  const divPerMonth = new Map<string, number>();
  for (const o of operations) {
    if (o.tipo !== 'provento' || !o.data.startsWith(String(year))) continue;
    const net = o.valor - (o.irRetido ?? 0);
    const asset = byId.get(o.assetId);
    switch (o.proventoTipo) {
      case 'dividendo': {
        out.dividendos += net;
        const key = `${ymOf(o.data)}|${o.assetId}`;
        divPerMonth.set(key, (divPerMonth.get(key) ?? 0) + o.valor);
        break;
      }
      case 'rendimento':
        if (asset?.tipo === 'fii') out.rendimentosFii += net;
        else out.outros += net;
        break;
      case 'jcp':
        out.jcp += net;
        break;
      case 'juros':
      case 'amortizacao':
        out.juros += net;
        break;
      default:
        out.outros += net;
    }
  }
  for (const [key, valor] of divPerMonth) {
    if (valor > DIVIDEND_WITHHOLDING_THRESHOLD) {
      const [ym, assetId] = key.split('|');
      out.dividendosAcimaLimite.push({ ym, assetId, valor });
    }
  }
  for (const m of tax) {
    if (m.ym.startsWith(String(year)) && m.acoesIsentas && m.lucroAcoes > 0) out.lucroAcoesIsento += m.lucroAcoes;
  }
  return out;
}

export interface YearEndPosition {
  asset: Asset;
  quantidade: number | null;
  /** custo de aquisição na data (o valor que vai na declaração de bens) */
  custo: number;
}

/** Posição em 31/12 pelo CUSTO (situação para "Bens e Direitos"). */
export function positionsAt(assets: Asset[], operations: Operation[], isoDate: string): YearEndPosition[] {
  const out: YearEndPosition[] = [];
  for (const asset of assets) {
    const ops = operations.filter((o) => o.assetId === asset.id && o.data <= isoDate);
    if (ops.length === 0) continue;
    const info = ASSET_TYPES[asset.tipo];
    if (info.valuation === 'quote') {
      const p = quotePosition(ops);
      if (p.quantidade > 0) out.push({ asset, quantidade: p.quantidade, custo: p.custo });
    } else {
      let net = 0;
      for (const o of ops) {
        if (o.tipo === 'aporte' || o.tipo === 'compra') net += o.valor + (o.custos ?? 0);
        if (o.tipo === 'resgate' || o.tipo === 'venda') net -= o.valor;
      }
      if (net > 0) out.push({ asset, quantidade: null, custo: net });
    }
  }
  return out.sort((a, b) => b.custo - a.custo);
}
