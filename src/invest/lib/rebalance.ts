/**
 * Rebalanceamento por aporte: dada a alocação-alvo (% por classe) e um valor
 * novo, sugere quanto aportar em cada classe para chegar mais perto do alvo
 * SEM vender nada. Primeiro cobre as classes abaixo do alvo (proporcional ao
 * que falta); se sobrar, distribui pelo alvo.
 */
import type { AssetClass, AllocationTargets } from '../types';

export interface RebalanceRow {
  classe: AssetClass;
  atual: number;
  atualPct: number;
  alvoPct: number;
  /** valor ideal depois do aporte */
  ideal: number;
  aportar: number;
  depoisPct: number;
}

export function targetsTotal(targets: AllocationTargets): number {
  return Object.values(targets).reduce((a: number, v) => a + (v ?? 0), 0);
}

export function rebalance(
  current: Partial<Record<AssetClass, number>>,
  targets: AllocationTargets,
  contribution: number,
): RebalanceRow[] {
  const classes = [...new Set([...Object.keys(current), ...Object.keys(targets)])] as AssetClass[];
  const total = classes.reduce((a, c) => a + (current[c] ?? 0), 0);
  const sumTargets = targetsTotal(targets) || 1;
  const after = total + contribution;

  const rows = classes.map((classe) => {
    const atual = current[classe] ?? 0;
    const alvoPct = (targets[classe] ?? 0) / sumTargets;
    const ideal = after * alvoPct;
    return { classe, atual, alvoPct, ideal, deficit: Math.max(0, ideal - atual) };
  });

  const totalDeficit = rows.reduce((a, r) => a + r.deficit, 0);
  let remaining = contribution;
  const aportes = new Map<AssetClass, number>();
  if (totalDeficit > 0) {
    const scale = Math.min(1, contribution / totalDeficit);
    for (const r of rows) {
      const v = Math.floor(r.deficit * scale);
      aportes.set(r.classe, v);
      remaining -= v;
    }
  }
  if (remaining > 0) {
    // sobra (ou alvo já atingido): distribui pelo alvo; o resto dos centavos vai para a maior fatia
    const withTarget = rows.filter((r) => r.alvoPct > 0);
    let given = 0;
    for (const r of withTarget) {
      const v = Math.floor(remaining * r.alvoPct);
      aportes.set(r.classe, (aportes.get(r.classe) ?? 0) + v);
      given += v;
    }
    const biggest = [...withTarget].sort((a, b) => b.alvoPct - a.alvoPct)[0];
    if (biggest) aportes.set(biggest.classe, (aportes.get(biggest.classe) ?? 0) + (remaining - given));
  }

  return rows
    .map((r) => {
      const aportar = aportes.get(r.classe) ?? 0;
      return {
        classe: r.classe,
        atual: r.atual,
        atualPct: total > 0 ? r.atual / total : 0,
        alvoPct: r.alvoPct,
        ideal: Math.round(r.ideal),
        aportar,
        depoisPct: after > 0 ? (r.atual + aportar) / after : 0,
      };
    })
    .sort((a, b) => b.aportar - a.aportar || b.alvoPct - a.alvoPct);
}
