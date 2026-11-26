/**
 * Rótulos traduzidos de dados do app (formas de pagamento, natureza, categorias
 * padrão, vencimentos). Use dentro de componentes que chamam `useTranslation()`
 * (assim re-renderizam ao trocar de idioma).
 */
import { DEFAULT_CATEGORY_NAMES } from '@/data/defaults';
import i18n from '@/i18n';
import type { Category, Nature, PaymentMethod, RecordKind } from '@/types';

export const paymentLabel = (p: PaymentMethod) => i18n.t(`payment.${p}`);

export const natureLabel = (n: Nature) => i18n.t(`nature.${n}`);

/** "Gasto Fixo" / "Fixa" etc. — o texto muda conforme o tipo do lançamento */
export const natureLabelFor = (n: Nature, kind: RecordKind) =>
  i18n.t(kind === 'despesa' ? `nature.${n}Expense` : `nature.${n}Income`);

export const kindLabel = (k: RecordKind) => i18n.t(`kind.${k}`);

/**
 * Nome exibido de uma categoria: as categorias padrão aparecem traduzidas
 * enquanto o usuário não as renomear; as criadas pelo usuário, como foram escritas.
 */
export function categoryName(c: Pick<Category, 'id' | 'nome'> | undefined): string {
  if (!c) return '';
  return DEFAULT_CATEGORY_NAMES[c.id] === c.nome ? i18n.t(`categories.${c.id}`) : c.nome;
}

/** "vence hoje", "vence amanhã", "em 2 dias", "venceu há 1 dia" */
export function dueLabel(daysLeft: number): string {
  if (daysLeft === 0) return i18n.t('due.today');
  if (daysLeft === 1) return i18n.t('due.tomorrow');
  if (daysLeft > 1) return i18n.t('due.inDays', { count: daysLeft });
  return i18n.t('due.overdue', { count: Math.abs(daysLeft) });
}
