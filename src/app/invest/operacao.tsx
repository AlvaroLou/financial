import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DateField } from '@/components/ui/DateField';
import { useDialog } from '@/components/ui/Dialog';
import { MoneyInput, SelectField, TextField } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Button, Chip } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { ASSET_TYPES } from '@/invest/catalog';
import { quotePosition } from '@/invest/lib/positions';
import { useInvestStore } from '@/invest/store';
import type { IncomeType, Operation, OperationType } from '@/invest/types';
import { todayISO } from '@/lib/clock';
import { brl, brlDelta, formatDecimal, parseDecimal } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { ISODate } from '@/types';

const TYPES_BY_VALUATION: Record<'quote' | 'fixed' | 'manual', OperationType[]> = {
  quote: ['compra', 'venda', 'provento', 'desdobramento', 'grupamento', 'bonificacao', 'taxa'],
  fixed: ['aporte', 'resgate', 'provento', 'taxa'],
  manual: ['aporte', 'resgate', 'provento', 'taxa'],
};
const INCOME_TYPES: IncomeType[] = ['dividendo', 'jcp', 'rendimento', 'juros', 'amortizacao', 'outro'];

interface Form {
  assetId: string;
  tipo: OperationType;
  data: ISODate;
  quantidade: string;
  preco: string;
  valor: number;
  custos: number;
  proventoTipo: IncomeType;
  irRetido: number;
  de: string;
  para: string;
  nota: string;
}

/** Nova operação (`?assetId=&tipo=`) ou edição (`?id=`). */
export default function OperacaoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; assetId?: string; tipo?: OperationType }>();
  const assets = useInvestStore((s) => s.assets);
  const operations = useInvestStore((s) => s.operations);
  const existing = useInvestStore((s) => (params.id ? s.operations.find((o) => o.id === params.id) : undefined));
  const store = useInvestStore.getState;
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const active = assets.filter((a) => !a.arquivado || a.id === existing?.assetId);

  const [form, setForm] = useState<Form>(() => {
    const assetId = existing?.assetId ?? params.assetId ?? active[0]?.id ?? '';
    const asset = assets.find((a) => a.id === assetId);
    const valuation = asset ? ASSET_TYPES[asset.tipo].valuation : 'quote';
    const tipo = existing?.tipo ?? (params.tipo && TYPES_BY_VALUATION[valuation].includes(params.tipo) ? params.tipo : TYPES_BY_VALUATION[valuation][0]);
    const fator = existing?.fator ?? 1;
    return {
      assetId,
      tipo,
      data: existing?.data ?? todayISO(),
      quantidade: existing?.quantidade !== undefined ? formatDecimal(existing.quantidade, 8) : '',
      preco: existing?.preco !== undefined ? formatDecimal(existing.preco, 8, 2) : '',
      valor: existing?.valor ?? 0,
      custos: existing?.custos ?? 0,
      proventoTipo: existing?.proventoTipo ?? (asset?.tipo === 'fii' ? 'rendimento' : valuation === 'fixed' ? 'juros' : 'dividendo'),
      irRetido: existing?.irRetido ?? 0,
      de: fator >= 1 ? '1' : formatDecimal(1 / fator, 4),
      para: fator >= 1 ? formatDecimal(fator, 4) : '1',
      nota: existing?.nota ?? '',
    };
  });
  const initial = useRef(JSON.stringify(form));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const asset = assets.find((a) => a.id === form.assetId);
  const valuation = asset ? ASSET_TYPES[asset.tipo].valuation : 'quote';
  const allowed = TYPES_BY_VALUATION[valuation];
  const qty = parseDecimal(form.quantidade);
  const price = parseDecimal(form.preco);
  const gross = Number.isFinite(qty) && Number.isFinite(price) ? Math.round(qty * price * 100) : 0;

  // posição antes desta operação (para validar vendas e mostrar o lucro estimado)
  const position = useMemo(() => {
    if (!asset || valuation !== 'quote') return null;
    const ops = operations.filter((o) => o.assetId === asset.id && o.id !== existing?.id && o.data <= form.data);
    return quotePosition(ops);
  }, [asset, valuation, operations, existing?.id, form.data]);

  const pickAsset = (assetId: string) => {
    const a = assets.find((x) => x.id === assetId);
    const v = a ? ASSET_TYPES[a.tipo].valuation : 'quote';
    setForm((f) => ({
      ...f,
      assetId,
      tipo: TYPES_BY_VALUATION[v].includes(f.tipo) ? f.tipo : TYPES_BY_VALUATION[v][0],
      proventoTipo: a?.tipo === 'fii' ? 'rendimento' : v === 'fixed' ? 'juros' : 'dividendo',
    }));
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!asset) e.asset = t('invest.opForm.assetError');
    const op: Omit<Operation, 'id'> = { assetId: form.assetId, tipo: form.tipo, data: form.data, valor: 0, nota: form.nota.trim() || undefined };
    switch (form.tipo) {
      case 'compra':
      case 'venda':
        if (!(qty > 0)) e.quantidade = t('invest.form.qtyError');
        if (!(price > 0)) e.preco = t('invest.form.priceError');
        if (form.tipo === 'venda' && position && qty > position.quantidade + 1e-9) {
          e.quantidade = t('invest.opForm.sellTooMuch', { qty: formatDecimal(position.quantidade, 8) });
        }
        Object.assign(op, { quantidade: qty, preco: price, valor: gross, custos: form.custos || undefined });
        break;
      case 'aporte':
      case 'resgate':
      case 'taxa':
        if (form.valor <= 0) e.valor = t('invest.form.valueError');
        Object.assign(op, { valor: form.valor, irRetido: form.tipo === 'resgate' && form.irRetido ? form.irRetido : undefined });
        break;
      case 'provento':
        if (form.valor <= 0) e.valor = t('invest.form.valueError');
        if (form.irRetido > form.valor) e.ir = t('invest.opForm.irError');
        Object.assign(op, { valor: form.valor, proventoTipo: form.proventoTipo, irRetido: form.irRetido || undefined });
        break;
      case 'desdobramento':
      case 'grupamento': {
        const de = parseDecimal(form.de);
        const para = parseDecimal(form.para);
        if (!(de > 0 && para > 0)) e.fator = t('invest.opForm.factorError');
        Object.assign(op, { fator: para / de });
        break;
      }
      case 'bonificacao':
        if (!(qty > 0)) e.quantidade = t('invest.form.qtyError');
        Object.assign(op, { quantidade: qty, valor: form.valor });
        break;
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    if (existing) store().updateOperation(existing.id, op);
    else store().addOperation(op);
    showSnackbar({ message: existing ? t('invest.opForm.updated') : t('invest.opForm.saved') });
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    ask({
      title: t('invest.opForm.deleteTitle'),
      message: t('invest.opForm.deleteMessage'),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const removed = store().removeOperation(existing.id);
            router.back();
            if (removed) {
              showSnackbar({ message: t('invest.opForm.deleted'), actionLabel: t('common.undo'), onAction: () => store().restoreOperation(removed) });
            }
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const estimatedProfit =
    form.tipo === 'venda' && position && position.quantidade > 0 && qty > 0 && price > 0
      ? gross - form.custos - Math.round(position.custo * (Math.min(qty, position.quantidade) / position.quantidade))
      : null;

  if (active.length === 0) {
    return (
      <FormScreen title={t('invest.opForm.newTitle')} dirty={false} onSave={() => router.replace('/invest/ativo-form')} saveLabel={t('invest.portfolio.addAsset')} saveIcon="plus">
        <AppText variant="body" color={colors.ink2}>
          {t('invest.opForm.noAssets')}
        </AppText>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={existing ? t('invest.opForm.editTitle') : t('invest.opForm.newTitle')}
      dirty={JSON.stringify(form) !== initial.current}
      onSave={save}
      saveLabel={existing ? t('common.saveChanges') : t('invest.opForm.save')}
      onDelete={existing ? remove : undefined}
    >
      <SelectField
        label={t('invest.opForm.asset')}
        value={form.assetId}
        onChange={pickAsset}
        options={active.map((a) => ({ value: a.id, label: a.ticker ? `${a.nome} (${a.ticker})` : a.nome, icon: ASSET_TYPES[a.tipo].icon }))}
      />
      {errors.asset ? (
        <AppText variant="caption" color={colors.expense}>
          {errors.asset}
        </AppText>
      ) : null}

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('invest.opForm.type')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allowed.map((tipo) => (
            <Chip key={tipo} label={t(`invest.op.${tipo}`)} active={form.tipo === tipo} onPress={() => set('tipo', tipo)} />
          ))}
        </View>
        <AppText variant="caption" color={colors.ink2}>
          {t(`invest.opHints.${form.tipo}`)}
        </AppText>
      </View>

      {form.tipo === 'compra' || form.tipo === 'venda' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('invest.form.quantity')}
                value={form.quantidade}
                onChangeText={(v) => set('quantidade', v.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                error={errors.quantidade}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('invest.form.unitPrice')}
                value={form.preco}
                onChangeText={(v) => set('preco', v.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                error={errors.preco}
              />
            </View>
          </View>
          <MoneyInput label={t('invest.form.costs')} hint={t('invest.form.costsHint')} value={form.custos} onChange={(v) => set('custos', v)} />
          <View style={{ backgroundColor: colors.tag, borderRadius: 12, padding: 12, gap: 4 }}>
            <AppText variant="label" color={colors.tagText} tabular>
              {t('invest.opForm.total', { value: brl(gross + (form.tipo === 'compra' ? form.custos : -form.custos)) })}
            </AppText>
            {position ? (
              <AppText variant="caption" color={colors.tagText} tabular>
                {t('invest.opForm.holding', { qty: formatDecimal(position.quantidade, 8), avg: brl(Math.round(position.precoMedio * 100)) })}
              </AppText>
            ) : null}
            {estimatedProfit !== null ? (
              <AppText variant="captionStrong" color={estimatedProfit < 0 ? colors.expense : colors.income} tabular>
                {t('invest.opForm.estimatedProfit', { value: brlDelta(estimatedProfit) })}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}

      {form.tipo === 'aporte' || form.tipo === 'resgate' || form.tipo === 'taxa' ? (
        <MoneyInput
          label={form.tipo === 'resgate' ? t('invest.opForm.grossRedeemed') : form.tipo === 'taxa' ? t('invest.opForm.feeValue') : t('invest.form.applied')}
          value={form.valor}
          onChange={(v) => set('valor', v)}
          error={errors.valor}
          tone={colors.primary}
        />
      ) : null}
      {form.tipo === 'resgate' ? (
        <MoneyInput label={t('invest.opForm.irWithheld')} hint={t('invest.opForm.irWithheldHint')} value={form.irRetido} onChange={(v) => set('irRetido', v)} />
      ) : null}

      {form.tipo === 'provento' ? (
        <>
          <SelectField
            label={t('invest.opForm.incomeType')}
            value={form.proventoTipo}
            onChange={(v) => set('proventoTipo', v)}
            options={INCOME_TYPES.map((k) => ({ value: k, label: t(`invest.income.${k}`) }))}
          />
          <MoneyInput label={t('invest.opForm.grossIncome')} value={form.valor} onChange={(v) => set('valor', v)} error={errors.valor} tone={colors.income} />
          <MoneyInput label={t('invest.opForm.irWithheld')} value={form.irRetido} onChange={(v) => set('irRetido', v)} error={errors.ir} />
          {form.proventoTipo === 'jcp' && form.valor > 0 ? (
            <Button compact variant="outline" label={t('invest.opForm.jcp15')} onPress={() => set('irRetido', Math.round(form.valor * 0.15))} />
          ) : null}
        </>
      ) : null}

      {form.tipo === 'desdobramento' || form.tipo === 'grupamento' ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('invest.opForm.from')} value={form.de} onChangeText={(v) => set('de', v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('invest.opForm.to')} value={form.para} onChangeText={(v) => set('para', v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" />
            </View>
          </View>
          <AppText variant="caption" color={errors.fator ? colors.expense : colors.ink2}>
            {errors.fator ?? t('invest.opForm.factorHint')}
          </AppText>
        </View>
      ) : null}

      {form.tipo === 'bonificacao' ? (
        <>
          <TextField
            label={t('invest.form.quantity')}
            value={form.quantidade}
            onChangeText={(v) => set('quantidade', v.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.quantidade}
          />
          <MoneyInput label={t('invest.opForm.bonusCost')} hint={t('invest.opForm.bonusCostHint')} value={form.valor} onChange={(v) => set('valor', v)} />
        </>
      ) : null}

      <DateField label={t('common.date')} value={form.data} onChange={(d) => set('data', d)} />
      <TextField label={t('invest.form.notes')} value={form.nota} onChangeText={(v) => set('nota', v)} maxLength={140} />
    </FormScreen>
  );
}
