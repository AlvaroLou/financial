import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, MoneyInput, TextField } from '@/components/ui/Fields';
import { Button, Chip, Segmented } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { CATEGORY_ICONS } from '@/lib/iconOptions';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';
import type { Category, CategoryInput, RecordKind } from '@/types';

const blank = (kind: RecordKind): CategoryInput => ({
  nome: '',
  icone: kind === 'despesa' ? 'dots' : 'cash',
  kind,
  naturezaPadrao: 'variavel',
  limiteMensal: 0,
});

/** Criar (sem `category`) ou editar uma categoria. */
export function CategorySheet({
  visible,
  category,
  newKind = 'despesa',
  onClose,
}: {
  visible: boolean;
  category?: Category;
  newKind?: RecordKind;
  onClose: () => void;
}) {
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const removeCategory = useFinanceStore((s) => s.removeCategory);
  const categoryRemoveBlock = useFinanceStore((s) => s.categoryRemoveBlock);
  const categories = useFinanceStore((s) => s.categories);
  const showSnackbar = useSnackbar();
  const ask = useDialog();

  const [form, setForm] = useState<CategoryInput>(blank(newKind));
  const [error, setError] = useState<string | undefined>();

  // recarrega o formulário a cada abertura
  useEffect(() => {
    if (!visible) return;
    setForm(category ? { ...category } : blank(newKind));
    setError(undefined);
  }, [visible, category, newKind]);

  const isExpense = form.kind === 'despesa';

  const save = () => {
    const nome = form.nome.trim();
    if (!nome) return setError('Dê um nome à categoria.');
    const duplicated = categories.some(
      (c) => c.id !== category?.id && c.kind === form.kind && c.nome.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (duplicated) return setError('Já existe uma categoria com esse nome.');
    const input = { ...form, nome, limiteMensal: isExpense ? form.limiteMensal : 0 };
    if (category) updateCategory(category.id, input);
    else addCategory(input);
    showSnackbar({ message: category ? 'Categoria atualizada' : `Categoria "${nome}" criada` });
    onClose();
  };

  const remove = () => {
    if (!category) return;
    const block = categoryRemoveBlock(category.id);
    if (block) {
      ask({
        title: 'Não dá para excluir',
        message:
          block === 'in-use'
            ? `Há lançamentos em "${category.nome}". Mude a categoria deles ou exclua-os antes — ou apenas renomeie esta categoria.`
            : `"${category.nome}" é a única categoria de ${category.kind === 'despesa' ? 'despesa' : 'receita'}. Crie outra antes de excluir esta.`,
      });
      return;
    }
    ask({
      title: `Excluir "${category.nome}"?`,
      actions: [
        {
          label: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (removeCategory(category.id)) {
              showSnackbar({ message: `Categoria "${category.nome}" excluída` });
              onClose();
            }
          },
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  return (
    <BottomSheet visible={visible} title={category ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <View style={{ gap: 16, paddingBottom: 8 }}>
        {category ? null : (
          <Segmented
            accessibilityLabel="Tipo da categoria"
            value={form.kind}
            onChange={(kind) => setForm((f) => ({ ...blank(kind), nome: f.nome }))}
            options={[
              { value: 'despesa', label: 'Despesa', icon: 'arrowUpRight' },
              { value: 'receita', label: 'Receita', icon: 'arrowDownLeft' },
            ]}
          />
        )}

        <TextField
          label="Nome"
          value={form.nome}
          onChangeText={(nome) => {
            setForm((f) => ({ ...f, nome }));
            setError(undefined);
          }}
          placeholder={isExpense ? 'Ex.: Pets' : 'Ex.: Aluguel recebido'}
          error={error}
          maxLength={30}
        />

        <View style={{ gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            Ícone
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_ICONS.map(({ icon, label }) => (
              <Chip
                key={icon}
                icon={icon}
                accessibilityLabel={`Ícone: ${label}`}
                active={form.icone === icon}
                onPress={() => setForm((f) => ({ ...f, icone: icon }))}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="label" color={colors.ink2}>
            Natureza sugerida nos lançamentos
          </AppText>
          <Segmented
            compact
            accessibilityLabel="Natureza padrão"
            value={form.naturezaPadrao}
            onChange={(naturezaPadrao) => setForm((f) => ({ ...f, naturezaPadrao }))}
            options={[
              { value: 'fixo', label: 'Fixo' },
              { value: 'variavel', label: 'Variável' },
            ]}
          />
        </View>

        {isExpense ? (
          <View style={{ gap: 6 }}>
            <MoneyInput
              label="Limite mensal"
              value={form.limiteMensal}
              onChange={(limiteMensal) => setForm((f) => ({ ...f, limiteMensal }))}
              tone={colors.primary}
            />
            <AppText variant="caption" color={colors.ink2}>
              Deixe R$ 0,00 para não ter limite. O orçamento do mês é a soma dos limites.
            </AppText>
          </View>
        ) : null}

        <Button label={category ? 'Salvar alterações' : 'Criar categoria'} icon="check" onPress={save} />
        {category ? <Button variant="danger" icon="trash" label="Excluir categoria" onPress={remove} /> : null}
      </View>
    </BottomSheet>
  );
}
