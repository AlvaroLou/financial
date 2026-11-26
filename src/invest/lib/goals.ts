/**
 * Metas com investimentos vinculados: o progresso é o valor guardado "à parte"
 * (manual, `goal.atual`) + o valor atual dos ativos vinculados (`asset.metaId`).
 * Ativos que apontam para uma meta apagada são simplesmente ignorados.
 */
import type { Goal } from '@/types';

import type { AssetValuation } from './portfolio';

export interface GoalLinks {
  /** valor atual somado dos ativos vinculados (centavos) */
  valor: number;
  assets: AssetValuation[];
}

export function linksByGoal(valuations: AssetValuation[]): Record<string, GoalLinks> {
  const out: Record<string, GoalLinks> = {};
  for (const v of valuations) {
    const id = v.asset.metaId;
    if (!id || v.fechado) continue;
    const entry = (out[id] ??= { valor: 0, assets: [] });
    entry.valor += v.valorAtual;
    entry.assets.push(v);
  }
  return out;
}

export interface GoalProgress {
  manual: number;
  linked: number;
  total: number;
  /** 0..1+ */
  ratio: number;
  missing: number;
  done: boolean;
}

export function goalProgress(goal: Goal, links?: GoalLinks): GoalProgress {
  const manual = goal.atual;
  const linked = links?.valor ?? 0;
  const total = manual + linked;
  return {
    manual,
    linked,
    total,
    ratio: goal.alvo > 0 ? total / goal.alvo : 0,
    missing: Math.max(0, goal.alvo - total),
    done: goal.alvo > 0 && total >= goal.alvo,
  };
}
