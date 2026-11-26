/**
 * brapi.dev — cotações da B3 (ações, FIIs, ETFs, BDRs). O plano gratuito exige
 * um token (cadastro grátis) e aceita 1 ativo por requisição; sem token, só os
 * ativos de teste (PETR4, VALE3, MGLU3, ITUB4) respondem.
 */
import type { Quote } from '../types';
import { getJson, HttpError } from './http';

const BASE = 'https://brapi.dev/api';
export const BRAPI_FREE_TICKERS = ['PETR4', 'VALE3', 'MGLU3', 'ITUB4'];

interface BrapiQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
}

interface BrapiResponse {
  results?: BrapiQuote[];
  error?: boolean;
  message?: string;
}

export function parseBrapi(body: BrapiResponse, now = new Date()): Record<string, Quote & { name?: string }> {
  const out: Record<string, Quote & { name?: string }> = {};
  for (const r of body.results ?? []) {
    if (!r.symbol || typeof r.regularMarketPrice !== 'number') continue;
    out[r.symbol.toUpperCase()] = {
      price: r.regularMarketPrice,
      changePct: typeof r.regularMarketChangePercent === 'number' ? r.regularMarketChangePercent / 100 : undefined,
      updatedAt: now.toISOString(),
      source: 'brapi',
      name: r.longName ?? r.shortName,
    };
  }
  return out;
}

export async function fetchBrapiQuote(ticker: string, token: string | null): Promise<Quote & { name?: string }> {
  const symbol = ticker.trim().toUpperCase();
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  const body = await getJson<BrapiResponse>(`${BASE}/quote/${encodeURIComponent(symbol)}${qs}`);
  if (body.error) throw new HttpError('http', body.message ?? 'erro');
  const quote = parseBrapi(body)[symbol];
  if (!quote) throw new HttpError('notFound', symbol);
  return quote;
}

/** Testa um token (consulta um ativo fora da lista gratuita). */
export async function testBrapiToken(token: string): Promise<boolean> {
  try {
    await fetchBrapiQuote('BBAS3', token);
    return true;
  } catch {
    return false;
  }
}
