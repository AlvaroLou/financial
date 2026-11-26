import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ColorPicker } from '@/components/ColorPicker';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, IconButton, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ACCENT_PRESETS, DEFAULT_ACCENTS, normalizeHex, type AppId, type ThemeMode } from '@/theme/palette';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius } from '@/theme/tokens';

const SETTING: Record<AppId, 'accentOrcamento' | 'accentInvest'> = {
  orcamento: 'accentOrcamento',
  investimentos: 'accentInvest',
};

/** Aparência: modo claro/escuro/automático (dos dois apps) e a cor de destaque de cada app. */
export default function AparenciaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const themeMode = useFinanceStore((s) => s.settings.themeMode);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />
        <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {t('appearance.title')}
        </AppText>
      </View>
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ padding: layout.screenPadding, gap: 24, paddingBottom: 40 }}>
        <View style={{ gap: 8 }}>
          <SectionHeader title={t('appearance.mode')} />
          <Segmented<ThemeMode>
            accessibilityLabel={t('appearance.mode')}
            value={themeMode}
            onChange={(v) => updateSettings({ themeMode: v })}
            options={[
              { value: 'light', label: t('appearance.light'), icon: 'sun' },
              { value: 'dark', label: t('appearance.dark'), icon: 'moon' },
              { value: 'auto', label: t('appearance.auto'), icon: 'themeAuto' },
            ]}
          />
          <AppText variant="caption" color={colors.ink2}>
            {t('appearance.autoHint')}
          </AppText>
        </View>

        <AccentSection app="orcamento" onInteract={(active) => setScrollEnabled(!active)} />
        <AccentSection app="investimentos" onInteract={(active) => setScrollEnabled(!active)} />
      </ScrollView>
    </Screen>
  );
}

function AccentSection({ app, onInteract }: { app: AppId; onInteract: (active: boolean) => void }) {
  const { t } = useTranslation();
  const { colors, palettes } = useTheme();
  const value = useFinanceStore((s) => s.settings[SETTING[app]]);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  const [custom, setCustom] = useState(() => !ACCENT_PRESETS.some((p) => p === normalizeHex(value)));
  const p = palettes[app];
  const setColor = (hex: string) => updateSettings({ [SETTING[app]]: hex });
  const isDefault = normalizeHex(value) === DEFAULT_ACCENTS[app];

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title={app === 'orcamento' ? t('appearance.budgetColor') : t('appearance.investColor')} />

      {/* prévia com as cores derivadas */}
      <View style={[styles.preview, { backgroundColor: p.hero }]} accessible accessibilityLabel={t('appearance.preview')}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={p.onHeroMuted}>
            {t(`mode.${app}`)}
          </AppText>
          <AppText variant="h2" color={p.onHero} tabular>
            R$ 12.345,67
          </AppText>
          <View style={[styles.previewPill, { backgroundColor: p.highlight }]}>
            <AppText variant="captionStrong" color={p.onHighlight}>
              {t('appearance.previewPill')}
            </AppText>
          </View>
        </View>
        <View style={[styles.previewFab, { backgroundColor: p.accent }]}>
          <Icon name="plus" size={24} color={p.onAccent} />
        </View>
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {ACCENT_PRESETS.map((hex) => {
            const selected = !custom && normalizeHex(value) === hex;
            return (
              <Pressable
                key={hex}
                accessibilityRole="radio"
                accessibilityLabel={t('appearance.colorA11y', { hex })}
                accessibilityState={{ selected }}
                onPress={() => {
                  setCustom(false);
                  setColor(hex);
                }}
                style={[styles.swatch, { backgroundColor: hex }, selected && { borderColor: colors.ink, borderWidth: 3 }]}
              >
                {selected ? <Icon name="check" size={20} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={t('appearance.customA11y')}
            accessibilityState={{ selected: custom }}
            onPress={() => setCustom(true)}
            style={[
              styles.swatch,
              { backgroundColor: colors.segment, borderColor: custom ? colors.ink : colors.outline, borderWidth: custom ? 3 : 1 },
            ]}
          >
            <Icon name="palette" size={20} color={colors.ink} />
          </Pressable>
        </View>

        {custom ? (
          <ColorPicker
            value={normalizeHex(value) ?? DEFAULT_ACCENTS[app]}
            onChange={setColor}
            onInteractStart={() => onInteract(true)}
            onInteractEnd={() => onInteract(false)}
          />
        ) : null}

        <Button
          variant="outline"
          compact
          icon="undo"
          label={t('appearance.restore')}
          disabled={isDefault}
          onPress={() => {
            setCustom(false);
            setColor(DEFAULT_ACCENTS[app]);
          }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 },
  preview: { borderRadius: radius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewPill: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  previewFab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
  },
});
