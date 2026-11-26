import { useMemo } from 'react';

import { addMonths } from '@/lib/dates';
import { monthOccurrences, summarize, totalBudget } from '@/lib/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import type { Category } from '@/types';

/** Dados derivados do mês selecionado (lançamentos, resumo, mês anterior, orçamento). */
export function useMonthData() {
  const records = useFinanceStore((s) => s.records);
  const categories = useFinanceStore((s) => s.categories);
  const month = useFinanceStore((s) => s.month);

  return useMemo(() => {
    const occurrences = monthOccurrences(records, month);
    const summary = summarize(occurrences);
    const prevMonth = addMonths(month, -1);
    const prevSummary = summarize(monthOccurrences(records, prevMonth));
    const budget = totalBudget(categories);
    return { month, prevMonth, occurrences, summary, prevSummary, budget };
  }, [records, categories, month]);
}

/** id -> categoria (para evitar `find` em cada linha de lista). */
export function useCategoryMap(): Record<string, Category> {
  const categories = useFinanceStore((s) => s.categories);
  return useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
}
