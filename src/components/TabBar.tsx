import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout } from '@/theme/tokens';

const ICONS: Record<string, IconName> = {
  // Orçamento
  index: 'home',
  estatisticas: 'stats',
  planejar: 'plan',
  extrato: 'statement',
  ajustes: 'settings',
  // Investimentos
  carteira: 'chartPie',
  ativos: 'chartLine',
  proventos: 'cashMultiple',
  metas: 'target',
  mais: 'dotsGrid',
};

/** Barra inferior das abas (as duas "apps" usam a mesma). O "+" fica só nas telas iniciais (Fab). */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom, backgroundColor: colors.surface, borderTopColor: colors.line }]}>
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const tint = focused ? colors.primary : colors.ink2;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.item}
            >
              <View style={[styles.iconPill, focused && { backgroundColor: colors.tint }]}>
                <Icon name={ICONS[route.name] ?? 'home'} size={22} color={tint} />
              </View>
              <AppText
                variant="caption"
                color={tint}
                numberOfLines={1}
                style={{ fontSize: 11, fontFamily: focused ? fonts.bold : fonts.semibold }}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
  },
  row: {
    height: layout.tabBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  iconPill: {
    width: 52,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
