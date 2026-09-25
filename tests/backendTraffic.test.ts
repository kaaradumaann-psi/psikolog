import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import type { Page, Request, Response } from '@playwright/test';
import { watchBackend } from '../e2e/support/backendTraffic';

function mockRequest(method: string, url: string, response?: Response): Request {
  return {
    method: () => method,
    url: () => url,
    response: async () => response ?? null,
    failure: () => ({ errorText: 'net::ERR_FAILED' }),
  } as unknown as Request;
}

function mockResponse(status: number, text: () => Promise<string>): Response {
  return {
    status: () => status,
    ok: () => status >= 200 && status < 300,
    text,
  } as unknown as Response;
}

test('ağ kanıtı sadece bu testin başarılı POST gövdesi tamamlandıktan sonra oluşur; bekleyen GET/DELETE engel değildir', async () => {
  const events = new EventEmitter();
  const backend = watchBackend(events as unknown as Page, 'E2E-OWN');
  const origin = 'https://example.supabase.co';

  // A preview run may have unrelated GETs still pending: none proves a write.
  for (let index = 0; index < 14; index += 1) {
    events.emit('request', mockRequest('GET', `${origin}/rest/v1/table_${index}?select=secret`));
  }
  const deletion = mockRequest('DELETE', `${origin}/rest/v1/clients?id=eq.old`, mockResponse(204, async () => ''));
  events.emit('request', deletion);
  events.emit('requestfinished', deletion);
  await setImmediate();
  assert.equal(backend.posts().length, 0, 'önceki DELETE başarı kanıtı değildir');

  let finishBody!: (body: string) => void;
  const body = new Promise<string>((resolve) => { finishBody = resolve; });
  const post = mockRequest('POST', `${origin}/rest/v1/clients?select=*`, mockResponse(201, () => body));
  events.emit('request', post);
  events.emit('requestfinished', post);
  await setImmediate();
  assert.equal(backend.posts().length, 0, 'yanıt başlığı gelmiş olsa da gövde bitmeden kanıt sayılmaz');

  // file_number may occur beyond the 300-char diagnostic excerpt.
  finishBody(JSON.stringify({ padding: 'x'.repeat(400), file_number: 'E2E-OWN' }));
  await setImmediate();
  const [proof] = backend.posts();
  assert.equal(proof?.status, 201);
  assert.equal(proof?.containsOwnFileNumber, true);
  assert.equal(proof?.body.includes('E2E-OWN'), false);
  assert.deepEqual(backend.origins(), [origin]);
  assert.match(backend.summary(), /bekleyen: 14/);
  assert.ok(!backend.summary().includes('select=secret'), 'teşhiste sorgu parametresi/klinik veri olmamalı');
});

test('başarısız veya başka dosyaya ait POST kanıt sayılmaz; istek hatası sorgu parametresini sızdırmaz', async () => {
  const events = new EventEmitter();
  const backend = watchBackend(events as unknown as Page, 'E2E-OWN');
  const origin = 'https://example.supabase.co';

  const other = mockRequest('POST', `${origin}/rest/v1/clients`, mockResponse(201, async () => '{"file_number":"E2E-OTHER"}'));
  const denied = mockRequest('POST', `${origin}/rest/v1/clients`, mockResponse(403, async () => '{"file_number":"E2E-OWN"}'));
  events.emit('request', other);
  events.emit('requestfinished', other);
  events.emit('request', denied);
  events.emit('requestfinished', denied);
  await setImmediate();
  assert.equal(backend.posts().filter((call) => call.ok && call.containsOwnFileNumber).length, 0);

  const failed = mockRequest('GET', `${origin}/rest/v1/notes?content=private`);
  events.emit('request', failed);
  events.emit('requestfailed', failed);
  assert.match(backend.summary(), /GET \/rest\/v1\/notes → net::ERR_FAILED/);
  assert.ok(!backend.summary().includes('content=private'));
});
