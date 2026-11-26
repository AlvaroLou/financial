/**
 * Dados FICTÍCIOS usados só nos testes (não entram no app).
 * Reproduzem o layout V3 (novembro/2026) para servir de regressão das regras de cálculo.
 */
import type { Category, FinanceRecord } from '@/types';

/** reais -> centavos */
const c = (reais: number) => Math.round(reais * 100);

export const fixtureCategories: Category[] = [
  { id: 'moradia', nome: 'Moradia', icone: 'home', kind: 'despesa', naturezaPadrao: 'fixo', limiteMensal: c(1800) },
  { id: 'alimentacao', nome: 'Alimentação', icone: 'utensils', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: c(1000) },
  { id: 'transporte', nome: 'Transporte', icone: 'car', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: c(500) },
  { id: 'lazer', nome: 'Lazer', icone: 'film', kind: 'despesa', naturezaPadrao: 'variavel', limiteMensal: c(900) },
  { id: 'renda', nome: 'Renda', icone: 'briefcase', kind: 'receita', naturezaPadrao: 'fixo', limiteMensal: 0 },
];

/**
 * Novembro/2026 fecha nos números do layout:
 * receitas 6.500 | despesas 3.240 (fixos 1.800 + variáveis 1.440) | saldo 3.260
 * crédito 1.440 · PIX 1.000 · débito 420 · dinheiro 180 · boleto 200
 * moradia 1.400 · alimentação 720 · transporte 320 · lazer 800
 * Parcelas de dezembro: 640. Aluguel, Internet, Assinaturas, Academia e Salário são recorrentes desde outubro.
 */
export const fixtureRecords: FinanceRecord[] = [
  { id: 'n01', kind: 'despesa', nome: 'Notebook', descricao: '', valorTotal: c(2400), natureza: 'variavel', forma: 'credito', data: '2026-11-25', categoriaId: 'moradia', parcelado: true, parcelaAtual: 3, parcelasTotais: 10, vencimento: '2026-11-27' },
  { id: 'n02', kind: 'despesa', nome: 'Mercado', descricao: '', valorTotal: c(320), natureza: 'variavel', forma: 'debito', data: '2026-11-25', categoriaId: 'alimentacao', parcelado: false },
  { id: 'n03', kind: 'despesa', nome: 'Geladeira', descricao: '', valorTotal: c(1920), natureza: 'fixo', forma: 'credito', data: '2026-11-24', categoriaId: 'moradia', parcelado: true, parcelaAtual: 2, parcelasTotais: 12, vencimento: '2026-11-29' },
  { id: 'n05', kind: 'despesa', nome: 'Transporte por app', descricao: '', valorTotal: c(42), natureza: 'variavel', forma: 'debito', data: '2026-11-23', categoriaId: 'transporte', parcelado: false },
  { id: 'n06', kind: 'despesa', nome: 'Show', descricao: '', valorTotal: c(180), natureza: 'variavel', forma: 'credito', data: '2026-11-22', categoriaId: 'lazer', parcelado: false },
  { id: 'n07', kind: 'despesa', nome: 'Lanche', descricao: '', valorTotal: c(20), natureza: 'variavel', forma: 'debito', data: '2026-11-22', categoriaId: 'lazer', parcelado: false },
  { id: 'n08', kind: 'despesa', nome: 'Restaurantes', descricao: '', valorTotal: c(320), natureza: 'variavel', forma: 'credito', data: '2026-11-21', categoriaId: 'alimentacao', parcelado: false },
  { id: 'n09', kind: 'despesa', nome: 'Cinema', descricao: '', valorTotal: c(100), natureza: 'variavel', forma: 'dinheiro', data: '2026-11-20', categoriaId: 'lazer', parcelado: false },
  { id: 'n10', kind: 'despesa', nome: 'Estacionamento', descricao: '', valorTotal: c(38), natureza: 'variavel', forma: 'debito', data: '2026-11-20', categoriaId: 'transporte', parcelado: false },
  { id: 'n11', kind: 'despesa', nome: 'Feira', descricao: '', valorTotal: c(80), natureza: 'variavel', forma: 'dinheiro', data: '2026-11-18', categoriaId: 'alimentacao', parcelado: false },
  { id: 'n12', kind: 'despesa', nome: 'Presente', descricao: '', valorTotal: c(100), natureza: 'variavel', forma: 'pix', data: '2026-11-18', categoriaId: 'lazer', parcelado: false },
  { id: 'n13', kind: 'despesa', nome: 'Seguro Auto', descricao: '', valorTotal: c(2880), natureza: 'fixo', forma: 'credito', data: '2026-11-15', categoriaId: 'transporte', parcelado: true, parcelaAtual: 10, parcelasTotais: 12, vencimento: '2026-11-30' },
  { id: 'n16', kind: 'receita', nome: 'Freelance', descricao: '', valorTotal: c(1000), natureza: 'variavel', forma: 'pix', data: '2026-11-10', categoriaId: 'renda', parcelado: false },
  // recorrentes desde outubro
  { id: 'o01', kind: 'despesa', nome: 'Aluguel', descricao: '', valorTotal: c(900), natureza: 'fixo', forma: 'pix', data: '2026-10-05', categoriaId: 'moradia', parcelado: false, recorrente: true },
  { id: 'o02', kind: 'despesa', nome: 'Internet', descricao: '', valorTotal: c(100), natureza: 'fixo', forma: 'boleto', data: '2026-10-24', categoriaId: 'moradia', parcelado: false, recorrente: true },
  { id: 'o06', kind: 'despesa', nome: 'Assinaturas', descricao: '', valorTotal: c(300), natureza: 'fixo', forma: 'credito', data: '2026-10-15', categoriaId: 'lazer', parcelado: false, recorrente: true },
  { id: 'o07', kind: 'despesa', nome: 'Academia', descricao: '', valorTotal: c(100), natureza: 'fixo', forma: 'boleto', data: '2026-10-10', categoriaId: 'lazer', parcelado: false, recorrente: true },
  { id: 'o09', kind: 'receita', nome: 'Salário', descricao: '', valorTotal: c(5500), natureza: 'fixo', forma: 'pix', data: '2026-10-05', categoriaId: 'renda', parcelado: false, recorrente: true },
  // outubro (despesas = 3.510)
  { id: 'o03', kind: 'despesa', nome: 'Mercado', descricao: '', valorTotal: c(540), natureza: 'variavel', forma: 'debito', data: '2026-10-20', categoriaId: 'alimentacao', parcelado: false },
  { id: 'o04', kind: 'despesa', nome: 'Restaurantes', descricao: '', valorTotal: c(380), natureza: 'variavel', forma: 'credito', data: '2026-10-18', categoriaId: 'alimentacao', parcelado: false },
  { id: 'o05', kind: 'despesa', nome: 'Combustível', descricao: '', valorTotal: c(300), natureza: 'variavel', forma: 'credito', data: '2026-10-12', categoriaId: 'transporte', parcelado: false },
  { id: 'o08', kind: 'despesa', nome: 'Passeios', descricao: '', valorTotal: c(250), natureza: 'variavel', forma: 'credito', data: '2026-10-22', categoriaId: 'lazer', parcelado: false },
  { id: 'o10', kind: 'receita', nome: 'Freelance', descricao: '', valorTotal: c(1500), natureza: 'variavel', forma: 'pix', data: '2026-10-12', categoriaId: 'renda', parcelado: false },
];
