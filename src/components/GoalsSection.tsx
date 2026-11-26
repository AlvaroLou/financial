import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { GoalCard } from '@/components/GoalCard';
import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, MoneyInput } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, SectionHeader } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useGoalLinks } from '@/invest/hooks';
import { goalProgress } from '@/invest/lib/goals';
import { brlShort } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Goal } from '@/types';

const CONTRIBUTIONS = [5_000, 10_000, 25_000, 50_000];

/**
 * Metas (compartilhadas pelos dois apps): no Orçamento ficam em Planejar; nos
 * Investimentos têm aba própria e mostram os ativos vinculados.
 */
export function GoalsSection({ showLinkedAssets = false, title }: { showLinkedAssets?: boolean; title?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const goals = useFinanceStore((s) => s.goals);
  const contributeToGoal = useFinanceStore((s) => s.contributeToGoal);
  const removeGoal = useFinanceStore((s) => s.removeGoal);
  const restoreGoal = useFinanceStore((s) => s.restoreGoal);
  const links = useGoalLinks();
  const showSnackbar = useSnackbar();
  const ask = useDialog();

  const [goalToFund, setGoalToFund] = useState<Goal | null>(null);
  const [customAmount, setCustomAmount] = useState(0);

  const closeFund = () => {
    setGoalToFund(null);
    setCustomAmount(0);
  };

  const fund = (amount: number) => {
    if (!goalToFund || amount <= 0) return;
    const missing = goalProgress(goalToFund, links[goalToFund.id]).missing;
    const added = contributeToGoal(goalToFund.id, Math.min(amount, missing));
    showSnackbar({
      message:
        added >= missing
          ? t('goals.addedCompleted', { value: brlShort(added), name: goalToFund.nome })
          : t('goals.added', { value: brlShort(added), name: goalToFund.nome }),
    });
    closeFund();
  };

  const confirmRemove = (g: Goal) =>
    ask({
      title: t('goals.deleteTitle'),
      message:
        t('goals.deleteMessage', { name: g.nome, value: brlShort(g.atual) }) +
        (links[g.id]?.assets.length ? ` ${t('goals.deleteLinkedNote')}` : ''),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const removed = removeGoal(g.id);
            if (removed) {
              showSnackbar({
                message: t('goals.deleted', { name: g.nome }),
                actionLabel: t('common.undo'),
                onAction: () => restoreGoal(removed),
              });
            }
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });

  return (
    <View>
      <SectionHeader title={title ?? t('goals.title')} actionLabel={t('goals.new')} onAction={() => router.push('/meta')} />
      <View style={{ gap: 12 }}>
        {goals.length === 0 ? (
          <Card style={{ padding: 20, gap: 12, alignItems: 'center' }}>
            <Icon name="piggy" size={32} color={colors.primary} />
            <AppText variant="body" color={colors.ink2} align="center">
              {showLinkedAssets ? t('goals.emptyTextInvest') : t('goals.emptyText')}
            </AppText>
            <Button
              variant="soft"
              icon="plus"
              label={t('goals.create')}
              onPress={() => router.push('/meta')}
              style={{ alignSelf: 'stretch' }}
            />
          </Card>
        ) : (
          goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              progress={goalProgress(g, links[g.id])}
              links={links[g.id]}
              showLinkedAssets={showLinkedAssets}
              onContribute={() => setGoalToFund(g)}
              onEdit={() => router.push({ pathname: '/meta', params: { id: g.id } })}
              onRemove={() => confirmRemove(g)}
            />
          ))
        )}
      </View>

      <BottomSheet
        visible={goalToFund !== null}
        title={goalToFund ? t('goals.contributeTitle', { name: goalToFund.nome }) : ''}
        onClose={closeFund}
      >
        <View style={{ gap: 8, paddingBottom: 8 }}>
          <AppText variant="caption" color={colors.ink2}>
            {t('goals.contributeHint')}
          </AppText>
          {CONTRIBUTIONS.map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityLabel={t('goals.addAmount', { value: brlShort(amount) })}
              onPress={() => fund(amount)}
              style={({ pressed }) => ({
                minHeight: 52,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.outline,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: pressed ? colors.tint : colors.surface,
              })}
            >
              <Icon name="plus" size={20} color={colors.primary} />
              <AppText variant="bodyStrong" tabular>
                {brlShort(amount)}
              </AppText>
            </Pressable>
          ))}
          <View style={{ gap: 8, marginTop: 8 }}>
            <MoneyInput label={t('goals.otherAmount')} value={customAmount} onChange={setCustomAmount} tone={colors.primary} />
            <Button label={t('common.add')} icon="check" disabled={customAmount <= 0} onPress={() => fund(customAmount)} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
