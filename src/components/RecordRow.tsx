import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/primitives';
import i18n from '@/i18n';
import { categoryName, natureLabel, paymentLabel } from '@/i18n/labels';
import { shortDay } from '@/lib/dates';
import { isRecurring, recordTags } from '@/lib/finance';
import { brlShort, brlSigned, spokenBrl } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { Category, Occurrence } from '@/types';

export function recordA11yLabel(o: Occurrence, categories?: Record<string, Category>): string {
  const r = o.record;
  const tags = recordTags(r)
    .map((id) => categoryName(categories?.[id]))
    .filter(Boolean);
  const parts = [
    r.nome,
    i18n.t(`kind.${r.kind}`),
    spokenBrl(o.valor),
    o.parcela ? i18n.t('record.installmentA11y', { current: o.parcela.atual, total: o.parcela.total }) : null,
    isRecurring(r) ? i18n.t('record.recurringA11y') : null,
    natureLabel(r.natureza),
    paymentLabel(r.forma),
    categories ? categoryName(categories[r.categoriaId]) : null,
    tags.length ? i18n.t('record.alsoInA11y', { names: tags.join(', ') }) : null,
    shortDay(o.data),
  ];
  return parts.filter(Boolean).join(', ');
}

/** Conteúdo visual de um lançamento (sem gestos). Use dentro de SwipeableRow ou Pressable. */
export function RecordRow({
  occurrence: o,
  category,
  categories,
  showDate = false,
}: {
  occurrence: Occurrence;
  category?: Category;
  /** para mostrar as etiquetas */
  categories?: Record<string, Category>;
  showDate?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const r = o.record;
  const isExpense = r.kind === 'despesa';
  const installment = !!o.parcela;
  const iconBg = !isExpense ? colors.incomeTint : installment ? colors.installmentTint : colors.expenseTint;
  const iconFg = !isExpense ? colors.income : installment ? colors.installmentText : colors.expense;
  const tags = categories ? recordTags(r).map((id) => categories[id]).filter(Boolean) : [];

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Icon name={r.icone ?? category?.icone ?? 'cash'} size={22} color={iconFg} />
      </View>

      <View style={styles.middle}>
        <View style={styles.titleLine}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {r.nome}
          </AppText>
          {o.parcela ? <Tag tone="installment">{`${o.parcela.atual}/${o.parcela.total}`}</Tag> : null}
        </View>
        <View style={styles.tags}>
          {isRecurring(r) ? <Tag icon="repeat">{t('record.monthly')}</Tag> : null}
          <Tag>{natureLabel(r.natureza)}</Tag>
          <Tag>{paymentLabel(r.forma)}</Tag>
          {tags.map((c) => (
            <Tag key={c.id} tone="accent" icon="tag">
              {categoryName(c)}
            </Tag>
          ))}
        </View>
      </View>

      <View style={styles.right}>
        <AppText
          variant="bodyStrong"
          tabular
          color={isExpense ? colors.expense : colors.income}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {brlSigned(o.valor, r.kind)}
        </AppText>
        {o.parcela ? (
          <AppText variant="caption" color={colors.ink2} tabular>
            {t('record.ofTotal', { value: brlShort(r.valorTotal) })}
          </AppText>
        ) : showDate ? (
          <AppText variant="caption" color={colors.ink2}>
            {shortDay(o.data)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 4 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  right: { alignItems: 'flex-end', gap: 2, maxWidth: '38%' },
});
