/**
 * CoinGecko — preços de criptomoedas em reais. Funciona sem chave (limite
 * baixo de requisições); uma chave "Demo" gratuita (cabeçalho x-cg-demo-api-key)
 * aumenta o limite.
 */
import type { Quote } from '../types';
import { getJson } from './http';

const BASE = 'https://api.coingecko.com/api/v3';

type PriceBody = Record<string, { brl?: number; brl_24h_change?: number; last_updated_at?: number }>;

export function parseCoingecko(body: PriceBody, now = new Date()): Record<string, Quote> {
  const out: Record<string, Quote> = {};
  for (const [id, v] of Object.entries(body ?? {})) {
    if (typeof v?.brl !== 'number') continue;
    out[id.toLowerCase()] = {
      price: v.brl,
      changePct: typeof v.brl_24h_change === 'number' ? v.brl_24h_change / 100 : undefined,
      updatedAt: now.toISOString(),
      source: 'coingecko',
    };
  }
  return out;
}

const headers = (key: string | null) => (key ? { 'x-cg-demo-api-key': key } : undefined);

/** Preços de várias moedas numa só requisição (ids da CoinGecko: bitcoin, ethereum…). */
export async function fetchCryptoQuotes(ids: string[], key: string | null): Promise<Record<string, Quote>> {
  if (ids.length === 0) return {};
  const unique = [...new Set(ids.map((i) => i.trim().toLowerCase()))].join(',');
  const body = await getJson<PriceBody>(
    `${BASE}/simple/price?ids=${encodeURIComponent(unique)}&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true`,
    { headers: headers(key) },
  );
  return parseCoingecko(body);
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
}

export async function searchCoins(query: string, key: string | null): Promise<CoinSearchResult[]> {
  const body = await getJson<{ coins?: CoinSearchResult[] }>(`${BASE}/search?query=${encodeURIComponent(query.trim())}`, {
    headers: headers(key),
  });
  return (body.coins ?? []).slice(0, 8).map((c) => ({ id: c.id, name: c.name, symbol: c.symbol }));
}

export async function testCoingeckoKey(key: string): Promise<boolean> {
  try {
    await fetchCryptoQuotes(['bitcoin'], key);
    return true;
  } catch {
    return false;
  }
}
