import type { Page, Request } from '@playwright/test';

type RestCall = { method: string; url: string; status: number; ok: boolean; body: string; containsOwnFileNumber: boolean };

/**
 * REST/konsol kanıtı: clients yanıtları ölçülür; diğer REST istekleri yalnızca
 * bekleyen uç noktalar ve origin teşhisi için izlenir (sorgu/klinik içerik loglanmaz).
 */
export function watchBackend(page: Page, ownFileNumber: string) {
  const calls: RestCall[] = [];
  const inFlight = new Map<Request, RestCall>();
  const pending = new Set<Request>();
  const origins = new Set<string>();
  const failed: string[] = [];
  const consoleErrors: string[] = [];
  // Query strings may contain clinical identifiers; log only method and endpoint.
  const label = (request: Request) => `${request.method()} ${new URL(request.url()).pathname}`;

  page.on('request', (request) => {
    const url = request.url();
    if (!url.includes('/rest/v1/')) return;
    pending.add(request);
    origins.add(new URL(url).origin);
    if (new URL(url).pathname !== '/rest/v1/clients') return;
    inFlight.set(request, { method: request.method(), url, status: 0, ok: false, body: '', containsOwnFileNumber: false });
  });
  // A `response` event only means headers arrived; the POST body may still be
  // unreadable. Record proof after requestfinished AND response.text() instead.
  page.on('requestfinished', (request) => {
    if (!request.url().includes('/rest/v1/')) return;
    pending.delete(request);
    const call = inFlight.get(request);
    if (!call) return;
    inFlight.delete(request);
    void (async () => {
      const response = await request.response();
      if (!response) throw new Error('yanıt alınamadı');
      call.status = response.status();
      call.ok = response.ok();
      try {
        const text = await response.text();
        call.containsOwnFileNumber = text.includes(ownFileNumber);
        call.body = text.replace(/\s+/g, ' ').slice(0, 300);
      } catch {
        call.body = '(gövde okunamadı)';
      }
      calls.push(call);
    })().catch((error: unknown) => {
      failed.push(`${label(request)} → ${error instanceof Error ? error.message : 'yanıt okunamadı'}`);
    });
  });
  page.on('requestfailed', (request) => {
    if (!request.url().includes('/rest/v1/')) return;
    pending.delete(request);
    inFlight.delete(request);
    failed.push(`${label(request)} → ${request.failure()?.errorText ?? 'bilinmeyen hata'}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text().slice(0, 300)}`);
  });

  const writes = () => calls.filter((call) => call.method !== 'GET');
  /** Yalnız yeni kayıt yazımı — temizlik DELETE'leri veya güncellemeler kanıt yerine geçmez. */
  const posts = () => calls.filter((call) => call.method === 'POST');
  return {
    calls,
    writes,
    posts,
    origins: () => [...origins],
    failed,
    consoleErrors,
    hydrations: () => calls.filter((call) => call.method === 'GET').length,
    summary: () =>
      `REST(clients): ${calls.map((call) => `${call.method}→${call.status}`).join(', ') || 'istek yok'}` +
      ` | hidrasyon okuması: ${calls.filter((call) => call.method === 'GET').length}` +
      ` | POST→${posts().map((call) => call.status).join(',') || 'yok'}` +
      ` | REST origin: ${[...origins].join(', ') || 'yok'}` +
      ` | bekleyen: ${pending.size} (${[...pending].slice(0, 16).map(label).join(', ') || '—'})` +
      ` | başarısız: ${failed.join(' | ') || '—'}`,
  };
}
