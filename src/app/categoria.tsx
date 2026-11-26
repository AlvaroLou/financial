import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { MoneyInput, TextField } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Icon } from '@/components/ui/Icon';
import { Chip, Segmented } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { categoryName } from '@/i18n/labels';
import { CATEGORY_ICONS } from '@/lib/iconOptions';
import { brl } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { CategoryInput, RecordKind } from '@/types';

const blank = (kind: RecordKind): CategoryInput => ({
  nome: '',
  icone: kind === 'despesa' ? 'dots' : 'cash',
  kind,
  naturezaPadrao: 'variavel',
  limiteMensal: 0,
});

/** Criar (`?tipo=despesa|receita`) ou editar (`?id=`) uma categoria. */
export default function CategoriaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id?: string; tipo?: RecordKind }>();
  const category = useFinanceStore((s) => (id ? s.categories.find((c) => c.id === id) : undefined));
  const categories = useFinanceStore((s) => s.categories);
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const removeCategory = useFinanceStore((s) => s.removeCategory);
  const categoryRemoveBlock = useFinanceStore((s) => s.categoryRemoveBlock);
  const showSnackbar = useSnackbar();
  const ask = useDialog();

  const [form, setForm] = useState<CategoryInput>(() =>
    category ? { ...category, nome: categoryName(category) } : blank(tipo === 'receita' ? 'receita' : 'despesa'),
  );
  const initial = useRef(JSON.stringify(form));
  const [error, setError] = useState<string | undefined>();
  const isExpense = form.kind === 'despesa';
  const fixed = !!category?.fixa;

  const save = () => {
    const nome = form.nome.trim();
    if (!nome) return setError(t('category.nameError'));
    const duplicated = categories.some(
      (c) => c.id !== category?.id && c.kind === form.kind && categoryName(c).trim().toLowerCase() === nome.toLowerCase(),
    );
    if (duplicated) return setError(t('category.duplicateError'));
    // nome igual ao traduzido = não renomeou (mantém o original para seguir traduzindo)
    const keepOriginal = category && nome === categoryName(category);
    const input = { ...form, nome: keepOriginal ? category.nome : nome, limiteMensal: isExpense ? form.limiteMensal : 0 };
    if (category) updateCategory(category.id, input);
    else addCategory(input);
    showSnackbar({ message: category ? t('category.updated') : t('category.created', { name: nome }) });
    router.back();
  };

  const remove = () => {
    if (!category) return;
    const name = categoryName(category);
    const block = categoryRemoveBlock(category.id);
    if (block) {
      ask({
        title: t('category.cantDeleteTitle'),
        message:
          block === 'fixed'
            ? t('category.fixed', { name })
            : block === 'in-use'
              ? t('category.inUse', { name })
              : category.kind === 'despesa'
                ? t('category.lastOfKindExpense', { name })
                : t('category.lastOfKindIncome', { name }),
      });
      return;
    }
    ask({
      title: t('category.deleteTitle', { name }),
      message: t('category.deleteTagNote'),
      actions: [
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            if (removeCategory(category.id)) {
              showSnackbar({ message: t('category.deleted', { name }) });
              router.back();
            }
          },
        },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });
  };

  return (
    <FormScreen
      title={category ? t('category.editTitle') : t('category.newTitle')}
      dirty={JSON.stringify(form) !== initial.current}
      onSave={save}
      saveLabel={category ? t('common.saveChanges') : t('category.create')}
      onDelete={category && !fixed ? remove : undefined}
      deleteLabel={t('category.deleteButton')}
    >
      {category ? null : (
        <Segmented
          accessibilityLabel={t('category.kindA11y')}
          value={form.kind}
          onChange={(kind) => setForm((f) => ({ ...blank(kind), nome: f.nome }))}
          options={[
            { value: 'despesa', label: t('kind.despesa'), icon: 'arrowUpRight' },
            { value: 'receita', label: t('kind.receita'), icon: 'arrowDownLeft' },
          ]}
        />
      )}

      {fixed ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.tag, borderRadius: 12, padding: 12 }}>
          <Icon name="lock" size={18} color={colors.tagText} />
          <AppText variant="label" color={colors.tagText} style={{ flex: 1 }}>
            {t('category.fixedNote')}
          </AppText>
        </View>
      ) : null}

      <TextField
        label={t('common.name')}
        value={form.nome}
        editable={!fixed}
        onChangeText={(nome) => {
          setForm((f) => ({ ...f, nome }));
          setError(undefined);
        }}
        placeholder={isExpense ? t('category.namePlaceholderExpense') : t('category.namePlaceholderIncome')}
        error={error}
        maxLength={30}
      />

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('common.icon')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORY_ICONS.map(({ icon, key }) => (
            <Chip
              key={icon}
              icon={icon}
              accessibilityLabel={t('common.iconA11y', { name: t(`icons.${key}`) })}
              active={form.icone === icon}
              onPress={() => setForm((f) => ({ ...f, icone: icon }))}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('category.natureDefault')}
        </AppText>
        <Segmented
          compact
          accessibilityLabel={t('category.natureDefaultA11y')}
          value={form.naturezaPadrao}
          onChange={(naturezaPadrao) => setForm((f) => ({ ...f, naturezaPadrao }))}
          options={[
            { value: 'fixo', label: t('nature.fixo') },
            { value: 'variavel', label: t('nature.variavel') },
          ]}
        />
      </View>

      {isExpense ? (
        <MoneyInput
          label={t('category.monthlyLimit')}
          hint={t('category.limitHint', { zero: brl(0) })}
          value={form.limiteMensal}
          onChange={(limiteMensal) => setForm((f) => ({ ...f, limiteMensal }))}
          tone={colors.primary}
        />
      ) : null}
    </FormScreen>
  );
}
