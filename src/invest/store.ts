import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { todayISO } from '@/lib/clock';

import type {
  AllocationTargets,
  Asset,
  InvestSettings,
  Institution,
  Operation,
  Quote,
  RateState,
  Snapshot,
} from './types';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type AssetInput = Omit<Asset, 'id' | 'criadoEm'>;
export type OperationInput = Omit<Operation, 'id'>;

/* ================================================================== carteira */

interface PortfolioData {
  assets: Asset[];
  operations: Operation[];
  institutions: Institution[];
  snapshots: Snapshot[];
  targets: AllocationTargets;
  settings: InvestSettings;
}

interface PortfolioState extends PortfolioData {
  addAsset: (input: AssetInput) => string;
  updateAsset: (id: string, patch: Partial<AssetInput>) => void;
  /** remove o ativo e suas operações; devolve tudo para desfazer */
  removeAsset: (id: string) => { asset: Asset; operations: Operation[] } | undefined;
  restoreAsset: (asset: Asset, operations: Operation[]) => void;
  /** vincula exatamente estes ativos à meta (os demais que apontavam para ela são desvinculados) */
  setGoalAssets: (goalId: string, assetIds: string[]) => void;

  addOperation: (input: OperationInput) => string;
  updateOperation: (id: string, input: OperationInput) => void;
  removeOperation: (id: string) => Operation | undefined;
  restoreOperation: (op: Operation) => void;

  addInstitution: (nome: string) => string;
  renameInstitution: (id: string, nome: string) => void;
  removeInstitution: (id: string) => void;

  /** grava a foto do mês (substitui a do mesmo mês) */
  recordSnapshot: (snapshot: Snapshot) => void;
  setTargets: (targets: AllocationTargets) => void;
  updateInvestSettings: (patch: Partial<InvestSettings>) => void;
  /** apaga a carteira inteira (Ajustes › Apagar todos os dados) */
  resetPortfolio: () => void;
}

const defaultInvestSettings: InvestSettings = { hasBrapiToken: false, hasCoingeckoKey: false, autoRefresh: true };

const emptyPortfolio = (): PortfolioData => ({
  assets: [],
  operations: [],
  institutions: [],
  snapshots: [],
  targets: {},
  settings: defaultInvestSettings,
});

/** ordena operações por data (estável: mesma data mantém a ordem de criação) */
const byDate = (a: Operation, b: Operation) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0);

export const useInvestStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      ...emptyPortfolio(),

      addAsset: (input) => {
        const id = uid();
        set((s) => ({ assets: [...s.assets, { ...input, id, criadoEm: todayISO() }] }));
        return id;
      },

      updateAsset: (id, patch) =>
        set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch, id: a.id, criadoEm: a.criadoEm } : a)) })),

      removeAsset: (id) => {
        const asset = get().assets.find((a) => a.id === id);
        if (!asset) return undefined;
        const operations = get().operations.filter((o) => o.assetId === id);
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id), operations: s.operations.filter((o) => o.assetId !== id) }));
        return { asset, operations };
      },

      restoreAsset: (asset, operations) =>
        set((s) => ({
          assets: s.assets.some((a) => a.id === asset.id) ? s.assets : [...s.assets, asset],
          operations: [...s.operations.filter((o) => o.assetId !== asset.id), ...operations].sort(byDate),
        })),

      setGoalAssets: (goalId, assetIds) =>
        set((s) => ({
          assets: s.assets.map((a) => {
            if (assetIds.includes(a.id)) return { ...a, metaId: goalId };
            if (a.metaId === goalId) return { ...a, metaId: undefined };
            return a;
          }),
        })),

      addOperation: (input) => {
        const id = uid();
        set((s) => ({ operations: [...s.operations, { ...input, id }].sort(byDate) }));
        return id;
      },

      updateOperation: (id, input) =>
        set((s) => ({ operations: s.operations.map((o) => (o.id === id ? { ...input, id } : o)).sort(byDate) })),

      removeOperation: (id) => {
        const found = get().operations.find((o) => o.id === id);
        if (found) set((s) => ({ operations: s.operations.filter((o) => o.id !== id) }));
        return found;
      },

      restoreOperation: (op) =>
        set((s) => ({
          operations: s.operations.some((o) => o.id === op.id) ? s.operations : [...s.operations, op].sort(byDate),
        })),

      addInstitution: (nome) => {
        const id = uid();
        set((s) => ({ institutions: [...s.institutions, { id, nome: nome.trim() }] }));
        return id;
      },
      renameInstitution: (id, nome) =>
        set((s) => ({ institutions: s.institutions.map((i) => (i.id === id ? { ...i, nome: nome.trim() } : i)) })),
      removeInstitution: (id) =>
        set((s) => ({
          institutions: s.institutions.filter((i) => i.id !== id),
          assets: s.assets.map((a) => (a.instituicaoId === id ? { ...a, instituicaoId: undefined } : a)),
        })),

      recordSnapshot: (snapshot) =>
        set((s) => {
          const current = s.snapshots.find((x) => x.ym === snapshot.ym);
          if (current && current.patrimonio === snapshot.patrimonio && current.investido === snapshot.investido) return s;
          const others = s.snapshots.filter((x) => x.ym !== snapshot.ym);
          return { snapshots: [...others, snapshot].sort((a, b) => (a.ym < b.ym ? -1 : 1)) };
        }),

      setTargets: (targets) => set({ targets }),
      updateInvestSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetPortfolio: () => set({ ...emptyPortfolio(), settings: get().settings }),
    }),
    {
      name: 'dinheiro-em-dia/investimentos/v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PortfolioData => ({
        assets: s.assets,
        operations: s.operations,
        institutions: s.institutions,
        snapshots: s.snapshots,
        targets: s.targets,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PortfolioData>;
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

/* ================================================================== mercado (cotações e taxas) */

/**
 * Taxas iniciais (antes da 1ª atualização pelo Banco Central). São só um ponto
 * de partida: o app avisa "valor padrão" até buscar as taxas ou o usuário digitar.
 */
export const DEFAULT_RATES: RateState = {
  cdiAnual: 0.1365,
  selicMeta: 0.1375,
  ipca12m: 0.0463,
  origem: 'padrao',
  cdiDiario: {},
  selicDiaria: {},
  ipcaMensal: {},
};

interface MarketData {
  /** chave: "B3:PETR4" ou "CG:bitcoin" (ver quoteKey) */
  quotes: Record<string, Quote>;
  rates: RateState;
}

interface MarketState extends MarketData {
  setQuotes: (quotes: Record<string, Quote>) => void;
  setRates: (patch: Partial<RateState>) => void;
  /** mescla séries novas nas guardadas */
  mergeSeries: (series: Partial<Pick<RateState, 'cdiDiario' | 'selicDiaria' | 'ipcaMensal'>>) => void;
  resetMarket: () => void;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      quotes: {},
      rates: DEFAULT_RATES,
      setQuotes: (quotes) => set((s) => ({ quotes: { ...s.quotes, ...quotes } })),
      setRates: (patch) => set((s) => ({ rates: { ...s.rates, ...patch } })),
      mergeSeries: (series) =>
        set((s) => ({
          rates: {
            ...s.rates,
            cdiDiario: { ...s.rates.cdiDiario, ...(series.cdiDiario ?? {}) },
            selicDiaria: { ...s.rates.selicDiaria, ...(series.selicDiaria ?? {}) },
            ipcaMensal: { ...s.rates.ipcaMensal, ...(series.ipcaMensal ?? {}) },
          },
        })),
      resetMarket: () => set({ quotes: {} }),
    }),
    {
      name: 'dinheiro-em-dia/mercado/v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): MarketData => ({ quotes: s.quotes, rates: s.rates }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MarketData>;
        return { ...current, ...p, rates: { ...current.rates, ...(p.rates ?? {}) } };
      },
    },
  ),
);

export { quoteKey } from './catalog';
