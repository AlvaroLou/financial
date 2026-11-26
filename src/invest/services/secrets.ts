import * as SecureStore from 'expo-secure-store';

/** Chaves das APIs de cotação (opcionais), guardadas no armazenamento seguro do aparelho. */
export type ProviderKey = 'brapi' | 'coingecko';

const KEY_NAME: Record<ProviderKey, string> = {
  brapi: 'dinheiro-em-dia.brapi-token',
  coingecko: 'dinheiro-em-dia.coingecko-key',
};

export async function getProviderKey(provider: ProviderKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_NAME[provider]);
  } catch {
    return null;
  }
}

export async function setProviderKey(provider: ProviderKey, value: string | null): Promise<void> {
  const v = value?.trim();
  if (v) await SecureStore.setItemAsync(KEY_NAME[provider], v);
  else await SecureStore.deleteItemAsync(KEY_NAME[provider]);
}

export async function clearProviderKeys(): Promise<void> {
  await Promise.all((Object.keys(KEY_NAME) as ProviderKey[]).map((p) => setProviderKey(p, null).catch(() => {})));
}
