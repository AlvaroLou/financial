import i18n from '@/i18n';
import { formatDecimal } from '@/lib/money';

import type { FixedIncomeTerms } from './types';

/** "110% do CDI", "IPCA + 6,00% a.a.", "12,50% a.a.", "CDI + 1,50% a.a.", "Selic + 0,10%", "Poupança" */
export function rateText(rf: FixedIncomeTerms): string {
  const pct = (v: number) => formatDecimal(v * 100, 2, 2);
  switch (rf.indexador) {
    case 'cdi':
      return i18n.t('invest.rate.cdi', { pct: formatDecimal(rf.taxa * 100, 2) });
    case 'cdi_spread':
      return i18n.t('invest.rate.cdiSpread', { pct: pct(rf.taxa) });
    case 'ipca':
      return i18n.t('invest.rate.ipca', { pct: pct(rf.taxa) });
    case 'selic':
      return rf.taxa ? i18n.t('invest.rate.selicSpread', { pct: pct(rf.taxa) }) : i18n.t('invest.rate.selic');
    case 'poupanca':
      return i18n.t('invest.rate.poupanca');
    default:
      return i18n.t('invest.rate.pre', { pct: pct(rf.taxa) });
  }
}
