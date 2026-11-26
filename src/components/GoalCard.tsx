import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, ProgressBar, Tag } from '@/components/ui/primitives';
import type { GoalLinks, GoalProgress } from '@/invest/lib/goals';
import { brlShort, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { Goal } from '@/types';

/** Cartão de uma meta: progresso = guardado à parte + investimentos vinculados. */
export function GoalCard({
  goal,
  progress,
  links,
  showLinkedAssets,
  onContribute,
  onEdit,
  onRemove,
}: {
  goal: Goal;
  progress: GoalProgress;
  links?: GoalLinks;
  /** lista os ativos vinculados (app Investimentos) */
  showLinkedAssets?: boolean;
  onContribute: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { done } = progress;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: done ? colors.incomeTint : colors.tint }]}>
          <Icon name={done ? 'checkCircle' : goal.icone} size={22} color={done ? colors.income : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {goal.nome}
          </AppText>
          <AppText variant="caption" color={colors.ink2} tabular>
            {done
              ? t('goals.progress', { current: brlShort(progress.total), target: brlShort(goal.alvo) })
              : t('goals.progressMissing', {
                  current: brlShort(progress.total),
                  target: brlShort(goal.alvo),
                  missing: brlShort(progress.missing),
                })}
          </AppText>
        </View>
        <AppText variant="h2" color={done ? colors.income : colors.primary} tabular>
          {percent(Math.min(progress.ratio, 9.99), 0)}
        </AppText>
      </View>

      <ProgressBar
        value={progress.ratio}
        color={done ? colors.income : colors.accent}
        label={t('goals.progressA11y', { name: goal.nome })}
      />

      {progress.linked > 0 ? (
        <View style={styles.breakdown}>
          <Tag tone="accent" icon="link">
            {t('goals.linkedValue', { value: brlShort(progress.linked) })}
          </Tag>
          {progress.manual > 0 ? <Tag>{t('goals.manualPart', { value: brlShort(progress.manual) })}</Tag> : null}
        </View>
      ) : null}

      {showLinkedAssets && links && links.assets.length > 0 ? (
        <View style={{ gap: 4 }}>
          {links.assets.map((v) => (
            <View key={v.asset.id} style={styles.assetRow}>
              <Icon name="link" size={14} color={colors.ink2} />
              <AppText variant="caption" color={colors.ink2} style={{ flex: 1 }} numberOfLines={1}>
                {v.asset.nome}
              </AppText>
              <AppText variant="captionStrong" tabular>
                {brlShort(v.valorAtual)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
        <Button
          variant="soft"
          compact
          label={done ? t('goals.completed') : t('goals.contribute')}
          icon={done ? 'check' : 'plus'}
          disabled={done}
          onPress={onContribute}
          style={{ flex: 1 }}
        />
        <IconButton icon="edit" label={t('goals.editA11y', { name: goal.nome })} color={colors.ink2} onPress={onEdit} />
        <IconButton icon="trash" label={t('goals.deleteA11y', { name: goal.nome })} color={colors.ink2} onPress={onRemove} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
