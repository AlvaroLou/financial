import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/primitives';
import { useRecordActions } from '@/hooks/useRecordActions';
import { categoryName, dueLabel } from '@/i18n/labels';
import { todayISO } from '@/lib/clock';
import { shortDay, ymOf } from '@/lib/dates';
import { limitStatus, monthOccurrences, summarize, upcomingDues } from '@/lib/finance';
import { brlShort, percent } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const DUE_DAYS = 7;

/**
 * Sino da tela inicial: conta e lista os alertas do app (vencimentos dos próximos
 * 7 dias e categorias com 80%+ do limite no mês atual), conforme os interruptores em Ajustes.
 */
export function AlertsButton() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { edit } = useRecordActions();
  const records = useFinanceStore((s) => s.records);
  const categories = useFinanceStore((s) => s.categories);
  const settings = useFinanceStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const today = todayISO();

  const { dues, budgetAlerts } = useMemo(() => {
    const dues = settings.alertaVencimento ? upcomingDues(records, today, DUE_DAYS) : [];
    const spentBy = summarize(monthOccurrences(records, ymOf(today))).porCategoria;
    const budgetAlerts = settings.alertaOrcamento
      ? categories
          .filter((c) => c.kind === 'despesa')
          .map((c) => ({ c, spent: spentBy[c.id] ?? 0, status: limitStatus(spentBy[c.id] ?? 0, c.limiteMensal) }))
          .filter((x) => x.status === 'warn' || x.status === 'over')
      : [];
    return { dues, budgetAlerts };
  }, [records, categories, settings.alertaVencimento, settings.alertaOrcamento, today]);

  const count = dues.length + budgetAlerts.length;
  const nothingEnabled = !settings.alertaVencimento && !settings.alertaOrcamento;

  return (
    <>
      <View>
        <IconButton
          icon="bell"
          label={count > 0 ? t('alerts.a11yCount', { count }) : t('alerts.a11yNone')}
          background={colors.surface}
          onPress={() => setOpen(true)}
        />
        {count > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.expense }]} pointerEvents="none">
            <AppText
              variant="caption"
              color={colors.base === 'dark' ? '#1A0B09' : '#FFFFFF'}
              style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 }}
            >
              {count > 9 ? '9+' : String(count)}
            </AppText>
          </View>
        ) : null}
      </View>

      <BottomSheet visible={open} title={t('alerts.title')} onClose={() => setOpen(false)}>
        <View style={{ gap: 4, paddingBottom: 8 }}>
          {count === 0 ? (
            <View style={styles.row}>
              <Icon name="check" size={20} color={colors.primary} />
              <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                {nothingEnabled ? t('alerts.off') : t('alerts.allClear', { days: DUE_DAYS })}
              </AppText>
            </View>
          ) : null}

          {dues.map(({ occurrence: o, daysLeft }) => (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                edit(o.record.id, ymOf(o.data));
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.tint }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.installmentTint }]}>
                <Icon name="clock" size={18} color={colors.installmentText} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {o.record.nome}
                </AppText>
                <AppText variant="caption" color={colors.installmentText}>
                  {`${dueLabel(daysLeft)} · ${o.vencimento ? shortDay(o.vencimento) : ''}`}
                </AppText>
              </View>
              <AppText variant="bodyStrong" tabular>
                {brlShort(o.valor)}
              </AppText>
            </Pressable>
          ))}

          {budgetAlerts.map(({ c, spent, status }) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                router.push('/planejar');
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.tint }]}
            >
              <View style={[styles.icon, { backgroundColor: status === 'over' ? colors.expenseTint : colors.installmentTint }]}>
                <Icon name={c.icone} size={18} color={status === 'over' ? colors.expense : colors.installmentText} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {categoryName(c)}
                </AppText>
                <AppText variant="caption" color={status === 'over' ? colors.expense : colors.installmentText}>
                  {status === 'over'
                    ? t('alerts.over', { spent: brlShort(spent), limit: brlShort(c.limiteMensal) })
                    : t('alerts.warn', { pct: percent(spent / c.limiteMensal, 0), limit: brlShort(c.limiteMensal) })}
                </AppText>
              </View>
              <Icon name="chevronRight" size={20} color={colors.ink2} />
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 8, borderRadius: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
