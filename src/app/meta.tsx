import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { MoneyInput, TextField } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Chip } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { usePortfolio } from '@/invest/hooks';
import { useInvestStore } from '@/invest/store';
import { GOAL_ICONS } from '@/lib/iconOptions';
import { brlShort } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { GoalInput } from '@/types';

/** Criar/editar meta (`?id=`). Os investimentos marcados aqui somam no progresso. */
export default function MetaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useFinanceStore((s) => (id ? s.goals.find((g) => g.id === id) : undefined));
  const addGoal = useFinanceStore((s) => s.addGoal);
  const updateGoal = useFinanceStore((s) => s.updateGoal);
  const setGoalAssets = useInvestStore((s) => s.setGoalAssets);
  const portfolio = usePortfolio();
  const showSnackbar = useSnackbar();

  const linkable = useMemo(() => portfolio.abertos, [portfolio]);
  const [form, setForm] = useState<GoalInput>(() =>
    goal ? { nome: goal.nome, alvo: goal.alvo, atual: goal.atual, icone: goal.icone } : { nome: '', alvo: 0, atual: 0, icone: 'piggy' },
  );
  const [linked, setLinked] = useState<string[]>(() => (goal ? linkable.filter((v) => v.asset.metaId === goal.id).map((v) => v.asset.id) : []));
  const initial = useRef(JSON.stringify({ form, linked }));
  const [errors, setErrors] = useState<{ nome?: string; alvo?: string }>({});

  const set = <K extends keyof GoalInput>(k: K, v: GoalInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const linkedValue = linkable.filter((v) => linked.includes(v.asset.id)).reduce((a, v) => a + v.valorAtual, 0);

  const save = () => {
    const errs: typeof errors = {};
    if (form.nome.trim() === '') errs.nome = t('goals.nameError');
    if (form.alvo <= 0) errs.alvo = t('goals.targetError');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const input = { ...form, nome: form.nome.trim() };
    const goalId = goal ? goal.id : addGoal(input);
    if (goal) updateGoal(goal.id, input);
    setGoalAssets(goalId, linked);
    showSnackbar({ message: goal ? t('goals.updated') : t('goals.created', { name: input.nome }) });
    router.back();
  };

  return (
    <FormScreen
      title={goal ? t('goals.editTitle') : t('goals.newTitle')}
      dirty={JSON.stringify({ form, linked }) !== initial.current}
      onSave={save}
      saveLabel={goal ? t('common.saveChanges') : t('goals.create')}
    >
      <TextField
        label={t('common.name')}
        value={form.nome}
        onChangeText={(v) => set('nome', v)}
        placeholder={t('goals.namePlaceholder')}
        error={errors.nome}
        maxLength={40}
      />
      <MoneyInput label={t('goals.targetLabel')} value={form.alvo} onChange={(v) => set('alvo', v)} error={errors.alvo} tone={colors.primary} />
      <MoneyInput
        label={t('goals.savedLabel')}
        hint={t('goals.savedHint')}
        value={form.atual}
        onChange={(v) => set('atual', v)}
      />

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('common.icon')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GOAL_ICONS.map(({ icon, key }) => (
            <Chip
              key={icon}
              icon={icon}
              accessibilityLabel={t('common.iconA11y', { name: t(`icons.${key}`) })}
              active={form.icone === icon}
              onPress={() => set('icone', icon)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('goals.linkedTitle')}
        </AppText>
        {linkable.length === 0 ? (
          <AppText variant="caption" color={colors.ink2}>
            {t('goals.linkedEmpty')}
          </AppText>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {linkable.map((v) => {
                const active = linked.includes(v.asset.id);
                const elsewhere = !active && v.asset.metaId && v.asset.metaId !== goal?.id;
                return (
                  <Chip
                    key={v.asset.id}
                    tone="soft"
                    icon={active ? 'check' : 'link'}
                    label={`${v.asset.nome} · ${brlShort(v.valorAtual)}${elsewhere ? ' *' : ''}`}
                    active={active}
                    onPress={() => setLinked((l) => (active ? l.filter((x) => x !== v.asset.id) : [...l, v.asset.id]))}
                  />
                );
              })}
            </View>
            <AppText variant="caption" color={colors.ink2}>
              {t('goals.linkedHint', { value: brlShort(linkedValue) })}
            </AppText>
          </>
        )}
      </View>
    </FormScreen>
  );
}
