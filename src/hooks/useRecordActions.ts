import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { SwipeAction } from '@/components/SwipeableRow';
import { useDialog } from '@/components/ui/Dialog';
import { useSnackbar } from '@/components/ui/Snackbar';
import { monthIndex, monthName, ymOf } from '@/lib/dates';
import { isRecurring } from '@/lib/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { FinanceRecord, YM } from '@/types';

/**
 * Ações compartilhadas de um lançamento: abrir/editar, duplicar e excluir (com desfazer).
 * `ym` é o mês da ocorrência tocada — importa para recorrentes ("excluir a partir deste mês").
 */
export function useRecordActions() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const deleteRecord = useFinanceStore((s) => s.deleteRecord);
  const restoreRecord = useFinanceStore((s) => s.restoreRecord);
  const duplicateRecord = useFinanceStore((s) => s.duplicateRecord);
  const endRecurrence = useFinanceStore((s) => s.endRecurrence);

  const edit = useCallback(
    (id: string, ym?: YM) => router.push({ pathname: '/registro', params: ym ? { id, ym } : { id } }),
    [router],
  );

  const undoable = useCallback(
    (message: string, original: FinanceRecord) =>
      showSnackbar({ message, actionLabel: t('common.undo'), onAction: () => restoreRecord(original) }),
    [restoreRecord, showSnackbar, t],
  );

  /** Exclui de vez (todos os meses). */
  const remove = useCallback(
    (id: string) => {
      const removed = deleteRecord(id);
      if (removed) undoable(t('recordActions.deleted', { name: removed.nome }), removed);
    },
    [deleteRecord, undoable, t],
  );

  /**
   * Exclusão a partir de uma ocorrência. Lançamentos recorrentes vistos depois do
   * primeiro mês perguntam se é para encerrar a partir daqui ou apagar o histórico todo.
   * `onDone` roda depois que algo foi de fato excluído (ex.: fechar a tela de edição).
   */
  const removeOccurrence = useCallback(
    (record: FinanceRecord, ym: YM, onDone?: () => void) => {
      const recurringLater = isRecurring(record) && monthIndex(ym) > monthIndex(ymOf(record.data));
      if (!recurringLater) {
        remove(record.id);
        onDone?.();
        return;
      }
      ask({
        title: t('recordActions.deleteRecurringTitle', { name: record.nome }),
        message: t('recordActions.deleteRecurringMessage'),
        actions: [
          {
            label: t('recordActions.fromMonth', { month: monthName(ym) }),
            onPress: () => {
              const original = endRecurrence(record.id, ym);
              if (original) undoable(t('recordActions.endedFrom', { name: record.nome, month: monthName(ym) }), original);
              onDone?.();
            },
          },
          {
            label: t('recordActions.allMonths'),
            style: 'destructive',
            onPress: () => {
              remove(record.id);
              onDone?.();
            },
          },
          { label: t('common.cancel'), style: 'cancel' },
        ],
      });
    },
    [ask, endRecurrence, remove, undoable, t],
  );

  const duplicate = useCallback(
    (id: string) => {
      const copyId = duplicateRecord(id);
      if (copyId) {
        showSnackbar({ message: t('recordActions.duplicated'), actionLabel: t('common.edit'), onAction: () => edit(copyId) });
      }
    },
    [duplicateRecord, edit, showSnackbar, t],
  );

  const swipeActions = useCallback(
    (record: FinanceRecord, ym: YM): SwipeAction[] => [
      {
        key: 'edit',
        label: t('common.edit'),
        icon: 'edit',
        color: colors.primary,
        background: colors.tint,
        onPress: () => edit(record.id, ym),
      },
      {
        key: 'duplicate',
        label: t('common.duplicate'),
        icon: 'copy',
        color: colors.tagText,
        background: colors.tag,
        onPress: () => duplicate(record.id),
      },
      {
        key: 'delete',
        label: t('common.delete'),
        icon: 'trash',
        color: colors.expense,
        background: colors.expenseTint,
        onPress: () => removeOccurrence(record, ym),
      },
    ],
    [edit, duplicate, removeOccurrence, colors, t],
  );

  return { edit, remove, removeOccurrence, duplicate, swipeActions };
}
