import { describe, expect, it } from 'vitest';

import { fixtureCategories as seedCategories, fixtureRecords as seedRecords } from './fixtures';
import {
  dailyAllowance,
  filterOccurrences,
  groupByDay,
  installmentValue,
  limitStatus,
  monthOccurrences,
  occurrenceIn,
  projectInstallments,
  recurringTotals,
  summarize,
  totalBudget,
  upcomingDues,
} from '@/lib/finance';
import type { Category, FinanceRecord } from '@/types';

const rec = (over: Partial<FinanceRecord> = {}): FinanceRecord => ({
  id: 'r1',
  kind: 'despesa',
  nome: 'Teste',
  descricao: '',
  valorTotal: 10_000,
  natureza: 'variavel',
  forma: 'pix',
  data: '2026-11-10',
  categoriaId: 'lazer',
  parcelado: false,
  ...over,
});

const categoryMap: Record<string, Category> = Object.fromEntries(seedCategories.map((c) => [c.id, c]));

describe('parcelas', () => {
  it('a última parcela absorve o resto da divisão e a soma bate com o total', () => {
    const r = rec({ valorTotal: 10_000, parcelado: true, parcelaAtual: 1, parcelasTotais: 3 });
    const values = [1, 2, 3].map((p) => installmentValue(r, p));
    expect(values).toEqual([3333, 3333, 3334]);
    expect(values.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it('deriva as parcelas dos outros meses e some fora do intervalo', () => {
    const r = rec({ valorTotal: 30_000, parcelado: true, parcelaAtual: 2, parcelasTotais: 3, data: '2026-11-10' });
    expect(occurrenceIn(r, '2026-10')?.parcela).toEqual({ atual: 1, total: 3 });
    expect(occurrenceIn(r, '2026-11')?.parcela).toEqual({ atual: 2, total: 3 });
    expect(occurrenceIn(r, '2026-12')?.parcela).toEqual({ atual: 3, total: 3 });
    expect(occurrenceIn(r, '2026-09')).toBeNull();
    expect(occurrenceIn(r, '2027-01')).toBeNull();
  });

  it('limita o dia ao fim do mês (31/jan -> 28/fev)', () => {
    const r = rec({ parcelado: true, parcelaAtual: 1, parcelasTotais: 3, data: '2027-01-31' });
    expect(occurrenceIn(r, '2027-02')?.data).toBe('2027-02-28');
    expect(occurrenceIn(r, '2027-03')?.data).toBe('2027-03-31');
  });

  it('mantém a distância entre data e vencimento (vencimento no mês seguinte)', () => {
    const r = rec({ parcelado: true, parcelaAtual: 1, parcelasTotais: 3, data: '2026-11-28', vencimento: '2026-12-03' });
    expect(occurrenceIn(r, '2026-11')?.vencimento).toBe('2026-12-03');
    expect(occurrenceIn(r, '2026-12')?.vencimento).toBe('2027-01-03');
  });
});

describe('recorrentes', () => {
  const aluguel = rec({ id: 'alu', nome: 'Aluguel', valorTotal: 90_000, recorrente: true, data: '2026-10-05' });

  it('aparece em todos os meses a partir do início, nunca antes', () => {
    expect(occurrenceIn(aluguel, '2026-09')).toBeNull();
    expect(occurrenceIn(aluguel, '2026-10')?.data).toBe('2026-10-05');
    expect(occurrenceIn(aluguel, '2027-06')?.data).toBe('2027-06-05');
    expect(occurrenceIn(aluguel, '2027-06')?.valor).toBe(90_000);
  });

  it('respeita o fim da recorrência (inclusive)', () => {
    const encerrado = { ...aluguel, recorrenteAte: '2026-12' };
    expect(occurrenceIn(encerrado, '2026-12')).not.toBeNull();
    expect(occurrenceIn(encerrado, '2027-01')).toBeNull();
  });

  it('parcelado tem prioridade sobre recorrente', () => {
    const r = rec({ recorrente: true, parcelado: true, parcelaAtual: 1, parcelasTotais: 2 });
    expect(occurrenceIn(r, '2027-01')).toBeNull();
  });

  it('soma os recorrentes ativos do mês', () => {
    const salario = rec({ id: 'sal', kind: 'receita', valorTotal: 500_000, recorrente: true, data: '2026-10-05' });
    expect(recurringTotals([aluguel, salario, rec()], '2026-12')).toEqual({ despesas: 90_000, receitas: 500_000 });
  });

  it('o filtro "recorrentes" do extrato só mostra recorrentes', () => {
    const list = monthOccurrences([aluguel, rec({ id: 'x' })], '2026-11');
    const out = filterOccurrences(list, { query: '', group: 'recorrentes', forma: null, categories: categoryMap });
    expect(out.map((o) => o.record.id)).toEqual(['alu']);
  });
});

describe('regressão: cenário do layout (novembro/2026) fecha nos números esperados', () => {
  const s = summarize(monthOccurrences(seedRecords, '2026-11'));

  it('receitas, despesas e saldo', () => {
    expect(s.receitas).toBe(650_000);
    expect(s.despesas).toBe(324_000);
    expect(s.saldo).toBe(326_000);
  });

  it('fixos x variáveis', () => {
    expect(s.fixos).toBe(180_000);
    expect(s.variaveis).toBe(144_000);
  });

  it('por forma de pagamento', () => {
    expect(s.porForma).toEqual({ credito: 144_000, pix: 100_000, debito: 42_000, dinheiro: 18_000, boleto: 20_000 });
  });

  it('por categoria', () => {
    expect(s.porCategoria).toEqual({ moradia: 140_000, alimentacao: 72_000, transporte: 32_000, lazer: 80_000 });
  });

  it('outubro (mês anterior) soma 3.510 em despesas', () => {
    expect(summarize(monthOccurrences(seedRecords, '2026-10')).despesas).toBe(351_000);
  });

  it('parcelas de dezembro: 640', () => {
    expect(projectInstallments(seedRecords, '2026-12', 1)[0].total).toBe(64_000);
  });

  it('orçamento = soma dos limites das categorias de despesa (4.200)', () => {
    expect(totalBudget(seedCategories)).toBe(420_000);
  });
});

describe('orçamento', () => {
  it('status por categoria', () => {
    expect(limitStatus(7_900, 10_000)).toBe('ok');
    expect(limitStatus(8_000, 10_000)).toBe('warn');
    expect(limitStatus(10_000, 10_000)).toBe('warn');
    expect(limitStatus(10_001, 10_000)).toBe('over');
    expect(limitStatus(1, 0)).toBe('none'); // limite 0 = sem limite
    expect(limitStatus(0, 0)).toBe('none');
  });

  it('pode gastar por dia: só no mês atual e nunca negativo', () => {
    expect(dailyAllowance(420_000, 324_000, '2026-11-25', '2026-11')).toEqual({ perDay: 19_200, daysLeft: 5 });
    expect(dailyAllowance(100, 500, '2026-11-25', '2026-11')?.perDay).toBe(0);
    expect(dailyAllowance(420_000, 0, '2026-11-25', '2026-12')).toBeNull();
    // último dia do mês: divide por 1, sem dividir por zero
    expect(dailyAllowance(1_000, 0, '2026-11-30', '2026-11')?.daysLeft).toBe(1);
    // sem orçamento (nenhum limite definido) não mostra "pode gastar por dia"
    expect(dailyAllowance(0, 5_000, '2026-11-25', '2026-11')).toBeNull();
  });

  it('categorias sem limite não entram no orçamento', () => {
    const cats = seedCategories.map((c) => (c.id === 'lazer' ? { ...c, limiteMensal: 0 } : c));
    expect(totalBudget(cats)).toBe(420_000 - 90_000);
  });
});

describe('vencimentos', () => {
  it('lista os próximos em ordem e ignora os vencidos', () => {
    const dues = upcomingDues(seedRecords, '2026-11-25');
    expect(dues.slice(0, 3).map((d) => [d.occurrence.record.nome, d.daysLeft])).toEqual([
      ['Notebook', 2],
      ['Geladeira', 4],
      ['Seguro Auto', 5],
    ]);
    expect(dues.every((d) => d.daysLeft >= 0)).toBe(true);
  });

  it('inclui vencimento deste mês de um lançamento do mês anterior', () => {
    const r = rec({ parcelado: true, parcelaAtual: 1, parcelasTotais: 1 + 1, data: '2026-11-28', vencimento: '2026-12-03' });
    const dues = upcomingDues([r], '2026-12-01');
    expect(dues[0].occurrence.vencimento).toBe('2026-12-03');
    expect(dues[0].daysLeft).toBe(2);
  });
});

describe('extrato: busca, filtros e agrupamento', () => {
  const nov = monthOccurrences(seedRecords, '2026-11');
  const f = (over: Partial<Parameters<typeof filterOccurrences>[1]>) =>
    filterOccurrences(nov, { query: '', group: 'todos', forma: null, categories: categoryMap, ...over });

  it('busca ignora acentos e maiúsculas e procura na categoria', () => {
    expect(f({ query: 'ALIMENTACAO' }).length).toBeGreaterThan(0);
    expect(f({ query: 'ALIMENTACAO' }).every((o) => o.record.categoriaId === 'alimentacao')).toBe(true);
    expect(f({ query: 'salario' }).map((o) => o.record.nome)).toEqual(['Salário']);
  });

  it('parcelados x à vista são complementares', () => {
    expect(f({ group: 'parcelados' }).length + f({ group: 'avista' }).length).toBe(nov.length);
    expect(f({ group: 'parcelados' }).map((o) => o.record.nome).sort()).toEqual(['Geladeira', 'Notebook', 'Seguro Auto']);
  });

  it('filtro por forma de pagamento', () => {
    expect(f({ forma: 'boleto' }).map((o) => o.record.nome).sort()).toEqual(['Academia', 'Internet']);
  });

  it('agrupa por dia (lista já em ordem decrescente) com saldo do dia', () => {
    const sections = groupByDay(nov);
    expect(sections[0].date).toBe('2026-11-25');
    expect(sections[0].net).toBe(-(24_000 + 32_000)); // parcela do notebook + mercado
    const dates = sections.map((s) => s.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});
