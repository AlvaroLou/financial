import type { ISODate, YM } from '@/types';

/**
 * Datas como texto 'YYYY-MM-DD' / 'YYYY-MM' (sem fuso). Os nomes de mês e os
 * formatos seguem o idioma escolhido (`setDateLocale`, chamado pelo i18n).
 */

interface DateLocale {
  /** nomes completos (forma usada em títulos) */
  months: string[];
  /** forma usada depois do dia ("25 de novembro"; em russo é o genitivo) */
  monthsOfDay?: string[];
  monthsShort: string[];
  /** em frases o mês fica minúsculo (pt, es, fr, it, ru) */
  lowerInSentence: boolean;
  /** título do mês: "Novembro 2026" */
  monthYear: (month: string, y: number, m: number) => string;
  /** mês em frase de outro ano: "dezembro de 2025" */
  monthOfYear: (month: string, y: number, m: number) => string;
  /** "25 de novembro" */
  dayMonth: (d: number, month: string, m: number) => string;
  /** "25 nov." */
  shortDay: (d: number, short: string, m: number) => string;
  date: (y: number, m: number, d: number) => string;
  today: string;
  yesterday: string;
  cjk?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const LOCALES: Record<string, DateLocale> = {
  'pt-BR': {
    months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    monthsShort: ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'],
    lowerInSentence: true,
    monthYear: (mo, y) => `${cap(mo)} ${y}`,
    monthOfYear: (mo, y) => `${mo} de ${y}`,
    dayMonth: (d, mo) => `${pad(d)} de ${mo}`,
    shortDay: (d, s) => `${pad(d)} ${s}`,
    date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
    today: 'Hoje',
    yesterday: 'Ontem',
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    lowerInSentence: false,
    monthYear: (mo, y) => `${mo} ${y}`,
    monthOfYear: (mo, y) => `${mo} ${y}`,
    dayMonth: (d, mo) => `${mo} ${d}`,
    shortDay: (d, s) => `${s} ${d}`,
    date: (y, m, d) => `${pad(m)}/${pad(d)}/${y}`,
    today: 'Today',
    yesterday: 'Yesterday',
  },
  es: {
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
    lowerInSentence: true,
    monthYear: (mo, y) => `${cap(mo)} de ${y}`,
    monthOfYear: (mo, y) => `${mo} de ${y}`,
    dayMonth: (d, mo) => `${d} de ${mo}`,
    shortDay: (d, s) => `${d} ${s}`,
    date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
    today: 'Hoy',
    yesterday: 'Ayer',
  },
  fr: {
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    monthsShort: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
    lowerInSentence: true,
    monthYear: (mo, y) => `${cap(mo)} ${y}`,
    monthOfYear: (mo, y) => `${mo} ${y}`,
    dayMonth: (d, mo) => `${d} ${mo}`,
    shortDay: (d, s) => `${d} ${s}`,
    date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
    today: "Aujourd'hui",
    yesterday: 'Hier',
  },
  de: {
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    monthsShort: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
    lowerInSentence: false,
    monthYear: (mo, y) => `${mo} ${y}`,
    monthOfYear: (mo, y) => `${mo} ${y}`,
    dayMonth: (d, mo) => `${d}. ${mo}`,
    shortDay: (d, s) => `${d}. ${s}`,
    date: (y, m, d) => `${pad(d)}.${pad(m)}.${y}`,
    today: 'Heute',
    yesterday: 'Gestern',
  },
  it: {
    months: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    monthsShort: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
    lowerInSentence: true,
    monthYear: (mo, y) => `${cap(mo)} ${y}`,
    monthOfYear: (mo, y) => `${mo} ${y}`,
    dayMonth: (d, mo) => `${d} ${mo}`,
    shortDay: (d, s) => `${d} ${s}`,
    date: (y, m, d) => `${pad(d)}/${pad(m)}/${y}`,
    today: 'Oggi',
    yesterday: 'Ieri',
  },
  ru: {
    months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    monthsOfDay: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    monthsShort: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
    lowerInSentence: true,
    monthYear: (mo, y) => `${cap(mo)} ${y}`,
    monthOfYear: (mo, y) => `${mo} ${y}`,
    dayMonth: (d, mo) => `${d} ${mo}`,
    shortDay: (d, s) => `${d} ${s}`,
    date: (y, m, d) => `${pad(d)}.${pad(m)}.${y}`,
    today: 'Сегодня',
    yesterday: 'Вчера',
  },
  'zh-CN': {
    months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    monthsShort: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    lowerInSentence: false,
    monthYear: (_mo, y, m) => `${y}年${m}月`,
    monthOfYear: (_mo, y, m) => `${y}年${m}月`,
    dayMonth: (d, _mo, m) => `${m}月${d}日`,
    shortDay: (d, _s, m) => `${m}月${d}日`,
    date: (y, m, d) => `${y}/${pad(m)}/${pad(d)}`,
    today: '今天',
    yesterday: '昨天',
    cjk: true,
  },
  ja: {
    months: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    monthsShort: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
    lowerInSentence: false,
    monthYear: (_mo, y, m) => `${y}年${m}月`,
    monthOfYear: (_mo, y, m) => `${y}年${m}月`,
    dayMonth: (d, _mo, m) => `${m}月${d}日`,
    shortDay: (d, _s, m) => `${m}月${d}日`,
    date: (y, m, d) => `${y}/${pad(m)}/${pad(d)}`,
    today: '今日',
    yesterday: '昨日',
    cjk: true,
  },
  ko: {
    months: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
    monthsShort: Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
    lowerInSentence: false,
    monthYear: (_mo, y, m) => `${y}년 ${m}월`,
    monthOfYear: (_mo, y, m) => `${y}년 ${m}월`,
    dayMonth: (d, _mo, m) => `${m}월 ${d}일`,
    shortDay: (d, _s, m) => `${m}월 ${d}일`,
    date: (y, m, d) => `${y}. ${pad(m)}. ${pad(d)}.`,
    today: '오늘',
    yesterday: '어제',
    cjk: true,
  },
};

let loc: DateLocale = LOCALES['pt-BR'];

/** Define o idioma das datas (códigos de i18n/languages.ts; desconhecido = pt-BR). */
export function setDateLocale(locale: string) {
  loc = LOCALES[locale] ?? LOCALES['pt-BR'];
}

/* ------------------------------------------------------------------ aritmética */

export function parseISO(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export const toISO = (y: number, m: number, d: number): ISODate => `${y}-${pad(m)}-${pad(d)}`;

export const ymOf = (iso: ISODate): YM => iso.slice(0, 7);

/** Número sequencial de meses (para diferenças entre meses). */
export function monthIndex(ym: YM): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function addMonths(ym: YM, n: number): YM {
  const idx = monthIndex(ym) + n;
  const y = Math.floor(idx / 12);
  return `${y}-${pad((idx % 12) + 1)}`;
}

export function daysInMonth(ym: YM): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Desloca uma data em `n` meses mantendo o dia (limitado ao fim do mês):
 * shiftMonths("2026-01-31", 1) -> "2026-02-28".
 */
export function shiftMonths(iso: ISODate, n: number): ISODate {
  if (n === 0) return iso;
  const ym = addMonths(ymOf(iso), n);
  const [y, m] = ym.split('-').map(Number);
  return toISO(y, m, Math.min(parseISO(iso).d, daysInMonth(ym)));
}

export function dateToISO(date: Date): ISODate {
  return toISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Meio-dia local evita problemas de fuso/horário de verão. */
export function isoToDate(iso: ISODate): Date {
  const { y, m, d } = parseISO(iso);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function diffDays(fromIso: ISODate, toIso: ISODate): number {
  return Math.round((isoToDate(toIso).getTime() - isoToDate(fromIso).getTime()) / 86_400_000);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
}

/** Meses (YM) de um ano: '2026' -> ['2026-01', …, '2026-12'] */
export const monthsOfYear = (year: number): YM[] => Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);

/* ------------------------------------------------------------------ rótulos */

const ymParts = (ym: YM) => {
  const [y, m] = ym.split('-').map(Number);
  return { y, m };
};

/** "2026-11" -> "Novembro 2026" */
export function monthLabel(ym: YM): string {
  const { y, m } = ymParts(ym);
  return loc.monthYear(loc.months[m - 1], y, m);
}

/** "2026-11" -> "novembro" (ou "novembro de 2025" se o ano for diferente de `refYm`) */
export function monthName(ym: YM, refYm?: YM): string {
  const { y, m } = ymParts(ym);
  const name = loc.lowerInSentence ? loc.months[m - 1].toLowerCase() : loc.months[m - 1];
  return refYm && refYm.slice(0, 4) !== ym.slice(0, 4) ? loc.monthOfYear(name, y, m) : name;
}

/** "2026-11" -> "Nov" (curto, p/ eixos de gráficos) */
export function monthAbbr(ym: YM): string {
  const { m } = ymParts(ym);
  const s = loc.monthsShort[m - 1];
  if (loc.cjk) return s;
  return cap(s.replace(/\.$/, '')).slice(0, 4).replace(/\.$/, '');
}

/** "2026-11-25" -> "25 nov." */
export function shortDay(iso: ISODate): string {
  const { m, d } = parseISO(iso);
  return loc.shortDay(d, loc.monthsShort[m - 1], m);
}

/** "2026-11-25" -> "25/11/2026" */
export function displayDate(iso: ISODate): string {
  const { y, m, d } = parseISO(iso);
  return loc.date(y, m, d);
}

/** "2026-11-25" -> "25 de novembro" */
export function dayMonth(iso: ISODate): string {
  const { m, d } = parseISO(iso);
  const names = loc.monthsOfDay ?? loc.months;
  const name = loc.lowerInSentence ? names[m - 1].toLowerCase() : names[m - 1];
  return loc.dayMonth(d, name, m);
}

/** Cabeçalho de grupo do extrato: "Hoje, 25 de novembro" / "Ontem, 24 de novembro" / "23 de novembro". */
export function groupLabel(iso: ISODate, todayIso: ISODate): string {
  const base = dayMonth(iso);
  const diff = diffDays(iso, todayIso);
  if (diff === 0) return `${loc.today}, ${base}`;
  if (diff === 1) return `${loc.yesterday}, ${base}`;
  return base;
}
