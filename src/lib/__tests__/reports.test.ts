import { describe, expect, it } from 'vitest';

import { categoryColorMap, OTHER_SERIES, SERIES } from '@/theme/tokens';
import { buildBudgetMonth, buildBudgetYear } from '@/lib/reports';
import { filterOccurrences, monthOccurrences, summarize } from '@/lib/finance';
import type { FinanceRecord } from '@/types';

const rec = (over: Partial<FinanceRecord>): FinanceRecord => ({
  id: Math.random().toString(36).slice(2),
  kind: 'despesa',
  nome: 'X',
  descricao: '',
  valorTotal: 10_000,
  natureza: 'variavel',
  forma: 'pix',
  data: '2026-03-10',
  categoriaId: 'alimentacao',
  parcelado: false,
  ...over,
});

const names = { alimentacao: 'Alimentação', cartao: 'Cartão', renda: 'Salário', moradia: 'Moradia' };

describe('etiquetas (categoria principal + "também em")', () => {
  const card = rec({ forma: 'credito', etiquetas: ['cartao'], valorTotal: 20_000 });
  const pix = rec({ valorTotal: 5_000 });

  it('o orçamento conta só a principal; a etiqueta soma à parte', () => {
    const s = summarize(monthOccurrences([card, pix], '2026-03'));
    expect(s.despesas).toBe(25_000);
    expect(s.porCategoria.alimentacao).toBe(25_000);
    expect(s.porCategoria.cartao).toBeUndefined();
    expect(s.porEtiqueta.cartao).toBe(20_000);
  });

  it('o filtro por categoria encontra principal ou etiqueta; a busca usa o nome da etiqueta', () => {
    const list = monthOccurrences([card, pix], '2026-03');
    const base = { query: '', group: 'todos' as const, forma: null, categories: {}, names };
    expect(filterOccurrences(list, { ...base, categoryId: 'cartao' })).toHaveLength(1);
    expect(filterOccurrences(list, { ...base, categoryId: 'alimentacao' })).toHaveLength(2);
    expect(filterOccurrences(list, { ...base, query: 'cartao' })).toHaveLength(1);
  });
});

describe('relatórios do Orçamento', () => {
  const records = [
    rec({ kind: 'receita', categoriaId: 'renda', valorTotal: 500_000, data: '2026-01-05', recorrente: true, natureza: 'fixo' }),
    rec({ categoriaId: 'moradia', valorTotal: 200_000, data: '2026-01-10', recorrente: true, natureza: 'fixo' }),
    rec({ valorTotal: 50_000, data: '2026-03-15', forma: 'credito', etiquetas: ['cartao'] }),
    rec({ kind: 'receita', categoriaId: 'renda', valorTotal: 300_000, data: '2025-06-05' }),
  ];

  it('mensal: totais, categorias, etiquetas e formas de pagamento', () => {
    const r = buildBudgetMonth(records, '2026-03', names);
    expect(r.summary).toMatchObject({ receitas: 500_000, despesas: 250_000, saldo: 250_000 });
    expect(r.despesasPorCategoria.map((c) => [c.nome, c.valor])).toEqual([
      ['Moradia', 200_000],
      ['Alimentação', 50_000],
    ]);
    expect(r.porEtiqueta).toEqual([{ id: 'cartao', nome: 'Cartão', valor: 50_000, pct: 0.2 }]);
    expect(r.porForma[0].forma).toBe('pix');
  });

  it('anual: mês a mês, acumulado, médias, taxa de poupança e ano anterior', () => {
    const r = buildBudgetYear(records, 2026, names);
    expect(r.mesesComDados).toBe(12);
    expect(r.totais.receitas).toBe(12 * 500_000);
    expect(r.totais.despesas).toBe(12 * 200_000 + 50_000);
    expect(r.meses[11].acumulado).toBe(r.totais.saldo);
    expect(r.media.despesas).toBe(Math.round(r.totais.despesas / 12));
    expect(r.taxaPoupanca).toBeCloseTo(r.totais.saldo / r.totais.receitas, 10);
    expect(r.maioresGastos[0].valor).toBe(200_000);
    expect(r.anoAnterior).toMatchObject({ receitas: 300_000, despesas: 0 });
  });
});

describe('cores dos gráficos', () => {
  it('a cor segue a categoria; passou de 8 séries, vira "Outros" (nunca repete cor)', () => {
    const cats = ['moradia', 'alimentacao', 'transporte', 'saude', 'lazer', 'cartao', 'outros', 'u1', 'u2', 'u3'].map((id) => ({ id }));
    const map = categoryColorMap(cats, 'light');
    expect(map.moradia).toBe(SERIES.light[0]);
    expect(map.outros).toBe(OTHER_SERIES.light);
    expect(map.u1).toBe(SERIES.light[6]);
    expect(map.u2).toBe(SERIES.light[7]);
    expect(map.u3).toBe(OTHER_SERIES.light);
    const colored = Object.values(map).filter((c) => c !== OTHER_SERIES.light);
    expect(new Set(colored).size).toBe(colored.length);
  });
});
