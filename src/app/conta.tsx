import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { MoneyInput, SelectField, TextField } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Segmented } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Account } from '@/types';

interface Draft {
  nome: string;
  tipo: Account['tipo'];
  saldo: number;
  negativo: boolean;
  final: string;
  limite: number;
  diaFechamento: string;
  diaVencimento: string;
}

/** Criar/editar conta (`?tipo=conta`) ou cartão (`?tipo=cartao`); `&id=` para editar. */
export default function ContaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id?: string; tipo?: 'conta' | 'cartao' }>();
  const isCard = tipo === 'cartao';
  const account = useFinanceStore((s) => (!isCard && id ? s.accounts.find((a) => a.id === id) : undefined));
  const card = useFinanceStore((s) => (isCard && id ? s.cards.find((k) => k.id === id) : undefined));
  const store = useFinanceStore.getState;
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const editing = !!(account || card);

  const [draft, setDraft] = useState<Draft>(() => {
    const base: Draft = { nome: '', tipo: 'conta', saldo: 0, negativo: false, final: '', limite: 0, diaFechamento: '1', diaVencimento: '10' };
    if (account) return { ...base, nome: account.nome, tipo: account.tipo, saldo: Math.abs(account.saldo), negativo: account.saldo < 0 };
    if (card) {
      return {
        ...base,
        nome: card.nome,
        final: card.final,
        limite: card.limite,
        diaFechamento: String(card.diaFechamento),
        diaVencimento: String(card.diaVencimento),
      };
    }
    return base;
  });
  const initial = useRef(JSON.stringify(draft));
  const [errors, setErrors] = useState<{ nome?: string; final?: string }>({});
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dayOptions = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: t('account.day', { day: i + 1 }) }));

  const save = () => {
    const nome = draft.nome.trim();
    const errs: typeof errors = {};
    if (!nome) errs.nome = isCard ? t('account.nameErrorCard') : t('account.nameErrorAccount');
    if (isCard && draft.final && !/^\d{4}$/.test(draft.final)) errs.final = t('account.last4Error');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (!isCard) {
      const input = { nome, tipo: draft.tipo, saldo: draft.negativo ? -draft.saldo : draft.saldo };
      if (account) store().updateAccount(account.id, input);
      else store().addAccount(input);
    } else {
      const input = {
        nome,
        final: draft.final,
        limite: draft.limite,
        diaFechamento: Number(draft.diaFechamento),
        diaVencimento: Number(draft.diaVencimento),
      };
      if (card) store().updateCard(card.id, input);
      else store().addCard(input);
    }
    showSnackbar({ message: editing ? t('account.saved') : t('account.added', { name: nome }) });
    router.back();
  };

  const remove = () => {
    const item = account ?? card;
    if (!item) return;
    ask({
      title: t('account.deleteTitle', { name: item.nome }),
      message: t('account.deleteMessage'),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (account) store().removeAccount(account.id);
            else if (card) store().removeCard(card.id);
            showSnackbar({ message: t('account.deleted', { name: item.nome }) });
            router.back();
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  const title = isCard
    ? editing
      ? t('account.editCard')
      : t('account.newCard')
    : editing
      ? t('account.editAccount')
      : t('account.newAccount');

  return (
    <FormScreen
      title={title}
      dirty={JSON.stringify(draft) !== initial.current}
      onSave={save}
      saveLabel={editing ? t('common.saveChanges') : t('common.add')}
      onDelete={editing ? remove : undefined}
    >
      <TextField
        label={t('common.name')}
        value={draft.nome}
        onChangeText={(v) => set('nome', v)}
        placeholder={isCard ? t('account.namePlaceholderCard') : t('account.namePlaceholderAccount')}
        error={errors.nome}
        maxLength={30}
      />

      {isCard ? (
        <>
          <TextField
            label={t('account.last4')}
            value={draft.final}
            onChangeText={(v) => set('final', v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="1234"
            error={errors.final}
          />
          <MoneyInput label={t('account.limit')} value={draft.limite} onChange={(v) => set('limite', v)} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SelectField label={t('account.closes')} value={draft.diaFechamento} options={dayOptions} onChange={(v) => set('diaFechamento', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField label={t('account.due')} value={draft.diaVencimento} options={dayOptions} onChange={(v) => set('diaVencimento', v)} />
            </View>
          </View>
        </>
      ) : (
        <>
          <Segmented
            accessibilityLabel={t('account.typeA11y')}
            value={draft.tipo}
            onChange={(v) => set('tipo', v)}
            options={[
              { value: 'conta', label: t('account.bank'), icon: 'bank' },
              { value: 'carteira', label: t('account.wallet'), icon: 'wallet' },
            ]}
          />
          <MoneyInput
            label={t('account.balance')}
            value={draft.saldo}
            onChange={(v) => set('saldo', v)}
            tone={draft.negativo ? colors.expense : colors.ink}
          />
          <Segmented
            compact
            accessibilityLabel={t('account.signA11y')}
            value={draft.negativo ? 'neg' : 'pos'}
            onChange={(v) => set('negativo', v === 'neg')}
            options={[
              { value: 'pos', label: t('account.positive') },
              { value: 'neg', label: t('account.negative') },
            ]}
          />
          <AppText variant="caption" color={colors.ink2}>
            {t('account.balanceNote')}
          </AppText>
        </>
      )}
    </FormScreen>
  );
}
