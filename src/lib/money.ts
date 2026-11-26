/**
 * Valores monetários sempre em CENTAVOS (inteiros) e sempre em reais (BRL).
 * A formatação (separadores, posição do "R$") segue o idioma escolhido, com
 * tabelas próprias — não depende do `Intl` do aparelho. O idioma é aplicado
 * por `setMoneyLocale` (chamado pelo i18n ao trocar de idioma).
 */

const NBSP = ' ';
const NNBSP = ' ';

interface MoneyFormat {
  dec: string;
  group: string;
  /** "1.234,56 R$" em vez de "R$ 1.234,56" */
  symbolAfter: boolean;
  /** entre o símbolo e o número */
  space: string;
  /** entre o número e "%" */
  pctSpace: string;
  spoken: (reais: string, nReais: number, centavos: number) => string;
}

const ptSpoken = (r: string, n: number, c: number) => {
  const reais = `${r} ${n === 1 ? 'real' : 'reais'}`;
  return c === 0 ? reais : `${reais} e ${c} ${c === 1 ? 'centavo' : 'centavos'}`;
};

/** plural russo: 1 реал, 2 реала, 5 реалов */
const ruPlural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

const FORMATS: Record<string, MoneyFormat> = {
  'pt-BR': { dec: ',', group: '.', symbolAfter: false, space: ' ', pctSpace: '', spoken: ptSpoken },
  en: {
    dec: '.',
    group: ',',
    symbolAfter: false,
    space: '',
    pctSpace: '',
    spoken: (r, n, c) => `${r} ${n === 1 ? 'real' : 'reais'}${c ? ` and ${c} ${c === 1 ? 'cent' : 'cents'}` : ''}`,
  },
  es: {
    dec: ',',
    group: '.',
    symbolAfter: true,
    space: NBSP,
    pctSpace: NBSP,
    spoken: (r, n, c) => `${r} ${n === 1 ? 'real' : 'reales'}${c ? ` y ${c} ${c === 1 ? 'centavo' : 'centavos'}` : ''}`,
  },
  fr: {
    dec: ',',
    group: NNBSP,
    symbolAfter: true,
    space: NBSP,
    pctSpace: NNBSP,
    spoken: (r, n, c) => `${r} ${n <= 1 ? 'réal' : 'réaux'}${c ? ` et ${c} ${c === 1 ? 'centime' : 'centimes'}` : ''}`,
  },
  de: {
    dec: ',',
    group: '.',
    symbolAfter: true,
    space: NBSP,
    pctSpace: NBSP,
    spoken: (r, n, c) => `${r} ${n === 1 ? 'Real' : 'Reais'}${c ? ` und ${c} ${c === 1 ? 'Centavo' : 'Centavos'}` : ''}`,
  },
  it: {
    dec: ',',
    group: '.',
    symbolAfter: true,
    space: NBSP,
    pctSpace: '',
    spoken: (r, n, c) => `${r} ${n === 1 ? 'real' : 'reais'}${c ? ` e ${c} ${c === 1 ? 'centesimo' : 'centesimi'}` : ''}`,
  },
  ru: {
    dec: ',',
    group: NBSP,
    symbolAfter: true,
    space: NBSP,
    pctSpace: NBSP,
    spoken: (r, n, c) => `${r} ${ruPlural(n, 'реал', 'реала', 'реалов')}${c ? ` ${c} сентаво` : ''}`,
  },
  'zh-CN': { dec: '.', group: ',', symbolAfter: false, space: '', pctSpace: '', spoken: (r, _n, c) => `${r}雷亚尔${c ? `${c}分` : ''}` },
  ja: { dec: '.', group: ',', symbolAfter: false, space: '', pctSpace: '', spoken: (r, _n, c) => `${r}レアル${c ? `${c}センターボ` : ''}` },
  ko: { dec: '.', group: ',', symbolAfter: false, space: '', pctSpace: '', spoken: (r, _n, c) => `${r}헤알${c ? ` ${c}센타부` : ''}` },
};

let fmt: MoneyFormat = FORMATS['pt-BR'];
let currentLocale = 'pt-BR';

/** Define o idioma da formatação (códigos de i18n/languages.ts; desconhecido = pt-BR). */
export function setMoneyLocale(locale: string) {
  currentLocale = FORMATS[locale] ? locale : 'pt-BR';
  fmt = FORMATS[currentLocale];
}

export const moneyLocale = () => currentLocale;

function group(int: number): string {
  return String(int).replace(/\B(?=(\d{3})+(?!\d))/g, fmt.group);
}

/** 123456 -> "1.234,56" (pt-BR) / "1,234.56" (en) */
export function formatNumber(cents: number, forceDecimals = true): string {
  const abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100);
  const dec = abs % 100;
  if (!forceDecimals && dec === 0) return group(int);
  return `${group(int)}${fmt.dec}${String(dec).padStart(2, '0')}`;
}

/**
 * Número decimal qualquer (quantidades, taxas): até `maxDecimals` casas, sem
 * zeros à direita além de `minDecimals`. 1234.5 -> "1.234,5"
 */
export function formatDecimal(value: number, maxDecimals = 2, minDecimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value < 0 ? '-' : '';
  const fixed = Math.abs(value).toFixed(maxDecimals);
  let [int, dec = ''] = fixed.split('.');
  dec = dec.replace(/0+$/, '');
  while (dec.length < minDecimals) dec += '0';
  const intFmt = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, fmt.group);
  return `${sign}${intFmt}${dec ? fmt.dec + dec : ''}`;
}

const withSymbol = (num: string) => (fmt.symbolAfter ? `${num}${fmt.space}R$` : `R$${fmt.space}${num}`);

/** 123456 -> "R$ 1.234,56" */
export function brl(cents: number): string {
  return `${cents < 0 ? '-' : ''}${withSymbol(formatNumber(cents))}`;
}

/** 324000 -> "R$ 3.240" (omite ",00" quando o valor é redondo) */
export function brlShort(cents: number): string {
  return `${cents < 0 ? '-' : ''}${withSymbol(formatNumber(cents, false))}`;
}

/** Com sinal tipográfico: "− R$ 240,00" / "+ R$ 1.500,00" */
export function brlSigned(cents: number, kind: 'despesa' | 'receita'): string {
  return `${kind === 'despesa' ? '−' : '+'} ${withSymbol(formatNumber(cents))}`;
}

/** Variação com sinal (positivo = "+"): 12345 -> "+ R$ 123,45"; -500 -> "− R$ 5,00" */
export function brlDelta(cents: number): string {
  if (Math.round(cents) === 0) return withSymbol(formatNumber(0));
  return brlSigned(Math.abs(cents), cents < 0 ? 'despesa' : 'receita');
}

/** Valor compacto para eixos de gráficos (sem "R$"): 125_000_000 -> "1,3M", 450_000 -> "4,5k" */
export function compactNumber(cents: number): string {
  const v = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (v >= 1_000_000) return `${sign}${formatDecimal(v / 1_000_000, 1)}M`;
  if (v >= 1_000) return `${sign}${formatDecimal(v / 1_000, 1)}k`;
  return `${sign}${formatDecimal(v, 0)}`;
}

/** 0.5556 -> "55,6%" */
export function percent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits).replace('.', fmt.dec)}${fmt.pctSpace}%`;
}

/** Percentual com sinal: 0.0123 -> "+1,23%" */
export function percentSigned(ratio: number, digits = 2): string {
  if (!Number.isFinite(ratio)) return '—';
  const p = percent(Math.abs(ratio), digits);
  if (Number((ratio * 100).toFixed(digits)) === 0) return p;
  return `${ratio < 0 ? '−' : '+'}${p}`;
}

/** Máscara de entrada estilo banco: só dígitos, últimos 2 = centavos. */
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  return digits === '' ? 0 : parseInt(digits, 10);
}

/** Texto exibido no campo de valor (sem "R$"): 240000 -> "2.400,00" */
export function centsToInput(cents: number): string {
  return formatNumber(cents);
}

/**
 * Lê um número digitado livremente ("1.234,5", "1234.5", "0,00012"): o último
 * "," ou "." é o separador decimal. Devolve NaN se não houver número.
 */
export function parseDecimal(text: string): number {
  const clean = text.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(clean)) return NaN;
  const lastSep = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'));
  if (lastSep === -1) return Number(clean);
  const int = clean.slice(0, lastSep).replace(/[.,]/g, '');
  const dec = clean.slice(lastSep + 1).replace(/[.,]/g, '');
  return Number(`${int || '0'}.${dec || '0'}`);
}

/** Para leitores de tela: 123456 -> "1.234 reais e 56 centavos" */
export function spokenBrl(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  return fmt.spoken(group(reais), reais, centavos);
}
