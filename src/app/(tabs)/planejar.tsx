import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GoalCard } from '@/components/GoalCard';
import { LimitSlider } from '@/components/charts/LimitSlider';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, MoneyInput, TextField } from '@/components/ui/Fields';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button, Card, Chip, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useMonthData } from '@/hooks/useMonthData';
import { todayISO } from '@/lib/clock';
import { addMonths, monthName, ymOf } from '@/lib/dates';
import { GOAL_ICONS } from '@/lib/iconOptions';
import { monthOccurrences, projectInstallments, recurringTotals, summarize } from '@/lib/finance';
import { brl, brlShort, percent } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';
import type { Goal } from '@/types';

const LIMIT_MAX = 300_000; // R$ 3.000 (mínimo da escala do slider)
const LIMIT_STEP = 5_000; // R$ 50
/** escala do slider: cresce com o limite/gasto da categoria (arredondada a R$ 500) */
const sliderMax = (limit: number, spent: number) =>
  Math.max(LIMIT_MAX, Math.ceil((Math.max(limit, spent) * 1.5) / 50_000) * 50_000);
const CONTRIBUTIONS = [5_000, 10_000, 25_000, 50_000];

export default function PlanejarScreen() {
  const router = useRouter();
  const { summary, budget } = useMonthData();
  const categories = useFinanceStore((s) => s.categories);
  const records = useFinanceStore((s) => s.records);
  const goals = useFinanceStore((s) => s.goals);
  const setCategoryLimit = useFinanceStore((s) => s.setCategoryLimit);
  const contributeToGoal = useFinanceStore((s) => s.contributeToGoal);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const removeGoal = useFinanceStore((s) => s.removeGoal);
  const restoreGoal = useFinanceStore((s) => s.restoreGoal);
  const showSnackbar = useSnackbar();
  const ask = useDialog();

  const [goalToFund, setGoalToFund] = useState<Goal | null>(null);
  const [customAmount, setCustomAmount] = useState(0);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [draft, setDraft] = useState<{ nome: string; alvo: number; icone: IconName }>({ nome: '', alvo: 0, icone: 'piggy' });
  const [draftError, setDraftError] = useState<{ nome?: string; alvo?: string }>({});

  const expenseCategories = categories.filter((c) => c.kind === 'despesa');
  const used = budget > 0 ? summary.despesas / budget : 0;
  const remaining = budget - summary.despesas;

  // projeção: a partir do mês seguinte ao mês de hoje; comprometimento sobre a renda do mês ATUAL
  const currentYm = ymOf(todayISO());
  const projectionStart = addMonths(currentYm, 1);
  const { projection, currentIncome, recurring } = useMemo(
    () => ({
      projection: projectInstallments(records, projectionStart, 6),
      currentIncome: summarize(monthOccurrences(records, currentYm)).receitas,
      recurring: recurringTotals(records, projectionStart),
    }),
    [records, projectionStart, currentYm],
  );
  const nextTotal = projection[0]?.total ?? 0;
  const nextMonthName = monthName(projectionStart, currentYm);

  const fund = (amount: number) => {
    if (!goalToFund || amount <= 0) return;
    const added = contributeToGoal(goalToFund.id, amount);
    showSnackbar({
      message:
        added < amount
          ? `${brlShort(added)} adicionados — "${goalToFund.nome}" foi concluída!`
          : `${brlShort(added)} adicionados a "${goalToFund.nome}"`,
    });
    setGoalToFund(null);
    setCustomAmount(0);
  };

  const saveGoal = () => {
    const errs: typeof draftError = {};
    if (draft.nome.trim() === '') errs.nome = 'Dê um nome à meta.';
    if (draft.alvo <= 0) errs.alvo = 'Informe quanto quer juntar.';
    setDraftError(errs);
    if (Object.keys(errs).length > 0) return;
    addGoal({ nome: draft.nome.trim(), alvo: draft.alvo, icone: draft.icone, atual: 0 });
    showSnackbar({ message: `Meta "${draft.nome.trim()}" criada` });
    setNewGoalOpen(false);
    setDraft({ nome: '', alvo: 0, icone: 'piggy' });
  };

  const confirmRemoveGoal = (g: Goal) =>
    ask({
      title: 'Excluir meta?',
      message: `"${g.nome}" e o valor registrado nela (${brlShort(g.atual)}) serão removidos.`,
      actions: [
        {
          label: 'Excluir',
          style: 'destructive',
          onPress: () => {
            const removed = removeGoal(g.id);
            if (removed) {
              showSnackbar({ message: `Meta "${g.nome}" excluída`, actionLabel: 'Desfazer', onAction: () => restoreGoal(removed) });
            }
          },
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });

  return (
    <Screen>
      <ScreenHeader title="Planejamento" subtitle="Orçamento, parcelas futuras e metas" />
      <ScreenScroll gap={20}>
        <MonthSelector />

        {/* Orçamento do mês */}
        {budget <= 0 ? (
          <Card style={{ padding: 20, gap: 8 }}>
            <AppText variant="label" color={colors.ink2}>
              Orçamento do mês
            </AppText>
            <AppText variant="h3">Você ainda não definiu limites</AppText>
            <AppText variant="body" color={colors.ink2}>
              Arraste a bolinha de cada categoria abaixo. O orçamento do mês é a soma dos limites — com ele, a tela
              inicial mostra quanto você ainda pode gastar por dia.
            </AppText>
          </Card>
        ) : (
          <Card style={{ padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <AppText variant="label" color={colors.ink2}>
                  Orçamento do mês
                </AppText>
                <AppText variant="title" tabular>
                  {brl(budget)}
                </AppText>
              </View>
              <AppText variant="h2" color={used > 1 ? colors.expense : colors.primary} tabular>
                {percent(used, 0)}
              </AppText>
            </View>
            <ProgressBar
              value={used}
              height={10}
              color={used > 1 ? colors.expenseFill : used >= 0.8 ? colors.installment : colors.primary}
              label="Orçamento do mês utilizado"
            />
            <AppText variant="caption" color={colors.ink2} tabular>
              {remaining >= 0
                ? `Gasto ${brlShort(summary.despesas)} · restam ${brlShort(remaining)}`
                : `Gasto ${brlShort(summary.despesas)} · estourou ${brlShort(-remaining)}`}
            </AppText>
          </Card>
        )}

        {/* Limites por categoria */}
        <View>
          <SectionHeader title="Limites por categoria" actionLabel="Categorias" onAction={() => router.push('/ajustes')} />
          <Card style={{ padding: 16, gap: 18 }}>
            {expenseCategories.map((c) => {
              const spent = summary.porCategoria[c.id] ?? 0;
              return (
                <LimitSlider
                  key={c.id}
                  name={c.nome}
                  icon={c.icone}
                  spent={spent}
                  limit={c.limiteMensal}
                  max={sliderMax(c.limiteMensal, spent)}
                  step={LIMIT_STEP}
                  onCommit={(v) => setCategoryLimit(c.id, v)}
                />
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="info" size={16} color={colors.ink2} />
              <AppText variant="caption" color={colors.ink2} style={{ flex: 1 }}>
                Arraste a bolinha para ajustar o limite (até o início = sem limite). Para um valor exato, edite a
                categoria em Ajustes.
              </AppText>
            </View>
          </Card>
        </View>

        {/* Parcelas futuras */}
        <View>
          <SectionHeader title="Parcelas dos próximos meses" />
          <Card style={{ padding: 20, gap: 16 }}>
            <ProjectionChart data={projection} />
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                alignItems: 'center',
                backgroundColor: colors.installmentTint,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Icon name="info" size={18} color={colors.installmentText} />
              <AppText variant="label" color={colors.installmentText} style={{ flex: 1 }}>
                {nextTotal === 0
                  ? `Nenhuma parcela prevista para ${nextMonthName}.`
                  : `Em ${nextMonthName}, as parcelas somam ${brlShort(nextTotal)}` +
                    (currentIncome > 0 ? ` (${percent(nextTotal / currentIncome)} da renda deste mês).` : '.')}
              </AppText>
            </View>
            {recurring.despesas > 0 || recurring.receitas > 0 ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Icon name="repeat" size={18} color={colors.ink2} />
                <AppText variant="caption" color={colors.ink2} style={{ flex: 1 }} tabular>
                  {`Recorrentes em ${nextMonthName}: ${brlShort(recurring.despesas)} em contas` +
                    (recurring.receitas > 0 ? ` · ${brlShort(recurring.receitas)} em receitas` : '')}
                </AppText>
              </View>
            ) : null}
          </Card>
        </View>

        {/* Metas */}
        <View>
          <SectionHeader title="Metas" actionLabel="Nova meta" onAction={() => setNewGoalOpen(true)} />
          <View style={{ gap: 12 }}>
            {goals.length === 0 ? (
              <Card style={{ padding: 20, gap: 12, alignItems: 'center' }}>
                <Icon name="piggy" size={32} color={colors.primary} />
                <AppText variant="body" color={colors.ink2} align="center">
                  Junte dinheiro para uma reserva, viagem ou compra grande.
                </AppText>
                <Button variant="soft" icon="plus" label="Criar meta" onPress={() => setNewGoalOpen(true)} style={{ alignSelf: 'stretch' }} />
              </Card>
            ) : (
              goals.map((g) => (
                <GoalCard key={g.id} goal={g} onContribute={() => setGoalToFund(g)} onRemove={() => confirmRemoveGoal(g)} />
              ))
            )}
          </View>
        </View>
      </ScreenScroll>

      {/* Contribuir */}
      <BottomSheet
        visible={goalToFund !== null}
        title={goalToFund ? `Contribuir · ${goalToFund.nome}` : ''}
        onClose={() => {
          setGoalToFund(null);
          setCustomAmount(0);
        }}
      >
        <View style={{ gap: 8, paddingBottom: 8 }}>
          {CONTRIBUTIONS.map((amount) => (
            <Pressable
              key={amount}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${brlShort(amount)}`}
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
            <MoneyInput label="Outro valor" value={customAmount} onChange={setCustomAmount} tone={colors.primary} />
            <Button label="Adicionar" icon="check" disabled={customAmount <= 0} onPress={() => fund(customAmount)} />
          </View>
        </View>
      </BottomSheet>

      {/* Nova meta */}
      <BottomSheet visible={newGoalOpen} title="Nova meta" onClose={() => setNewGoalOpen(false)}>
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <TextField
            label="Nome"
            value={draft.nome}
            onChangeText={(nome) => setDraft((d) => ({ ...d, nome }))}
            placeholder="Ex.: Reserva de emergência"
            error={draftError.nome}
            maxLength={40}
          />
          <MoneyInput
            label="Quanto quer juntar"
            value={draft.alvo}
            onChange={(alvo) => setDraft((d) => ({ ...d, alvo }))}
            error={draftError.alvo}
            tone={colors.primary}
          />
          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.ink2}>
              Ícone
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_ICONS.map(({ icon, label }) => (
                <Chip
                  key={icon}
                  icon={icon}
                  accessibilityLabel={`Ícone: ${label}`}
                  active={draft.icone === icon}
                  onPress={() => setDraft((d) => ({ ...d, icone: icon }))}
                />
              ))}
            </View>
          </View>
          <Button label="Criar meta" icon="check" onPress={saveGoal} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
