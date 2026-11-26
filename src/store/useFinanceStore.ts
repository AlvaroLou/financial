import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cardCategory, CARD_CATEGORY_ID, defaultCategories, defaultSettings, PRESERVED_SETTINGS } from '@/data/defaults';
import { todayISO } from '@/lib/clock';
import { addMonths, monthIndex, ymOf } from '@/lib/dates';
import type {
  Account,
  AccountInput,
  CardInput,
  Category,
  CategoryInput,
  CreditCard,
  FinanceRecord,
  Goal,
  GoalInput,
  Settings,
  YM,
} from '@/types';

/** Coloca "Cartão" antes de "Outros" (ou ao fim das despesas). */
function insertCardCategory(categories: Category[]): Category[] {
  const list = [...categories];
  const outros = list.findIndex((c) => c.id === 'outros');
  const lastExpense = list.map((c) => c.kind).lastIndexOf('despesa');
  const at = outros >= 0 ? outros : lastExpense + 1;
  list.splice(at, 0, cardCategory);
  return list;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type RecordInput = Omit<FinanceRecord, 'id'>;

/** Motivo pelo qual uma categoria não pode ser excluída. */
export type CategoryRemoveBlock = 'in-use' | 'last-of-kind' | 'fixed';

interface PersistedData {
  records: FinanceRecord[];
  categories: Category[];
  accounts: Account[];
  cards: CreditCard[];
  goals: Goal[];
  settings: Settings;
  /** já passou pela tela de boas-vindas */
  onboarded: boolean;
}

interface FinanceState extends PersistedData {
  /** mês selecionado nos seletores (não é persistido) */
  month: YM;

  setMonth: (ym: YM) => void;
  shiftMonth: (delta: number) => void;

  /* lançamentos */
  addRecord: (input: RecordInput) => string;
  updateRecord: (id: string, input: RecordInput) => void;
  deleteRecord: (id: string) => FinanceRecord | undefined;
  restoreRecord: (record: FinanceRecord) => void;
  duplicateRecord: (id: string) => string | undefined;
  /**
   * Encerra uma recorrência antes de `fromYm` (o lançamento deixa de existir a
   * partir desse mês). Se `fromYm` for o primeiro mês, o registro é removido.
   * Devolve o registro original (para desfazer).
   */
  endRecurrence: (id: string, fromYm: YM) => FinanceRecord | undefined;

  /* categorias */
  addCategory: (input: CategoryInput) => string;
  updateCategory: (id: string, patch: Partial<CategoryInput>) => void;
  setCategoryLimit: (id: string, limiteMensal: number) => void;
  /** por que a categoria não pode ser excluída (ou null se pode) */
  categoryRemoveBlock: (id: string) => CategoryRemoveBlock | null;
  removeCategory: (id: string) => boolean;

  /* contas e cartões */
  addAccount: (input: AccountInput) => string;
  updateAccount: (id: string, input: AccountInput) => void;
  removeAccount: (id: string) => void;
  addCard: (input: CardInput) => string;
  updateCard: (id: string, input: CardInput) => void;
  removeCard: (id: string) => void;

  /* metas */
  addGoal: (input: GoalInput) => string;
  removeGoal: (id: string) => Goal | undefined;
  restoreGoal: (goal: Goal) => void;
  /** soma `amount` à meta (sem passar do alvo) e devolve quanto foi de fato adicionado */
  contributeToGoal: (id: string, amount: number) => number;

  updateSettings: (patch: Partial<Settings>) => void;
  /** sai da tela de boas-vindas */
  completeOnboarding: () => void;
  /** apaga todos os dados do usuário (mantém só as preferências de segurança/privacidade) */
  eraseAllData: () => void;
}

const emptyData = (): Omit<PersistedData, 'onboarded'> => ({
  records: [],
  categories: defaultCategories,
  accounts: [],
  cards: [],
  goals: [],
  settings: defaultSettings,
});

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      onboarded: false,
      month: ymOf(todayISO()),

      setMonth: (ym) => set({ month: ym }),
      shiftMonth: (delta) => set((s) => ({ month: addMonths(s.month, delta) })),

      /* ------------------------------------------------------------ lançamentos */

      addRecord: (input) => {
        const id = uid();
        set((s) => ({ records: [{ ...input, id }, ...s.records] }));
        return id;
      },

      updateRecord: (id, input) =>
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...input, id } : r)) })),

      deleteRecord: (id) => {
        const found = get().records.find((r) => r.id === id);
        if (found) set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
        return found;
      },

      // desfazer: devolve o registro (substitui se ainda existir, ex.: após encerrar recorrência)
      restoreRecord: (record) =>
        set((s) =>
          s.records.some((r) => r.id === record.id)
            ? { records: s.records.map((r) => (r.id === record.id ? record : r)) }
            : { records: [record, ...s.records] },
        ),

      duplicateRecord: (id) => {
        const original = get().records.find((r) => r.id === id);
        if (!original) return undefined;
        const copyId = uid();
        set((s) => ({ records: [{ ...original, id: copyId }, ...s.records] }));
        return copyId;
      },

      endRecurrence: (id, fromYm) => {
        const found = get().records.find((r) => r.id === id);
        if (!found) return undefined;
        if (monthIndex(fromYm) <= monthIndex(ymOf(found.data))) {
          get().deleteRecord(id);
        } else {
          const recorrenteAte = addMonths(fromYm, -1);
          set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, recorrenteAte } : r)) }));
        }
        return found;
      },

      /* ------------------------------------------------------------ categorias */

      addCategory: (input) => {
        const id = uid();
        set((s) => ({ categories: [...s.categories, { ...input, id }] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) => {
            if (c.id !== id) return c;
            // categoria fixa: só ícone, natureza sugerida e limite podem mudar
            const allowed = c.fixa ? { icone: patch.icone, naturezaPadrao: patch.naturezaPadrao, limiteMensal: patch.limiteMensal } : patch;
            const clean = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));
            return { ...c, ...clean, id: c.id, fixa: c.fixa };
          }),
        })),

      setCategoryLimit: (id, limiteMensal) => get().updateCategory(id, { limiteMensal }),

      categoryRemoveBlock: (id) => {
        const { categories, records } = get();
        const cat = categories.find((c) => c.id === id);
        if (!cat) return null;
        if (cat.fixa) return 'fixed';
        // como etiqueta não bloqueia: ao excluir, a etiqueta sai dos lançamentos
        if (records.some((r) => r.categoriaId === id)) return 'in-use';
        if (categories.filter((c) => c.kind === cat.kind).length <= 1) return 'last-of-kind';
        return null;
      },

      removeCategory: (id) => {
        if (get().categoryRemoveBlock(id)) return false;
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          records: s.records.map((r) =>
            r.etiquetas?.includes(id) ? { ...r, etiquetas: r.etiquetas.filter((e) => e !== id) } : r,
          ),
        }));
        return true;
      },

      /* ------------------------------------------------------------ contas e cartões */

      addAccount: (input) => {
        const id = uid();
        set((s) => ({ accounts: [...s.accounts, { ...input, id }] }));
        return id;
      },
      updateAccount: (id, input) => set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...input, id } : a)) })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      addCard: (input) => {
        const id = uid();
        set((s) => ({ cards: [...s.cards, { ...input, id }] }));
        return id;
      },
      updateCard: (id, input) => set((s) => ({ cards: s.cards.map((k) => (k.id === id ? { ...input, id } : k)) })),
      removeCard: (id) => set((s) => ({ cards: s.cards.filter((k) => k.id !== id) })),

      /* ------------------------------------------------------------ metas */

      addGoal: (input) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...input, id }] }));
        return id;
      },

      removeGoal: (id) => {
        const found = get().goals.find((g) => g.id === id);
        if (found) set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        return found;
      },

      restoreGoal: (goal) =>
        set((s) => (s.goals.some((g) => g.id === goal.id) ? s : { goals: [...s.goals, goal] })),

      contributeToGoal: (id, amount) => {
        const goal = get().goals.find((g) => g.id === id);
        if (!goal) return 0;
        const added = Math.max(0, Math.min(amount, goal.alvo - goal.atual));
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, atual: g.atual + added } : g)) }));
        return added;
      },

      /* ------------------------------------------------------------ app */

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      completeOnboarding: () => set({ onboarded: true, month: ymOf(todayISO()) }),

      eraseAllData: () =>
        set((s) => ({
          ...emptyData(),
          settings: {
            ...defaultSettings,
            ...Object.fromEntries(PRESERVED_SETTINGS.map((k) => [k, s.settings[k]])),
          },
          onboarded: true,
          month: ymOf(todayISO()),
        })),
    }),
    {
      name: 'dinheiro-em-dia/v1',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedData => ({
        records: s.records,
        categories: s.categories,
        accounts: s.accounts,
        cards: s.cards,
        goals: s.goals,
        settings: s.settings,
        onboarded: s.onboarded,
      }),
      migrate: (persisted, version) => {
        const state = { ...((persisted ?? {}) as Partial<PersistedData>) };
        // v1 não tinha boas-vindas: quem já tinha dados salvos segue direto para o app
        if (version < 2) state.onboarded = true;
        // até a v2 o app trazia dados fictícios; remove o que sobrou deles (ids fixos do
        // antigo seed — os criados pelo usuário são aleatórios e nunca coincidem)
        if (version < 3) {
          state.records = (state.records ?? []).filter((r) => !/^[no]\d{2}$/.test(r.id));
          state.goals = (state.goals ?? []).filter((g) => !['g1', 'g2'].includes(g.id));
          state.accounts = (state.accounts ?? []).filter((a) => !['a1', 'a2'].includes(a.id));
          state.cards = (state.cards ?? []).filter((k) => k.id !== 'k1');
        }
        // v4: preferências novas (tema, cores, idioma, app) e a categoria fixa "Cartão"
        if (version < 4) {
          state.settings = { ...defaultSettings, ...(state.settings ?? {}) };
          const cats = state.categories ?? defaultCategories;
          state.categories = cats.some((c) => c.id === CARD_CATEGORY_ID) ? cats : insertCardCategory(cats);
        }
        return state;
      },
      // preferências adicionadas em versões futuras ganham o valor padrão
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedData>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);
