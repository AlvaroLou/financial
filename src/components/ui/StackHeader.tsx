import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/primitives';

/** Cabeçalho de telas empilhadas (ferramentas): voltar + título + ações. */
export function StackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 4 }}>
      <IconButton icon="chevronLeft" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
