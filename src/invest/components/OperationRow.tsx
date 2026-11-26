import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { shortDay } from '@/lib/dates';
import { brlShort, formatDecimal } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

import type { Asset, Operation, OperationType } from '../types';

const ICON: Record<OperationType, IconName> = {
  compra: 'arrowDownLeft',
  aporte: 'arrowDownLeft',
  venda: 'arrowUpRight',
  resgate: 'arrowUpRight',
  provento: 'coins',
  desdobramento: 'split',
  grupamento: 'merge',
  bonificacao: 'gift',
  taxa: 'receipt',
};

/** Sinal do valor na carteira: entra dinheiro do bolso (+aplicado) ou volta para o bolso. */
export function operationFlow(o: Operation): 'in' | 'out' | 'income' | 'neutral' | 'cost' {
  if (o.tipo === 'compra' || o.tipo === 'aporte') return 'in';
  if (o.tipo === 'venda' || o.tipo === 'resgate') return 'out';
  if (o.tipo === 'provento') return 'income';
  if (o.tipo === 'taxa') return 'cost';
  return 'neutral';
}

export function OperationRow({
  op,
  asset,
  onPress,
  first,
  showAsset = true,
}: {
  op: Operation;
  asset?: Asset;
  onPress?: () => void;
  first?: boolean;
  showAsset?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const flow = operationFlow(op);
  const amountColor = flow === 'income' ? colors.income : flow === 'cost' ? colors.expense : colors.ink;
  const detail =
    op.tipo === 'desdobramento' || op.tipo === 'grupamento'
      ? t('invest.op.factor', { factor: formatDecimal(op.fator ?? 1, 6) })
      : op.quantidade
        ? `${formatDecimal(op.quantidade, 8)} × ${brlShort(Math.round((op.preco ?? 0) * 100))}`
        : op.proventoTipo
          ? t(`invest.income.${op.proventoTipo}`)
          : '';
  const title = showAsset && asset ? asset.nome : t(`invest.op.${op.tipo}`);
  const sub = [showAsset ? t(`invest.op.${op.tipo}`) : null, detail || null, shortDay(op.data)].filter(Boolean).join(' · ');
  const value =
    flow === 'neutral' ? '' : `${flow === 'out' ? '−' : flow === 'income' ? '+' : flow === 'cost' ? '−' : ''} ${brlShort(op.valor + (flow === 'in' ? op.custos ?? 0 : 0))}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}, ${value}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.bg },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: flow === 'income' ? colors.incomeTint : colors.tint }]}>
        <Icon name={ICON[op.tipo]} size={18} color={flow === 'income' ? colors.income : colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.ink2} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      <AppText variant="bodyStrong" tabular color={amountColor} numberOfLines={1}>
        {value.trim()}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
