import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { DateField } from '@/components/ui/DateField';
import { BottomSheet, MoneyInput, SelectField, SwitchRow, TextField, useSelectStyle } from '@/components/ui/Fields';
import { FormScreen } from '@/components/ui/FormScreen';
import { Icon } from '@/components/ui/Icon';
import { Button, Chip } from '@/components/ui/primitives';
import { useSnackbar } from '@/components/ui/Snackbar';
import { ASSET_TYPES, TYPE_GROUPS } from '@/invest/catalog';
import { fetchBrapiQuote } from '@/invest/services/brapi';
import { searchCoins, type CoinSearchResult } from '@/invest/services/coingecko';
import { getProviderKey } from '@/invest/services/secrets';
import { useInvestStore, useMarketStore } from '@/invest/store';
import type { AssetType, Indexer } from '@/invest/types';
import { todayISO } from '@/lib/clock';
import { addDays } from '@/lib/dates';
import { formatDecimal, parseDecimal } from '@/lib/money';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { ISODate } from '@/types';

const NONE = '__none__';
const NEW = '__new__';

interface Form {
  tipo: AssetType;
  nome: string;
  ticker: string;
  coingeckoId: string;
  instituicaoId: string;
  novaInstituicao: string;
  metaId: string;
  indexador: Indexer;
  taxa: string;
  temVencimento: boolean;
  vencimento: ISODate;
  liquidezDiaria: boolean;
  notas: string;
  // operação inicial (só ao criar)
  valor: number;
  quantidade: string;
  preco: string;
  custos: number;
  data: ISODate;
}

/** Converte a taxa digitada (em %) para fração. */
const rateFromInput = (text: string) => {
  const v = parseDecimal(text);
  return Number.isFinite(v) ? v / 100 : NaN;
};

/** Criar (`?tipo=`) ou editar (`?id=`) um investimento. Ao criar, já registra a aplicação/compra inicial. */
export default function AtivoFormScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const selectStyle = useSelectStyle();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const asset = useInvestStore((s) => (id ? s.assets.find((a) => a.id === id) : undefined));
  const institutions = useInvestStore((s) => s.institutions);
  const goals = useFinanceStore((s) => s.goals);
  const store = useInvestStore.getState;
  const showSnackbar = useSnackbar();

  const [form, setForm] = useState<Form>(() => {
    const today = todayISO();
    const tipo: AssetType = asset?.tipo ?? 'cdb';
    const info = ASSET_TYPES[tipo];
    const taxa = asset?.rf ? formatDecimal(asset.rf.taxa * 100, 4) : info.defaultIndexer === 'cdi' ? '100' : '';
    return {
      tipo,
      nome: asset?.nome ?? '',
      ticker: asset?.ticker ?? '',
      coingeckoId: asset?.coingeckoId ?? '',
      instituicaoId: asset?.instituicaoId ?? NONE,
      novaInstituicao: '',
      metaId: asset?.metaId ?? NONE,
      indexador: asset?.rf?.indexador ?? info.defaultIndexer ?? 'cdi',
      taxa,
      temVencimento: !!asset?.rf?.vencimento,
      vencimento: asset?.rf?.vencimento ?? addDays(today, 365 * 2),
      liquidezDiaria: asset?.rf?.liquidezDiaria ?? false,
      notas: asset?.notas ?? '',
      valor: 0,
      quantidade: '',
      preco: '',
      custos: 0,
      data: asset?.rf?.dataInicio ?? today,
    };
  });
  const initial = useRef(JSON.stringify(form));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [typeOpen, setTypeOpen] = useState(false);
  const [coinQuery, setCoinQuery] = useState('');
  const [coinResults, setCoinResults] = useState<CoinSearchResult[] | null>(null);
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'error'>('idle');

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const info = ASSET_TYPES[form.tipo];
  const isFixed = info.valuation === 'fixed';
  const isQuote = info.valuation === 'quote';
  const isCrypto = form.tipo === 'cripto';
  const editing = !!asset;

  const changeType = (tipo: AssetType) => {
    const ti = ASSET_TYPES[tipo];
    setForm((f) => ({
      ...f,
      tipo,
      indexador: ti.defaultIndexer ?? f.indexador,
      taxa: ti.defaultIndexer === 'cdi' ? '100' : ti.defaultIndexer === 'poupanca' || ti.defaultIndexer === 'selic' ? '0' : f.taxa,
    }));
    setTypeOpen(false);
  };

  const rateLabel = {
    pre: t('invest.form.ratePre'),
    cdi: t('invest.form.rateCdi'),
    cdi_spread: t('invest.form.rateCdiSpread'),
    ipca: t('invest.form.rateIpca'),
    selic: t('invest.form.rateSelic'),
    poupanca: '',
  }[form.indexador];

  const lookupTicker = async () => {
    if (!form.ticker.trim()) return;
    setLookup('loading');
    try {
      const token = await getProviderKey('brapi');
      const q = await fetchBrapiQuote(form.ticker, token);
      useMarketStore.getState().setQuotes({ [`B3:${form.ticker.trim().toUpperCase()}`]: { price: q.price, changePct: q.changePct, updatedAt: q.updatedAt, source: 'brapi' } });
      setForm((f) => ({ ...f, nome: f.nome || q.name || f.ticker.toUpperCase(), preco: f.preco || formatDecimal(q.price, 2, 2) }));
      setLookup('idle');
    } catch {
      setLookup('error');
    }
  };

  const findCoins = async () => {
    if (!coinQuery.trim()) return;
    setLookup('loading');
    try {
      setCoinResults(await searchCoins(coinQuery, await getProviderKey('coingecko')));
      setLookup('idle');
    } catch {
      setLookup('error');
    }
  };

  const save = () => {
    const e: Record<string, string> = {};
    const nome = form.nome.trim() || form.ticker.trim().toUpperCase();
    if (!nome) e.nome = t('invest.form.nameError');
    if (isCrypto && !form.coingeckoId) e.coin = t('invest.form.coinError');
    const taxa = isFixed ? (form.indexador === 'poupanca' ? 0 : rateFromInput(form.taxa)) : 0;
    if (isFixed && form.indexador !== 'poupanca' && !(Number.isFinite(taxa) && taxa >= 0)) e.taxa = t('invest.form.rateError');
    if (isFixed && form.temVencimento && form.vencimento <= form.data) e.vencimento = t('invest.form.maturityError');
    const qty = parseDecimal(form.quantidade);
    const price = parseDecimal(form.preco);
    if (!editing) {
      if (isQuote) {
        if (!(qty > 0)) e.quantidade = t('invest.form.qtyError');
        if (!(price > 0)) e.preco = t('invest.form.priceError');
      } else if (form.valor <= 0) e.valor = t('invest.form.valueError');
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    let instituicaoId: string | undefined = form.instituicaoId === NONE ? undefined : form.instituicaoId;
    if (form.instituicaoId === NEW) instituicaoId = form.novaInstituicao.trim() ? store().addInstitution(form.novaInstituicao) : undefined;

    const input = {
      tipo: form.tipo,
      nome,
      ticker: isQuote && !isCrypto && form.ticker.trim() ? form.ticker.trim().toUpperCase() : undefined,
      coingeckoId: isCrypto ? form.coingeckoId : undefined,
      instituicaoId,
      metaId: form.metaId === NONE ? undefined : form.metaId,
      rf: isFixed
        ? {
            indexador: form.indexador,
            taxa,
            dataInicio: form.data,
            vencimento: form.temVencimento ? form.vencimento : undefined,
            liquidezDiaria: form.liquidezDiaria,
          }
        : undefined,
      notas: form.notas.trim() || undefined,
      cotacaoManual: asset?.cotacaoManual,
      valorManual: asset?.valorManual,
      arquivado: asset?.arquivado,
    };

    if (asset) {
      store().updateAsset(asset.id, input);
      showSnackbar({ message: t('invest.form.updated') });
      router.back();
      return;
    }
    const assetId = store().addAsset(input);
    if (isQuote) {
      store().addOperation({ assetId, tipo: 'compra', data: form.data, quantidade: qty, preco: price, valor: Math.round(qty * price * 100), custos: form.custos || undefined });
    } else {
      store().addOperation({ assetId, tipo: 'aporte', data: form.data, valor: form.valor });
    }
    showSnackbar({ message: t('invest.form.created', { name: nome }) });
    router.replace(`/invest/ativo/${assetId}`);
  };

  return (
    <FormScreen
      title={editing ? t('invest.form.editTitle') : t('invest.form.newTitle')}
      dirty={JSON.stringify(form) !== initial.current}
      onSave={save}
      saveLabel={editing ? t('common.saveChanges') : t('invest.form.create')}
    >
      {/* tipo */}
      <View style={{ gap: 6 }}>
        <AppText variant="label" color={colors.ink2}>
          {t('invest.form.type')}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('invest.form.type')}: ${t(`invest.types.${form.tipo}`)}`}
          disabled={editing}
          onPress={() => setTypeOpen(true)}
          style={({ pressed }) => [selectStyle, pressed && { opacity: 0.8 }, editing && { opacity: 0.7 }]}
        >
          <Icon name={info.icon} size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{t(`invest.types.${form.tipo}`)}</AppText>
            <AppText variant="caption" color={colors.ink2}>
              {t(`invest.typeHints.${form.tipo}`)}
            </AppText>
          </View>
          {editing ? null : <Icon name="chevronDown" size={20} color={colors.ink2} />}
        </Pressable>
      </View>

      {isQuote && !isCrypto ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('invest.form.ticker')}
                value={form.ticker}
                onChangeText={(v) => set('ticker', v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                autoCapitalize="characters"
                placeholder={t(`invest.form.tickerPlaceholder.${form.tipo}`)}
              />
            </View>
            <Button compact variant="outline" icon="search" label={t('invest.form.lookup')} onPress={() => void lookupTicker()} style={{ marginBottom: 0 }} />
          </View>
          <AppText variant="caption" color={lookup === 'error' ? colors.expense : colors.ink2}>
            {lookup === 'loading' ? t('invest.form.looking') : lookup === 'error' ? t('invest.form.lookupError') : t('invest.form.tickerHint')}
          </AppText>
        </View>
      ) : null}

      {isCrypto ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('invest.form.coinSearch')}
                value={coinQuery}
                onChangeText={setCoinQuery}
                placeholder="Bitcoin, ETH, Solana…"
                onSubmitEditing={() => void findCoins()}
                error={errors.coin}
              />
            </View>
            <Button compact variant="outline" icon="search" label={t('invest.form.lookup')} onPress={() => void findCoins()} />
          </View>
          {form.coingeckoId ? (
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.form.coinSelected', { id: form.coingeckoId })}
            </AppText>
          ) : null}
          {lookup === 'error' ? (
            <AppText variant="caption" color={colors.expense}>
              {t('invest.form.lookupError')}
            </AppText>
          ) : null}
          {coinResults ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {coinResults.length === 0 ? (
                <AppText variant="caption" color={colors.ink2}>
                  {t('invest.form.noResults')}
                </AppText>
              ) : (
                coinResults.map((c) => (
                  <Chip
                    key={c.id}
                    label={`${c.name} (${c.symbol})`}
                    active={form.coingeckoId === c.id}
                    onPress={() => setForm((f) => ({ ...f, coingeckoId: c.id, nome: f.nome || c.name }))}
                  />
                ))
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      <TextField
        label={t('common.name')}
        value={form.nome}
        onChangeText={(v) => set('nome', v)}
        placeholder={t(`invest.form.namePlaceholder.${info.grupo}`)}
        error={errors.nome}
        maxLength={50}
      />

      {isFixed ? (
        <>
          {info.indexers && info.indexers.length > 1 ? (
            <SelectField
              label={t('invest.form.indexer')}
              value={form.indexador}
              onChange={(v) => setForm((f) => ({ ...f, indexador: v, taxa: v === 'cdi' ? '100' : f.taxa }))}
              options={info.indexers.map((ix) => ({ value: ix, label: t(`invest.indexers.${ix}`) }))}
            />
          ) : null}
          {form.indexador !== 'poupanca' ? (
            <TextField
              label={rateLabel}
              value={form.taxa}
              onChangeText={(v) => set('taxa', v.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={form.indexador === 'cdi' ? '110' : '12,5'}
              hint={t(`invest.form.rateHint.${form.indexador}`)}
              error={errors.taxa}
            />
          ) : (
            <AppText variant="caption" color={colors.ink2}>
              {t('invest.form.poupancaHint')}
            </AppText>
          )}
          <SwitchRow
            icon="calendarClock"
            label={t('invest.form.hasMaturity')}
            value={form.temVencimento}
            onChange={(v) => set('temVencimento', v)}
          />
          {form.temVencimento ? (
            <DateField label={t('invest.form.maturity')} value={form.vencimento} onChange={(d) => set('vencimento', d)} error={errors.vencimento} />
          ) : null}
          <SwitchRow
            icon="lightning"
            label={t('invest.form.dailyLiquidity')}
            description={t('invest.form.dailyLiquidityHint')}
            value={form.liquidezDiaria}
            onChange={(v) => set('liquidezDiaria', v)}
          />
        </>
      ) : null}

      {!editing ? (
        <View style={{ gap: 14 }}>
          <AppText variant="h3">{isQuote ? t('invest.form.firstBuy') : t('invest.form.firstApplication')}</AppText>
          {isQuote ? (
            <>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('invest.form.quantity')}
                    value={form.quantidade}
                    onChangeText={(v) => set('quantidade', v.replace(/[^\d.,]/g, ''))}
                    keyboardType="decimal-pad"
                    error={errors.quantidade}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label={t('invest.form.unitPrice')}
                    value={form.preco}
                    onChangeText={(v) => set('preco', v.replace(/[^\d.,]/g, ''))}
                    keyboardType="decimal-pad"
                    error={errors.preco}
                  />
                </View>
              </View>
              <MoneyInput label={t('invest.form.costs')} hint={t('invest.form.costsHint')} value={form.custos} onChange={(v) => set('custos', v)} />
            </>
          ) : (
            <MoneyInput label={t('invest.form.applied')} value={form.valor} onChange={(v) => set('valor', v)} error={errors.valor} tone={colors.primary} />
          )}
          <DateField label={isQuote ? t('invest.form.buyDate') : t('invest.form.applicationDate')} value={form.data} onChange={(d) => set('data', d)} />
        </View>
      ) : null}

      <SelectField
        label={t('invest.form.institution')}
        value={form.instituicaoId}
        onChange={(v) => set('instituicaoId', v)}
        options={[
          { value: NONE, label: t('invest.form.noInstitution') },
          ...institutions.map((i) => ({ value: i.id, label: i.nome })),
          { value: NEW, label: t('invest.form.newInstitution'), icon: 'plus' },
        ]}
      />
      {form.instituicaoId === NEW ? (
        <TextField
          label={t('invest.form.institutionName')}
          value={form.novaInstituicao}
          onChangeText={(v) => set('novaInstituicao', v)}
          placeholder={t('invest.form.institutionPlaceholder')}
          maxLength={30}
        />
      ) : null}

      <SelectField
        label={t('invest.form.goal')}
        value={form.metaId}
        onChange={(v) => set('metaId', v)}
        options={[{ value: NONE, label: t('invest.form.noGoal') }, ...goals.map((g) => ({ value: g.id, label: g.nome, icon: g.icone }))]}
      />

      <TextField label={t('invest.form.notes')} value={form.notas} onChangeText={(v) => set('notas', v)} multiline maxLength={280} />

      <BottomSheet visible={typeOpen} title={t('invest.form.type')} onClose={() => setTypeOpen(false)}>
        <View style={{ paddingBottom: 8, gap: 4 }}>
          {TYPE_GROUPS.map((g) => (
            <View key={g.grupo} style={{ gap: 2 }}>
              <AppText variant="eyebrow" color={colors.ink2} style={{ marginTop: 10, marginBottom: 4 }}>
                {t(`invest.groups.${g.grupo}`)}
              </AppText>
              {g.tipos.map((tipo) => (
                <Pressable
                  key={tipo}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: form.tipo === tipo }}
                  onPress={() => changeType(tipo)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 52,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    backgroundColor: pressed ? colors.tint : 'transparent',
                  })}
                >
                  <Icon name={ASSET_TYPES[tipo].icon} size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{t(`invest.types.${tipo}`)}</AppText>
                    <AppText variant="caption" color={colors.ink2}>
                      {t(`invest.typeHints.${tipo}`)}
                    </AppText>
                  </View>
                  {form.tipo === tipo ? <Icon name="check" size={20} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </BottomSheet>
    </FormScreen>
  );
}
