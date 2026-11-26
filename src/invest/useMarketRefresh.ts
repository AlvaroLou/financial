import { useCallback, useEffect, useState } from 'react';

import { todayISO } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import type { ISODate } from '@/types';

import { ASSET_TYPES, quoteKey } from './catalog';
import { fetchCdiDaily, fetchCurrentRates, fetchIpcaMonthly, fetchSelicDaily } from './services/bcb';
import { BRAPI_FREE_TICKERS, fetchBrapiQuote } from './services/brapi';
import { fetchCryptoQuotes } from './services/coingecko';
import { HttpError, mapLimit } from './services/http';
import { getProviderKey } from './services/secrets';
import { useInvestStore, useMarketStore } from './store';
import type { Quote } from './types';

const QUOTE_TTL = 15 * 60 * 1000;
const RATES_TTL = 12 * 60 * 60 * 1000;

export type RefreshStatus = 'idle' | 'loading' | 'ok' | 'partial' | 'offline' | 'error';

export interface RefreshResult {
  status: RefreshStatus;
  /** ativos da B3 sem cotação porque falta o token da brapi */
  needsToken: string[];
  failed: string[];
  at: string;
}

let inFlight: Promise<RefreshResult> | null = null;

const older = (iso: string | undefined, ttl: number) => !iso || Date.now() - new Date(iso).getTime() > ttl;

function keysRange(map: Record<string, number>): { min?: string; max?: string } {
  let min: string | undefined;
  let max: string | undefined;
  for (const k of Object.keys(map)) {
    if (!min || k < min) min = k;
    if (!max || k > max) max = k;
  }
  return { min, max };
}

/** Busca só o trecho que falta de uma série (do 1º aporte até hoje). */
async function fillSeries(
  have: Record<string, number>,
  earliest: ISODate,
  today: ISODate,
  fetcher: (from: ISODate, to: ISODate) => Promise<Record<string, number>>,
): Promise<Record<string, number> | null> {
  const { min, max } = keysRange(have);
  const ranges: [ISODate, ISODate][] = [];
  if (!min || earliest < min) ranges.push([earliest, min ? addDays(min, -1) : today]);
  if (max && max < today) ranges.push([addDays(max, 1), today]);
  if (ranges.length === 0) return null;
  const out: Record<string, number> = {};
  for (const [a, b] of ranges) if (a <= b) Object.assign(out, await fetcher(a, b));
  return out;
}

export async function refreshMarket(force = false): Promise<RefreshResult> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { assets, operations } = useInvestStore.getState();
    const market = useMarketStore.getState();
    const today = todayISO();
    const result: RefreshResult = { status: 'ok', needsToken: [], failed: [], at: new Date().toISOString() };
    let offline = false;
    const note = (e: unknown, label: string) => {
      if (e instanceof HttpError && (e.kind === 'offline' || e.kind === 'timeout')) offline = true;
      result.failed.push(label);
    };

    // ---------------------------------------------------------------- taxas (Banco Central)
    if (force || market.rates.origem === 'padrao' || older(market.rates.atualizadoEm, RATES_TTL)) {
      try {
        const r = await fetchCurrentRates();
        // taxa digitada pelo usuário não é sobrescrita (ele pode voltar ao automático na tela de taxas)
        if (market.rates.origem !== 'manual') {
          market.setRates({ ...r, origem: 'bcb', atualizadoEm: new Date().toISOString() });
        } else {
          market.setRates({ atualizadoEm: new Date().toISOString() });
        }
      } catch (e) {
        note(e, 'BCB');
      }

      const fixed = assets.filter((a) => a.rf && !a.arquivado);
      const firstOf = (pred: (ix: string) => boolean): ISODate | null => {
        const ids = new Set(fixed.filter((a) => pred(a.rf!.indexador)).map((a) => a.id));
        const dates = operations.filter((o) => ids.has(o.assetId)).map((o) => o.data);
        return dates.length ? dates.reduce((m, d) => (d < m ? d : m)) : null;
      };
      try {
        const series = useMarketStore.getState().rates;
        const cdiFrom = firstOf((ix) => ix === 'cdi' || ix === 'cdi_spread');
        const selicFrom = firstOf((ix) => ix === 'selic');
        const ipcaFrom = firstOf((ix) => ix === 'ipca');
        const merged: Parameters<typeof market.mergeSeries>[0] = {};
        if (cdiFrom) {
          const add = await fillSeries(series.cdiDiario, cdiFrom, today, fetchCdiDaily);
          if (add) merged.cdiDiario = add;
        }
        if (selicFrom) {
          const add = await fillSeries(series.selicDiaria, selicFrom, today, fetchSelicDaily);
          if (add) merged.selicDiaria = add;
        }
        if (ipcaFrom) merged.ipcaMensal = await fetchIpcaMonthly(ipcaFrom, today);
        if (Object.keys(merged).length) market.mergeSeries(merged);
      } catch (e) {
        note(e, 'BCB');
      }
    }

    // ---------------------------------------------------------------- cotações
    const open = assets.filter((a) => !a.arquivado && ASSET_TYPES[a.tipo].valuation === 'quote');
    const quotes = useMarketStore.getState().quotes;
    const stale = open.filter((a) => {
      const k = quoteKey(a);
      return k && (force || older(quotes[k]?.updatedAt, QUOTE_TTL));
    });
    const next: Record<string, Quote> = {};

    const b3 = [...new Set(stale.filter((a) => ASSET_TYPES[a.tipo].quote === 'brapi' && a.ticker).map((a) => a.ticker!.trim().toUpperCase()))];
    if (b3.length) {
      const token = await getProviderKey('brapi');
      const allowed = token ? b3 : b3.filter((t) => BRAPI_FREE_TICKERS.includes(t));
      result.needsToken = token ? [] : b3.filter((t) => !BRAPI_FREE_TICKERS.includes(t));
      const settled = await mapLimit(allowed, 3, async (ticker) => [ticker, await fetchBrapiQuote(ticker, token)] as const);
      settled.forEach((s, i) => {
        if (s.status === 'fulfilled') {
          const [ticker, q] = s.value;
          next[`B3:${ticker}`] = { price: q.price, changePct: q.changePct, updatedAt: q.updatedAt, source: 'brapi' };
        } else {
          note(s.reason, allowed[i]);
        }
      });
    }

    const crypto = [...new Set(stale.filter((a) => a.tipo === 'cripto' && a.coingeckoId).map((a) => a.coingeckoId!.trim().toLowerCase()))];
    if (crypto.length) {
      try {
        const key = await getProviderKey('coingecko');
        const got = await fetchCryptoQuotes(crypto, key);
        for (const [id, q] of Object.entries(got)) next[`CG:${id}`] = q;
        for (const id of crypto) if (!got[id]) result.failed.push(id);
      } catch (e) {
        note(e, 'CoinGecko');
      }
    }
    if (Object.keys(next).length) useMarketStore.getState().setQuotes(next);

    if (offline) result.status = 'offline';
    else if (result.failed.length || result.needsToken.length) result.status = 'partial';
    return result;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Atualiza cotações e taxas ao abrir a tela (se ligado) e expõe "puxar para atualizar". */
export function useMarketRefresh(auto = true) {
  const autoRefresh = useInvestStore((s) => s.settings.autoRefresh);
  const [state, setState] = useState<{ loading: boolean; last: RefreshResult | null }>({ loading: false, last: null });

  const refresh = useCallback(async (force = false) => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const last = await refreshMarket(force);
      setState({ loading: false, last });
      return last;
    } catch {
      const last: RefreshResult = { status: 'error', needsToken: [], failed: [], at: new Date().toISOString() };
      setState({ loading: false, last });
      return last;
    }
  }, []);

  useEffect(() => {
    if (auto && autoRefresh) void refresh(false);
  }, [auto, autoRefresh, refresh]);

  return { ...state, refresh };
}
