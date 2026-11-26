/**
 * Domínio de Investimentos (app "Investimentos"). Valores em CENTAVOS, exceto
 * preço unitário (`preco`, em reais com casas livres — cripto pode valer
 * R$ 0,0001) e quantidades (decimais). Taxas em fração (0.149 = 14,9% a.a.).
 */
import type { ISODate, YM } from '@/types';

export type AssetType =
  // renda fixa
  | 'cdb'
  | 'lci'
  | 'lca'
  | 'lc'
  | 'cri'
  | 'cra'
  | 'debenture'
  | 'debenture_incentivada'
  | 'tesouro_selic'
  | 'tesouro_prefixado'
  | 'tesouro_ipca'
  | 'poupanca'
  | 'fundo_di'
  // renda variável
  | 'acao'
  | 'fii'
  | 'etf'
  | 'bdr'
  | 'cripto'
  | 'fundo'
  // outros
  | 'previdencia'
  | 'outro';

/** Classe de ativo (alocação e rebalanceamento). */
export type AssetClass =
  | 'renda_fixa'
  | 'tesouro'
  | 'fundos'
  | 'acoes'
  | 'fiis'
  | 'etfs'
  | 'exterior'
  | 'cripto'
  | 'previdencia'
  | 'outros';

/** Renda fixa × variável × outros (resumo da carteira). */
export type AssetGroup = 'fixa' | 'variavel' | 'outros';

/** Como o valor atual é calculado. */
export type Valuation = 'quote' | 'fixed' | 'manual';

/** Fonte da cotação automática. */
export type QuoteSource = 'brapi' | 'coingecko' | 'none';

/** Indexador da renda fixa. */
export type Indexer = 'pre' | 'cdi' | 'cdi_spread' | 'ipca' | 'selic' | 'poupanca';

export interface FixedIncomeTerms {
  indexador: Indexer;
  /**
   * pre: taxa a.a. (0.12) · cdi: % do CDI (1.10 = 110%) · cdi_spread/ipca/selic:
   * taxa adicional a.a. (0.06 = +6%) · poupanca: ignorada
   */
  taxa: number;
  /** data da aplicação inicial (os aportes têm datas próprias) */
  dataInicio: ISODate;
  vencimento?: ISODate;
  /** pode resgatar a qualquer momento */
  liquidezDiaria?: boolean;
}

export interface Asset {
  id: string;
  tipo: AssetType;
  nome: string;
  /** B3 (PETR4, HGLG11, IVVB11…) */
  ticker?: string;
  /** id da CoinGecko (bitcoin, ethereum…) */
  coingeckoId?: string;
  instituicaoId?: string;
  /** meta (Orçamento › Metas) que este ativo ajuda a cumprir */
  metaId?: string;
  rf?: FixedIncomeTerms;
  /**
   * preço digitado (R$ por unidade). Vale o mais recente entre ele e a cotação
   * automática (ex.: corrigir uma cotação atrasada, ou ativos sem cotação).
   */
  cotacaoManual?: { preco: number; em: string };
  /** valor atual informado pelo usuário (fundos, previdência, ou ajuste da renda fixa) */
  valorManual?: { valor: number; data: ISODate };
  /** coberto pelo FGC (CDB, LCI, LCA, LC…) */
  fgc?: boolean;
  notas?: string;
  criadoEm: ISODate;
  /** arquivado: some das listas, mas o histórico continua nos relatórios */
  arquivado?: boolean;
}

export type OperationType =
  | 'compra'
  | 'venda'
  | 'aporte'
  | 'resgate'
  | 'provento'
  | 'desdobramento'
  | 'grupamento'
  | 'bonificacao'
  | 'taxa';

export type IncomeType = 'dividendo' | 'jcp' | 'rendimento' | 'juros' | 'amortizacao' | 'outro';

export interface Operation {
  id: string;
  assetId: string;
  tipo: OperationType;
  data: ISODate;
  /** compra/venda/bonificação: unidades (decimais para cripto e frações) */
  quantidade?: number;
  /** compra/venda: R$ por unidade */
  preco?: number;
  /**
   * centavos. compra/venda: quantidade × preço (sem custos) · aporte/resgate:
   * valor aplicado/retirado (bruto) · provento: valor bruto · bonificação: custo
   * atribuído · taxa: valor pago
   */
  valor: number;
  /** corretagem, emolumentos (centavos) */
  custos?: number;
  proventoTipo?: IncomeType;
  /** desdobramento 1→2: fator 2 · grupamento 10→1: fator 0.1 */
  fator?: number;
  /** IR retido na fonte (JCP, resgates de renda fixa…) */
  irRetido?: number;
  nota?: string;
}

export interface Institution {
  id: string;
  nome: string;
}

export interface Quote {
  /** R$ por unidade */
  price: number;
  /** variação do dia em fração (0.012 = +1,2%) */
  changePct?: number;
  /** ISO com hora */
  updatedAt: string;
  source: 'brapi' | 'coingecko';
}

/** Séries do Banco Central (taxas em fração). */
export interface RateState {
  /** CDI anualizado (base 252) */
  cdiAnual: number;
  /** meta Selic a.a. */
  selicMeta: number;
  /** IPCA acumulado em 12 meses */
  ipca12m: number;
  /** data das taxas acima */
  referencia?: ISODate;
  /** 'bcb' (atualizado), 'manual' (digitado) ou 'padrao' (nunca atualizado) */
  origem: 'bcb' | 'manual' | 'padrao';
  /** quando foi buscado (ISO com hora) */
  atualizadoEm?: string;
  /** CDI diário por dia útil (fração ao dia) */
  cdiDiario: Record<ISODate, number>;
  /** Selic diária por dia útil (fração ao dia) */
  selicDiaria: Record<ISODate, number>;
  /** IPCA mensal (fração ao mês) */
  ipcaMensal: Record<YM, number>;
}

/** Foto mensal da carteira (para o gráfico de evolução). */
export interface Snapshot {
  ym: YM;
  patrimonio: number;
  investido: number;
}

export type AllocationTargets = Partial<Record<AssetClass, number>>;

export interface InvestSettings {
  /** token gratuito da brapi.dev fica no SecureStore — aqui só se existe */
  hasBrapiToken: boolean;
  hasCoingeckoKey: boolean;
  /** atualizar cotações ao abrir a Carteira */
  autoRefresh: boolean;
}
