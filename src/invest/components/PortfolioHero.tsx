import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HIDDEN_VALUE } from '@/components/BalanceCard';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/primitives';
import { brl, brlDelta, brlShort, percentSigned } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

import type { PortfolioSummary } from '../lib/portfolio';

/** Cartão de destaque da Carteira: patrimônio, investido, resultado e variação do dia. */
export function PortfolioHero({
  summary,
  hidden,
  onToggleHidden,
  status,
}: {
  summary: PortfolioSummary;
  hidden: boolean;
  onToggleHidden: () => void;
  /** linha de status (ex.: "Atualizado às 14:32") */
  status?: { text: string; icon: 'refresh' | 'cloudOff' | 'alert' | 'checkCircle' };
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const show = (s: string) => (hidden ? HIDDEN_VALUE : s);
  const tone = (v: number) => (v < 0 ? colors.expenseOnHero : colors.incomeOnHero);

  return (
    <View style={[styles.card, { backgroundColor: colors.hero }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.onHeroMuted}>
            {t('invest.hero.title')}
          </AppText>
          <AppText
            variant="display"
            color={colors.onHero}
            tabular
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={hidden ? t('invest.hero.hiddenA11y') : t('invest.hero.a11y', { value: brl(summary.patrimonio) })}
          >
            {show(brl(summary.patrimonio))}
          </AppText>
        </View>
        <IconButton
          icon={hidden ? 'eyeOff' : 'eye'}
          label={hidden ? t('common.showValues') : t('common.hideValues')}
          onPress={onToggleHidden}
          color={colors.onHero}
          background={colors.heroPanelStrong}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.panel, { backgroundColor: colors.heroPanel }]}>
          <AppText variant="caption" color={colors.onHeroMuted}>
            {t('invest.hero.invested')}
          </AppText>
          <AppText variant="bodyStrong" color={colors.onHero} tabular numberOfLines={1} adjustsFontSizeToFit>
            {show(brlShort(summary.investido))}
          </AppText>
        </View>
        <View style={[styles.panel, { backgroundColor: colors.heroPanel }]}>
          <AppText variant="caption" color={colors.onHeroMuted}>
            {t('invest.hero.result')}
          </AppText>
          <AppText variant="bodyStrong" color={tone(summary.resultado)} tabular numberOfLines={1} adjustsFontSizeToFit>
            {show(brlDelta(summary.resultado))}
          </AppText>
          {summary.resultadoPct !== null && !hidden ? (
            <AppText variant="caption" color={tone(summary.resultado)} tabular>
              {percentSigned(summary.resultadoPct)}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        {summary.variacaoDiaPct !== null ? (
          <View style={[styles.pill, { backgroundColor: colors.highlight }]}>
            <Icon name={summary.variacaoDia < 0 ? 'trendDown' : 'trendUp'} size={16} color={colors.onHighlight} />
            <AppText variant="label" color={colors.onHighlight} tabular>
              {hidden
                ? t('invest.hero.todayHidden')
                : t('invest.hero.today', { value: brlDelta(summary.variacaoDia), pct: percentSigned(summary.variacaoDiaPct) })}
            </AppText>
          </View>
        ) : null}
        {status ? (
          <View style={styles.status}>
            <Icon name={status.icon} size={14} color={colors.onHeroMuted} />
            <AppText variant="caption" color={colors.onHeroMuted} numberOfLines={2} style={{ flexShrink: 1 }}>
              {status.text}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 20, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  panel: { flex: 1, borderRadius: radius.md, padding: 12, gap: 2 },
  footer: { gap: 10 },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
