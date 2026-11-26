import { useTranslation } from 'react-i18next';

import type { RefreshResult } from './useMarketRefresh';
import { useMarketStore } from './store';

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Texto da linha de status da Carteira (atualizado às…, offline, falta token…). */
export function usePortfolioStatus(loading: boolean, last: RefreshResult | null) {
  const { t } = useTranslation();
  const quotes = useMarketStore((s) => s.quotes);
  if (loading) return { text: t('invest.status.updating'), icon: 'refresh' as const };
  if (last?.status === 'offline') return { text: t('invest.status.offline'), icon: 'cloudOff' as const };
  if (last && last.needsToken.length) {
    return { text: t('invest.status.needsToken', { count: last.needsToken.length }), icon: 'alert' as const };
  }
  if (last && last.failed.length) return { text: t('invest.status.partial', { list: last.failed.join(', ') }), icon: 'alert' as const };
  const times = Object.values(quotes).map((q) => q.updatedAt);
  const latest = last?.at ?? [...times].sort().pop();
  return latest ? { text: t('invest.status.updatedAt', { time: hhmm(latest) }), icon: 'checkCircle' as const } : undefined;
}
