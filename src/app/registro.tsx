import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DateField } from '@/components/ui/DateField';
import { useDialog } from '@/components/ui/Dialog';
import { MoneyInput, SelectField, SwitchRow, TextField } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Icon } from '@/components/ui/Icon';
import { Button, Chip, Segmented, Tag } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { CARD_CATEGORY_ID } from '@/data/defaults';
import { useRecordActions } from '@/hooks/useRecordActions';
import { categoryName, natureLabelFor, paymentLabel } from '@/i18n/labels';
import { todayISO } from '@/lib/clock';
import { addDays, displayDate, monthIndex, monthLabel, ymOf } from '@/lib/dates';
import { installmentValue, isRecurring, monthlyValue, recordTags } from '@/lib/finance';
import { PAYMENT_ORDER } from '@/lib/labels';
import { brl } from '@/lib/money';
import { useFinanceStore, type RecordInput } from '@/store/useFinanceStore';
import type { ThemeColors } from '@/theme/palette';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { FinanceRecord, ISODate, Nature, PaymentMethod, RecordKind, YM } from '@/types';

interface Form {
  kind: RecordKind;
  valorTotal: number;
  nome: string;
  descricao: string;
  categoriaId: string;
  etiquetas: string[];
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
    etiquetas: recordTags(r),
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
    const first = categories.find((c) => c.kind === 'despesa' && !c.fixa) ?? categories[0];
    const data = todayISO();
    return {
      kind: 'despesa',
      valorTotal: 0,
      nome: '',
      descricao: '',
      categoriaId: first?.id ?? '',
      etiquetas: [],
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
  /** a etiqueta "Cartão" foi posta automaticamente (ao escolher Crédito)? */
  const autoCardTag = useRef(false);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const sameKind = useMemo(() => categories.filter((c) => c.kind === form.kind), [categories, form.kind]);
  const hasCardCategory = categories.some((c) => c.id === CARD_CATEGORY_ID);

  const changeKind = (kind: RecordKind) => {
    if (kind === form.kind) return;
    const first = categories.find((c) => c.kind === kind && !c.fixa) ?? categories.find((c) => c.kind === kind);
    autoCardTag.current = false;
    setForm((f) => ({
      ...f,
      kind,
      categoriaId: first?.id ?? f.categoriaId,
      etiquetas: [],
      natureza: first?.naturezaPadrao ?? f.natureza,
      parcelado: kind === 'receita' ? false : f.parcelado,
    }));
  };

  const pickCategory = (categoriaId: string) => {
    const c = categories.find((x) => x.id === categoriaId);
    setForm((f) => ({
      ...f,
      categoriaId,
      etiquetas: f.etiquetas.filter((e) => e !== categoriaId),
      natureza: c?.naturezaPadrao ?? f.natureza,
    }));
  };

  const toggleTag = (tagId: string) => {
    if (tagId === CARD_CATEGORY_ID) autoCardTag.current = false;
    setForm((f) => ({
      ...f,
      etiquetas: f.etiquetas.includes(tagId) ? f.etiquetas.filter((e) => e !== tagId) : [...f.etiquetas, tagId],
    }));
  };

  // Crédito põe a etiqueta "Cartão" automaticamente (e tira se trocar de volta, caso tenha sido automática)
  const changeForma = (forma: PaymentMethod) => {
    setForm((f) => {
      let etiquetas = f.etiquetas;
      const canTag = f.kind === 'despesa' && hasCardCategory && f.categoriaId !== CARD_CATEGORY_ID;
      if (forma === 'credito' && canTag && !etiquetas.includes(CARD_CATEGORY_ID)) {
        etiquetas = [...etiquetas, CARD_CATEGORY_ID];
        autoCardTag.current = true;
      } else if (forma !== 'credito' && autoCardTag.current) {
        etiquetas = etiquetas.filter((e) => e !== CARD_CATEGORY_ID);
        autoCardTag.current = false;
      }
      return { ...f, forma, etiquetas };
    });
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
    if (form.valorTotal <= 0) next.valor = t('form.valueError');
    if (form.nome.trim() === '') next.nome = t('form.nameError');
    if (form.parcelado) {
      if (total < 2) next.parcelasTotais = t('form.installmentsMinError');
      if (atual < 1 || (total >= 2 && atual > total)) next.parcelaAtual = t('form.installmentRangeError', { max: Math.max(total, 1) });
    }
    if (needsDue && form.vencimento < form.data) next.vencimento = t('form.dueError');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const tags = form.etiquetas.filter((e) => e !== form.categoriaId && sameKind.some((c) => c.id === e));
    const input: RecordInput = {
      kind: form.kind,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      valorTotal: form.valorTotal,
      natureza: form.natureza,
      forma: form.forma,
      data: form.data,
      categoriaId: form.categoriaId,
      etiquetas: tags.length ? tags : undefined,
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
    showSnackbar({ message: isEditing ? t('form.updated') : t('form.saved') });
    router.back();
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
      title: t('form.deleteTitle'),
      message: isRecurring(existing)
        ? t('form.deleteMessageRecurring', { name: existing.nome })
        : t('form.deleteMessage', { name: existing.nome }),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            router.back();
            remove(existing.id);
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const isExpense = form.kind === 'despesa';
  const tagOptions = sameKind.filter((c) => c.id !== form.categoriaId);

  return (
    <FormScreen
      title={isEditing ? t('form.editTitle') : t('form.newTitle')}
      dirty={JSON.stringify(form) !== JSON.stringify(initialForm.current)}
      onSave={save}
      saveLabel={isEditing ? t('common.saveChanges') : t('form.saveNew')}
      onDelete={isEditing ? confirmDelete : undefined}
      deleteLabel={t('form.deleteA11y')}
    >
      <Segmented
        accessibilityLabel={t('form.kindA11y')}
        value={form.kind}
        onChange={changeKind}
        options={[
          { value: 'despesa', label: t('kind.despesa'), icon: 'arrowUpRight' },
          { value: 'receita', label: t('kind.receita'), icon: 'arrowDownLeft' },
        ]}
      />

      <MoneyInput
        label={form.parcelado ? t('form.valueTotal') : form.recorrente ? t('form.valueMonthly') : t('common.value')}
        value={form.valorTotal}
        onChange={(v) => set('valorTotal', v)}
        error={errors.valor}
        tone={isExpense ? colors.expense : colors.income}
      />

      <TextField
        label={t('common.name')}
        value={form.nome}
        onChangeText={(v) => set('nome', v)}
        placeholder={isExpense ? t('form.namePlaceholderExpense') : t('form.namePlaceholderIncome')}
        error={errors.nome}
        returnKeyType="next"
        maxLength={60}
      />

      <TextField
        label={t('form.description')}
        value={form.descricao}
        onChangeText={(v) => set('descricao', v)}
        placeholder={t('form.descriptionPlaceholder')}
        multiline
        maxLength={280}
      />

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('form.mainCategory')}
        </AppText>
        <View style={styles.wrap}>
          {sameKind.map((c) => (
            <Chip key={c.id} label={categoryName(c)} icon={c.icone} active={form.categoriaId === c.id} onPress={() => pickCategory(c.id)} />
          ))}
        </View>
        <AppText variant="caption" color={colors.ink2}>
          {t('form.mainCategoryHint')}
        </AppText>
      </View>

      {tagOptions.length > 0 ? (
        <View style={{ gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            {t('form.alsoIn')}
          </AppText>
          <View style={styles.wrap}>
            {tagOptions.map((c) => {
              const active = form.etiquetas.includes(c.id);
              return (
                <Chip
                  key={c.id}
                  tone="soft"
                  label={categoryName(c)}
                  icon={active ? 'check' : 'tag'}
                  active={active}
                  accessibilityLabel={t('form.tagA11y', { name: categoryName(c) })}
                  onPress={() => toggleTag(c.id)}
                />
              );
            })}
          </View>
          <AppText variant="caption" color={colors.ink2}>
            {isExpense && hasCardCategory ? `${t('form.alsoInHint')} ${t('form.cardAuto')}` : t('form.alsoInHint')}
          </AppText>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('form.nature')}
        </AppText>
        <Segmented
          accessibilityLabel={t('form.natureA11y')}
          value={form.natureza}
          onChange={(v) => set('natureza', v)}
          options={[
            { value: 'fixo', label: natureLabelFor('fixo', form.kind) },
            { value: 'variavel', label: natureLabelFor('variavel', form.kind) },
          ]}
        />
      </View>

      <SelectField
        label={t('form.payment')}
        value={form.forma}
        onChange={changeForma}
        options={PAYMENT_ORDER.map((p) => ({ value: p, label: paymentLabel(p) }))}
      />

      <DateField label={form.recorrente ? t('form.firstMonth') : t('common.date')} value={form.data} onChange={(d) => set('data', d)} />

      <View style={{ gap: 12 }}>
        <SwitchRow
          icon="repeat"
          label={t('form.repeat')}
          description={isExpense ? t('form.repeatExpense') : t('form.repeatIncome')}
          value={form.recorrente}
          onChange={setRecorrente}
        />

        {form.recorrente ? (
          <View style={styles.note}>
            <Icon name="info" size={18} color={colors.tagText} />
            <View style={{ flex: 1, gap: 8 }}>
              <AppText variant="label" color={colors.tagText}>
                {(form.recorrenteAte
                  ? t('form.repeatRange', { from: monthLabel(ymOf(form.data)), to: monthLabel(form.recorrenteAte) })
                  : t('form.repeatFrom', { date: displayDate(form.data) })) + (isEditing ? ` ${t('form.repeatEditNote')}` : '')}
              </AppText>
              {form.recorrenteAte ? (
                <Button
                  variant="soft"
                  compact
                  icon="repeat"
                  label={t('form.repeatForever')}
                  onPress={() => set('recorrenteAte', undefined)}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {isExpense ? (
          <SwitchRow
            icon="card"
            label={t('form.installment')}
            description={t('form.installmentHint')}
            value={form.parcelado}
            onChange={setParcelado}
          />
        ) : null}

        {isExpense && form.parcelado ? (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('form.currentInstallment')}
                  value={form.parcelaAtual}
                  onChangeText={(v) => set('parcelaAtual', v.replace(/\D/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  error={errors.parcelaAtual}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('form.totalInstallments')}
                  value={form.parcelasTotais}
                  onChangeText={(v) => set('parcelasTotais', v.replace(/\D/g, '').slice(0, 3))}
                  keyboardType="number-pad"
                  error={errors.parcelasTotais}
                />
              </View>
            </View>

            {installmentInfo ? (
              <View accessible accessibilityLiveRegion="polite" style={[styles.note, { backgroundColor: colors.installmentTint }]}>
                <Icon name="info" size={18} color={colors.installmentText} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Tag tone="installment">{t('form.installmentTag', { current: atual, total })}</Tag>
                  <AppText variant="label" color={colors.installmentText}>
                    {t('form.installmentInfo', {
                      monthly: brl(installmentInfo.monthly),
                      left: installmentInfo.left,
                      remaining: brl(installmentInfo.remaining),
                    })}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {needsDue ? (
        <DateField
          label={form.parcelado ? t('form.dueInstallment') : t('form.dueBoleto')}
          value={form.vencimento}
          onChange={(d) => set('vencimento', d)}
          error={errors.vencimento}
        />
      ) : null}
    </FormScreen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    note: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: colors.tag,
      borderRadius: 12,
      padding: 12,
    },
  });
