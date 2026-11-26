import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useFinanceStore } from '@/store/useFinanceStore';
import type { AppId } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const APPS: { id: AppId; icon: 'wallet' | 'chartLine'; href: '/' | '/carteira' }[] = [
  { id: 'orcamento', icon: 'wallet', href: '/' },
  { id: 'investimentos', icon: 'chartLine', href: '/carteira' },
];

/**
 * "Orçamento | Investimentos" no topo das telas iniciais: troca de app (abas,
 * cor e telas próprias). Usa `replace`, então o "voltar" não cruza os apps.
 * O app reabre no último usado.
 */
export function ModeSwitch() {
  const { t } = useTranslation();
  const { app, palettes, colors } = useTheme();
  const router = useRouter();
  const updateSettings = useFinanceStore((s) => s.updateSettings);

  const go = (next: (typeof APPS)[number]) => {
    if (next.id === app) return;
    updateSettings({ appMode: next.id });
    router.replace(next.href);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('mode.label')}
      style={[styles.wrap, { backgroundColor: colors.segment }]}
    >
      {APPS.map((a) => {
        const active = a.id === app;
        const p = palettes[a.id];
        return (
          <Pressable
            key={a.id}
            accessibilityRole="radio"
            accessibilityLabel={t(`mode.${a.id}`)}
            accessibilityState={{ selected: active }}
            onPress={() => go(a)}
            style={({ pressed }) => [
              styles.item,
              active && { backgroundColor: p.accent },
              pressed && !active && { opacity: 0.7 },
            ]}
          >
            <Icon name={a.icon} size={16} color={active ? p.onAccent : colors.ink2} />
            <AppText
              variant="label"
              numberOfLines={1}
              color={active ? p.onAccent : colors.ink2}
              style={{ fontFamily: active ? fonts.bold : fonts.semibold, flexShrink: 1 }}
            >
              {t(`mode.${a.id}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 14 },
  item: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
});
