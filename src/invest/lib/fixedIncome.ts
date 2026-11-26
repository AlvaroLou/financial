/**
 * Renda fixa "na curva": o valor de uma aplicação é corrigido dia útil a dia útil
 * pelo indexador. Com as séries diárias do Banco Central (CDI, Selic) e o IPCA
 * mensal, o cálculo é exato para CDI/Selic; sem elas (ou em dias ainda sem
 * dado), usa a taxa anual atual e marca o resultado como aproximado.
 *
 * Técnica: uma "cota" P(t) acumula o fator desde a 1ª aplicação; cada aporte
 * compra cotas (valor / P(data)) e cada resgate vende cotas (FIFO). Assim o
 * valor de hoje, o custo e o IR por lote (tabela regressiva) saem juntos.
 */
import { addDays, diffDays, ymOf } from '@/lib/dates';
import type { ISODate } from '@/types';

import type { Asset, FixedIncomeTerms, Operation, RateState } from '../types';
import { BUSINESS_DAYS_PER_YEAR, businessDaysInMonth, isBusinessDay } from './calendar';

/* ------------------------------------------------------------------ taxas */

/** Taxa diária (dia útil) equivalente a uma taxa anual base 252. */
export const dailyFromAnnual = (annual: number) => (1 + annual) ** (1 / BUSINESS_DAYS_PER_YEAR) - 1;

/** Taxa anual base 252 equivalente a uma taxa diária. */
export const annualFromDaily = (daily: number) => (1 + daily) ** BUSINESS_DAYS_PER_YEAR - 1;

/** Taxa mensal equivalente a uma anual. */
export const monthlyFromAnnual = (annual: number) => (1 + annual) ** (1 / 12) - 1;

/** Rendimento mensal da poupança (regra de 2012, sem a TR). */
export function poupancaMonthly(selicMeta: number): number {
  return selicMeta > 0.085 ? 0.005 : monthlyFromAnnual(selicMeta * 0.7);
}

/* ------------------------------------------------------------------ IR e IOF */

/** Alíquota de IR da renda fixa pela tabela regressiva (dias corridos). */
export function irRate(days: number): number {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

/** IOF regressivo sobre o rendimento em resgates com menos de 30 dias. */
export function iofRate(days: number): number {
  if (days >= 30) return 0;
  if (days <= 0) return 0.96;
  const table = [
    96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3,
  ];
  return table[days - 1] / 100;
}

/* ------------------------------------------------------------------ curva */

export interface Curve {
  /** fator acumulado da 1ª data até `iso` (datas antes do início = 1) */
  at: (iso: ISODate) => number;
  /** algum dia usou taxa estimada (sem a série oficial) */
  approximate: boolean;
}

/**
 * Monta a curva do indexador de `start` até `end` (inclusive).
 * A correção de um dia útil d é aplicada ao passar para d+1 (d inclusive, fim exclusive).
 */
export function buildCurve(terms: FixedIncomeTerms, rates: RateState, start: ISODate, end: ISODate): Curve {
  const cum = new Map<ISODate, number>();
  let factor = 1;
  let approximate = false;
  const spreadDaily = dailyFromAnnual(terms.taxa);

  if (terms.indexador === 'poupanca') {
    // poupança: rende a cada "aniversário" mensal, sem pro rata
    approximate = true;
    const monthly = poupancaMonthly(rates.selicMeta);
    const startDay = Number(start.slice(8, 10));
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (d !== start && Number(d.slice(8, 10)) === Math.min(startDay, daysInMonthOf(d))) factor *= 1 + monthly;
      cum.set(d, factor);
    }
  } else {
    for (let d = start; d <= end; d = addDays(d, 1)) {
      cum.set(d, factor);
      if (!isBusinessDay(d)) continue;
      let daily: number;
      switch (terms.indexador) {
        case 'pre':
          daily = spreadDaily;
          break;
        case 'cdi': {
          const cdi = rates.cdiDiario[d];
          if (cdi === undefined) approximate = true;
          daily = (cdi ?? dailyFromAnnual(rates.cdiAnual)) * terms.taxa;
          break;
        }
        case 'cdi_spread': {
          const cdi = rates.cdiDiario[d];
          if (cdi === undefined) approximate = true;
          daily = (1 + (cdi ?? dailyFromAnnual(rates.cdiAnual))) * (1 + spreadDaily) - 1;
          break;
        }
        case 'selic': {
          const selic = rates.selicDiaria[d];
          if (selic === undefined) approximate = true;
          daily = (1 + (selic ?? dailyFromAnnual(rates.selicMeta))) * (1 + spreadDaily) - 1;
          break;
        }
        case 'ipca': {
          const monthly = rates.ipcaMensal[ymOf(d)];
          if (monthly === undefined) approximate = true;
          const m = monthly ?? monthlyFromAnnual(rates.ipca12m);
          // IPCA do mês distribuído pelos dias úteis do próprio mês (o mês cheio rende exatamente m)
          const ipcaDaily = (1 + m) ** (1 / businessDaysInMonth(ymOf(d))) - 1;
          daily = (1 + ipcaDaily) * (1 + spreadDaily) - 1;
          break;
        }
        default:
          daily = 0;
      }
      factor *= 1 + daily;
    }
  }

  const last = factor;
  return {
    at: (iso) => {
      if (iso < start) return 1;
      if (iso > end) return last;
      return cum.get(iso) ?? last;
    },
    approximate,
  };
}

function daysInMonthOf(iso: ISODate): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/* ------------------------------------------------------------------ posição */

interface Lot {
  date: ISODate;
  units: number;
  /** custo (centavos) ainda aplicado neste lote */
  cost: number;
}

export interface FixedIncomePosition {
  /** valor bruto hoje (centavos) */
  bruto: number;
  /** estimativa líquida de IR e IOF se resgatasse hoje (centavos) */
  liquido: number;
  irEstimado: number;
  iofEstimado: number;
  /** custo do que segue aplicado */
  investido: number;
  /** soma de todos os aportes */
  aportado: number;
  /** soma de todos os resgates (brutos) */
  resgatado: number;
  /** ganho realizado nos resgates (centavos, bruto) */
  realizado: number;
  /** juros/amortizações pagos (cupons) — líquidos de IR retido */
  proventos: number;
  /** fator do indexador desde a 1ª aplicação */
  fator: number;
  approximate: boolean;
}

/**
 * Valor de uma aplicação de renda fixa a partir das operações (aporte, resgate,
 * provento = juros/amortização) e do "valor atual informado" (ajuste), se houver.
 */
export function fixedIncomePosition(
  asset: Pick<Asset, 'rf' | 'valorManual'>,
  operations: Operation[],
  rates: RateState,
  today: ISODate,
  isentoIR: boolean,
): FixedIncomePosition {
  const empty: FixedIncomePosition = {
    bruto: 0,
    liquido: 0,
    irEstimado: 0,
    iofEstimado: 0,
    investido: 0,
    aportado: 0,
    resgatado: 0,
    realizado: 0,
    proventos: 0,
    fator: 1,
    approximate: false,
  };
  const terms = asset.rf;
  const ops = operations.filter((o) => o.tipo === 'aporte' || o.tipo === 'resgate' || o.tipo === 'provento');
  if (!terms || ops.length === 0) return empty;

  const first = ops.reduce((min, o) => (o.data < min ? o.data : min), ops[0].data);
  const end = terms.vencimento && terms.vencimento < today ? terms.vencimento : today;
  const curve = buildCurve(terms, rates, first, end > first ? end : first);
  const P = (d: ISODate) => curve.at(d > end ? end : d);

  const lots: Lot[] = [];
  const pos = { ...empty, approximate: curve.approximate };
  const manual = asset.valorManual && asset.valorManual.data >= first ? asset.valorManual : undefined;
  let manualApplied = false;

  const applyManual = () => {
    if (!manual || manualApplied) return;
    manualApplied = true;
    const value = lots.reduce((acc, l) => acc + l.units * P(manual.data), 0);
    if (value > 0) {
      const ratio = manual.valor / value;
      for (const l of lots) l.units *= ratio;
    }
  };

  const sorted = [...ops].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  for (const o of sorted) {
    if (manual && o.data > manual.data) applyManual();
    if (o.tipo === 'aporte') {
      pos.aportado += o.valor;
      lots.push({ date: o.data, units: o.valor / P(o.data), cost: o.valor });
    } else if (o.tipo === 'resgate') {
      pos.resgatado += o.valor;
      let unitsToSell = o.valor / P(o.data);
      for (const l of lots) {
        if (unitsToSell <= 0) break;
        if (l.units <= 0) continue;
        const sold = Math.min(l.units, unitsToSell);
        const costPart = l.cost * (sold / l.units);
        pos.realizado += sold * P(o.data) - costPart;
        l.cost -= costPart;
        l.units -= sold;
        unitsToSell -= sold;
      }
    } else if (o.tipo === 'provento') {
      pos.proventos += o.valor - (o.irRetido ?? 0);
    }
  }
  applyManual();

  const valueDate = end;
  for (const l of lots) {
    if (l.units <= 1e-9) continue;
    const gross = l.units * P(valueDate);
    const gain = Math.max(0, gross - l.cost);
    const days = diffDays(l.date, today);
    const iof = gain * iofRate(days);
    const ir = isentoIR ? 0 : (gain - iof) * irRate(days);
    pos.bruto += gross;
    pos.investido += l.cost;
    pos.iofEstimado += iof;
    pos.irEstimado += ir;
  }
  pos.bruto = Math.round(pos.bruto);
  pos.investido = Math.round(pos.investido);
  pos.iofEstimado = Math.round(pos.iofEstimado);
  pos.irEstimado = Math.round(pos.irEstimado);
  pos.liquido = pos.bruto - pos.iofEstimado - pos.irEstimado;
  pos.realizado = Math.round(pos.realizado);
  pos.fator = P(valueDate);
  return pos;
}

/**
 * Rentabilidade do CDI no período (para "% do CDI"): fator − 1 entre as datas.
 */
export function cdiReturn(rates: RateState, from: ISODate, to: ISODate): { value: number; approximate: boolean } {
  if (to <= from) return { value: 0, approximate: false };
  const curve = buildCurve({ indexador: 'cdi', taxa: 1, dataInicio: from }, rates, from, to);
  return { value: curve.at(to) - 1, approximate: curve.approximate };
}

/** Projeção simples: quanto `valor` vira em `months` meses a uma taxa anual. */
export function projectAnnual(valor: number, annual: number, months: number): number {
  return Math.round(valor * (1 + annual) ** (months / 12));
}
