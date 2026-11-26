import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  groupLabel,
  monthLabel,
  monthName,
  shiftMonths,
} from '@/lib/dates';
import { budgetMonthCsv, csvSeparator } from '@/lib/export';
import { buildBudgetMonth } from '@/lib/reports';
import i18n from '@/i18n';
import { dueLabel } from '@/i18n/labels';
import { brl, brlShort, brlSigned, digitsToCents, formatNumber, percent, spokenBrl } from '@/lib/money';
import type { FinanceRecord } from '@/types';

describe('money', () => {
  it('formata em pt-BR sem depender de Intl', () => {
    expect(formatNumber(123456)).toBe('1.234,56');
    expect(formatNumber(5)).toBe('0,05');
    expect(brl(-123456)).toBe('-R$ 1.234,56');
    expect(brlShort(324000)).toBe('R$ 3.240');
    expect(brlShort(324050)).toBe('R$ 3.240,50');
    expect(brlSigned(24000, 'despesa')).toBe('− R$ 240,00');
    expect(percent(0.5556)).toBe('55,6%');
  });

  it('máscara de entrada estilo banco', () => {
    expect(digitsToCents('2.400,00')).toBe(240000);
    expect(digitsToCents('0,005')).toBe(5);
    expect(digitsToCents('')).toBe(0);
    expect(digitsToCents('9'.repeat(20))).toBe(99_999_999_999);
  });

  it('valor falado para leitores de tela', () => {
    expect(spokenBrl(100)).toBe('1 real');
    expect(spokenBrl(123456)).toBe('1.234 reais e 56 centavos');
    expect(spokenBrl(201)).toBe('2 reais e 1 centavo');
  });
});

describe('dates', () => {
  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
  });

  it('dias no mês (ano bissexto)', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2027-02')).toBe(28);
  });

  it('desloca datas em meses limitando ao fim do mês', () => {
    expect(shiftMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftMonths('2026-11-25', 0)).toBe('2026-11-25');
    expect(shiftMonths('2026-11-25', 14)).toBe('2028-01-25');
  });

  it('diferença e soma de dias atravessando horário de verão / anos', () => {
    expect(diffDays('2026-12-30', '2027-01-02')).toBe(3);
    expect(addDays('2026-11-28', 5)).toBe('2026-12-03');
  });

  it('rótulos', () => {
    expect(monthLabel('2026-11')).toBe('Novembro 2026');
    expect(monthName('2026-11')).toBe('novembro');
    expect(monthName('2025-12', '2026-01')).toBe('dezembro de 2025');
    expect(groupLabel('2026-11-25', '2026-11-25')).toBe('Hoje, 25 de novembro');
    expect(groupLabel('2026-11-24', '2026-11-25')).toBe('Ontem, 24 de novembro');
    expect(dueLabel(0)).toBe('vence hoje');
    expect(dueLabel(1)).toBe('vence amanhã');
    expect(dueLabel(4)).toBe('em 4 dias');
    expect(dueLabel(-1)).toBe('venceu há 1 dia');
  });
});

describe('export CSV', () => {
  const record: FinanceRecord = {
    id: 'x',
    kind: 'despesa',
    nome: 'Jantar "especial"; amigos',
    descricao: '',
    valorTotal: 12_345,
    natureza: 'variavel',
    forma: 'credito',
    data: '2026-11-21',
    categoriaId: 'alimentacao',
    parcelado: false,
  };

  it('usa BOM, ";" como separador, vírgula decimal e escapa aspas', () => {
    const csv = budgetMonthCsv(buildBudgetMonth([record], '2026-11', { alimentacao: 'Alimentação' }), { alimentacao: 'Alimentação' }, i18n.t.bind(i18n) as never);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csvSeparator()).toBe(';');
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Orçamento · Novembro 2026');
    expect(lines).toContain('Gastos (despesas);123,45');
    expect(lines).toContain('21/11/2026;Despesa;"Jantar ""especial""; amigos";Alimentação;;Variável;Crédito;;-123,45');
  });
});
