import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf' });
  return true;
}

/** Grava o CSV no cache e abre o menu de compartilhamento. false = o aparelho não compartilha arquivos. */
export async function shareCsv(content: string, fileName: string, dialogTitle: string): Promise<boolean> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(content);
  return shareFile(file.uri, 'text/csv', dialogTitle);
}

/** Gera o PDF a partir do HTML, dá um nome legível e abre o menu de compartilhamento. */
export async function sharePdf(html: string, fileName: string, dialogTitle: string): Promise<boolean> {
  const { uri } = await Print.printToFileAsync({ html });
  let target = uri;
  try {
    const dest = new File(Paths.cache, fileName);
    if (dest.exists) dest.delete();
    new File(uri).move(dest);
    target = dest.uri;
  } catch {
    // mantém o nome gerado pelo sistema
  }
  return shareFile(target, 'application/pdf', dialogTitle);
}
