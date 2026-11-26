import { useMemo } from 'react';

import { todayISO } from '@/lib/clock';

import { linksByGoal, type GoalLinks } from './lib/goals';
import { summarizePortfolio, type PortfolioSummary } from './lib/portfolio';
import { useInvestStore, useMarketStore } from './store';

/** Resumo da carteira com as cotações e taxas guardadas (recalcula quando algo muda). */
export function usePortfolio(): PortfolioSummary {
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const quotes = useMarketStore((s) => s.quotes);
  const rates = useMarketStore((s) => s.rates);
  const today = todayISO();
  return useMemo(
    () => summarizePortfolio(assets, operations, { quotes, rates, today }),
    [assets, operations, quotes, rates, today],
  );
}

/** Ativos vinculados a cada meta (id da meta -> valor e ativos). */
export function useGoalLinks(): Record<string, GoalLinks> {
  const summary = usePortfolio();
  return useMemo(() => linksByGoal(summary.valuations), [summary]);
}
