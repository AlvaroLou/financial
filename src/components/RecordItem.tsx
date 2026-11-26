import { useTranslation } from 'react-i18next';

import { RecordRow, recordA11yLabel } from '@/components/RecordRow';
import { SwipeableRow } from '@/components/SwipeableRow';
import { useRecordActions } from '@/hooks/useRecordActions';
import { ymOf } from '@/lib/dates';
import type { Category, Occurrence } from '@/types';

/** Linha de lançamento completa: toque abre a edição; deslizar revela Editar / Duplicar / Excluir. */
export function RecordItem({
  occurrence,
  category,
  categories,
  showDate,
}: {
  occurrence: Occurrence;
  category?: Category;
  /** mapa de categorias (para as etiquetas e o texto de acessibilidade) */
  categories?: Record<string, Category>;
  showDate?: boolean;
}) {
  useTranslation(); // re-renderiza ao trocar de idioma
  const { edit, swipeActions } = useRecordActions();
  const ym = ymOf(occurrence.data);

  return (
    <SwipeableRow
      actions={swipeActions(occurrence.record, ym)}
      onPress={() => edit(occurrence.record.id, ym)}
      accessibilityLabel={recordA11yLabel(occurrence, categories)}
    >
      <RecordRow occurrence={occurrence} category={category} categories={categories} showDate={showDate} />
    </SwipeableRow>
  );
}
