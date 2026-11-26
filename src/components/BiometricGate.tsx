import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Se "Biometria" estiver ativa nos Ajustes, o app pede digital/Face ID ao abrir
 * e sempre que volta do segundo plano.
 *
 * Bloqueado, a tela de bloqueio SUBSTITUI o app (inclusive telas modais abertas,
 * como "Novo lançamento"), garantindo que nada fique visível por trás.
 */
export function BiometricGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const enabled = useFinanceStore((s) => s.settings.biometria);
  // começa bloqueado só se a biometria já estava ativa ao abrir o app
  const [locked, setLocked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const authenticate = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt', { app: t('app.name') }),
        cancelLabel: t('common.cancel'),
        fallbackLabel: t('lock.usePassword'),
      });
      if (result.success) setLocked(false);
      else if (result.error !== 'user_cancel' && result.error !== 'system_cancel' && result.error !== 'app_cancel') {
        setError(t('lock.error'));
      }
    } catch {
      setError(t('lock.unavailable'));
    } finally {
      busy.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (enabled && locked) void authenticate();
  }, [enabled, locked, authenticate]);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  if (!enabled || !locked) return <>{children}</>;

  return (
    <View style={[styles.lock, { backgroundColor: colors.bg }]}>
      <View style={[styles.badge, { backgroundColor: colors.tint }]}>
        <Icon name="fingerprint" size={40} color={colors.primary} />
      </View>
      <AppText variant="title" align="center">
        {t('lock.title')}
      </AppText>
      <AppText variant="body" color={colors.ink2} align="center">
        {t('lock.text')}
      </AppText>
      {error ? (
        <AppText variant="label" color={colors.expense} align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button label={t('lock.unlock')} icon="fingerprint" onPress={authenticate} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  lock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
