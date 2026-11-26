import { useEffect } from 'react';

import { useFinanceStore } from '@/store/useFinanceStore';
import type { AppId } from '@/theme/palette';

/** Mantém "o app aberto por último" igual ao grupo de telas visível (o app reabre nele). */
export function useSyncAppMode(app: AppId) {
  const appMode = useFinanceStore((s) => s.settings.appMode);
  const updateSettings = useFinanceStore((s) => s.updateSettings);
  useEffect(() => {
    if (appMode !== app) updateSettings({ appMode: app });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);
}
