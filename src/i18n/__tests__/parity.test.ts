import { describe, expect, it } from 'vitest';

import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import itLocale from '@/locales/it.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import ptBR from '@/locales/pt-BR.json';
import ru from '@/locales/ru.json';
import zhCN from '@/locales/zh-CN.json';

import { flatten } from './keys.test';

const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (k: string) => k.replace(PLURAL, '');
const placeholders = (s: string) => new Set([...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]));

/** base -> { variantes, placeholders } */
function index(locale: Record<string, unknown>) {
  const out = new Map<string, { variants: Set<string>; values: Record<string, string> }>();
  for (const [k, v] of Object.entries(flatten(locale))) {
    const b = base(k);
    const e = out.get(b) ?? { variants: new Set<string>(), values: {} };
    e.variants.add(PLURAL.test(k) ? k.slice(b.length + 1) : '');
    e.values[k] = v;
    out.set(b, e);
  }
  return out;
}

const reference = index(ptBR as Record<string, unknown>);
const LOCALES: Record<string, Record<string, unknown>> = { en, es, fr, de, it: itLocale, ru, 'zh-CN': zhCN, ja, ko };
/** formas de plural exigidas por idioma (além de _other) */
const REQUIRED: Record<string, string[]> = {
  en: ['one'],
  es: ['one'],
  fr: ['one'],
  de: ['one'],
  it: ['one'],
  ru: ['one', 'few', 'many'],
  'zh-CN': [],
  ja: [],
  ko: [],
};

describe.each(Object.keys(LOCALES))('tradução %s', (code) => {
  const target = index(LOCALES[code]);

  it('tem exatamente as mesmas chaves que o pt-BR', () => {
    const missing = [...reference.keys()].filter((k) => !target.has(k));
    const extra = [...target.keys()].filter((k) => !reference.has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('plurais com as formas do idioma', () => {
    const problems: string[] = [];
    for (const [k, ref] of reference) {
      const isPlural = [...ref.variants].some((v) => v !== '');
      const t = target.get(k);
      if (!t || !isPlural) continue;
      for (const form of ['other', ...REQUIRED[code]]) if (!t.variants.has(form)) problems.push(`${k}_${form}`);
    }
    expect(problems).toEqual([]);
  });

  it('mantém os mesmos {{placeholders}} e nenhum texto vazio', () => {
    const problems: string[] = [];
    for (const [k, ref] of reference) {
      const t = target.get(k);
      if (!t) continue;
      const refPh = new Set(Object.values(ref.values).flatMap((v) => [...placeholders(v)]));
      for (const [key, value] of Object.entries(t.values)) {
        const ph = placeholders(value);
        const unknown = [...ph].filter((p) => !refPh.has(p));
        if (unknown.length) problems.push(`${key}: placeholder desconhecido ${unknown.join(',')}`);
        const isPluralKey = PLURAL.test(key);
        if (!isPluralKey) {
          const missing = [...refPh].filter((p) => !ph.has(p));
          if (missing.length) problems.push(`${key}: faltou ${missing.join(',')}`);
        }
        const refValue = ref.values[k] ?? Object.values(ref.values)[0];
        if (value.trim() === '' && refValue.trim() !== '') problems.push(`${key}: vazio`);
      }
    }
    expect(problems).toEqual([]);
  });
});
