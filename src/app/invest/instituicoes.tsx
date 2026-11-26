import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { BottomSheet, TextField } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, ProgressBar } from '@/components/ui/primitives';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { StackHeader } from '@/components/ui/StackHeader';
import { usePortfolio } from '@/invest/hooks';
import { FGC_LIMIT } from '@/invest/lib/portfolio';
import { useInvestStore } from '@/invest/store';
import { brl, brlShort, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** Bancos e corretoras: quanto há em cada um e a exposição ao limite do FGC (R$ 250 mil por instituição). */
export default function InstituicoesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const institutions = useInvestStore((s) => s.institutions);
  const store = useInvestStore.getState;
  const summary = usePortfolio();
  const ask = useDialog();
  const [editing, setEditing] = useState<{ id?: string; nome: string } | null>(null);

  const save = () => {
    if (!editing || !editing.nome.trim()) return;
    if (editing.id) store().renameInstitution(editing.id, editing.nome);
    else store().addInstitution(editing.nome);
    setEditing(null);
  };

  const remove = (id: string, nome: string) =>
    ask({
      title: t('invest.institutions.deleteTitle', { name: nome }),
      message: t('invest.institutions.deleteMessage'),
      actions: [
        { label: t('common.delete'), style: 'destructive', onPress: () => store().removeInstitution(id) },
        { label: t('common.cancel'), style: 'cancel' },
      ],
    });

  return (
    <Screen>
      <StackHeader title={t('invest.more.institutions')} />
      <ScreenScroll gap={16}>
        <AppText variant="body" color={colors.ink2}>
          {t('invest.institutions.intro', { limit: brl(FGC_LIMIT) })}
        </AppText>
        {institutions.length === 0 ? (
          <Card style={{ padding: 16 }}>
            <AppText variant="body" color={colors.ink2}>
              {t('invest.institutions.empty')}
            </AppText>
          </Card>
        ) : (
          institutions.map((inst) => {
            const total = summary.porInstituicao[inst.id] ?? 0;
            const fgc = summary.fgcPorInstituicao[inst.id] ?? 0;
            const over = fgc > FGC_LIMIT;
            return (
              <Card key={inst.id} style={{ padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="bank" size={20} color={colors.primary} />
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {inst.nome}
                  </AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.edit')} hitSlop={8} onPress={() => setEditing({ id: inst.id, nome: inst.nome })}>
                    <Icon name="edit" size={20} color={colors.ink2} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={8} onPress={() => remove(inst.id, inst.nome)}>
                    <Icon name="trash" size={20} color={colors.ink2} />
                  </Pressable>
                </View>
                <AppText variant="caption" color={colors.ink2} tabular>
                  {t('invest.institutions.total', { value: brlShort(total), pct: percent(summary.patrimonio > 0 ? total / summary.patrimonio : 0) })}
                </AppText>
                {fgc > 0 ? (
                  <>
                    <ProgressBar
                      value={fgc / FGC_LIMIT}
                      color={over ? colors.expenseFill : fgc / FGC_LIMIT > 0.8 ? colors.installment : colors.accent}
                      label={t('invest.institutions.fgcA11y')}
                    />
                    <AppText variant="caption" color={over ? colors.expense : colors.ink2} tabular>
                      {over
                        ? t('invest.institutions.fgcOver', { value: brlShort(fgc), over: brlShort(fgc - FGC_LIMIT) })
                        : t('invest.institutions.fgcUsed', { value: brlShort(fgc), limit: brlShort(FGC_LIMIT) })}
                    </AppText>
                  </>
                ) : null}
              </Card>
            );
          })
        )}
        <Button icon="plus" label={t('invest.institutions.add')} onPress={() => setEditing({ nome: '' })} />
      </ScreenScroll>

      <BottomSheet
        visible={editing !== null}
        title={editing?.id ? t('invest.institutions.rename') : t('invest.institutions.add')}
        onClose={() => setEditing(null)}
      >
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <TextField
            label={t('common.name')}
            value={editing?.nome ?? ''}
            onChangeText={(v) => setEditing((e) => (e ? { ...e, nome: v } : e))}
            placeholder={t('invest.form.institutionPlaceholder')}
            maxLength={30}
            autoFocus
          />
          <Button label={t('common.save')} icon="check" disabled={!editing?.nome.trim()} onPress={save} />
        </View>
      </BottomSheet>
    </Screen>
  );
}
