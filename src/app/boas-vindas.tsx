import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { useFinanceStore } from '@/store/useFinanceStore';
import { colors, layout, radius } from '@/theme/tokens';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar', title: 'Quanto pode gastar hoje', text: 'Orçamento por categoria e valor diário até o fim do mês.' },
  { icon: 'card', title: 'Parcelas e recorrentes', text: 'Uma compra parcelada ou um aluguel é lançado uma vez só.' },
  { icon: 'clock', title: 'Nada vence escondido', text: 'Próximos vencimentos sempre na tela inicial.' },
];

/** Primeira abertura: apresenta o app; os dados são todos cadastrados pelo usuário. */
export default function BoasVindasScreen() {
  const completeOnboarding = useFinanceStore((s) => s.completeOnboarding);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Icon name="wallet" size={36} color={colors.forest} />
          </View>
          <AppText variant="title" color={colors.surface} accessibilityRole="header">
            Dinheiro em Dia
          </AppText>
          <AppText variant="body" color={colors.onForest} style={{ fontSize: 16, lineHeight: 22 }}>
            Suas finanças do mês, sem planilha: veja para onde vai o dinheiro e quanto ainda dá para gastar.
          </AppText>
        </View>

        <View style={{ gap: 12 }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={20} color={colors.lime} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong" color={colors.surface}>
                  {f.title}
                </AppText>
                <AppText variant="caption" color={colors.onForest}>
                  {f.text}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="accent" label="Começar" icon="arrowUpRight" onPress={completeOnboarding} />
        <AppText variant="caption" color={colors.onForest} align="center">
          Você cadastra seus lançamentos, contas e metas. Tudo fica salvo só neste aparelho.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forest },
  content: { padding: layout.screenPadding, paddingTop: 48, gap: 32, flexGrow: 1 },
  hero: { gap: 12 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { padding: layout.screenPadding, gap: 12 },
});
