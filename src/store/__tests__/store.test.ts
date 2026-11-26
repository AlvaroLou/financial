import { beforeEach, describe, expect, it, vi } from 'vitest';

// A store persiste no AsyncStorage; nos testes usamos um armazenamento em memória.
vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
    },
  };
});

const { useFinanceStore } = await import('@/store/useFinanceStore');
const { defaultCategories } = await import('@/data/defaults');

const s = () => useFinanceStore.getState();

const expense = {
  kind: 'despesa' as const,
  nome: 'Mercado',
  descricao: '',
  valorTotal: 10_000,
  natureza: 'variavel' as const,
  forma: 'pix' as const,
  data: '2026-11-10',
  categoriaId: 'alimentacao',
  parcelado: false,
};

beforeEach(() => s().eraseAllData());

describe('estado inicial', () => {
  it('não traz nenhum dado fictício', () => {
    expect(s().records).toEqual([]);
    expect(s().accounts).toEqual([]);
    expect(s().cards).toEqual([]);
    expect(s().goals).toEqual([]);
  });

  it('categorias padrão começam sem limite', () => {
    expect(s().categories).toEqual(defaultCategories);
    expect(s().categories.every((c) => c.limiteMensal === 0)).toBe(true);
    expect(s().categories.some((c) => c.kind === 'despesa')).toBe(true);
    expect(s().categories.some((c) => c.kind === 'receita')).toBe(true);
  });
});

describe('categorias', () => {
  it('cria, edita e exclui', () => {
    const id = s().addCategory({ nome: 'Pets', icone: 'heart', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 30_000 });
    s().updateCategory(id, { nome: 'Pet', limiteMensal: 40_000 });
    expect(s().categories.find((c) => c.id === id)).toMatchObject({ nome: 'Pet', limiteMensal: 40_000 });
    expect(s().removeCategory(id)).toBe(true);
    expect(s().categories.find((c) => c.id === id)).toBeUndefined();
  });

  it('não exclui categoria com lançamentos', () => {
    s().addRecord(expense);
    expect(s().categoryRemoveBlock('alimentacao')).toBe('in-use');
    expect(s().removeCategory('alimentacao')).toBe(false);
    expect(s().categories.some((c) => c.id === 'alimentacao')).toBe(true);
  });

  it('não exclui a última categoria de um tipo', () => {
    const receitas = s().categories.filter((c) => c.kind === 'receita');
    receitas.slice(1).forEach((c) => s().removeCategory(c.id));
    expect(s().categoryRemoveBlock(receitas[0].id)).toBe('last-of-kind');
    expect(s().removeCategory(receitas[0].id)).toBe(false);
  });
});

describe('contas e cartões', () => {
  it('CRUD de conta (saldo pode ser negativo)', () => {
    const id = s().addAccount({ nome: 'Banco', tipo: 'conta', saldo: -5_000 });
    s().updateAccount(id, { nome: 'Banco X', tipo: 'conta', saldo: 12_000 });
    expect(s().accounts).toEqual([{ id, nome: 'Banco X', tipo: 'conta', saldo: 12_000 }]);
    s().removeAccount(id);
    expect(s().accounts).toEqual([]);
  });

  it('CRUD de cartão', () => {
    const id = s().addCard({ nome: 'Cartão', final: '1234', limite: 500_000, diaFechamento: 3, diaVencimento: 10 });
    s().updateCard(id, { nome: 'Cartão', final: '1234', limite: 600_000, diaFechamento: 3, diaVencimento: 10 });
    expect(s().cards[0].limite).toBe(600_000);
    s().removeCard(id);
    expect(s().cards).toEqual([]);
  });
});

describe('lançamentos e metas', () => {
  it('encerrar recorrência a partir de um mês e desfazer', () => {
    const id = s().addRecord({ ...expense, recorrente: true, data: '2026-10-05' });
    const original = s().endRecurrence(id, '2026-12');
    expect(s().records.find((r) => r.id === id)?.recorrenteAte).toBe('2026-11');
    s().restoreRecord(original!);
    expect(s().records.find((r) => r.id === id)?.recorrenteAte).toBeUndefined();
  });

  it('encerrar no primeiro mês remove o lançamento', () => {
    const id = s().addRecord({ ...expense, recorrente: true, data: '2026-10-05' });
    s().endRecurrence(id, '2026-10');
    expect(s().records.find((r) => r.id === id)).toBeUndefined();
  });

  it('contribuição não passa do alvo', () => {
    const id = s().addGoal({ nome: 'Reserva', icone: 'piggy', atual: 0, alvo: 10_000 });
    expect(s().contributeToGoal(id, 7_000)).toBe(7_000);
    expect(s().contributeToGoal(id, 7_000)).toBe(3_000);
    expect(s().goals[0].atual).toBe(10_000);
  });
});

describe('migração de versões antigas', () => {
  it('remove os dados fictícios do antigo seed e mantém os do usuário', async () => {
    const migrate = useFinanceStore.persist.getOptions().migrate!;
    const migrated = (await migrate(
      {
        records: [{ ...expense, id: 'n01' }, { ...expense, id: 'o09' }, { ...expense, id: 'mf3k2abc12' }],
        goals: [{ id: 'g1' }, { id: 'meu1x9z' }],
        accounts: [{ id: 'a1' }, { id: 'a2' }],
        cards: [{ id: 'k1' }],
      },
      1,
    )) as ReturnType<typeof s>;
    expect(migrated.records.map((r) => r.id)).toEqual(['mf3k2abc12']);
    expect(migrated.goals.map((g) => g.id)).toEqual(['meu1x9z']);
    expect(migrated.accounts).toEqual([]);
    expect(migrated.cards).toEqual([]);
    expect(migrated.onboarded).toBe(true);
  });
});
