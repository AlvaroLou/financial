import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, MoneyInput, SelectField, TextField } from '@/components/ui/Fields';
import { Button, Segmented } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';
import type { Account, CreditCard } from '@/types';

export type AccountSheetTarget =
  | { type: 'conta'; item?: Account }
  | { type: 'cartao'; item?: CreditCard };

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Dia ${i + 1}` }));

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

function toDraft(target: AccountSheetTarget | null): Draft {
  const base: Draft = { nome: '', tipo: 'conta', saldo: 0, negativo: false, final: '', limite: 0, diaFechamento: '1', diaVencimento: '10' };
  if (!target?.item) return base;
  if (target.type === 'conta') {
    const a = target.item;
    return { ...base, nome: a.nome, tipo: a.tipo, saldo: Math.abs(a.saldo), negativo: a.saldo < 0 };
  }
  const k = target.item;
  return { ...base, nome: k.nome, final: k.final, limite: k.limite, diaFechamento: String(k.diaFechamento), diaVencimento: String(k.diaVencimento) };
}

/** Criar/editar uma conta (ou carteira) ou um cartão de crédito. `target = null` fecha. */
export function AccountSheet({ target, onClose }: { target: AccountSheetTarget | null; onClose: () => void }) {
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const removeAccount = useFinanceStore((s) => s.removeAccount);
  const addCard = useFinanceStore((s) => s.addCard);
  const updateCard = useFinanceStore((s) => s.updateCard);
  const removeCard = useFinanceStore((s) => s.removeCard);
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const [draft, setDraft] = useState<Draft>(() => toDraft(target));
  const [errors, setErrors] = useState<{ nome?: string; final?: string }>({});

  useEffect(() => {
    if (!target) return;
    setDraft(toDraft(target));
    setErrors({});
  }, [target]);

  const isCard = target?.type === 'cartao';
  const editing = !!target?.item;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (!target) return;
    const nome = draft.nome.trim();
    const errs: typeof errors = {};
    if (!nome) errs.nome = isCard ? 'Informe o nome do cartão.' : 'Informe o nome da conta.';
    if (isCard && draft.final && !/^\d{4}$/.test(draft.final)) errs.final = 'Use os 4 últimos dígitos.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (target.type === 'conta') {
      const input = { nome, tipo: draft.tipo, saldo: draft.negativo ? -draft.saldo : draft.saldo };
      if (target.item) updateAccount(target.item.id, input);
      else addAccount(input);
    } else {
      const input = {
        nome,
        final: draft.final,
        limite: draft.limite,
        diaFechamento: Number(draft.diaFechamento),
        diaVencimento: Number(draft.diaVencimento),
      };
      if (target.item) updateCard(target.item.id, input);
      else addCard(input);
    }
    showSnackbar({ message: editing ? 'Alterações salvas' : `"${nome}" adicionado` });
    onClose();
  };

  const remove = () => {
    if (!target?.item) return;
    const item = target.item;
    ask({
      title: `Excluir "${item.nome}"?`,
      message: 'Seus lançamentos não são afetados.',
      actions: [
        {
          label: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (target.type === 'conta') removeAccount(item.id);
            else removeCard(item.id);
            showSnackbar({ message: `"${item.nome}" excluído` });
            onClose();
          },
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const title = isCard ? (editing ? 'Editar cartão' : 'Novo cartão') : editing ? 'Editar conta' : 'Nova conta';

  return (
    <BottomSheet visible={target !== null} title={title} onClose={onClose}>
      <View style={{ gap: 16, paddingBottom: 8 }}>
        <TextField
          label="Nome"
          value={draft.nome}
          onChangeText={(t) => set('nome', t)}
          placeholder={isCard ? 'Ex.: Nubank' : 'Ex.: Banco do Brasil'}
          error={errors.nome}
          maxLength={30}
        />

        {isCard ? (
          <>
            <TextField
              label="Final do cartão (opcional)"
              value={draft.final}
              onChangeText={(t) => set('final', t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="1234"
              error={errors.final}
            />
            <MoneyInput label="Limite" value={draft.limite} onChange={(v) => set('limite', v)} tone={colors.ink} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SelectField label="Fecha" value={draft.diaFechamento} options={DAY_OPTIONS} onChange={(v) => set('diaFechamento', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField label="Vence" value={draft.diaVencimento} options={DAY_OPTIONS} onChange={(v) => set('diaVencimento', v)} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Segmented
              accessibilityLabel="Tipo"
              value={draft.tipo}
              onChange={(v) => set('tipo', v)}
              options={[
                { value: 'conta', label: 'Conta bancária', icon: 'bank' },
                { value: 'carteira', label: 'Carteira', icon: 'wallet' },
              ]}
            />
            <MoneyInput
              label="Saldo atual"
              value={draft.saldo}
              onChange={(v) => set('saldo', v)}
              tone={draft.negativo ? colors.expense : colors.ink}
            />
            <Segmented
              compact
              accessibilityLabel="Sinal do saldo"
              value={draft.negativo ? 'neg' : 'pos'}
              onChange={(v) => set('negativo', v === 'neg')}
              options={[
                { value: 'pos', label: 'Positivo' },
                { value: 'neg', label: 'Negativo (cheque especial)' },
              ]}
            />
            <AppText variant="caption" color={colors.ink2}>
              O saldo é informativo: atualize quando quiser conferir com o banco.
            </AppText>
          </>
        )}

        <Button label={editing ? 'Salvar alterações' : 'Adicionar'} icon="check" onPress={save} />
        {editing ? <Button variant="danger" icon="trash" label="Excluir" onPress={remove} /> : null}
      </View>
    </BottomSheet>
  );
}
