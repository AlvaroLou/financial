import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton, ProgressBar } from '@/components/ui/primitives';
import { brl, brlShort, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

export const HIDDEN_VALUE = 'R$ ••••••';

/** Cartão-resumo do mês (cor de destaque escura): saldo, receitas, despesas e uso do orçamento. */
export function BalanceCard({
  saldo,
  receitas,
  despesas,
  budget,
  perDay,
  hidden,
  onToggleHidden,
}: {
  saldo: number;
  receitas: number;
  despesas: number;
  budget: number;
  /** quanto ainda pode gastar por dia (centavos) — só no mês atual */
  perDay: number | null;
  hidden: boolean;
  onToggleHidden: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const used = budget > 0 ? despesas / budget : 0;
  const over = used > 1;
  const show = (text: string) => (hidden ? HIDDEN_VALUE : text);

  return (
    <View style={[styles.card, { backgroundColor: colors.hero }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.onHeroMuted}>
            {t('balance.title')}
          </AppText>
          <AppText
            variant="display"
            color={colors.onHero}
            tabular
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={hidden ? t('balance.hiddenA11y') : t('balance.a11y', { value: brl(saldo) })}
          >
            {show(brl(saldo))}
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

      <View style={styles.pair}>
        <View style={[styles.pairItem, { backgroundColor: colors.heroPanel }]}>
          <Icon name="arrowDownLeft" size={18} color={colors.incomeOnHero} />
          <View style={{ flexShrink: 1 }}>
            <AppText variant="caption" color={colors.onHeroMuted}>
              {t('balance.income')}
            </AppText>
            <AppText variant="bodyStrong" color={colors.incomeOnHero} tabular numberOfLines={1} adjustsFontSizeToFit>
              {show(brlShort(receitas))}
            </AppText>
          </View>
        </View>
        <View style={[styles.pairItem, { backgroundColor: colors.heroPanel }]}>
          <Icon name="arrowUpRight" size={18} color={colors.expenseOnHero} />
          <View style={{ flexShrink: 1 }}>
            <AppText variant="caption" color={colors.onHeroMuted}>
              {t('balance.expenses')}
            </AppText>
            <AppText variant="bodyStrong" color={colors.expenseOnHero} tabular numberOfLines={1} adjustsFontSizeToFit>
              {show(brlShort(despesas))}
            </AppText>
          </View>
        </View>
      </View>

      {budget > 0 ? (
        <View style={{ gap: 6 }}>
          <View style={styles.budgetLine}>
            <AppText variant="caption" color={colors.onHeroMuted}>
              {t('balance.budgetUsed', { pct: percent(used, 0) })}
            </AppText>
            <AppText variant="caption" color={colors.onHeroMuted} tabular>
              {hidden ? HIDDEN_VALUE : t('balance.budgetOf', { spent: brlShort(despesas), budget: brlShort(budget) })}
            </AppText>
          </View>
          <ProgressBar
            value={used}
            color={over ? colors.expenseOnHero : colors.highlight}
            trackColor="rgba(255,255,255,0.18)"
            label={t('balance.budgetBar')}
          />
        </View>
      ) : null}

      {perDay !== null ? (
        <View style={[styles.allowance, { backgroundColor: colors.highlight }]}>
          <Icon name="calendar" size={16} color={colors.onHighlight} />
          <AppText variant="label" color={colors.onHighlight} style={{ fontFamily: fonts.bold, flexShrink: 1 }}>
            {hidden ? t('balance.perDayHidden') : t('balance.perDay', { value: brlShort(Math.round(perDay)) })}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 20,
    gap: 16,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pair: { flexDirection: 'row', gap: 12 },
  pairItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    padding: 12,
  },
  budgetLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  allowance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
