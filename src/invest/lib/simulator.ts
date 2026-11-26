/**
 * Simulador de juros compostos (valores brutos, sem IR): valor futuro, tempo
 * até a meta e aporte mensal necessário. Taxas anuais convertidas para mensais
 * equivalentes. Valores em centavos.
 */
import { monthlyFromAnnual } from './fixedIncome';

export function futureValue(initial: number, monthly: number, annualRate: number, months: number): number {
  const i = monthlyFromAnnual(annualRate);
  if (months <= 0) return initial;
  if (Math.abs(i) < 1e-12) return Math.round(initial + monthly * months);
  const g = (1 + i) ** months;
  return Math.round(initial * g + monthly * ((g - 1) / i));
}

/** Meses até atingir `target` (null se não chegar em 100 anos). */
export function monthsToGoal(initial: number, monthly: number, annualRate: number, target: number): number | null {
  if (initial >= target) return 0;
  const i = monthlyFromAnnual(annualRate);
  let v = initial;
  for (let n = 1; n <= 1200; n++) {
    v = v * (1 + i) + monthly;
    if (v >= target) return n;
  }
  return null;
}

/** Aporte mensal necessário para chegar a `target` em `months` meses. */
export function requiredMonthly(initial: number, annualRate: number, months: number, target: number): number {
  if (months <= 0) return Math.max(0, target - initial);
  const i = monthlyFromAnnual(annualRate);
  const g = (1 + i) ** months;
  const missing = target - initial * g;
  if (missing <= 0) return 0;
  if (Math.abs(i) < 1e-12) return Math.ceil(missing / months);
  return Math.ceil((missing * i) / (g - 1));
}

export interface SimulationPoint {
  month: number;
  investido: number;
  total: number;
}

/** Pontos (a cada `step` meses) para o gráfico: total aplicado × valor com juros. */
export function simulationSeries(initial: number, monthly: number, annualRate: number, months: number, step = 12): SimulationPoint[] {
  const out: SimulationPoint[] = [];
  for (let m = 0; m <= months; m += step) out.push({ month: m, investido: initial + monthly * m, total: futureValue(initial, monthly, annualRate, m) });
  if (months % step !== 0) out.push({ month: months, investido: initial + monthly * months, total: futureValue(initial, monthly, annualRate, months) });
  return out;
}
