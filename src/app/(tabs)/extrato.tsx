import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { RecordItem } from '@/components/RecordItem';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Chip } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader } from '@/components/ui/Screen';
import { useCategoryMap, useMonthData } from '@/hooks/useMonthData';
import { todayISO } from '@/lib/clock';
import { groupLabel } from '@/lib/dates';
import { filterOccurrences, groupByDay, type GroupFilter } from '@/lib/finance';
import { PAYMENT_LABEL, PAYMENT_ORDER } from '@/lib/labels';
import { brlSigned } from '@/lib/money';
import { colors, fonts, layout, radius } from '@/theme/tokens';
import type { Occurrence, PaymentMethod } from '@/types';

const GROUPS: { value: GroupFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'fixos', label: 'Fixos' },
  { value: 'variaveis', label: 'Variáveis' },
  { value: 'parcelados', label: 'Parcelados' },
  { value: 'recorrentes', label: 'Recorrentes' },
  { value: 'avista', label: 'À Vista' },
];

export default function ExtratoScreen() {
  const { occurrences } = useMonthData();
  const categories = useCategoryMap();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('todos');
  const [forma, setForma] = useState<PaymentMethod | null>(null);
  const [formaOpen, setFormaOpen] = useState(false);

  const today = todayISO();
  const filtered = useMemo(
    () => filterOccurrences(occurrences, { query, group, forma, categories }),
    [occurrences, query, group, forma, categories],
  );
  const sections = useMemo(
    () => groupByDay(filtered).map((s) => ({ title: groupLabel(s.date, today), net: s.net, data: s.items })),
    [filtered, today],
  );

  const net = filtered.reduce((acc, o) => acc + (o.record.kind === 'receita' ? o.valor : -o.valor), 0);
  const hasFilters = query.trim() !== '' || group !== 'todos' || forma !== null;
  const clear = () => {
    setQuery('');
    setGroup('todos');
    setForma(null);
  };

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <MonthSelector />

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.ink2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nome, categoria…"
          placeholderTextColor={colors.ink2}
          accessibilityLabel="Buscar lançamentos"
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQuery('')} hitSlop={12}>
            <Icon name="close" size={18} color={colors.ink2} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        {GROUPS.map((g) => (
          <Chip key={g.value} label={g.label} active={group === g.value} onPress={() => setGroup(g.value)} />
        ))}
        <Chip
          label={forma ? PAYMENT_LABEL[forma] : 'Forma de Pagamento'}
          active={forma !== null}
          trailingIcon="chevronDown"
          onPress={() => setFormaOpen(true)}
        />
      </ScrollView>

      <View style={styles.summary} accessibilityLiveRegion="polite">
        <AppText variant="caption" color={colors.ink2}>
          {`${filtered.length} ${filtered.length === 1 ? 'lançamento' : 'lançamentos'}`}
        </AppText>
        <AppText variant="captionStrong" color={net < 0 ? colors.expense : colors.income} tabular>
          {filtered.length > 0 ? brlSigned(Math.abs(net), net < 0 ? 'despesa' : 'receita') : ''}
        </AppText>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title="Extrato" />
      <SectionList<Occurrence, { title: string; net: number; data: Occurrence[] }>
        sections={sections}
        keyExtractor={(o) => o.key}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingBottom: layout.fabClearance + 24,
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AppText variant="label" color={colors.ink2} accessibilityRole="header">
              {section.title}
            </AppText>
            <AppText variant="captionStrong" color={colors.ink2} tabular>
              {brlSigned(Math.abs(section.net), section.net < 0 ? 'despesa' : 'receita')}
            </AppText>
          </View>
        )}
        renderItem={({ item, index, section }) => {
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View
              style={[
                styles.itemShell,
                first && styles.itemFirst,
                last && styles.itemLast,
                !first && { borderTopWidth: 1, borderTopColor: colors.line },
              ]}
            >
              <RecordItem occurrence={item} category={categories[item.record.categoriaId]} />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={32} color={colors.ink2} />
            <AppText variant="h3" align="center">
              Nada por aqui
            </AppText>
            <AppText variant="body" color={colors.ink2} align="center">
              {hasFilters ? 'Nenhum lançamento corresponde aos filtros.' : 'Nenhum lançamento neste mês.'}
            </AppText>
            {hasFilters ? <Button variant="soft" label="Limpar filtros" onPress={clear} /> : null}
          </View>
        }
      />

      <BottomSheet visible={formaOpen} title="Forma de pagamento" onClose={() => setFormaOpen(false)}>
        {([null, ...PAYMENT_ORDER] as (PaymentMethod | null)[]).map((p) => {
          const selected = forma === p;
          return (
            <Pressable
              key={p ?? 'todas'}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                setForma(p);
                setFormaOpen(false);
              }}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.tint }]}
            >
              <AppText variant="bodyStrong" style={{ flex: 1 }}>
                {p ? PAYMENT_LABEL[p] : 'Todas'}
              </AppText>
              {selected ? <Icon name="check" size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    minHeight: 40,
  },
  itemShell: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.border,
    borderRightColor: colors.border,
    overflow: 'hidden',
  },
  itemFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  itemLast: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
});
