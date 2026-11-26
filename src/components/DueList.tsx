import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Card, Tag } from '@/components/ui/primitives';
import { dueLabel } from '@/i18n/labels';
import { shortDay } from '@/lib/dates';
import type { Due } from '@/lib/finance';
import { brlShort, spokenBrl } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { Occurrence } from '@/types';

/** Próximos vencimentos (parcelas e boletos). Urgentes (≤ 3 dias) ganham destaque âmbar. */
export function DueList({ dues, onPressDue }: { dues: Due[]; onPressDue: (occurrence: Occurrence) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (dues.length === 0) {
    return (
      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="check" size={20} color={colors.primary} />
        <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
          {t('dues.empty')}
        </AppText>
      </Card>
    );
  }

  return (
    <Card style={{ overflow: 'hidden' }}>
      {dues.map(({ occurrence: o, daysLeft }, i) => {
        const urgent = daysLeft <= 3;
        const installment = o.parcela
          ? `${t('record.installmentA11y', { current: o.parcela.atual, total: o.parcela.total })}, `
          : '';
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityLabel={`${o.record.nome}, ${installment}${spokenBrl(o.valor)}, ${dueLabel(daysLeft)}`}
            onPress={() => onPressDue(o)}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: 1, borderTopColor: colors.line },
              pressed && { backgroundColor: colors.bg },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: urgent ? colors.installmentTint : colors.tint }]}>
              <Icon name="clock" size={20} color={urgent ? colors.installmentText : colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {o.record.nome}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {o.parcela ? <Tag tone="installment">{`${o.parcela.atual}/${o.parcela.total}`}</Tag> : null}
                <AppText variant="caption" color={urgent ? colors.installmentText : colors.ink2} style={{ flexShrink: 1 }}>
                  {`${dueLabel(daysLeft)} · ${o.vencimento ? shortDay(o.vencimento) : ''}`}
                </AppText>
              </View>
            </View>
            <AppText variant="bodyStrong" tabular>
              {brlShort(o.valor)}
            </AppText>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
