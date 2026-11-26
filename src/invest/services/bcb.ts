/**
 * Banco Central — SGS (dados abertos, sem cadastro):
 * 12 = CDI diário (% a.d.), 11 = Selic diária (% a.d.), 4389 = CDI anualizado
 * (% a.a., base 252), 432 = meta Selic (% a.a.), 433 = IPCA mensal (% a.m.),
 * 13522 = IPCA acumulado em 12 meses (%). Séries diárias: no máximo 10 anos por consulta.
 */
import { addDays, parseISO, toISO, ymOf } from '@/lib/dates';
import type { ISODate, YM } from '@/types';

import { getJson } from './http';

const BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

interface SgsPoint {
  data: string; // dd/mm/aaaa
  valor: string; // "0.050788"
}

const toBr = (iso: ISODate) => {
  const { y, m, d } = parseISO(iso);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

/** "24/11/2026" -> "2026-11-24" */
export const fromBr = (br: string): ISODate => {
  const [d, m, y] = br.split('/').map(Number);
  return toISO(y, m, d);
};

/** Converte a resposta do SGS em {data ISO: valor em fração} (o SGS usa %). */
export function parseSgs(points: SgsPoint[]): Record<ISODate, number> {
  const out: Record<ISODate, number> = {};
  for (const p of points ?? []) {
    const v = Number(String(p.valor).replace(',', '.'));
    if (p.data && Number.isFinite(v)) out[fromBr(p.data)] = v / 100;
  }
  return out;
}

/**
 * Último valor de uma série. Usa uma janela de datas recente: o endpoint
 * `/ultimos/N` do SGS responde "304 Not Modified" sem corpo para navegadores.
 */
async function latest(series: number, lookbackDays: number): Promise<{ data: ISODate; valor: number } | null> {
  const today = new Date();
  const to = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const pts = await getJson<SgsPoint[]>(
    `${BASE}.${series}/dados?formato=json&dataInicial=${toBr(addDays(to, -lookbackDays))}&dataFinal=${toBr(addDays(to, 60))}`,
  );
  const parsed = parseSgs(pts);
  const data = Object.keys(parsed).sort().pop();
  return data ? { data, valor: parsed[data] } : null;
}

/** Série diária entre datas, em janelas de até ~9 anos. */
async function dailyRange(series: number, from: ISODate, to: ISODate): Promise<Record<ISODate, number>> {
  const out: Record<ISODate, number> = {};
  let start = from;
  while (start <= to) {
    const endCandidate = addDays(start, 365 * 9);
    const end = endCandidate < to ? endCandidate : to;
    const pts = await getJson<SgsPoint[]>(`${BASE}.${series}/dados?formato=json&dataInicial=${toBr(start)}&dataFinal=${toBr(end)}`, {
      timeoutMs: 20_000,
    });
    Object.assign(out, parseSgs(pts));
    start = addDays(end, 1);
  }
  return out;
}

export interface CurrentRates {
  cdiAnual: number;
  selicMeta: number;
  ipca12m: number;
  referencia: ISODate;
}

export async function fetchCurrentRates(): Promise<CurrentRates> {
  // CDI e Selic: diários (janela de 30 dias); IPCA 12m: mensal, sai com ~1 mês de atraso
  const [cdi, selic, ipca] = await Promise.all([latest(4389, 30), latest(432, 120), latest(13522, 120)]);
  if (!cdi || !selic || !ipca) throw new Error('séries vazias');
  return { cdiAnual: cdi.valor, selicMeta: selic.valor, ipca12m: ipca.valor, referencia: cdi.data };
}

export async function fetchCdiDaily(from: ISODate, to: ISODate) {
  return dailyRange(12, from, to);
}

export async function fetchSelicDaily(from: ISODate, to: ISODate) {
  return dailyRange(11, from, to);
}

/** IPCA mensal (fração) por 'YYYY-MM'. */
export async function fetchIpcaMonthly(from: ISODate, to: ISODate): Promise<Record<YM, number>> {
  const pts = await getJson<SgsPoint[]>(`${BASE}.433/dados?formato=json&dataInicial=${toBr(from)}&dataFinal=${toBr(to)}`, {
    timeoutMs: 20_000,
  });
  const out: Record<YM, number> = {};
  for (const [iso, v] of Object.entries(parseSgs(pts))) out[ymOf(iso)] = v;
  return out;
}
