import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/primitives';
import { brlDelta, brlShort, formatDecimal, percentSigned } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import { ASSET_TYPES, classColor } from '../catalog';
import type { AssetValuation } from '../lib/portfolio';

/** Linha de uma posição: ícone da classe, nome/ticker, valor atual e resultado. */
export function PositionRow({
  v,
  onPress,
  first,
  hidden,
  share,
}: {
  v: AssetValuation;
  onPress: () => void;
  first?: boolean;
  hidden?: boolean;
  /** fração do patrimônio */
  share?: number;
}) {
  const { t } = useTranslation();
  const { colors, base } = useTheme();
  const info = ASSET_TYPES[v.asset.tipo];
  const positive = v.resultado >= 0;
  const subtitle = [
    v.asset.ticker ?? (v.asset.coingeckoId ? v.asset.coingeckoId.toUpperCase() : null),
    t(`invest.types.${v.asset.tipo}`),
    v.quantidade !== undefined && v.quantidade > 0 ? `${formatDecimal(v.quantidade, 8)} ${t('invest.units')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${v.asset.nome}, ${subtitle}${hidden ? '' : `, ${brlShort(v.valorAtual)}, ${t('invest.result')} ${brlDelta(v.resultado)}`}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.bg },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.tint }]}>
        <Icon name={info.icon} size={20} color={colors.primary} />
        <View style={[styles.classDot, { backgroundColor: classColor(info.classe, base), borderColor: colors.surface }]} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {v.asset.nome}
        </AppText>
        <AppText variant="caption" color={colors.ink2} numberOfLines={1}>
          {subtitle}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          {v.precoFonte === 'average' ? <Tag tone="installment">{t('invest.noQuote')}</Tag> : null}
          {v.approximate && v.precoFonte !== 'average' ? <Tag>{t('invest.estimated')}</Tag> : null}
          {v.asset.metaId ? <Tag tone="accent" icon="target">{t('invest.inGoal')}</Tag> : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: '42%' }}>
        <AppText variant="bodyStrong" tabular numberOfLines={1} adjustsFontSizeToFit>
          {hidden ? '••••' : brlShort(v.valorAtual)}
        </AppText>
        {!hidden && v.investido > 0 ? (
          <AppText variant="caption" tabular color={positive ? colors.income : colors.expense} numberOfLines={1}>
            {v.resultadoPct !== null ? percentSigned(v.resultadoPct) : brlDelta(v.resultado)}
          </AppText>
        ) : null}
        {share !== undefined && !hidden ? (
          <AppText variant="caption" color={colors.ink2} tabular>
            {t('invest.ofPortfolio', { pct: formatDecimal(share * 100, 1) })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  classDot: { position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
});
