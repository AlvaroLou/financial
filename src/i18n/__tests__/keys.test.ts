import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import ptBR from '@/locales/pt-BR.json';

/** Chaves (com pontos) de um objeto aninhado. */
export function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}

const PLURAL = ['zero', 'one', 'two', 'few', 'many', 'other'];
const flat = flatten(ptBR as Record<string, unknown>);
const has = (key: string) => key in flat || PLURAL.some((p) => `${key}_${p}` in flat);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe('traduções pt-BR', () => {
  it('toda chave estática usada no código existe', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles(join(__dirname, '..', '..'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!has(m[1])) missing.add(`${m[1]}  (${file.split(/[\\/]src[\\/]/)[1]})`);
    }
    expect([...missing]).toEqual([]);
  });

  it('famílias de chaves dinâmicas estão completas', async () => {
    const { ASSET_TYPES, CLASS_ORDER } = await import('@/invest/catalog');
    const { CATEGORY_ICONS, GOAL_ICONS } = await import('@/lib/iconOptions');
    const { defaultCategories } = await import('@/data/defaults');
    const families: string[] = [
      ...Object.keys(ASSET_TYPES).flatMap((t) => [`invest.types.${t}`, `invest.typeHints.${t}`]),
      ...CLASS_ORDER.map((c) => `invest.classes.${c}`),
      ...['fixa', 'variavel', 'outros'].map((g) => `invest.groups.${g}`),
      ...['pre', 'cdi', 'cdi_spread', 'ipca', 'selic', 'poupanca'].flatMap((i) => [`invest.indexers.${i}`, `invest.form.rateHint.${i}`]),
      ...['compra', 'venda', 'aporte', 'resgate', 'provento', 'desdobramento', 'grupamento', 'bonificacao', 'taxa'].flatMap((o) => [
        `invest.op.${o}`,
        `invest.opHints.${o}`,
      ]),
      ...['dividendo', 'jcp', 'rendimento', 'juros', 'amortizacao', 'outro'].map((k) => `invest.income.${k}`),
      ...['auto', 'manual', 'average', 'none'].map((k) => `invest.detail.priceSource.${k}`),
      ...['acao', 'fii', 'etf', 'bdr'].map((k) => `invest.form.tickerPlaceholder.${k}`),
      ...['fixa', 'variavel', 'outros'].map((k) => `invest.form.namePlaceholder.${k}`),
      ...['rates', 'rebalance', 'simulator', 'tax', 'institutions'].flatMap((k) => [`invest.more.${k}`, `invest.more.${k}Hint`]),
      ...defaultCategories.map((c) => `categories.${c.id}`),
      ...[...CATEGORY_ICONS, ...GOAL_ICONS].map((i) => `icons.${i.key}`),
      ...['despesa', 'receita'].map((k) => `kind.${k}`),
      ...['fixo', 'variavel', 'fixoExpense', 'variavelExpense', 'fixoIncome', 'variavelIncome'].map((k) => `nature.${k}`),
      ...['credito', 'pix', 'debito', 'dinheiro', 'boleto'].map((k) => `payment.${k}`),
      ...['none', 'ok', 'warn', 'over'].map((k) => `limit.${k}`),
      ...['orcamento', 'investimentos'].map((k) => `mode.${k}`),
      ...['light', 'dark', 'auto'].map((k) => `appearance.${k}`),
      ...['todos', 'fixos', 'variaveis', 'parcelados', 'recorrentes', 'avista'].map((k) => `statement.groups.${k}`),
      ...['f1', 'f2', 'f3'].flatMap((k) => [`welcome.${k}Title`, `welcome.${k}Text`]),
    ];
    expect(families.filter((k) => !has(k))).toEqual([]);
  });
});
