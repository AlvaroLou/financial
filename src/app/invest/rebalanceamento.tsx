import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { MoneyInput, TextField } from '@/components/ui/Fields';
import { Button, Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { StackHeader } from '@/components/ui/StackHeader';
import { CLASS_ORDER, classColor } from '@/invest/catalog';
import { usePortfolio } from '@/invest/hooks';
import { rebalance, targetsTotal } from '@/invest/lib/rebalance';
import { useInvestStore } from '@/invest/store';
import type { AllocationTargets, AssetClass } from '@/invest/types';
import { brlShort, formatDecimal, parseDecimal, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** Alocação-alvo por classe e sugestão de aporte para se aproximar dela (sem vender nada). */
export default function RebalanceamentoScreen() {
  const { t } = useTranslation();
  const { colors, base } = useTheme();
  const summary = usePortfolio();
  const targets = useInvestStore((s) => s.targets);
  const setTargets = useInvestStore((s) => s.setTargets);
  const showSnackbar = useSnackbar();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(CLASS_ORDER.map((c) => [c, targets[c] ? formatDecimal((targets[c] ?? 0) * 100, 1) : ''])),
  );
  const [contribution, setContribution] = useState(100_000);

  const parsed: AllocationTargets = useMemo(() => {
    const out: AllocationTargets = {};
    for (const c of CLASS_ORDER) {
      const v = parseDecimal(draft[c] ?? '');
      if (Number.isFinite(v) && v > 0) out[c] = v / 100;
    }
    return out;
  }, [draft]);
  const sum = targetsTotal(parsed);
  const rows = useMemo(() => (sum > 0 ? rebalance(summary.porClasse, parsed, contribution) : []), [summary.porClasse, parsed, contribution, sum]);

  const save = () => {
    setTargets(parsed);
    showSnackbar({ message: t('invest.rebalance.saved') });
  };

  return (
    <Screen>
      <StackHeader title={t('invest.more.rebalance')} />
      <ScreenScroll gap={20}>
        <AppText variant="body" color={colors.ink2}>
          {t('invest.rebalance.intro')}
        </AppText>

        <View>
          <SectionHeader title={t('invest.rebalance.targets')} />
          <Card style={{ padding: 16, gap: 10 }}>
            {CLASS_ORDER.map((c: AssetClass) => (
              <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: classColor(c, base) }} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{t(`invest.classes.${c}`)}</AppText>
                  <AppText variant="caption" color={colors.ink2} tabular>
                    {t('invest.rebalance.now', {
                      pct: percent(summary.patrimonio > 0 ? summary.porClasse[c] / summary.patrimonio : 0),
                    })}
                  </AppText>
                </View>
                <View style={{ width: 96 }}>
                  <TextField
                    label="%"
                    value={draft[c] ?? ''}
                    onChangeText={(v) => setDraft((d) => ({ ...d, [c]: v.replace(/[^\d.,]/g, '') }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>
            ))}
            <AppText variant="label" color={Math.abs(sum - 1) < 0.001 ? colors.income : colors.installmentText} tabular>
              {t('invest.rebalance.sum', { pct: percent(sum) })}
            </AppText>
            <Button variant="outline" icon="check" label={t('invest.rebalance.saveTargets')} onPress={save} />
          </Card>
        </View>

        <View>
          <SectionHeader title={t('invest.rebalance.suggestion')} />
          <Card style={{ padding: 16, gap: 14 }}>
            <MoneyInput label={t('invest.rebalance.contribution')} value={contribution} onChange={setContribution} tone={colors.primary} />
            {rows.length === 0 ? (
              <AppText variant="body" color={colors.ink2}>
                {t('invest.rebalance.noTargets')}
              </AppText>
            ) : (
              rows
                .filter((r) => r.alvoPct > 0 || r.atual > 0)
                .map((r) => (
                  <View key={r.classe} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: classColor(r.classe, base) }} />
                      <AppText variant="bodyStrong" style={{ flex: 1 }}>
                        {t(`invest.classes.${r.classe}`)}
                      </AppText>
                      <AppText variant="bodyStrong" tabular color={r.aportar > 0 ? colors.primary : colors.ink2}>
                        {r.aportar > 0 ? `+ ${brlShort(r.aportar)}` : '—'}
                      </AppText>
                    </View>
                    <ProgressBar value={r.depoisPct} color={classColor(r.classe, base)} label={t(`invest.classes.${r.classe}`)} />
                    <AppText variant="caption" color={colors.ink2} tabular>
                      {t('invest.rebalance.row', { now: percent(r.atualPct), after: percent(r.depoisPct), target: percent(r.alvoPct) })}
                    </AppText>
                  </View>
                ))
            )}
          </Card>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
