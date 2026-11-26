import { DEFAULT_ACCENTS } from '@/theme/palette';
import type { Category, Settings } from '@/types';

/** Id da categoria fixa "Cartão" (não pode ser excluída; vira etiqueta automática no crédito). */
export const CARD_CATEGORY_ID = 'cartao';

export const cardCategory: Category = {
  id: CARD_CATEGORY_ID,
  nome: 'Cartão',
  icone: 'card',
  kind: 'despesa',
  naturezaPadrao: 'variavel',
  limiteMensal: 0,
  fixa: true,
};

/**
 * Estrutura inicial do app — SEM valores: nenhum lançamento, conta ou meta, e
 * categorias sem limite. O usuário edita, exclui ou cria categorias em Ajustes.
 * (Os ids das categorias padrão fixam as cores dos gráficos em theme/tokens.ts.)
 * Os nomes ficam em pt-BR nos dados; enquanto o usuário não renomear, a tela
 * mostra o nome traduzido (ver i18n/labels.ts -> categoryName).
 */
export const defaultCategories: Category[] = [
  { id: 'moradia', nome: 'Moradia', icone: 'home', kind: 'despesa', naturezaPadrao: 'fixo', limiteMensal: 0 },
  { id: 'alimentacao', nome: 'Alimentação', icone: 'utensils', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 0 },
  { id: 'transporte', nome: 'Transporte', icone: 'car', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 0 },
  { id: 'saude', nome: 'Saúde', icone: 'heart', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 0 },
  { id: 'lazer', nome: 'Lazer', icone: 'film', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 0 },
  cardCategory,
  { id: 'outros', nome: 'Outros', icone: 'dots', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: 0 },
  { id: 'renda', nome: 'Salário', icone: 'briefcase', kind: 'receita', naturezaPadrao: 'fixo', limiteMensal: 0 },
  { id: 'extras', nome: 'Outras receitas', icone: 'cash', kind: 'receita', naturezaPadrao: 'variavel', limiteMensal: 0 },
];

/** Nome original (pt-BR) de cada categoria padrão. */
export const DEFAULT_CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  defaultCategories.map((c) => [c.id, c.nome]),
);

export const defaultSettings: Settings = {
  diaFechamentoMes: 30,
  alertaVencimento: true,
  alertaOrcamento: true,
  biometria: false,
  ocultarSaldo: false,
  themeMode: 'auto',
  accentOrcamento: DEFAULT_ACCENTS.orcamento,
  accentInvest: DEFAULT_ACCENTS.investimentos,
  language: null,
  appMode: 'orcamento',
};

/** Preferências que sobrevivem a "Apagar todos os dados". */
export const PRESERVED_SETTINGS = [
  'biometria',
  'ocultarSaldo',
  'themeMode',
  'accentOrcamento',
  'accentInvest',
  'language',
  'appMode',
] as const satisfies readonly (keyof Settings)[];
