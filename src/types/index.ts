import type { IconName } from '@/components/ui/Icon';
import type { LanguageCode } from '@/i18n/languages';
import type { AppId, ThemeMode } from '@/theme/palette';

/** 'YYYY-MM' */
export type YM = string;
/** 'YYYY-MM-DD' */
export type ISODate = string;

export type RecordKind = 'despesa' | 'receita';
export type Nature = 'fixo' | 'variavel';
export type PaymentMethod = 'credito' | 'pix' | 'debito' | 'dinheiro' | 'boleto';

export interface Category {
  id: string;
  nome: string;
  icone: IconName;
  kind: RecordKind;
  /** tag padrão sugerida ao criar um lançamento dessa categoria */
  naturezaPadrao: Nature;
  /** limite mensal em centavos (somente despesas); 0 = sem limite definido */
  limiteMensal: number;
  /** categoria do sistema (ex.: "Cartão"): não pode ser excluída nem renomeada */
  fixa?: boolean;
}

/**
 * Um lançamento. Valores monetários sempre em CENTAVOS (inteiros).
 *
 * Compras parceladas são UM registro: `valorTotal` é o total da compra e
 * `parcelaAtual` é a parcela que cai no mês de `data`. As parcelas dos outros
 * meses são derivadas (ver lib/finance.ts -> occurrenceIn).
 */
export interface FinanceRecord {
  id: string;
  kind: RecordKind;
  nome: string;
  descricao: string;
  valorTotal: number;
  natureza: Nature;
  forma: PaymentMethod;
  data: ISODate;
  /** categoria PRINCIPAL: é a que conta no orçamento e nos gráficos */
  categoriaId: string;
  /**
   * Outras categorias do mesmo tipo em que o lançamento também aparece (ex.:
   * "Cartão"). Servem para filtros e relatórios — não somam no orçamento.
   */
  etiquetas?: string[];
  icone?: IconName;
  parcelado: boolean;
  parcelaAtual?: number;
  parcelasTotais?: number;
  /**
   * Lançamento recorrente (aluguel, salário, assinaturas): repete todo mês a
   * partir de `data`. Não se combina com `parcelado`.
   */
  recorrente?: boolean;
  /** último mês (inclusive) da recorrência; ausente = sem fim */
  recorrenteAte?: YM;
  /**
   * Vencimento da parcela/boleto referente ao mês de `data`. Nos meses
   * seguintes, a distância em meses entre `data` e `vencimento` é mantida
   * (ex.: compra em 28/11 com vencimento 03/12 -> parcela de dezembro vence 03/01).
   */
  vencimento?: ISODate;
}

/** Lançamento materializado em um mês específico (já considera parcelas). */
export interface Occurrence {
  key: string;
  record: FinanceRecord;
  data: ISODate;
  /** valor que cai neste mês, em centavos */
  valor: number;
  parcela?: { atual: number; total: number };
  vencimento?: ISODate;
}

export interface Account {
  id: string;
  nome: string;
  tipo: 'conta' | 'carteira';
  saldo: number;
}

export interface CreditCard {
  id: string;
  nome: string;
  final: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
}

export interface Goal {
  id: string;
  nome: string;
  icone: IconName;
  atual: number;
  alvo: number;
}

export type GoalInput = Omit<Goal, 'id'>;
export type CategoryInput = Omit<Category, 'id'>;
export type AccountInput = Omit<Account, 'id'>;
export type CardInput = Omit<CreditCard, 'id'>;

export interface Settings {
  /** dia em que o ciclo financeiro fecha (1-31) */
  diaFechamentoMes: number;
  alertaVencimento: boolean;
  alertaOrcamento: boolean;
  biometria: boolean;
  /** padrão das telas iniciais (o olho só mostra temporariamente) */
  ocultarSaldo: boolean;
  /** claro, escuro ou automático (segue o aparelho) */
  themeMode: ThemeMode;
  /** cor de destaque do Orçamento */
  accentOrcamento: string;
  /** cor de destaque dos Investimentos */
  accentInvest: string;
  /** null = idioma do aparelho */
  language: LanguageCode | null;
  /** app aberto por último (o app reabre nele) */
  appMode: AppId;
}

export interface MonthSummary {
  receitas: number;
  despesas: number;
  saldo: number;
  fixos: number;
  variaveis: number;
  parcelas: number;
  porForma: Record<PaymentMethod, number>;
  /** despesas por categoria PRINCIPAL (é o que soma no orçamento) */
  porCategoria: Record<string, number>;
  /** despesas por etiqueta (o mesmo lançamento pode estar em várias; não somar com o total) */
  porEtiqueta: Record<string, number>;
}
