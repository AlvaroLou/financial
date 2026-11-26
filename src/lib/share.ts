import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildCsv, buildPdfHtml, exportFileName } from '@/lib/export';
import type { Category, Occurrence, YM } from '@/types';

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
  return true;
}

/** Gera o CSV do mês e abre o menu de compartilhamento. Retorna false se o aparelho não compartilha arquivos. */
export async function exportCsv(
  ym: YM,
  occurrences: Occurrence[],
  categories: Record<string, Category>,
): Promise<boolean> {
  const file = new File(Paths.cache, exportFileName(ym, 'csv'));
  file.create({ overwrite: true });
  file.write(buildCsv(occurrences, categories));
  return shareFile(file.uri, 'text/csv', 'Exportar extrato (CSV)');
}

/** Gera o PDF do mês e abre o menu de compartilhamento. */
export async function exportPdf(
  ym: YM,
  occurrences: Occurrence[],
  categories: Record<string, Category>,
): Promise<boolean> {
  const { uri } = await Print.printToFileAsync({ html: buildPdfHtml(ym, occurrences, categories) });
  return shareFile(uri, 'application/pdf', 'Exportar extrato (PDF)');
}
