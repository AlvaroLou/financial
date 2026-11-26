import { describe, expect, it } from 'vitest';

import {
  ACCENT_PRESETS,
  buildColors,
  contrastRatio,
  DEFAULT_ACCENTS,
  ensureContrast,
  hexToRgb,
  hslToHex,
  mix,
  normalizeHex,
  readableOn,
  rgbToHsl,
  type ThemeBase,
} from '@/theme/palette';

/** cores da grade + algumas "difíceis" que o usuário pode escolher no seletor livre */
const ACCENTS = [...ACCENT_PRESETS, '#FFFF00', '#00FFFF', '#FFFFFF', '#000000', '#FF00FF', '#7FFF00', '#808080'];
const BASES: ThemeBase[] = ['light', 'dark'];

/** [texto, fundo, contraste mínimo] */
const PAIRS: [keyof ReturnType<typeof buildColors>, keyof ReturnType<typeof buildColors>, number][] = [
  ['ink', 'bg', 7],
  ['ink', 'surface', 7],
  ['ink2', 'bg', 4.5],
  ['ink2', 'surface', 4.5],
  ['primary', 'bg', 4.5],
  ['primary', 'surface', 4.5],
  ['primary', 'tint', 4.5],
  ['onAccent', 'accent', 4.5],
  ['onAccentSoft', 'accentSoft', 4.5],
  ['tagText', 'tag', 4.5],
  ['onHero', 'hero', 7],
  ['onHeroMuted', 'hero', 4.5],
  ['incomeOnHero', 'hero', 4.5],
  ['expenseOnHero', 'hero', 4.5],
  ['onHighlight', 'highlight', 4.5],
  ['income', 'surface', 4.5],
  ['expense', 'surface', 4.5],
  ['expense', 'expenseTint', 4.5],
  ['installmentText', 'installmentTint', 4.5],
  ['installmentText', 'surface', 4.5],
  ['onInverse', 'inverse', 4.5],
  ['inverseAction', 'inverse', 4.5],
];

describe('conversões de cor', () => {
  it('normaliza hex', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('21644c')).toBe('#21644C');
    expect(normalizeHex('xyz')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });

  it('ida e volta HSL', () => {
    for (const hex of ACCENT_PRESETS) {
      const { h, s, l } = rgbToHsl(hex);
      const back = hexToRgb(hslToHex(h, s, l));
      const orig = hexToRgb(hex);
      expect(Math.abs(back.r - orig.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - orig.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - orig.b)).toBeLessThanOrEqual(1);
    }
  });

  it('contraste WCAG', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(readableOn('#FFFF00')).toBe('#111A17');
    expect(readableOn('#21644C')).toBe('#FFFFFF');
    const fixed = ensureContrast('#FFD400', '#FFFFFF', 4.5);
    expect(contrastRatio(fixed, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('paleta', () => {
  it('o verde padrão continua igual ao layout original no modo claro', () => {
    const c = buildColors(DEFAULT_ACCENTS.orcamento, 'light');
    expect(c.primary).toBe('#21644C');
    expect(c.accent).toBe('#21644C');
    expect(c.onAccent).toBe('#FFFFFF');
    expect(c.highlight).toBe('#D7F58B');
  });

  for (const base of BASES) {
    for (const accent of ACCENTS) {
      it(`${base} · ${accent}: pares texto/fundo legíveis`, () => {
        const c = buildColors(accent, base);
        for (const [fg, bg, min] of PAIRS) {
          const ratio = contrastRatio(c[fg] as string, c[bg] as string);
          expect(ratio, `${fg} sobre ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
        }
      });
    }
  }

  it('cor inválida cai no padrão', () => {
    expect(buildColors('não é cor', 'light').primary).toBe('#21644C');
  });
});
