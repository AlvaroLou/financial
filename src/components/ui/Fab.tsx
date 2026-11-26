import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fabShadow, layout } from '@/theme/tokens';

/**
 * Botão flutuante "+" — só nas telas iniciais de cada app (Início e Carteira),
 * no canto inferior direito, acima da barra de abas. A tela deve usar
 * `ScreenScroll withFabClearance` para o botão nunca cobrir conteúdo.
 */
export function Fab({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.accent },
        fabShadow(colors),
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Icon name={icon} size={28} color={colors.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    bottom: 16,
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: layout.fabSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
