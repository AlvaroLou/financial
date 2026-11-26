import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useFinanceStore } from '@/store/useFinanceStore';

/**
 * Visibilidade dos valores da tela inicial.
 *
 * - "Ocultar saldo" (Ajustes) é o PADRÃO da tela e nunca é alterado aqui.
 * - O olho só troca a visualização temporariamente (nos dois sentidos).
 * - Ao sair da tela (outra aba, "+" ou qualquer tela por cima) ou mandar o app
 *   para o segundo plano, volta ao padrão.
 */
export function useHiddenValues() {
  const hiddenByDefault = useFinanceStore((s) => s.settings.ocultarSaldo);
  const [override, setOverride] = useState<boolean | null>(null);

  // O cleanup roda no "blur" — inclusive quando um modal abre por cima das abas,
  // porque o navegador de abas repassa o blur para a aba focada.
  useFocusEffect(useCallback(() => () => setOverride(null), []));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') setOverride(null);
    });
    return () => sub.remove();
  }, []);

  const hidden = override ?? hiddenByDefault;
  const toggle = useCallback(() => setOverride(!hidden), [hidden]);
  return { hidden, toggle };
}
