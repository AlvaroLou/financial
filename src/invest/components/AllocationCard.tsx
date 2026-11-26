import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { DonutChart } from '@/components/charts/DonutChart';
import { AppText } from '@/components/ui/AppText';
import { Card, Segmented } from '@/components/ui/primitives';
import { brlShort, percent, spokenBrl } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';
import { OTHER_SERIES, SERIES } from '@/theme/tokens';

import { CLASS_ORDER, classColor } from '../catalog';
import type { PortfolioSummary } from '../lib/portfolio';
import { useInvestStore } from '../store';

type View_ = 'classe' | 'grupo' | 'instituicao';

/** Alocação da carteira: por classe, renda fixa × variável, ou por instituição (rosca + legenda com valores). */
export function AllocationCard({ summary, hidden }: { summary: PortfolioSummary; hidden: boolean }) {
  const { t } = useTranslation();
  const { colors, base } = useTheme();
  const institutions = useInvestStore((s) => s.institutions);
  const [mode, setMode] = useState<View_>('classe');
  const total = summary.patrimonio;

  let slices: { id: string; nome: string; value: number; color: string }[] = [];
  if (mode === 'classe') {
    const named = CLASS_ORDER.map((c) => ({ id: c, nome: t(`invest.classes.${c}`), value: summary.porClasse[c], color: classColor(c, base) }));
    const own = named.filter((s) => s.color !== OTHER_SERIES[base]);
    const rest = named.filter((s) => s.color === OTHER_SERIES[base] && s.value > 0);
    slices = [
      ...own,
      ...(rest.length ? [{ id: 'outros', nome: rest.map((r) => r.nome).join(' + '), value: rest.reduce((a, r) => a + r.value, 0), color: OTHER_SERIES[base] }] : []),
    ];
  } else if (mode === 'grupo') {
    slices = (['fixa', 'variavel', 'outros'] as const).map((g, i) => ({
      id: g,
      nome: t(`invest.groups.${g}`),
      value: summary.porGrupo[g],
      color: g === 'outros' ? OTHER_SERIES[base] : SERIES[base][i],
    }));
  } else {
    const entries = Object.entries(summary.porInstituicao).sort((a, b) => b[1] - a[1]);
    const top = entries.filter(([id]) => id !== '').slice(0, 8);
    const rest = entries.filter(([id]) => !top.some(([x]) => x === id));
    // cor por ordem de cadastro da instituição (estável), não pelo valor
    const order = institutions.map((i) => i.id);
    slices = [
      ...top.map(([id, value]) => ({
        id,
        nome: institutions.find((i) => i.id === id)?.nome ?? '—',
        value,
        // nunca repete cores: da 9ª instituição em diante, cinza
        color: order.indexOf(id) >= 0 && order.indexOf(id) < 8 ? SERIES[base][order.indexOf(id)] : OTHER_SERIES[base],
      })),
      ...(rest.length ? [{ id: 'sem', nome: t('invest.allocation.noInstitution'), value: rest.reduce((a, [, v]) => a + v, 0), color: OTHER_SERIES[base] }] : []),
    ];
  }
  const visible = slices.filter((s) => s.value > 0);

  return (
    <Card style={{ padding: 16, gap: 16 }}>
      <Segmented
        compact
        accessibilityLabel={t('invest.allocation.viewA11y')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'classe', label: t('invest.allocation.byClass') },
          { value: 'grupo', label: t('invest.allocation.byGroup') },
          { value: 'instituicao', label: t('invest.allocation.byInstitution') },
        ]}
      />
      {visible.length === 0 ? (
        <AppText variant="body" color={colors.ink2} align="center">
          {t('invest.allocation.empty')}
        </AppText>
      ) : (
        <View style={{ alignItems: 'center', gap: 16 }}>
          <DonutChart
            slices={visible}
            size={168}
            accessibilityLabel={t('invest.allocation.a11y', {
              list: visible.map((s) => `${s.nome} ${percent(s.value / total, 0)}`).join(', '),
            })}
          >
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.allocation.assets', { count: summary.abertos.length })}
            </AppText>
          </DonutChart>
          <View style={{ alignSelf: 'stretch', gap: 2 }}>
            {visible.map((s) => (
              <View
                key={s.id}
                accessible
                accessibilityLabel={`${s.nome}, ${percent(s.value / total)}${hidden ? '' : `, ${spokenBrl(s.value)}`}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 34 }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: s.color }} />
                <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {s.nome}
                </AppText>
                <AppText variant="body" color={colors.ink2} tabular>
                  {percent(s.value / total)}
                </AppText>
                <AppText variant="bodyStrong" tabular style={{ minWidth: 86, textAlign: 'right' }}>
                  {hidden ? '••••' : brlShort(s.value)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
