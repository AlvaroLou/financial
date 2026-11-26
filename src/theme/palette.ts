/**
 * Paleta dinâmica: tudo é derivado de UMA cor de destaque (por app) e da base
 * (clara/escura). Funções puras — testadas em theme/__tests__/palette.test.ts,
 * que confere o contraste dos pares texto/fundo em todas as cores da grade.
 */

export type ThemeBase = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type AppId = 'orcamento' | 'investimentos';

/** Cores padrão de cada app. */
export const DEFAULT_ACCENTS: Record<AppId, string> = {
  orcamento: '#21644C', // verde-floresta (layout original)
  investimentos: '#1F5FAD', // azul
};

/** Grade de cores do seletor (os dois padrões primeiro). */
export const ACCENT_PRESETS = [
  '#21644C',
  '#1F5FAD',
  '#0E7C86',
  '#2E7D32',
  '#6E8B1E',
  '#5B3FD0',
  '#8E3FB8',
  '#C2185B',
  '#D2412E',
  '#E36414',
  '#E9B10A',
  '#00897B',
  '#3D5A80',
  '#37474F',
] as const;

/** Destaques escolhidos à mão para algumas cores (o resto é derivado). */
const HIGHLIGHT_OVERRIDES: Record<string, string> = {
  '#21644C': '#D7F58B', // lima do layout original
};

/* ------------------------------------------------------------------ conversões */

interface RGB {
  r: number;
  g: number;
  b: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Aceita "#rgb" ou "#rrggbb"; devolve null se não for uma cor válida. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toUpperCase()}` : null;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt((normalizeHex(hex) ?? '#000000').slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Mistura `a` com `b` (t = peso de `b`, 0..1). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export const darken = (hex: string, amount: number) => mix(hex, '#000000', amount);
export const lighten = (hex: string, amount: number) => mix(hex, '#FFFFFF', amount);

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function rgbToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number];
  if (hh < 60) rgb = [c, x, 0];
  else if (hh < 120) rgb = [x, c, 0];
  else if (hh < 180) rgb = [0, c, x];
  else if (hh < 240) rgb = [0, x, c];
  else if (hh < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgbToHex({ r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 });
}

/* ------------------------------------------------------------------ contraste (WCAG) */

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Ajusta `fg` (escurecendo ou clareando, o que der mais contraste) até atingir
 * `ratio` contra TODOS os fundos de `bgs`.
 */
export function ensureContrast(fg: string, bgs: string | string[], ratio: number): string {
  const list = Array.isArray(bgs) ? bgs : [bgs];
  const ok = (c: string) => list.every((bg) => contrastRatio(c, bg) >= ratio);
  if (ok(fg)) return normalizeHex(fg) ?? fg;
  // direção: rumo ao extremo que mais contrasta com o fundo "médio"
  const avgLum = list.reduce((acc, bg) => acc + luminance(bg), 0) / list.length;
  const towards = avgLum > 0.179 ? '#000000' : '#FFFFFF';
  for (let i = 1; i <= 40; i++) {
    const c = mix(fg, towards, i / 40);
    if (ok(c)) return c;
  }
  return towards;
}

/** Texto escuro ou branco — o que tiver mais contraste com `bg`. */
export function readableOn(bg: string, dark = '#111A17', light = '#FFFFFF'): string {
  return contrastRatio(dark, bg) >= contrastRatio(light, bg) ? dark : light;
}

/* ------------------------------------------------------------------ paleta */

/** Monta todas as cores do app a partir da cor de destaque e da base. */
export function buildColors(accentInput: string, base: ThemeBase) {
  const raw = normalizeHex(accentInput) ?? DEFAULT_ACCENTS.orcamento;
  const light = base === 'light';
  const { h, s } = rgbToHsl(raw);

  // neutros, levemente tingidos pelo destaque
  const bg = light ? mix('#F9FAF9', raw, 0.02) : mix('#0D100F', raw, 0.05);
  const surface = light ? '#FFFFFF' : mix('#161A19', raw, 0.06);
  const raised = light ? '#FFFFFF' : mix('#252B29', raw, 0.06);
  const ink = light ? mix('#14201C', raw, 0.15) : mix('#EDF1EF', raw, 0.04);
  const ink2 = ensureContrast(light ? mix('#5A6661', raw, 0.08) : mix('#A4AEAA', raw, 0.06), [bg, surface], 4.6);

  const tint = light ? mix('#FFFFFF', raw, 0.1) : mix(surface, raw, 0.22);
  const tag = light ? mix('#FFFFFF', raw, 0.13) : mix(surface, raw, 0.26);
  const segment = light ? mix('#ECEFEC', raw, 0.05) : mix('#1F2422', raw, 0.06);
  const line = light ? mix('#E8ECE8', raw, 0.04) : mix('#262C2A', raw, 0.05);
  const border = light ? mix('#EDF0ED', raw, 0.04) : mix('#232927', raw, 0.05);
  const outline = light ? mix('#D6DCD7', raw, 0.06) : mix('#3A423F', raw, 0.08);
  const track = light ? mix('#E9EDE9', raw, 0.06) : mix('#2A302E', raw, 0.08);

  // destaque: preenchimentos (botões, FAB, interruptores) e versão para texto/ícones
  let accent = light ? raw : ensureContrast(raw, bg, 3);
  const onAccent = readableOn(accent);
  // tons médios (nem preto nem branco chegam a 4,5:1): ajusta o preenchimento
  if (contrastRatio(onAccent, accent) < 4.6) accent = ensureContrast(accent, onAccent, 4.6);
  const primary = ensureContrast(raw, [bg, surface, tint], 4.6);
  const accentSoft = light ? mix('#FFFFFF', raw, 0.17) : mix(surface, raw, 0.32);
  const onAccentSoft = ensureContrast(primary, accentSoft, 4.6);
  const tagText = ensureContrast(light ? darken(raw, 0.12) : lighten(raw, 0.45), tag, 4.6);

  // cartão de destaque ("herói": saldo, boas-vindas) — escuro nas duas bases
  const hero = ensureContrast(darken(raw, 0.35), '#FFFFFF', 8.5);
  const onHero = '#FFFFFF';
  const onHeroMuted = ensureContrast(mix('#FFFFFF', raw, 0.28), hero, 4.6);
  const highlight = HIGHLIGHT_OVERRIDES[raw] ?? hslToHex(h, clamp(s + 0.3, 0.3, 0.85), 0.8);
  const onHighlight = ensureContrast(hero, highlight, 4.6);

  // semântica financeira
  const income = light ? '#21644C' : '#5BC394';
  const expense = light ? '#B3362B' : '#FF8F80';
  const installment = light ? '#C77A0A' : '#E8A33C';

  // superfície invertida (snackbar)
  const inverse = light ? hero : mix('#FFFFFF', raw, 0.1);
  const onInverse = light ? '#FFFFFF' : '#111A17';
  const inverseAction = light ? ensureContrast(highlight, inverse, 4.6) : ensureContrast(darken(raw, 0.2), inverse, 4.6);

  return {
    base,
    bg,
    surface,
    raised,
    tint,
    tag,
    tagText,
    pill: tag,
    segment,
    segmentActive: raised,
    line,
    border,
    outline,
    track,

    ink,
    ink2,

    accent,
    onAccent,
    primary,
    accentSoft,
    onAccentSoft,
    /** segunda série dos gráficos (ex.: variáveis × fixos) */
    accentAlt: light ? mix(raw, '#FFFFFF', 0.45) : mix(raw, '#FFFFFF', 0.55),
    /** primeira série (fixos) — precisa aparecer sobre o fundo nas duas bases */
    seriesStrong: light ? hero : accent,

    hero,
    onHero,
    onHeroMuted,
    heroPanel: 'rgba(255,255,255,0.08)',
    heroPanelStrong: 'rgba(255,255,255,0.12)',
    highlight,
    onHighlight,
    incomeOnHero: '#D7F58B',
    expenseOnHero: '#FFB4A8',

    income,
    incomeTint: light ? '#E4F1EA' : mix(surface, income, 0.16),
    expense,
    expenseTint: light ? '#FAEEEA' : mix(surface, expense, 0.16),
    expenseFill: '#E4685A',
    installment,
    installmentTint: light ? '#FCEFD0' : mix(surface, installment, 0.18),
    installmentText: light ? '#7A4A00' : '#F5C67E',

    inverse,
    onInverse,
    inverseAction,

    switchThumb: light ? '#FFFFFF' : '#E9EDEB',
    overlay: light ? rgba(ink, 0.34) : 'rgba(0, 0, 0, 0.6)',
    shadow: light ? ink : '#000000',
  };
}

export type ThemeColors = ReturnType<typeof buildColors>;
