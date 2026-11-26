/** fetch com tempo limite e erro tipado (offline, HTTP, resposta inválida). */
export class HttpError extends Error {
  constructor(
    public kind: 'offline' | 'timeout' | 'http' | 'invalid' | 'auth' | 'notFound' | 'rateLimit',
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function getJson<T>(url: string, init: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 12_000);
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', ...init.headers }, signal: controller.signal });
  } catch (e) {
    throw new HttpError((e as Error)?.name === 'AbortError' ? 'timeout' : 'offline', String(e));
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    if (res.ok) throw new HttpError('invalid', 'resposta não é JSON', res.status);
  }
  if (!res.ok) {
    const kind = res.status === 401 || res.status === 403 ? 'auth' : res.status === 404 ? 'notFound' : res.status === 429 ? 'rateLimit' : 'http';
    const message = (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new HttpError(kind, message, res.status);
  }
  return body as T;
}

/** Executa tarefas com no máximo `limit` em paralelo. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
