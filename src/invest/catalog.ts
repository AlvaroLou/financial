import type { IconName } from '@/components/ui/Icon';
import type { ThemeBase } from '@/theme/palette';
import { OTHER_SERIES, SERIES } from '@/theme/tokens';

import type { Asset, AssetClass, AssetGroup, AssetType, Indexer, QuoteSource, Valuation } from './types';

export interface AssetTypeInfo {
  classe: AssetClass;
  grupo: AssetGroup;
  icon: IconName;
  valuation: Valuation;
  quote: QuoteSource;
  /** rendimento isento de IR para pessoa física */
  isentoIR: boolean;
  /** coberto pelo FGC (até R$ 250 mil por CPF e instituição) */
  fgc: boolean;
  /** indexadores oferecidos no formulário (renda fixa) */
  indexers?: Indexer[];
  /** indexador sugerido */
  defaultIndexer?: Indexer;
}

/** Tudo o que o app sabe sobre cada tipo de investimento. Nomes traduzidos em `invest.types.<tipo>`. */
export const ASSET_TYPES: Record<AssetType, AssetTypeInfo> = {
  cdb: { classe: 'renda_fixa', grupo: 'fixa', icon: 'bank', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: true, indexers: ['cdi', 'pre', 'ipca', 'cdi_spread'], defaultIndexer: 'cdi' },
  lci: { classe: 'renda_fixa', grupo: 'fixa', icon: 'home', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: true, indexers: ['cdi', 'pre', 'ipca'], defaultIndexer: 'cdi' },
  lca: { classe: 'renda_fixa', grupo: 'fixa', icon: 'water', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: true, indexers: ['cdi', 'pre', 'ipca'], defaultIndexer: 'cdi' },
  lc: { classe: 'renda_fixa', grupo: 'fixa', icon: 'bank', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: true, indexers: ['cdi', 'pre', 'ipca'], defaultIndexer: 'pre' },
  cri: { classe: 'renda_fixa', grupo: 'fixa', icon: 'building', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: false, indexers: ['ipca', 'cdi', 'cdi_spread', 'pre'], defaultIndexer: 'ipca' },
  cra: { classe: 'renda_fixa', grupo: 'fixa', icon: 'water', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: false, indexers: ['ipca', 'cdi', 'cdi_spread', 'pre'], defaultIndexer: 'ipca' },
  debenture: { classe: 'renda_fixa', grupo: 'fixa', icon: 'factory', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: false, indexers: ['cdi_spread', 'ipca', 'cdi', 'pre'], defaultIndexer: 'cdi_spread' },
  debenture_incentivada: { classe: 'renda_fixa', grupo: 'fixa', icon: 'factory', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: false, indexers: ['ipca', 'cdi_spread', 'pre'], defaultIndexer: 'ipca' },
  tesouro_selic: { classe: 'tesouro', grupo: 'fixa', icon: 'shield', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: false, indexers: ['selic'], defaultIndexer: 'selic' },
  tesouro_prefixado: { classe: 'tesouro', grupo: 'fixa', icon: 'shield', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: false, indexers: ['pre'], defaultIndexer: 'pre' },
  tesouro_ipca: { classe: 'tesouro', grupo: 'fixa', icon: 'shield', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: false, indexers: ['ipca'], defaultIndexer: 'ipca' },
  poupanca: { classe: 'renda_fixa', grupo: 'fixa', icon: 'piggy', valuation: 'fixed', quote: 'none', isentoIR: true, fgc: true, indexers: ['poupanca'], defaultIndexer: 'poupanca' },
  fundo_di: { classe: 'fundos', grupo: 'fixa', icon: 'chartArea', valuation: 'fixed', quote: 'none', isentoIR: false, fgc: false, indexers: ['cdi'], defaultIndexer: 'cdi' },
  acao: { classe: 'acoes', grupo: 'variavel', icon: 'factory', valuation: 'quote', quote: 'brapi', isentoIR: false, fgc: false },
  fii: { classe: 'fiis', grupo: 'variavel', icon: 'building', valuation: 'quote', quote: 'brapi', isentoIR: false, fgc: false },
  etf: { classe: 'etfs', grupo: 'variavel', icon: 'chartPie', valuation: 'quote', quote: 'brapi', isentoIR: false, fgc: false },
  bdr: { classe: 'exterior', grupo: 'variavel', icon: 'globe', valuation: 'quote', quote: 'brapi', isentoIR: false, fgc: false },
  cripto: { classe: 'cripto', grupo: 'variavel', icon: 'bitcoin', valuation: 'quote', quote: 'coingecko', isentoIR: false, fgc: false },
  fundo: { classe: 'fundos', grupo: 'variavel', icon: 'chartArea', valuation: 'manual', quote: 'none', isentoIR: false, fgc: false },
  previdencia: { classe: 'previdencia', grupo: 'outros', icon: 'pension', valuation: 'manual', quote: 'none', isentoIR: false, fgc: false },
  outro: { classe: 'outros', grupo: 'outros', icon: 'dots', valuation: 'manual', quote: 'none', isentoIR: false, fgc: false },
};

/** Ordem de exibição no seletor de tipo (agrupada). */
export const TYPE_GROUPS: { grupo: AssetGroup; tipos: AssetType[] }[] = [
  {
    grupo: 'fixa',
    tipos: ['cdb', 'tesouro_selic', 'tesouro_ipca', 'tesouro_prefixado', 'lci', 'lca', 'lc', 'cri', 'cra', 'debenture', 'debenture_incentivada', 'poupanca', 'fundo_di'],
  },
  { grupo: 'variavel', tipos: ['acao', 'fii', 'etf', 'bdr', 'cripto', 'fundo'] },
  { grupo: 'outros', tipos: ['previdencia', 'outro'] },
];

/**
 * Ordem fixa das classes = ordem dos slots da paleta dos gráficos (theme/tokens SERIES).
 * Previdência e Outros ficam no cinza de "Outros".
 */
export const CLASS_ORDER: AssetClass[] = [
  'renda_fixa',
  'acoes',
  'fiis',
  'tesouro',
  'exterior',
  'etfs',
  'fundos',
  'cripto',
  'previdencia',
  'outros',
];

const CLASS_SLOT: Partial<Record<AssetClass, number>> = {
  renda_fixa: 0,
  acoes: 1,
  fiis: 2,
  tesouro: 3,
  exterior: 4,
  etfs: 5,
  fundos: 6,
  cripto: 7,
};

/** Cor da classe no gráfico (a classe sempre tem a mesma cor). */
export function classColor(classe: AssetClass, base: ThemeBase): string {
  const slot = CLASS_SLOT[classe];
  return slot === undefined ? OTHER_SERIES[base] : SERIES[base][slot];
}

export const isFixedIncome = (tipo: AssetType) => ASSET_TYPES[tipo].valuation === 'fixed';
export const isQuoted = (tipo: AssetType) => ASSET_TYPES[tipo].valuation === 'quote';

/** Chave da cotação no cache: "B3:PETR4" ou "CG:bitcoin" (null = sem cotação automática). */
export function quoteKey(asset: Pick<Asset, 'tipo' | 'ticker' | 'coingeckoId'>): string | null {
  const info = ASSET_TYPES[asset.tipo];
  if (info.quote === 'coingecko') return asset.coingeckoId ? `CG:${asset.coingeckoId.trim().toLowerCase()}` : null;
  if (info.quote === 'brapi') return asset.ticker ? `B3:${asset.ticker.trim().toUpperCase()}` : null;
  return null;
}
