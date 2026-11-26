import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DateField } from '@/components/ui/DateField';
import { useDialog } from '@/components/ui/Dialog';
import { MoneyInput, SelectField, SwitchRow, TextField } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Chip, IconButton, Segmented, Tag } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useRecordActions } from '@/hooks/useRecordActions';
import { todayISO } from '@/lib/clock';
import { addDays, displayDate, monthIndex, monthLabel, ymOf } from '@/lib/dates';
import { installmentValue, isRecurring, monthlyValue } from '@/lib/finance';
import { PAYMENT_LABEL, PAYMENT_ORDER } from '@/lib/labels';
import { brl } from '@/lib/money';
import { useFinanceStore, type RecordInput } from '@/store/useFinanceStore';
import { colors, layout } from '@/theme/tokens';
import type { FinanceRecord, ISODate, Nature, PaymentMethod, RecordKind, YM } from '@/types';

interface Form {
  kind: RecordKind;
  valorTotal: number;
  nome: string;
  descricao: string;
  categoriaId: string;
  natureza: Nature;
  forma: PaymentMethod;
  data: ISODate;
  parcelado: boolean;
  parcelaAtual: string;
  parcelasTotais: string;
  recorrente: boolean;
  recorrenteAte?: YM;
  vencimento: ISODate;
}

type Errors = Partial<Record<'valor' | 'nome' | 'parcelaAtual' | 'parcelasTotais' | 'vencimento', string>>;

const toInt = (s: string) => parseInt(s.replace(/\D/g, ''), 10) || 0;

function toForm(r: FinanceRecord): Form {
  return {
    kind: r.kind,
    valorTotal: r.valorTotal,
    nome: r.nome,
    descricao: r.descricao,
    categoriaId: r.categoriaId,
    natureza: r.natureza,
    forma: r.forma,
    data: r.data,
    parcelado: r.parcelado,
    parcelaAtual: String(r.parcelaAtual ?? 1),
    parcelasTotais: String(r.parcelasTotais ?? 2),
    recorrente: isRecurring(r),
    recorrenteAte: r.recorrenteAte,
    vencimento: r.vencimento ?? addDays(r.data, 5),
  };
}

export default function RegistroScreen() {
  const router = useRouter();
  const { id, ym: ymParam } = useLocalSearchParams<{ id?: string; ym?: string }>();
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const { remove, removeOccurrence } = useRecordActions();

  const categories = useFinanceStore((s) => s.categories);
  const existing = useFinanceStore((s) => (id ? s.records.find((r) => r.id === id) : undefined));
  const addRecord = useFinanceStore((s) => s.addRecord);
  const updateRecord = useFinanceStore((s) => s.updateRecord);

  const isEditing = !!existing;

  const [form, setForm] = useState<Form>(() => {
    if (existing) return toForm(existing);
    const first = categories.find((c) => c.kind === 'despesa') ?? categories[0];
    const data = todayISO();
    return {
      kind: 'despesa',
      valorTotal: 0,
      nome: '',
      descricao: '',
      categoriaId: first?.id ?? '',
      natureza: first?.naturezaPadrao ?? 'variavel',
      forma: 'pix',
      data,
      parcelado: false,
      parcelaAtual: '1',
      parcelasTotais: '2',
      recorrente: false,
      vencimento: addDays(data, 5),
    };
  });
  const initialForm = useRef(form);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const visibleCategories = useMemo(() => categories.filter((c) => c.kind === form.kind), [categories, form.kind]);

  const changeKind = (kind: RecordKind) => {
    if (kind === form.kind) return;
    const first = categories.find((c) => c.kind === kind);
    setForm((f) => ({
      ...f,
      kind,
      categoriaId: first?.id ?? f.categoriaId,
      natureza: first?.naturezaPadrao ?? f.natureza,
      parcelado: kind === 'receita' ? false : f.parcelado,
    }));
  };

  const pickCategory = (categoriaId: string) => {
    const c = categories.find((x) => x.id === categoriaId);
    setForm((f) => ({ ...f, categoriaId, natureza: c?.naturezaPadrao ?? f.natureza }));
  };

  // parcelado e recorrente são excludentes
  const setParcelado = (v: boolean) => setForm((f) => ({ ...f, parcelado: v, recorrente: v ? false : f.recorrente }));
  const setRecorrente = (v: boolean) =>
    setForm((f) => ({
      ...f,
      recorrente: v,
      parcelado: v ? false : f.parcelado,
      // recorrências costumam ser fixas (aluguel, salário, assinaturas)
      natureza: v && !f.recorrente ? 'fixo' : f.natureza,
    }));

  const atual = toInt(form.parcelaAtual);
  const total = toInt(form.parcelasTotais);
  const needsDue = form.parcelado || form.forma === 'boleto';

  const installmentInfo = useMemo(() => {
    if (!form.parcelado || total < 2 || atual < 1 || atual > total || form.valorTotal <= 0) return null;
    const draft = { valorTotal: form.valorTotal, parcelasTotais: total } as FinanceRecord;
    let remaining = 0;
    for (let p = atual + 1; p <= total; p++) remaining += installmentValue(draft, p);
    return { monthly: monthlyValue(form.valorTotal, total), left: total - atual, remaining };
  }, [form.parcelado, form.valorTotal, atual, total]);

  const validate = (): boolean => {
    const next: Errors = {};
    if (form.valorTotal <= 0) next.valor = 'Informe um valor maior que zero.';
    if (form.nome.trim() === '') next.nome = 'Dê um nome ao lançamento.';
    if (form.parcelado) {
      if (total < 2) next.parcelasTotais = 'Use 2 ou mais parcelas.';
      if (atual < 1 || (total >= 2 && atual > total)) next.parcelaAtual = `Informe um valor entre 1 e ${Math.max(total, 1)}.`;
    }
    if (needsDue && form.vencimento < form.data) next.vencimento = 'O vencimento não pode ser antes da data do lançamento.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const input: RecordInput = {
      kind: form.kind,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      valorTotal: form.valorTotal,
      natureza: form.natureza,
      forma: form.forma,
      data: form.data,
      categoriaId: form.categoriaId,
      // mantém o ícone personalizado só se a categoria não mudou
      icone: existing && existing.categoriaId === form.categoriaId ? existing.icone : undefined,
      parcelado: form.parcelado,
      parcelaAtual: form.parcelado ? atual : undefined,
      parcelasTotais: form.parcelado ? total : undefined,
      recorrente: form.recorrente || undefined,
      // um fim anterior ao início não faz sentido (a data pode ter sido movida)
      recorrenteAte:
        form.recorrente && form.recorrenteAte && monthIndex(form.recorrenteAte) >= monthIndex(ymOf(form.data))
          ? form.recorrenteAte
          : undefined,
      vencimento: needsDue ? form.vencimento : undefined,
    };
    if (existing) updateRecord(existing.id, input);
    else addRecord(input);
    showSnackbar({ message: isEditing ? 'Lançamento atualizado' : 'Lançamento salvo' });
    router.back();
  };

  const close = () => {
    if (JSON.stringify(form) === JSON.stringify(initialForm.current)) {
      router.back();
      return;
    }
    ask({
      title: 'Descartar alterações?',
      message: 'O que você preencheu não será salvo.',
      actions: [
        { label: 'Descartar', style: 'destructive', onPress: () => router.back() },
        { label: 'Continuar', style: 'cancel' },
      ],
    });
  };

  const confirmDelete = () => {
    if (!existing) return;
    const occurrenceYm = ymParam ?? ymOf(existing.data);
    // recorrente visto depois do 1º mês: o diálogo próprio pergunta "a partir de quando"
    if (isRecurring(existing) && monthIndex(occurrenceYm) > monthIndex(ymOf(existing.data))) {
      removeOccurrence(existing, occurrenceYm, () => router.back());
      return;
    }
    ask({
      title: 'Excluir lançamento?',
      message: `"${existing.nome}" será removido${isRecurring(existing) ? ' de todos os meses' : ''}. Você poderá desfazer em seguida.`,
      actions: [
        {
          label: 'Excluir',
          style: 'destructive',
          onPress: () => {
            router.back();
            remove(existing.id);
          },
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const isExpense = form.kind === 'despesa';

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
        <IconButton icon="close" label="Fechar" onPress={close} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {isEditing ? 'Editar lançamento' : 'Novo lançamento'}
        </AppText>
        {isEditing ? <IconButton icon="trash" label="Excluir lançamento" color={colors.expense} onPress={confirmDelete} /> : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: layout.screenPadding, gap: 18, paddingBottom: 24 }}
        >
          <Segmented
            accessibilityLabel="Tipo de lançamento"
            value={form.kind}
            onChange={changeKind}
            options={[
              { value: 'despesa', label: 'Despesa', icon: 'arrowUpRight' },
              { value: 'receita', label: 'Receita', icon: 'arrowDownLeft' },
            ]}
          />

          <MoneyInput
            label={form.parcelado ? 'Valor total da compra' : form.recorrente ? 'Valor mensal' : 'Valor'}
            value={form.valorTotal}
            onChange={(v) => set('valorTotal', v)}
            error={errors.valor}
            tone={isExpense ? colors.expense : colors.income}
          />

          <TextField
            label="Nome"
            value={form.nome}
            onChangeText={(t) => set('nome', t)}
            placeholder={isExpense ? 'Ex.: Mercado' : 'Ex.: Salário'}
            error={errors.nome}
            returnKeyType="next"
            maxLength={60}
          />

          <TextField
            label="Descrição (opcional)"
            value={form.descricao}
            onChangeText={(t) => set('descricao', t)}
            placeholder="Detalhes, loja, observações…"
            multiline
            maxLength={280}
          />

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.ink2}>
              Categoria
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {visibleCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.nome}
                  icon={c.icone}
                  active={form.categoriaId === c.id}
                  onPress={() => pickCategory(c.id)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="label" color={colors.ink2}>
              Natureza
            </AppText>
            <Segmented
              accessibilityLabel="Natureza do lançamento"
              value={form.natureza}
              onChange={(v) => set('natureza', v)}
              options={[
                { value: 'fixo', label: isExpense ? 'Gasto Fixo' : 'Fixa' },
                { value: 'variavel', label: isExpense ? 'Gasto Variável' : 'Variável' },
              ]}
            />
          </View>

          <SelectField
            label="Forma de pagamento"
            value={form.forma}
            onChange={(v) => set('forma', v)}
            options={PAYMENT_ORDER.map((p) => ({ value: p, label: PAYMENT_LABEL[p] }))}
          />

          <DateField label={form.recorrente ? 'Primeiro mês (data)' : 'Data'} value={form.data} onChange={(d) => set('data', d)} />

          <View style={{ gap: 12 }}>
            <SwitchRow
              icon="repeat"
              label="Repetir todo mês"
              description={isExpense ? 'Aluguel, assinaturas, contas da casa…' : 'Salário, aluguel recebido, mesada…'}
              value={form.recorrente}
              onChange={setRecorrente}
            />

            {form.recorrente ? (
              <View style={styles.note}>
                <Icon name="info" size={18} color={colors.tagText} />
                <View style={{ flex: 1, gap: 8 }}>
                  <AppText variant="label" color={colors.tagText}>
                    {form.recorrenteAte
                      ? `Repete de ${monthLabel(ymOf(form.data)).toLowerCase()} até ${monthLabel(form.recorrenteAte).toLowerCase()}.`
                      : `Aparece automaticamente todo mês a partir de ${displayDate(form.data)}.`}
                    {isEditing ? ' Alterações valem para todos os meses.' : ''}
                  </AppText>
                  {form.recorrenteAte ? (
                    <Button
                      variant="soft"
                      icon="repeat"
                      label="Voltar a repetir sem fim"
                      onPress={() => set('recorrenteAte', undefined)}
                      style={{ minHeight: 40 }}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}

            {isExpense ? (
              <SwitchRow
                icon="card"
                label="Compra parcelada"
                description="Divide o valor total em parcelas mensais"
                value={form.parcelado}
                onChange={setParcelado}
              />
            ) : null}

            {isExpense && form.parcelado ? (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Parcela atual"
                      value={form.parcelaAtual}
                      onChangeText={(t) => set('parcelaAtual', t.replace(/\D/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      error={errors.parcelaAtual}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField
                      label="Total de parcelas"
                      value={form.parcelasTotais}
                      onChangeText={(t) => set('parcelasTotais', t.replace(/\D/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      error={errors.parcelasTotais}
                    />
                  </View>
                </View>

                {installmentInfo ? (
                  <View accessible accessibilityLiveRegion="polite" style={[styles.note, styles.noteInstallment]}>
                    <Icon name="info" size={18} color={colors.installmentText} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Tag tone="installment">{`Parcela ${atual} de ${total}`}</Tag>
                      <AppText variant="label" color={colors.installmentText}>
                        {`${brl(installmentInfo.monthly)} por mês · restam ${installmentInfo.left} (${brl(installmentInfo.remaining)})`}
                      </AppText>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {needsDue ? (
            <View style={{ gap: 6 }}>
              <DateField
                label={form.parcelado ? 'Vencimento da parcela' : 'Vencimento do boleto'}
                value={form.vencimento}
                onChange={(d) => set('vencimento', d)}
              />
              {errors.vencimento ? (
                <AppText variant="caption" color={colors.expense} accessibilityLiveRegion="polite">
                  {errors.vencimento}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            padding: layout.screenPadding,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.line,
            backgroundColor: colors.surface,
          }}
        >
          <Button label={isEditing ? 'Salvar alterações' : 'Salvar lançamento'} icon="check" onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.tag,
    borderRadius: 12,
    padding: 12,
  },
  noteInstallment: { backgroundColor: colors.installmentTint },
});
