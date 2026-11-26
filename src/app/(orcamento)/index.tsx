import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { BalanceCard } from '@/components/BalanceCard';
import { DueList } from '@/components/DueList';
import { ModeSwitch } from '@/components/ModeSwitch';
import { RecordItem } from '@/components/RecordItem';
import { AppText } from '@/components/ui/AppText';
import { Fab } from '@/components/ui/Fab';
import { Button, Card, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { useCategoryMap, useMonthData } from '@/hooks/useMonthData';
import { useRecordActions } from '@/hooks/useRecordActions';
import { todayISO } from '@/lib/clock';
import { monthName, ymOf } from '@/lib/dates';
import { dailyAllowance, upcomingDues } from '@/lib/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';

function greetingKey(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'home.greetingEvening';
  if (h < 12) return 'home.greetingMorning';
  if (h < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

export default function InicioScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { edit } = useRecordActions();
  const { month, occurrences, summary, budget } = useMonthData();
  const categories = useCategoryMap();
  const records = useFinanceStore((s) => s.records);
  const { hidden, toggle: toggleHidden } = useHiddenValues();

  const today = todayISO();
  const allowance = dailyAllowance(budget, summary.despesas, today, month);
  const dues = useMemo(() => upcomingDues(records, today).slice(0, 3), [records, today]);
  const recent = occurrences.slice(0, 5);
  const isEmpty = records.length === 0;

  return (
    <Screen>
      <ScreenHeader
        top={<ModeSwitch />}
        title={t(greetingKey())}
        subtitle={t('home.subtitle', { month: monthName(month, ymOf(today)) })}
        right={<AlertsButton />}
      />
      <ScreenScroll gap={20} withFabClearance>
        <MonthSelector />

        <BalanceCard
          saldo={summary.saldo}
          receitas={summary.receitas}
          despesas={summary.despesas}
          budget={budget}
          perDay={allowance ? allowance.perDay : null}
          hidden={hidden}
          onToggleHidden={toggleHidden}
        />

        {isEmpty ? (
          <Card style={{ padding: 20, gap: 14 }}>
            <AppText variant="h3">{t('home.emptyTitle')}</AppText>
            {['home.step1', 'home.step2', 'home.step3'].map((key, i) => (
              <View key={key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.tint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="captionStrong" color={colors.primary}>
                    {String(i + 1)}
                  </AppText>
                </View>
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  {t(key)}
                </AppText>
              </View>
            ))}
            <Button icon="plus" label={t('home.newEntry')} onPress={() => router.push('/registro')} />
          </Card>
        ) : (
          <>
            <View>
              <SectionHeader title={t('home.upcoming')} />
              <DueList dues={dues} onPressDue={(o) => edit(o.record.id, ymOf(o.data))} />
            </View>

            <View>
              <SectionHeader title={t('home.recent')} actionLabel={t('common.seeAll')} onAction={() => router.push('/extrato')} />
              {recent.length === 0 ? (
                <Card style={{ padding: 20 }}>
                  <AppText variant="body" color={colors.ink2} align="center">
                    {t('home.noneThisMonth')}
                  </AppText>
                </Card>
              ) : (
                <Card style={{ overflow: 'hidden' }}>
                  {recent.map((o, i) => (
                    <View key={o.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                      <RecordItem occurrence={o} category={categories[o.record.categoriaId]} categories={categories} showDate />
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </ScreenScroll>

      <Fab label={t('home.newEntry')} onPress={() => router.push('/registro')} />
    </Screen>
  );
}
