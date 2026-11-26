import * as Print from 'expo-print';

import { buildCsv, buildPdfHtml, exportFileName } from '@/lib/export';
import type { Category, Occurrence, YM } from '@/types';

/** Navegador: baixa o CSV diretamente. */
export async function exportCsv(
  ym: YM,
  occurrences: Occurrence[],
  categories: Record<string, Category>,
): Promise<boolean> {
  const blob = new Blob([buildCsv(occurrences, categories)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(ym, 'csv');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Navegador: abre a janela de impressão (o usuário escolhe "Salvar como PDF"). */
export async function exportPdf(
  ym: YM,
  occurrences: Occurrence[],
  categories: Record<string, Category>,
): Promise<boolean> {
  await Print.printAsync({ html: buildPdfHtml(ym, occurrences, categories) });
  return true;
}
