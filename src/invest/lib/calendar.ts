/**
 * Dias úteis do mercado financeiro brasileiro (calendário nacional da ANBIMA):
 * fins de semana e feriados nacionais, incluindo Carnaval (seg e ter), Sexta-feira
 * Santa, Corpus Christi e Consciência Negra (20/11, nacional desde 2024).
 * Base 252 dias úteis por ano.
 */
import { addDays, parseISO, toISO } from '@/lib/dates';
import type { ISODate } from '@/types';

export const BUSINESS_DAYS_PER_YEAR = 252;

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function easter(year: number): ISODate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(year, month, day);
}

const holidayCache = new Map<number, Set<ISODate>>();

/** Feriados nacionais do ano (que caem em dia de semana ou não). */
export function holidays(year: number): Set<ISODate> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const e = easter(year);
  const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
  if (year >= 2024) fixed.push('11-20');
  const set = new Set<ISODate>([
    ...fixed.map((md) => `${year}-${md}`),
    addDays(e, -48), // Carnaval (segunda)
    addDays(e, -47), // Carnaval (terça)
    addDays(e, -2), // Sexta-feira Santa
    addDays(e, 60), // Corpus Christi
  ]);
  holidayCache.set(year, set);
  return set;
}

export function isWeekend(iso: ISODate): boolean {
  const { y, m, d } = parseISO(iso);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isBusinessDay(iso: ISODate): boolean {
  return !isWeekend(iso) && !holidays(parseISO(iso).y).has(iso);
}

/**
 * Dias úteis entre `start` (inclusive) e `end` (exclusive) — a contagem usada
 * na renda fixa (da aplicação até o resgate/vencimento).
 */
export function businessDaysBetween(start: ISODate, end: ISODate): number {
  if (end <= start) return 0;
  let n = 0;
  for (let d = start; d < end; d = addDays(d, 1)) if (isBusinessDay(d)) n++;
  return n;
}

const monthCache = new Map<string, number>();

/** Dias úteis do mês 'YYYY-MM'. */
export function businessDaysInMonth(ym: string): number {
  const cached = monthCache.get(ym);
  if (cached !== undefined) return cached;
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= last; d++) if (isBusinessDay(toISO(y, m, d))) n++;
  monthCache.set(ym, n);
  return n;
}

/** Próximo dia útil a partir de `iso` (inclusive). */
export function nextBusinessDay(iso: ISODate): ISODate {
  let d = iso;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** Último dia útil do mês (vencimento do DARF). */
export function lastBusinessDayOfMonth(year: number, month: number): ISODate {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let d = toISO(year, month, last);
  while (!isBusinessDay(d)) d = addDays(d, -1);
  return d;
}
