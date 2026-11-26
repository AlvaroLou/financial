import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { RecordItem } from '@/components/RecordItem';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet, OptionList } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Chip } from '@/components/ui/primitives';
import { MonthSelector, Screen, ScreenHeader } from '@/components/ui/Screen';
import { useCategoryMap, useMonthData } from '@/hooks/useMonthData';
import { categoryName, paymentLabel } from '@/i18n/labels';
import { todayISO } from '@/lib/clock';
import { groupLabel } from '@/lib/dates';
import { filterOccurrences, groupByDay, type GroupFilter } from '@/lib/finance';
import { PAYMENT_ORDER } from '@/lib/labels';
import { brlSigned } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import type { ThemeColors } from '@/theme/palette';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { fonts, layout, radius } from '@/theme/tokens';
import type { Occurrence, PaymentMethod } from '@/types';

const GROUPS: GroupFilter[] = ['todos', 'fixos', 'variaveis', 'parcelados', 'recorrentes', 'avista'];
const ALL = '__all__';

export default function ExtratoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { occurrences } = useMonthData();
  const categories = useCategoryMap();
  const categoryList = useFinanceStore((s) => s.categories);

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('todos');
  const [forma, setForma] = useState<PaymentMethod | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'forma' | 'categoria' | null>(null);

  const names = useMemo(
    () => Object.fromEntries(categoryList.map((c) => [c.id, categoryName(c)])),
    // nomes traduzidos mudam com o idioma
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryList, t],
  );

  const today = todayISO();
  const filtered = useMemo(
    () => filterOccurrences(occurrences, { query, group, forma, categories, categoryId, names }),
    [occurrences, query, group, forma, categories, categoryId, names],
  );
  const sections = useMemo(
    () => groupByDay(filtered).map((s) => ({ title: groupLabel(s.date, today), net: s.net, data: s.items })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, today, t],
  );

  const net = filtered.reduce((acc, o) => acc + (o.record.kind === 'receita' ? o.valor : -o.valor), 0);
  const hasFilters = query.trim() !== '' || group !== 'todos' || forma !== null || categoryId !== null;
  const clear = () => {
    setQuery('');
    setGroup('todos');
    setForma(null);
    setCategoryId(null);
  };

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <MonthSelector />

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.ink2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('statement.searchPlaceholder')}
          placeholderTextColor={colors.ink2}
          accessibilityLabel={t('statement.searchA11y')}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('statement.clearSearch')} onPress={() => setQuery('')} hitSlop={12}>
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
        <Chip
          label={categoryId ? names[categoryId] ?? t('statement.categoryFilter') : t('statement.categoryFilter')}
          icon="tag"
          active={categoryId !== null}
          trailingIcon="chevronDown"
          onPress={() => setSheet('categoria')}
        />
        <Chip
          label={forma ? paymentLabel(forma) : t('statement.paymentFilter')}
          active={forma !== null}
          trailingIcon="chevronDown"
          onPress={() => setSheet('forma')}
        />
        {GROUPS.map((g) => (
          <Chip key={g} label={t(`statement.groups.${g}`)} active={group === g} onPress={() => setGroup(g)} />
        ))}
      </ScrollView>

      <View style={styles.summary} accessibilityLiveRegion="polite">
        <AppText variant="caption" color={colors.ink2}>
          {t('statement.count', { count: filtered.length })}
        </AppText>
        <AppText variant="captionStrong" color={net < 0 ? colors.expense : colors.income} tabular>
          {filtered.length > 0 ? brlSigned(Math.abs(net), net < 0 ? 'despesa' : 'receita') : ''}
        </AppText>
      </View>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader title={t('statement.title')} />
      <SectionList<Occurrence, { title: string; net: number; data: Occurrence[] }>
        sections={sections}
        keyExtractor={(o) => o.key}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingBottom: 32 }}
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
              <RecordItem occurrence={item} category={categories[item.record.categoriaId]} categories={categories} />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search" size={32} color={colors.ink2} />
            <AppText variant="h3" align="center">
              {t('statement.emptyTitle')}
            </AppText>
            <AppText variant="body" color={colors.ink2} align="center">
              {hasFilters ? t('statement.emptyFiltered') : t('statement.emptyMonth')}
            </AppText>
            {hasFilters ? <Button variant="soft" label={t('statement.clearFilters')} onPress={clear} /> : null}
          </View>
        }
      />

      <BottomSheet visible={sheet === 'forma'} title={t('statement.paymentTitle')} onClose={() => setSheet(null)}>
        <OptionList
          options={[
            { value: ALL, label: t('statement.allPayments') },
            ...PAYMENT_ORDER.map((p) => ({ value: p as string, label: paymentLabel(p) })),
          ]}
          selected={forma ?? ALL}
          onSelect={(v) => {
            setForma(v === ALL ? null : (v as PaymentMethod));
            setSheet(null);
          }}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'categoria'} title={t('statement.categoryTitle')} onClose={() => setSheet(null)}>
        <OptionList
          options={[
            { value: ALL, label: t('statement.allCategories') },
            ...categoryList.map((c) => ({ value: c.id, label: names[c.id], icon: c.icone })),
          ]}
          selected={categoryId ?? ALL}
          onSelect={(v) => {
            setCategoryId(v === ALL ? null : v);
            setSheet(null);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 10, minWidth: 0 },
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
  });
