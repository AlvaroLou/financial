import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { Button, Card, SectionHeader, Tag } from '@/components/ui/primitives';
import { Screen, ScreenScroll } from '@/components/ui/Screen';
import { useSnackbar } from '@/components/ui/Snackbar';
import { StackHeader } from '@/components/ui/StackHeader';
import { testBrapiToken } from '@/invest/services/brapi';
import { testCoingeckoKey } from '@/invest/services/coingecko';
import { getProviderKey, setProviderKey, type ProviderKey } from '@/invest/services/secrets';
import { useInvestStore, useMarketStore } from '@/invest/store';
import { useMarketRefresh } from '@/invest/useMarketRefresh';
import { displayDate } from '@/lib/dates';
import { formatDecimal, parseDecimal, percent } from '@/lib/money';
import { useTheme } from '@/theme/ThemeProvider';

/** Taxas de referência (Banco Central ou digitadas) e chaves das APIs de cotação. */
export default function TaxasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rates = useMarketStore((s) => s.rates);
  const quotes = useMarketStore((s) => s.quotes);
  const setRates = useMarketStore((s) => s.setRates);
  const updateInvestSettings = useInvestStore((s) => s.updateInvestSettings);
  const { loading, last, refresh } = useMarketRefresh(false);
  const showSnackbar = useSnackbar();

  const [cdi, setCdi] = useState(formatDecimal(rates.cdiAnual * 100, 2, 2));
  const [selic, setSelic] = useState(formatDecimal(rates.selicMeta * 100, 2, 2));
  const [ipca, setIpca] = useState(formatDecimal(rates.ipca12m * 100, 2, 2));

  useEffect(() => {
    setCdi(formatDecimal(rates.cdiAnual * 100, 2, 2));
    setSelic(formatDecimal(rates.selicMeta * 100, 2, 2));
    setIpca(formatDecimal(rates.ipca12m * 100, 2, 2));
  }, [rates.cdiAnual, rates.selicMeta, rates.ipca12m]);

  const saveManual = () => {
    const [c, s, i] = [cdi, selic, ipca].map((x) => parseDecimal(x) / 100);
    if (![c, s, i].every((x) => Number.isFinite(x) && x >= 0 && x < 1)) return;
    setRates({ cdiAnual: c, selicMeta: s, ipca12m: i, origem: 'manual' });
    showSnackbar({ message: t('invest.rates.savedManual') });
  };

  const backToAuto = async () => {
    setRates({ origem: 'padrao' });
    const r = await refresh(true);
    showSnackbar({ message: r.status === 'offline' ? t('invest.status.offline') : t('invest.rates.updated') });
  };

  const origin = { bcb: t('invest.rates.originBcb'), manual: t('invest.rates.originManual'), padrao: t('invest.rates.originDefault') }[rates.origem];
  const quoteList = Object.entries(quotes).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Screen>
      <StackHeader title={t('invest.more.rates')} />
      <ScreenScroll gap={20}>
        <View>
          <SectionHeader title={t('invest.rates.title')} />
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Tag tone={rates.origem === 'bcb' ? 'success' : rates.origem === 'manual' ? 'accent' : 'installment'}>{origin}</Tag>
              {rates.referencia ? (
                <AppText variant="caption" color={colors.ink2}>
                  {t('invest.rates.referenceDate', { date: displayDate(rates.referencia) })}
                </AppText>
              ) : null}
            </View>
            {[
              { label: t('invest.rates.cdi'), value: rates.cdiAnual, hint: t('invest.rates.cdiHint') },
              { label: t('invest.rates.selic'), value: rates.selicMeta, hint: t('invest.rates.selicHint') },
              { label: t('invest.rates.ipca'), value: rates.ipca12m, hint: t('invest.rates.ipcaHint') },
            ].map((r) => (
              <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{r.label}</AppText>
                  <AppText variant="caption" color={colors.ink2}>
                    {r.hint}
                  </AppText>
                </View>
                <AppText variant="h2" tabular>
                  {percent(r.value, 2)}
                </AppText>
              </View>
            ))}
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.rates.series', {
                cdi: Object.keys(rates.cdiDiario).length,
                selic: Object.keys(rates.selicDiaria).length,
                ipca: Object.keys(rates.ipcaMensal).length,
              })}
            </AppText>
            <Button
              icon="refresh"
              label={loading ? t('invest.status.updating') : t('invest.rates.updateNow')}
              disabled={loading}
              onPress={() => void backToAuto()}
            />
            {last?.status === 'offline' ? (
              <AppText variant="caption" color={colors.expense}>
                {t('invest.status.offline')}
              </AppText>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionHeader title={t('invest.rates.manualTitle')} />
          <Card style={{ padding: 16, gap: 12 }}>
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.rates.manualHint')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField label="CDI %" value={cdi} onChangeText={setCdi} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Selic %" value={selic} onChangeText={setSelic} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="IPCA %" value={ipca} onChangeText={setIpca} keyboardType="decimal-pad" />
              </View>
            </View>
            <Button variant="outline" icon="check" label={t('invest.rates.saveManual')} onPress={saveManual} />
          </Card>
        </View>

        <View>
          <SectionHeader title={t('invest.rates.providers')} />
          <View style={{ gap: 12 }}>
            <KeyCard
              provider="brapi"
              title={t('invest.rates.brapiTitle')}
              hint={t('invest.rates.brapiHint')}
              onSaved={(has) => updateInvestSettings({ hasBrapiToken: has })}
              test={testBrapiToken}
            />
            <KeyCard
              provider="coingecko"
              title={t('invest.rates.coingeckoTitle')}
              hint={t('invest.rates.coingeckoHint')}
              onSaved={(has) => updateInvestSettings({ hasCoingeckoKey: has })}
              test={testCoingeckoKey}
            />
          </View>
        </View>

        {quoteList.length > 0 ? (
          <View>
            <SectionHeader title={t('invest.rates.cachedQuotes')} />
            <Card style={{ overflow: 'hidden' }}>
              {quoteList.map(([k, q], i) => (
                <View
                  key={k}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
                >
                  <AppText variant="bodyStrong" style={{ flex: 1 }}>
                    {k.split(':')[1].toUpperCase()}
                  </AppText>
                  <AppText variant="caption" color={colors.ink2}>
                    {`${q.source} · ${displayDate(q.updatedAt.slice(0, 10))}`}
                  </AppText>
                  <AppText variant="bodyStrong" tabular>
                    {`R$ ${formatDecimal(q.price, q.price < 1 ? 8 : 2, 2)}`}
                  </AppText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

function KeyCard({
  provider,
  title,
  hint,
  onSaved,
  test,
}: {
  provider: ProviderKey;
  title: string;
  hint: string;
  onSaved: (has: boolean) => void;
  test: (key: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    void getProviderKey(provider).then((k) => setSaved(!!k));
  }, [provider]);

  const save = async () => {
    const key = value.trim();
    setState('testing');
    const ok = key ? await test(key) : false;
    setState(ok ? 'ok' : 'fail');
    if (ok) {
      await setProviderKey(provider, key);
      setSaved(true);
      setValue('');
      onSaved(true);
    }
  };

  const remove = async () => {
    await setProviderKey(provider, null);
    setSaved(false);
    setState('idle');
    onSaved(false);
  };

  return (
    <Card style={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="key" size={18} color={colors.primary} />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          {title}
        </AppText>
        {saved ? <Tag tone="success" icon="check">{t('invest.rates.keySaved')}</Tag> : null}
      </View>
      <AppText variant="caption" color={colors.ink2}>
        {hint}
      </AppText>
      <TextField
        label={t('invest.rates.keyLabel')}
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder={saved ? '••••••••' : ''}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          compact
          style={{ flex: 1 }}
          icon="check"
          label={state === 'testing' ? t('invest.rates.testing') : t('invest.rates.testAndSave')}
          disabled={!value.trim() || state === 'testing'}
          onPress={() => void save()}
        />
        {saved ? <Button compact variant="danger" icon="trash" label={t('common.delete')} onPress={() => void remove()} /> : null}
      </View>
      {state === 'ok' || state === 'fail' ? (
        <AppText variant="caption" color={state === 'ok' ? colors.income : colors.expense}>
          {state === 'ok' ? t('invest.rates.keyOk') : t('invest.rates.keyFail')}
        </AppText>
      ) : null}
    </Card>
  );
}
