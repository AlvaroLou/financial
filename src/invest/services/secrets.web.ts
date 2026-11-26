import AsyncStorage from '@react-native-async-storage/async-storage';

/** Web: não há armazenamento seguro — as chaves ficam no armazenamento local do navegador. */
export type ProviderKey = 'brapi' | 'coingecko';

const KEY_NAME: Record<ProviderKey, string> = {
  brapi: 'dinheiro-em-dia.brapi-token',
  coingecko: 'dinheiro-em-dia.coingecko-key',
};

export async function getProviderKey(provider: ProviderKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_NAME[provider]);
  } catch {
    return null;
  }
}

export async function setProviderKey(provider: ProviderKey, value: string | null): Promise<void> {
  const v = value?.trim();
  if (v) await AsyncStorage.setItem(KEY_NAME[provider], v);
  else await AsyncStorage.removeItem(KEY_NAME[provider]);
}

export async function clearProviderKeys(): Promise<void> {
  await Promise.all((Object.keys(KEY_NAME) as ProviderKey[]).map((p) => setProviderKey(p, null).catch(() => {})));
}
