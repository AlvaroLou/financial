import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { BalanceCard } from '@/components/BalanceCard';
import { DueList } from '@/components/DueList';
import { RecordItem } from '@/components/RecordItem';
import { AppText } from '@/components/ui/AppText';
import { Button, Card, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useHiddenValues } from '@/hooks/useHiddenValues';
import { useCategoryMap, useMonthData } from '@/hooks/useMonthData';
import { useRecordActions } from '@/hooks/useRecordActions';
import { todayISO } from '@/lib/clock';
import { monthName, ymOf } from '@/lib/dates';
import { dailyAllowance, upcomingDues } from '@/lib/finance';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Boa noite!';
  if (h < 12) return 'Bom dia!';
  if (h < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

export default function InicioScreen() {
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
        title={greeting()}
        subtitle={`Seu resumo de ${monthName(month, ymOf(today))}`}
        right={<AlertsButton />}
      />
      <ScreenScroll gap={20}>
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
            <AppText variant="h3">Comece pelo seu primeiro lançamento</AppText>
            {[
              { n: '1', text: 'Cadastre seu salário e as contas fixas (aluguel, internet…) com “Repetir todo mês”.' },
              { n: '2', text: 'Em Planejar, defina um limite para cada categoria — vira o orçamento do mês.' },
              { n: '3', text: 'Lance os gastos do dia a dia no botão + e acompanhe quanto ainda pode gastar.' },
            ].map((s) => (
              <View key={s.n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
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
                    {s.n}
                  </AppText>
                </View>
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  {s.text}
                </AppText>
              </View>
            ))}
            <Button icon="plus" label="Novo lançamento" onPress={() => router.push('/registro')} />
          </Card>
        ) : (
          <>
            <View>
              <SectionHeader title="Próximos vencimentos" />
              <DueList dues={dues} onPressDue={(o) => edit(o.record.id, ymOf(o.data))} />
            </View>

            <View>
              <SectionHeader title="Lançamentos recentes" actionLabel="Ver tudo" onAction={() => router.push('/extrato')} />
              {recent.length === 0 ? (
                <Card style={{ padding: 20 }}>
                  <AppText variant="body" color={colors.ink2} align="center">
                    Nenhum lançamento neste mês. Toque no + para adicionar.
                  </AppText>
                </Card>
              ) : (
                <Card style={{ overflow: 'hidden' }}>
                  {recent.map((o, i) => (
                    <View key={o.key} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
                      <RecordItem occurrence={o} category={categories[o.record.categoriaId]} showDate />
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}
