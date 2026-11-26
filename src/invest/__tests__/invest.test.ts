import { describe, expect, it } from 'vitest';

import { DEFAULT_RATES } from '@/invest/store';
import { businessDaysBetween, easter, isBusinessDay, lastBusinessDayOfMonth } from '@/invest/lib/calendar';
import { buildCurve, dailyFromAnnual, fixedIncomePosition, iofRate, irRate } from '@/invest/lib/fixedIncome';
import { goalProgress, linksByGoal } from '@/invest/lib/goals';
import { summarizePortfolio, valueAsset } from '@/invest/lib/portfolio';
import { quotePosition } from '@/invest/lib/positions';
import { rebalance } from '@/invest/lib/rebalance';
import { futureValue, monthsToGoal, requiredMonthly } from '@/invest/lib/simulator';
import { monthlyTax } from '@/invest/lib/tax';
import { parseSgs } from '@/invest/services/bcb';
import { parseBrapi } from '@/invest/services/brapi';
import { parseCoingecko } from '@/invest/services/coingecko';
import type { Asset, Operation, RateState } from '@/invest/types';

let n = 0;
const op = (o: Partial<Operation> & Pick<Operation, 'tipo' | 'data' | 'valor'>): Operation => ({ id: `o${n++}`, assetId: 'a', ...o });
const rates = (over: Partial<RateState> = {}): RateState => ({ ...DEFAULT_RATES, ...over });

describe('calendário', () => {
  it('Páscoa e feriados móveis', () => {
    expect(easter(2026)).toBe('2026-04-05');
    expect(easter(2027)).toBe('2027-03-28');
    expect(isBusinessDay('2026-02-16')).toBe(false); // Carnaval
    expect(isBusinessDay('2026-04-03')).toBe(false); // Sexta-feira Santa
    expect(isBusinessDay('2026-06-04')).toBe(false); // Corpus Christi
    expect(isBusinessDay('2026-11-20')).toBe(false); // Consciência Negra
    expect(isBusinessDay('2026-11-21')).toBe(false); // sábado
    expect(isBusinessDay('2026-11-19')).toBe(true);
  });

  it('conta dias úteis (início incluso, fim excluso)', () => {
    expect(businessDaysBetween('2026-11-19', '2026-11-24')).toBe(2); // 19 e 23
    expect(businessDaysBetween('2026-01-01', '2027-01-01')).toBe(249);
  });

  it('último dia útil do mês (vencimento do DARF)', () => {
    expect(lastBusinessDayOfMonth(2026, 1)).toBe('2026-01-30');
    expect(lastBusinessDayOfMonth(2026, 10)).toBe('2026-10-30');
  });
});

describe('renda fixa', () => {
  it('prefixado: (1 + taxa)^(du/252)', () => {
    const curve = buildCurve({ indexador: 'pre', taxa: 0.12, dataInicio: '2026-01-02' }, rates(), '2026-01-02', '2027-01-04');
    const du = businessDaysBetween('2026-01-02', '2027-01-04');
    expect(curve.at('2027-01-04')).toBeCloseTo(1.12 ** (du / 252), 10);
    expect(curve.approximate).toBe(false);
  });

  it('CDI com a série diária é exato; sem ela é aproximado', () => {
    const days: Record<string, number> = {};
    for (const d of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']) days[d] = 0.0005;
    const exact = buildCurve({ indexador: 'cdi', taxa: 1.1, dataInicio: '2026-11-16' }, rates({ cdiDiario: days }), '2026-11-16', '2026-11-20');
    expect(exact.at('2026-11-20')).toBeCloseTo((1 + 0.0005 * 1.1) ** 4, 12);
    expect(exact.approximate).toBe(false);
    const approx = buildCurve({ indexador: 'cdi', taxa: 1, dataInicio: '2026-11-16' }, rates(), '2026-11-16', '2026-11-20');
    expect(approx.at('2026-11-20')).toBeCloseTo((1 + dailyFromAnnual(DEFAULT_RATES.cdiAnual)) ** 4, 12);
    expect(approx.approximate).toBe(true);
  });

  it('IR regressivo e IOF', () => {
    expect([irRate(180), irRate(181), irRate(360), irRate(361), irRate(720), irRate(721)]).toEqual([0.225, 0.2, 0.2, 0.175, 0.175, 0.15]);
    expect(iofRate(1)).toBe(0.96);
    expect(iofRate(29)).toBe(0.03);
    expect(iofRate(30)).toBe(0);
  });

  it('valor bruto, IR estimado e isenção', () => {
    const asset = { rf: { indexador: 'pre' as const, taxa: 0.1, dataInicio: '2025-11-25' } };
    const ops = [op({ tipo: 'aporte', data: '2025-11-25', valor: 1_000_000 })];
    const du = businessDaysBetween('2025-11-25', '2026-11-25');
    const gross = Math.round(1_000_000 * 1.1 ** (du / 252));
    const taxed = fixedIncomePosition(asset, ops, rates(), '2026-11-25', false);
    expect(taxed.bruto).toBe(gross);
    expect(taxed.irEstimado).toBe(Math.round((gross - 1_000_000) * 0.175)); // 365 dias -> 17,5%
    expect(taxed.liquido).toBe(taxed.bruto - taxed.irEstimado);
    const exempt = fixedIncomePosition(asset, ops, rates(), '2026-11-25', true);
    expect(exempt.irEstimado).toBe(0);
  });

  it('resgate vende as cotas mais antigas primeiro (FIFO) e realiza o ganho', () => {
    const asset = { rf: { indexador: 'pre' as const, taxa: 0.1, dataInicio: '2025-01-02' } };
    const ops = [
      op({ tipo: 'aporte', data: '2025-01-02', valor: 100_000 }),
      op({ tipo: 'aporte', data: '2025-07-01', valor: 100_000 }),
      op({ tipo: 'resgate', data: '2026-01-02', valor: 50_000 }),
    ];
    const p = fixedIncomePosition(asset, ops, rates(), '2026-01-02', false);
    expect(p.aportado).toBe(200_000);
    expect(p.realizado).toBeGreaterThan(0);
    // custo restante: 200 mil − custo das cotas vendidas (todas do 1º lote)
    expect(p.investido).toBeLessThan(200_000);
    expect(p.investido).toBeGreaterThan(150_000);
    expect(p.bruto).toBeGreaterThan(p.investido);
  });

  it('valor informado (extrato do banco) recalibra a curva', () => {
    const asset = { rf: { indexador: 'pre' as const, taxa: 0.1, dataInicio: '2026-01-02' }, valorManual: { valor: 105_000, data: '2026-06-01' } };
    const ops = [op({ tipo: 'aporte', data: '2026-01-02', valor: 100_000 })];
    const p = fixedIncomePosition(asset, ops, rates(), '2026-06-01', false);
    expect(p.bruto).toBe(105_000);
  });
});

describe('preço médio (renda variável)', () => {
  const ops: Operation[] = [
    op({ tipo: 'compra', data: '2026-01-10', quantidade: 100, preco: 10, valor: 100_000, custos: 1_000 }),
    op({ tipo: 'compra', data: '2026-02-10', quantidade: 100, preco: 12, valor: 120_000 }),
    op({ tipo: 'venda', data: '2026-03-10', quantidade: 50, preco: 15, valor: 75_000, custos: 500 }),
    op({ tipo: 'desdobramento', data: '2026-04-10', valor: 0, fator: 2 }),
    op({ tipo: 'provento', data: '2026-05-10', valor: 1_000, proventoTipo: 'dividendo' }),
    op({ tipo: 'provento', data: '2026-05-10', valor: 2_000, proventoTipo: 'jcp', irRetido: 300 }),
  ];

  it('custos entram no preço médio; venda realiza pelo preço médio', () => {
    const p = quotePosition(ops);
    expect(p.sales[0].lucro).toBe(75_000 - 500 - 55_250);
    expect(p.realizado).toBe(19_250);
    expect(p.custo).toBe(165_750);
    expect(p.quantidade).toBe(300); // 150 × 2 (desdobramento)
    expect(p.precoMedio).toBeCloseTo(5.525, 6);
    expect(p.proventos).toBe(2_700);
    expect(p.proventosPorTipo).toEqual({ dividendo: 1_000, jcp: 1_700 });
  });

  it('venda maior que a posição é sinalizada', () => {
    const p = quotePosition([op({ tipo: 'compra', data: '2026-01-01', quantidade: 1, preco: 10, valor: 1_000 }), op({ tipo: 'venda', data: '2026-01-02', quantidade: 2, preco: 10, valor: 2_000 })]);
    expect(p.oversold).toBe(true);
    expect(p.quantidade).toBe(0);
  });
});

describe('carteira', () => {
  const asset = (over: Partial<Asset>): Asset => ({ id: 'a', tipo: 'acao', nome: 'X', criadoEm: '2026-01-01', ...over });
  const buy = op({ assetId: 'p', tipo: 'compra', data: '2026-01-10', quantidade: 10, preco: 30, valor: 30_000 });

  it('usa a cotação mais recente (automática ou digitada)', () => {
    const quotes = { 'B3:PETR4': { price: 40, updatedAt: '2026-11-25T10:00:00.000Z', source: 'brapi' as const, changePct: 0.02 } };
    const ctx = { quotes, rates: rates(), today: '2026-11-25' };
    const auto = valueAsset(asset({ id: 'p', ticker: 'PETR4' }), [buy], ctx);
    expect(auto.valorAtual).toBe(40_000);
    expect(auto.precoFonte).toBe('auto');
    expect(auto.variacaoDia).toBe(Math.round((40_000 * 0.02) / 1.02));
    const manual = valueAsset(asset({ id: 'p', ticker: 'PETR4', cotacaoManual: { preco: 41, em: '2026-11-25T12:00:00.000Z' } }), [buy], ctx);
    expect(manual.valorAtual).toBe(41_000);
    expect(manual.precoFonte).toBe('manual');
    const none = valueAsset(asset({ id: 'p', ticker: 'XPTO3' }), [buy], ctx);
    expect(none.precoFonte).toBe('average');
    expect(none.valorAtual).toBe(30_000);
  });

  it('resume por classe, instituição e FGC; metas somam os vinculados', () => {
    const assets: Asset[] = [
      asset({ id: 'p', ticker: 'PETR4', metaId: 'g1' }),
      { id: 'c', tipo: 'cdb', nome: 'CDB', criadoEm: '2026-01-01', instituicaoId: 'i1', metaId: 'g1', rf: { indexador: 'pre', taxa: 0, dataInicio: '2026-01-01' } },
    ];
    const ops = [buy, op({ assetId: 'c', tipo: 'aporte', data: '2026-01-01', valor: 50_000 })];
    const s = summarizePortfolio(assets, ops, { quotes: {}, rates: rates(), today: '2026-11-25' });
    expect(s.patrimonio).toBe(80_000);
    expect(s.porClasse.acoes).toBe(30_000);
    expect(s.porClasse.renda_fixa).toBe(50_000);
    expect(s.fgcPorInstituicao.i1).toBe(50_000);
    const links = linksByGoal(s.valuations);
    expect(links.g1.valor).toBe(80_000);
    const progress = goalProgress({ id: 'g1', nome: 'Reserva', icone: 'shield', atual: 20_000, alvo: 100_000 }, links.g1);
    expect(progress).toMatchObject({ manual: 20_000, linked: 80_000, total: 100_000, done: true, missing: 0 });
  });
});

describe('IR sobre vendas', () => {
  const assets: Asset[] = [
    { id: 's', tipo: 'acao', nome: 'Ação', criadoEm: '2026-01-01' },
    { id: 'f', tipo: 'fii', nome: 'FII', criadoEm: '2026-01-01' },
    { id: 'k', tipo: 'cripto', nome: 'BTC', criadoEm: '2026-01-01' },
  ];

  it('ações: isenção até R$ 20 mil em vendas; acima, 15%; prejuízo compensa', () => {
    const base: Operation[] = [
      op({ assetId: 's', tipo: 'compra', data: '2026-01-05', quantidade: 3000, preco: 10, valor: 3_000_000 }),
      op({ assetId: 's', tipo: 'venda', data: '2026-01-20', quantidade: 1000, preco: 11, valor: 1_100_000 }), // R$ 11 mil, lucro 1 mil: isento
      op({ assetId: 's', tipo: 'venda', data: '2026-02-20', quantidade: 1000, preco: 12, valor: 1_200_000 }), // R$ 12 mil
      op({ assetId: 's', tipo: 'venda', data: '2026-02-21', quantidade: 1000, preco: 12, valor: 1_200_000 }), // total fev R$ 24 mil, lucro 4 mil
    ];
    const tax = monthlyTax(assets, base, '2026-12');
    const jan = tax.find((m) => m.ym === '2026-01')!;
    expect(jan.acoesIsentas).toBe(true);
    expect(jan.impostoComum).toBe(0);
    const feb = tax.find((m) => m.ym === '2026-02')!;
    expect(feb.acoesIsentas).toBe(false);
    expect(feb.impostoComum).toBe(60_000); // 15% de R$ 4.000
    expect(feb.darfB3).toBe(60_000);
    expect(feb.vencimento).toBe('2026-03-31');

    const withLoss: Operation[] = [
      op({ assetId: 's', tipo: 'compra', data: '2026-01-05', quantidade: 4000, preco: 10, valor: 4_000_000 }),
      op({ assetId: 's', tipo: 'venda', data: '2026-03-10', quantidade: 2500, preco: 9.6, valor: 2_400_000 }), // prejuízo R$ 1 mil
      op({ assetId: 's', tipo: 'venda', data: '2026-04-10', quantidade: 1500, preco: 14, valor: 2_100_000 }), // lucro R$ 6 mil
    ];
    const t2 = monthlyTax(assets, withLoss, '2026-12');
    expect(t2.find((m) => m.ym === '2026-03')!.prejuizoComum).toBe(100_000);
    expect(t2.find((m) => m.ym === '2026-04')!.impostoComum).toBe(75_000); // 15% de (6.000 − 1.000)
  });

  it('FII paga 20% sem isenção; cripto é isenta até R$ 35 mil em vendas', () => {
    const t = monthlyTax(
      assets,
      [
        op({ assetId: 'f', tipo: 'compra', data: '2026-05-02', quantidade: 100, preco: 100, valor: 1_000_000 }),
        op({ assetId: 'f', tipo: 'venda', data: '2026-05-20', quantidade: 100, preco: 110, valor: 1_100_000 }),
        op({ assetId: 'k', tipo: 'compra', data: '2026-06-01', quantidade: 1, preco: 30_000, valor: 3_000_000 }),
        op({ assetId: 'k', tipo: 'venda', data: '2026-06-20', quantidade: 1, preco: 34_000, valor: 3_400_000 }),
      ],
      '2026-12',
    );
    expect(t.find((m) => m.ym === '2026-05')!.impostoFii).toBe(20_000);
    const jun = t.find((m) => m.ym === '2026-06')!;
    expect(jun.criptoIsenta).toBe(true);
    expect(jun.impostoCripto).toBe(0);
  });
});

describe('ferramentas', () => {
  it('rebalanceamento: cobre primeiro as classes abaixo do alvo', () => {
    const rows = rebalance({ renda_fixa: 100_000, acoes: 0 }, { renda_fixa: 0.5, acoes: 0.5 }, 100_000);
    expect(rows.find((r) => r.classe === 'acoes')!.aportar).toBe(100_000);
    expect(rows.find((r) => r.classe === 'renda_fixa')!.aportar).toBe(0);
    const total = rebalance({ renda_fixa: 50_000, acoes: 50_000 }, { renda_fixa: 0.5, acoes: 0.5 }, 1_001);
    expect(total.reduce((a, r) => a + r.aportar, 0)).toBe(1_001);
  });

  it('simulador: juros compostos, prazo e aporte necessário', () => {
    expect(futureValue(0, 100, 0, 12)).toBe(1_200);
    expect(futureValue(100_000, 0, 0.1, 12)).toBe(110_000);
    const months = monthsToGoal(100_000, 10_000, 0.1, 1_000_000)!;
    expect(futureValue(100_000, 10_000, 0.1, months)).toBeGreaterThanOrEqual(1_000_000);
    expect(futureValue(100_000, 10_000, 0.1, months - 1)).toBeLessThan(1_000_000);
    const need = requiredMonthly(0, 0.12, 120, 10_000_000);
    expect(futureValue(0, need, 0.12, 120)).toBeGreaterThanOrEqual(10_000_000);
  });
});

describe('leitura das APIs', () => {
  it('Banco Central (SGS) em fração', () => {
    expect(parseSgs([{ data: '24/11/2026', valor: '0.050788' }, { data: '01/10/2026', valor: '13.65' }])).toEqual({
      '2026-11-24': 0.00050788,
      '2026-10-01': 0.1365,
    });
  });

  it('brapi e CoinGecko', () => {
    const b = parseBrapi({ results: [{ symbol: 'PETR4', regularMarketPrice: 41.36, regularMarketChangePercent: 2, longName: 'Petrobras' }] });
    expect(b.PETR4).toMatchObject({ price: 41.36, changePct: 0.02, source: 'brapi', name: 'Petrobras' });
    const c = parseCoingecko({ bitcoin: { brl: 354355, brl_24h_change: 1.5 } });
    expect(c.bitcoin).toMatchObject({ price: 354355, changePct: 0.015, source: 'coingecko' });
  });
});

describe('relatório de investimentos', () => {
  it('sem foto mensal, estima o patrimônio inicial (renda fixa pela curva, variável pelo custo)', async () => {
    const { buildInvestReport, estimatedValueAt } = await import('@/invest/lib/reports');
    const assets: Asset[] = [
      { id: 'c', tipo: 'cdb', nome: 'CDB', criadoEm: '2025-01-01', rf: { indexador: 'pre', taxa: 0.1, dataInicio: '2025-01-02' } },
      { id: 'p', tipo: 'acao', nome: 'PETR4', ticker: 'PETR4', criadoEm: '2025-01-01' },
    ];
    const ops = [
      op({ assetId: 'c', tipo: 'aporte', data: '2025-01-02', valor: 100_000 }),
      op({ assetId: 'p', tipo: 'compra', data: '2025-06-02', quantidade: 10, preco: 30, valor: 30_000 }),
      op({ assetId: 'p', tipo: 'compra', data: '2026-03-02', quantidade: 10, preco: 40, valor: 40_000 }),
    ];
    const start = estimatedValueAt(assets, ops, '2025-12-31', rates());
    const cdb = Math.round(100_000 * 1.1 ** (businessDaysBetween('2025-01-02', '2025-12-31') / 252));
    expect(start).toBe(cdb + 30_000);
    const summary = summarizePortfolio(assets, ops, { quotes: {}, rates: rates(), today: '2026-11-25' });
    const r = buildInvestReport({ assets, operations: ops, snapshots: [], rates: rates(), summary, today: '2026-11-25', from: '2026-01-01', to: '2026-12-31', annual: true });
    expect(r.inicialEstimado).toBe(true);
    expect(r.finalEstimado).toBe(false);
    expect(r.patrimonioInicial).toBe(start);
    expect(r.aportes).toBe(40_000);
    expect(r.valorizacao).toBe(summary.patrimonio - start - 40_000);
    expect(r.posicoes.map((p) => p.asset.id).sort()).toEqual(['c', 'p']);
  });
});
