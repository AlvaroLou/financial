import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, ProgressBar } from '@/components/ui/primitives';
import { brlShort, percent } from '@/lib/money';
import { colors } from '@/theme/tokens';
import type { Goal } from '@/types';

export function GoalCard({
  goal,
  onContribute,
  onRemove,
}: {
  goal: Goal;
  onContribute: () => void;
  onRemove: () => void;
}) {
  const ratio = goal.alvo > 0 ? goal.atual / goal.alvo : 0;
  const done = goal.atual >= goal.alvo;
  const missing = Math.max(0, goal.alvo - goal.atual);

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name={goal.icone} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{goal.nome}</AppText>
          <AppText variant="caption" color={colors.ink2} tabular>
            {`${brlShort(goal.atual)} de ${brlShort(goal.alvo)}`}
            {done ? '' : ` · faltam ${brlShort(missing)}`}
          </AppText>
        </View>
        <AppText variant="h2" color={colors.primary} tabular>
          {percent(ratio, 0)}
        </AppText>
      </View>
      <ProgressBar value={ratio} label={`Progresso da meta ${goal.nome}`} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          variant="soft"
          label={done ? 'Meta concluída' : 'Contribuir'}
          icon={done ? 'check' : 'plus'}
          disabled={done}
          onPress={onContribute}
          style={{ minHeight: 44, flex: 1 }}
        />
        <IconButton icon="trash" label={`Excluir meta ${goal.nome}`} color={colors.ink2} onPress={onRemove} />
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
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
