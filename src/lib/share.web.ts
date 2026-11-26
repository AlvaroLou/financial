import * as Print from 'expo-print';

/** Navegador: baixa o CSV diretamente. */
export async function shareCsv(content: string, fileName: string, _dialogTitle: string): Promise<boolean> {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Navegador: abre a janela de impressão (o usuário escolhe "Salvar como PDF"). */
export async function sharePdf(html: string, _fileName: string, _dialogTitle: string): Promise<boolean> {
  await Print.printAsync({ html });
  return true;
}
