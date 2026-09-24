import assert from 'node:assert/strict';
import test from 'node:test';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { explainEdgeFunctionError } from '../src/auth/adminApi';

/**
 * Admin Edge Function hata mesajı regresyonu.
 *
 * Önceki davranış tüm başarısızlıkları tek cümlede ("Edge Function bağlantısını
 * kontrol edin") eziyordu; origin allowlist'i (403), süresi dolmuş oturum (401),
 * bulunamayan hedef (404) ve şema/veritabanı hatası (500) ayırt edilemiyordu.
 * Bu testler her sınıfın ayrı ve eyleme dönüştürülebilir mesaja gittiğini
 * kanıtlar; ayrıca yanıt gövdesinin sanitize edilip sınırlandığını doğrular.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('403 origin reddi doğrudan ALLOWED_ORIGINS komutunu önerir', async () => {
  const response = jsonResponse(403, { error: 'Origin not allowed' });
  const error = new FunctionsHttpError(response);
  const message = await explainEdgeFunctionError({ error, response }, 'Kullanıcı hesabı silinemedi.');
  assert.match(message, /ALLOWED_ORIGINS/);
  assert.match(message, /supabase secrets set/);
});

test('403 yetki reddi (origin değil) Admin rolünü işaret eder', async () => {
  const response = jsonResponse(403, { error: 'Admin role required' });
  const error = new FunctionsHttpError(response);
  const message = await explainEdgeFunctionError({ error, response }, 'yedek');
  assert.match(message, /Admin/);
  assert.ok(!message.includes('ALLOWED_ORIGINS'), 'yetki hatasında CORS komutu önerilmemeli');
});

test('401 oturum mesajı verir, 404 hedefin bulunamadığını söyler', async () => {
  const expired = jsonResponse(401, { error: 'Authentication required' });
  const expiredMessage = await explainEdgeFunctionError({ error: new FunctionsHttpError(expired), response: expired }, 'yedek');
  assert.match(expiredMessage, /Oturumunuz/);
  assert.match(expiredMessage, /yeniden giriş/);

  const missing = jsonResponse(404, { error: 'Psychologist not found' });
  const missingMessage = await explainEdgeFunctionError({ error: new FunctionsHttpError(missing), response: missing }, 'yedek');
  assert.match(missingMessage, /bulunamadı/);
  assert.match(missingMessage, /404/);
});

test('500 şema/dağıtım kontrollerini işaret eder ve teşhis komutuna yönlendirir', async () => {
  const response = jsonResponse(500, { error: 'Function configuration is incomplete' });
  const message = await explainEdgeFunctionError({ error: new FunctionsHttpError(response), response }, 'yedek');
  assert.match(message, /supabase functions deploy admin-users/);
  assert.match(message, /supabase db push/);
  assert.match(message, /diagnose:supabase/);
});

test('relay hatası fonksiyonun yanıt vermediğini söyler', async () => {
  const response = jsonResponse(502, { error: 'relay' });
  const message = await explainEdgeFunctionError({ error: new FunctionsRelayError(response), response }, 'yedek');
  assert.match(message, /relay/i);
});

test('tarayıcı isteği tamamlanamazsa CORS/ağ ayrımı yapılır ve origin bildirilir', async () => {
  const message = await explainEdgeFunctionError({ error: new FunctionsFetchError(new TypeError('Failed to fetch')) }, 'yedek');
  assert.match(message, /ALLOWED_ORIGINS/);
  assert.match(message, /admin-users/);
});

test('sunucu mesajı kırpılır, satır sonları temizlenir ve durum kodu mesaja eklenir', async () => {
  const long = 'hata '.repeat(200);
  const response = jsonResponse(400, { error: `İlk satır\n${long}` });
  const message = await explainEdgeFunctionError({ error: new FunctionsHttpError(response), response }, 'yedek');
  assert.ok(!message.includes('\n'), 'kontrol karakterleri temizlenmeli');
  assert.ok(message.length < 400, 'sunucu mesajı sınırlandırılmalı');
  assert.match(message, /HTTP 400/);
});

test('gövde okunamazsa ya da JSON değilse yedek mesaj ve durum kodu korunur', async () => {
  const html = new Response('<html>gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } });
  const message = await explainEdgeFunctionError({ error: new FunctionsHttpError(html), response: html }, 'Hesap durumu değiştirilemedi.');
  assert.match(message, /Hesap durumu değiştirilemedi/);
  assert.match(message, /502/);

  const noResponse = await explainEdgeFunctionError({ error: new Error('network down') }, 'yedek mesaj');
  assert.match(noResponse, /network down|yedek mesaj/);
  assert.equal(await explainEdgeFunctionError({ error: undefined }, 'yedek mesaj'), 'yedek mesaj');
});
