/**
 * Geração do conteúdo exportado (CSV e HTML do PDF) — funções puras.
 * Salvar/compartilhar o arquivo fica em lib/share.ts (nativo) e lib/share.web.ts (navegador).
 */
import { displayDate, monthLabel } from '@/lib/dates';
import { NATURE_LABEL, PAYMENT_LABEL } from '@/lib/labels';
import { brl, formatNumber } from '@/lib/money';
import type { Category, Occurrence, YM } from '@/types';

/* ---------------------------------------------------------------- CSV */

function csvCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV no padrão brasileiro: separador `;`, decimais com vírgula e BOM UTF-8
 * (o Excel em pt-BR abre acentos corretamente).
 */
export function buildCsv(occurrences: Occurrence[], categories: Record<string, Category>): string {
  const header = ['Data', 'Tipo', 'Nome', 'Categoria', 'Natureza', 'Forma de pagamento', 'Parcela', 'Valor (R$)'];
  const lines = occurrences.map((o) =>
    [
      displayDate(o.data),
      o.record.kind === 'despesa' ? 'Despesa' : 'Receita',
      o.record.nome,
      categories[o.record.categoriaId]?.nome ?? '',
      NATURE_LABEL[o.record.natureza],
      PAYMENT_LABEL[o.record.forma],
      o.parcela ? `${o.parcela.atual}/${o.parcela.total}` : '',
      `${o.record.kind === 'despesa' ? '-' : ''}${formatNumber(o.valor)}`,
    ]
      .map(csvCell)
      .join(';'),
  );
  return `﻿${[header.join(';'), ...lines].join('\r\n')}`;
}

export const exportFileName = (ym: YM, ext: 'csv' | 'pdf') => `dinheiro-em-dia-${ym}.${ext}`;

/* ---------------------------------------------------------------- PDF */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildPdfHtml(ym: YM, occurrences: Occurrence[], categories: Record<string, Category>): string {
  const receitas = occurrences.filter((o) => o.record.kind === 'receita').reduce((a, o) => a + o.valor, 0);
  const despesas = occurrences.filter((o) => o.record.kind === 'despesa').reduce((a, o) => a + o.valor, 0);
  const rows = occurrences
    .map(
      (o) => `<tr>
        <td>${displayDate(o.data)}</td>
        <td>${esc(o.record.nome)}${o.parcela ? ` <small>(${o.parcela.atual}/${o.parcela.total})</small>` : ''}</td>
        <td>${esc(categories[o.record.categoriaId]?.nome ?? '')}</td>
        <td>${PAYMENT_LABEL[o.record.forma]}</td>
        <td class="num ${o.record.kind}">${o.record.kind === 'despesa' ? '−' : '+'} ${brl(o.valor)}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#172E28;padding:24px}
    h1{margin:0 0 4px;font-size:22px} p{margin:0 0 16px;color:#5C6D65}
    .sum{display:flex;gap:12px;margin-bottom:20px}
    .sum div{flex:1;border:1px solid #E1E8DF;border-radius:10px;padding:10px 12px}
    .sum b{display:block;font-size:16px;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;color:#5C6D65;border-bottom:2px solid #E1E8DF;padding:6px 4px}
    td{border-bottom:1px solid #E1E8DF;padding:6px 4px}
    .num{text-align:right;white-space:nowrap} .despesa{color:#B3362B} .receita{color:#21644C}
  </style></head><body>
  <h1>Extrato · ${monthLabel(ym)}</h1><p>Dinheiro em Dia</p>
  <div class="sum">
    <div>Receitas<b class="receita">${brl(receitas)}</b></div>
    <div>Despesas<b class="despesa">${brl(despesas)}</b></div>
    <div>Saldo<b>${brl(receitas - despesas)}</b></div>
  </div>
  <table><thead><tr><th>Data</th><th>Lançamento</th><th>Categoria</th><th>Pagamento</th><th class="num">Valor</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
}
