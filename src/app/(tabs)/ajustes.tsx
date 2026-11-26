import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AccountSheet, type AccountSheetTarget } from '@/components/manage/AccountSheet';
import { CategorySheet } from '@/components/manage/CategorySheet';
import { AppText } from '@/components/ui/AppText';
import { useDialog } from '@/components/ui/Dialog';
import { SwitchRow } from '@/components/ui/Fields';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button, Card, SectionHeader } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader, ScreenScroll } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { useCategoryMap, useMonthData } from '@/hooks/useMonthData';
import { monthLabel } from '@/lib/dates';
import { NATURE_LABEL } from '@/lib/labels';
import { brlShort } from '@/lib/money';
import { exportCsv, exportPdf } from '@/lib/share';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors } from '@/theme/tokens';
import type { Category, RecordKind } from '@/types';

export default function AjustesScreen() {
  const { month, occurrences } = useMonthData();
  const categoryMap = useCategoryMap();
  const categories = useFinanceStore((s) => s.categories);
  const accounts = useFinanceStore((s) => s.accounts);
  const cards = useFinanceStore((s) => s.cards);
  const settings = useFinanceStore((s) => s.settings);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const eraseAllData = useFinanceStore((s) => s.eraseAllData);
  const showSnackbar = useSnackbar();
  const ask = useDialog();
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [accountTarget, setAccountTarget] = useState<AccountSheetTarget | null>(null);
  const [categorySheet, setCategorySheet] = useState<{ category?: Category; kind: RecordKind } | null>(null);

  const runExport = async (kind: 'csv' | 'pdf') => {
    if (occurrences.length === 0) {
      ask({ title: 'Nada para exportar', message: `Não há lançamentos em ${monthLabel(month).toLowerCase()}.` });
      return;
    }
    setExporting(kind);
    try {
      const ok = await (kind === 'csv' ? exportCsv : exportPdf)(month, occurrences, categoryMap);
      if (!ok) ask({ title: 'Compartilhamento indisponível', message: 'Este aparelho não permite compartilhar arquivos.' });
    } catch {
      ask({ title: 'Não foi possível exportar', message: 'Tente novamente em instantes.' });
    } finally {
      setExporting(null);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (!value) {
      updateSettings({ biometria: false });
      return;
    }
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !enrolled) {
        ask({
          title: 'Biometria indisponível',
          message: 'Cadastre uma digital ou Face ID nas configurações do aparelho. (Não disponível na versão web.)',
        });
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme para ativar a biometria' });
      if (result.success) updateSettings({ biometria: true });
    } catch {
      ask({ title: 'Biometria indisponível', message: 'Não foi possível acessar a biometria deste aparelho.' });
    }
  };

  const confirmErase = () =>
    ask({
      title: 'Apagar todos os dados?',
      message: 'Lançamentos, contas, cartões, metas e categorias personalizadas serão apagados deste aparelho. Não dá para desfazer.',
      actions: [
        {
          label: 'Apagar tudo',
          style: 'destructive',
          onPress: () => {
            eraseAllData();
            showSnackbar({ message: 'Dados apagados' });
          },
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });

  const categoryGroups: { kind: RecordKind; title: string }[] = [
    { kind: 'despesa', title: 'Despesas' },
    { kind: 'receita', title: 'Receitas' },
  ];

  return (
    <Screen>
      <ScreenHeader title="Ajustes" />
      <ScreenScroll gap={20}>
        {/* Contas e cartões */}
        <View>
          <SectionHeader title="Contas e cartões" />
          <Card style={{ overflow: 'hidden' }}>
            {accounts.length === 0 && cards.length === 0 ? (
              <View style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Icon name="bank" size={20} color={colors.ink2} />
                <AppText variant="body" color={colors.ink2} style={{ flex: 1 }}>
                  Cadastre suas contas e cartões para acompanhar saldos e limites.
                </AppText>
              </View>
            ) : null}
            {accounts.map((a, i) => (
              <ListRow
                key={a.id}
                first={i === 0}
                icon={a.tipo === 'conta' ? 'bank' : 'wallet'}
                title={a.nome}
                trailing={brlShort(a.saldo)}
                trailingColor={a.saldo < 0 ? colors.expense : undefined}
                onPress={() => setAccountTarget({ type: 'conta', item: a })}
              />
            ))}
            {cards.map((k, i) => (
              <ListRow
                key={k.id}
                first={accounts.length === 0 && i === 0}
                icon="card"
                title={k.final ? `${k.nome} •••• ${k.final}` : k.nome}
                subtitle={`Limite ${brlShort(k.limite)} · fecha dia ${k.diaFechamento} · vence dia ${k.diaVencimento}`}
                onPress={() => setAccountTarget({ type: 'cartao', item: k })}
              />
            ))}
          </Card>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Button style={{ flex: 1 }} variant="outline" icon="plus" label="Conta" onPress={() => setAccountTarget({ type: 'conta' })} />
            <Button style={{ flex: 1 }} variant="outline" icon="plus" label="Cartão" onPress={() => setAccountTarget({ type: 'cartao' })} />
          </View>
        </View>

        {/* Categorias */}
        <View>
          <SectionHeader
            title="Categorias"
            actionLabel="Nova"
            onAction={() => setCategorySheet({ kind: 'despesa' })}
          />
          <View style={{ gap: 12 }}>
            {categoryGroups.map((g) => (
              <Card key={g.kind} style={{ overflow: 'hidden' }}>
                <AppText variant="eyebrow" color={colors.ink2} style={{ paddingHorizontal: 14, paddingTop: 12 }}>
                  {g.title}
                </AppText>
                {categories
                  .filter((c) => c.kind === g.kind)
                  .map((c, i) => (
                    <ListRow
                      key={c.id}
                      first={i === 0}
                      icon={c.icone}
                      title={c.nome}
                      subtitle={
                        g.kind === 'despesa'
                          ? `${NATURE_LABEL[c.naturezaPadrao]} · ${c.limiteMensal > 0 ? `limite ${brlShort(c.limiteMensal)}` : 'sem limite'}`
                          : NATURE_LABEL[c.naturezaPadrao]
                      }
                      onPress={() => setCategorySheet({ category: c, kind: c.kind })}
                    />
                  ))}
              </Card>
            ))}
            <AppText variant="caption" color={colors.ink2}>
              Toque numa categoria para renomear, trocar o ícone, a natureza sugerida ou o limite mensal.
            </AppText>
          </View>
        </View>

        {/* Exportar */}
        <View>
          <SectionHeader title="Exportar" />
          <Card style={{ padding: 16, gap: 12 }}>
            <MonthSelector />
            <AppText variant="caption" color={colors.ink2}>
              {`Extrato de ${monthLabel(month)} · ${occurrences.length} ${occurrences.length === 1 ? 'lançamento' : 'lançamentos'}`}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                style={{ flex: 1 }}
                variant="outline"
                icon="download"
                label={exporting === 'csv' ? 'Gerando…' : 'CSV'}
                disabled={exporting !== null}
                onPress={() => runExport('csv')}
              />
              <Button
                style={{ flex: 1 }}
                variant="outline"
                icon="download"
                label={exporting === 'pdf' ? 'Gerando…' : 'PDF'}
                disabled={exporting !== null}
                onPress={() => runExport('pdf')}
              />
            </View>
          </Card>
        </View>

        {/* Preferências */}
        <View>
          <SectionHeader title="Preferências" />
          <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <SwitchRow
              icon="clock"
              label="Alertas de vencimento"
              description="Mostrar no sino da tela inicial o que vence nos próximos 7 dias"
              value={settings.alertaVencimento}
              onChange={(v) => updateSettings({ alertaVencimento: v })}
            />
            <SwitchRow
              icon="bell"
              label="Alertas de orçamento"
              description="Mostrar no sino as categorias que passaram de 80% do limite"
              value={settings.alertaOrcamento}
              onChange={(v) => updateSettings({ alertaOrcamento: v })}
            />
            <SwitchRow
              icon="fingerprint"
              label="Biometria"
              description="Pedir digital ou Face ID ao abrir o app"
              value={settings.biometria}
              onChange={toggleBiometric}
            />
            <SwitchRow
              icon="eyeOff"
              label="Ocultar saldo"
              description="A tela inicial abre com os valores escondidos. O olho mostra só até você sair da tela."
              value={settings.ocultarSaldo}
              onChange={(v) => updateSettings({ ocultarSaldo: v })}
            />
          </Card>
        </View>

        {/* Dados */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Dados" />
          <AppText variant="caption" color={colors.ink2}>
            Seus dados ficam salvos apenas neste aparelho. Exporte o CSV de cada mês se quiser uma cópia.
          </AppText>
          <Button variant="danger" icon="trash" label="Apagar todos os dados" onPress={confirmErase} />
          <AppText variant="caption" color={colors.ink2} align="center">
            {`Dinheiro em Dia · versão ${Constants.expoConfig?.version ?? '1.0.0'}`}
          </AppText>
        </View>
      </ScreenScroll>

      <AccountSheet target={accountTarget} onClose={() => setAccountTarget(null)} />
      <CategorySheet
        visible={categorySheet !== null}
        category={categorySheet?.category}
        newKind={categorySheet?.kind}
        onClose={() => setCategorySheet(null)}
      />
    </Screen>
  );
}

function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  trailingColor,
  first,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  trailing?: string;
  trailingColor?: string;
  first?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(', ')}
      accessibilityHint="Toque para editar"
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60 },
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.bg },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.ink2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ? (
        <AppText variant="bodyStrong" tabular color={trailingColor}>
          {trailing}
        </AppText>
      ) : null}
      <Icon name="chevronRight" size={20} color={colors.ink2} />
    </Pressable>
  );
}
