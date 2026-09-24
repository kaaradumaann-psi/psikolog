import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transform } from 'esbuild';

/**
 * Supabase Edge Functions sözleşmesi.
 *
 * Bu dosyalar Deno çalışma zamanında koşar, `tsconfig.json` kapsamı dışındadır ve
 * CI'da derlenmez: bir sözdizimi hatası ancak `supabase functions deploy`
 * aşamasında (ya da canlıda) fark edilir. Testler, esbuild ile sözdizimini
 * doğrular ve canlıda hata teşhisini bozan davranışları kilitler:
 *   - durum kodlu hataların `Error` alt sınıfıyla taşınması (düz nesne fırlatmak
 *     `error instanceof Error` kontrolünü bozar ve 503/401 mesajları kaybolur),
 *   - doğrulama hataları dışında ham `error.message`'ın istemciye dönmemesi,
 *   - veritabanı kaynaklı hataların 500 + `supabase db push` olarak sınıflanması,
 *   - işleyicinin en dışta `try/catch` ile sarılı olması (yakalanmayan istisna
 *     CORS başlıksız yanıt üretir ve tarayıcıda "bağlantı hatası" gibi görünür).
 */

const FUNCTIONS = ['admin-users', 'ai-interpretation'] as const;

function source(name: string): string {
  return readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
}

for (const name of FUNCTIONS) {
  test(`${name}: TypeScript kaynağı derlenebilir (sözdizimi)`, async () => {
    const code = source(name);
    await assert.doesNotReject(() => transform(code, { loader: 'ts', target: 'es2022' }));
  });

  test(`${name}: işleyici en dışta try/catch ile sarılıdır ve JSON 500 döner`, async () => {
    const code = source(name);
    assert.match(code, /Deno\.serve\(async request => \{\s*try \{/,
      'yakalanmayan istisna CORS başlıksız yanıt üretir; Deno.serve gövdesi try ile başlamalı');
    assert.match(code, /\} catch \(error\) \{\s*console\.error\(/,
      'beklenmeyen istisna sunucu tarafında loglanmalı');
    assert.match(code, /return response\(request, 500, \{ error: /,
      'beklenmeyen istisna istemciye JSON 500 olarak dönmeli');
  });

  test(`${name}: kişisel veri/anahtar konsola yazılmaz (console.log yok)`, () => {
    const code = source(name);
    assert.ok(!/console\.log\(/.test(code), 'gövde içeriği loglanmamalı; yalnız console.error kullanılır');
  });

  test(`${name}: ham hata mesajı istemciye taşınmaz`, () => {
    const code = source(name);
    assert.ok(!/error instanceof Error \? error\.message/.test(code),
      'ham istisna mesajı (şema/tablo adı) istemciye dönmemeli');
  });
}

test('ai-interpretation: durum kodlu hatalar FunctionError ile taşınır', () => {
  const code = source('ai-interpretation');
  assert.match(code, /class FunctionError extends Error \{\s*readonly code: number;/);
  assert.match(code, /if \(!apiKey\) \{[\s\S]{0,240}?throw new FunctionError\([\s\S]{0,300}?, 503\);/,
    'AI_API_KEY eksikse 503 dönmeli');
  assert.match(code, /error instanceof FunctionError\) return response\(request, error\.code/);
  assert.match(code, /henüz yapılandırılmamış/, 'arayüz "yapılandırılmamış" mesajını görebilmeli');
  // Düz nesne fırlatma geri gelirse yukarıdaki 503 yolu sessizce 502'ye düşer.
  assert.ok(!/const error: \{ message: string; code: number \}/.test(code), 'düz nesne fırlatma kullanılmamalı');
});

test('ai-interpretation: Gemini yerel uç noktası (generateContent) desteklenir', () => {
  const code = source('ai-interpretation');
  // Google 2026'da AIza.* yerine AQ.* ("Auth key") vermeye başladı; bu anahtarlar
  // OpenAI uyumlu /chat/completions yolunda 401/403 ile reddedilir ve YALNIZCA
  // Gemini'nin yerel generateContent ucunda x-goog-api-key ile çalışır.
  assert.match(code, /:generateContent/, 'Gemini yerel ucuna istek atılmalı');
  assert.match(code, /'x-goog-api-key': apiKey/,
    'anahtar x-goog-api-key başlığıyla taşınmalı (query string loglara sızmaz, Bearer AQ.* reddedilir)');
  assert.match(code, /systemInstruction/, 'sistem promptu Gemini istemine de gömülü olmalı');
  assert.match(code, /generationConfig/, 'üretim ayarları Gemini isteminde yer almalı');

  // Sağlayıcı seçimi: açık AI_PROVIDER > uç nokta hostu > model adı > anahtar ipucu.
  assert.match(code, /function resolveAiProvider\(\): AiProvider/);
  assert.match(code, /Deno\.env\.get\('AI_PROVIDER'\)/);
  assert.match(code, /model\.startsWith\('gemini'\)/, 'AI_MODEL=gemini-* sağlayıcıyı otomatik seçmeli');
  assert.match(code, /key\.startsWith\('AIza'\) \|\| key\.startsWith\('AQ\.'\)/,
    'AI_MODEL unutulduğunda AIza.*/AQ.* anahtar ipucu Geminiye yönlendirmeli');

  // callGemini gövdesinde OpenAI usulü Authorization başlığı bulunmamalı.
  const start = code.indexOf('async function callGemini');
  const end = code.indexOf('async function callOpenAiCompatible');
  assert.ok(start >= 0 && end > start, 'callGemini/callOpenAiCompatible fonksiyonları bulunamadı');
  assert.ok(!/Authorization\s*:/.test(code.slice(start, end)),
    'Gemini yolunda anahtar Authorization başlığıyla gönderilmemeli');
});

test('ai-interpretation: sağlayıcı hataları ayırt edilebilir mesajlara çevrilir', () => {
  const code = source('ai-interpretation');
  assert.match(code, /function upstreamFailure\(/);
  assert.match(code, /401 \|\| status === 403[\s\S]{0,240}AI_API_KEY secret/);
  assert.match(code, /status === 404\)[\s\S]{0,200}AI_MODEL secret/,
    '404 (model yok) için AI_MODEL ipucu vermeli');
  assert.match(code, /status === 429\)[\s\S]{0,200}kota/, '429 için kota mesajı vermeli');
  assert.match(code, /güvenlik filtreleri/, 'Gemini safety bloklaması ayrı mesaj vermeli');
  // Teşhis için sağlayıcı durum kodu + kısa özet sunucu günlüğüne yazılır (anahtar/gövde asla).
  assert.match(code, /console\.error\('ai-interpretation: sağlayıcı hatası'/);
  assert.match(code, /function logUpstreamFailure\(/);
});

test('admin-users: doğrulama hataları 400, veritabanı kaynaklı hatalar 500 olarak sınıflanır', () => {
  const code = source('admin-users');
  assert.match(code, /class ValidationError extends Error/);
  assert.match(code, /if \(error instanceof ValidationError\) return response\(request, 400/);
  assert.match(code, /function isDatabaseSideError\(/);
  assert.match(code, /database error/i, 'GoTrue veritabanı hatası imzası sınıflandırılmalı');
  assert.match(code, /unexpected_failure/i);
  assert.match(code, /supabase db push/, '500 yanıtı operatöre doğru komutu söylemeli');
  // Profil/rol yükseltmesi: rol istemciden alınmaz, JWT + profiles tablosundan okunur.
  assert.match(code, /adminClient\.auth\.getUser\(token\)/);
  assert.match(code, /callerRow\.role !== 'ADMIN'/);
});

test('her iki fonksiyon da origin allowlist’ini ve Bearer token doğrulamasını korur', () => {
  for (const name of FUNCTIONS) {
    const code = source(name);
    assert.match(code, /if \(origin && !isAllowedOrigin\(origin\)\) return response\(request, 403/);
    assert.match(code, /authorization\?\.startsWith\('Bearer '\)/);
    assert.match(code, /Access-Control-Allow-Origin'\] = origin/);
    assert.match(code, /'Vary': 'Origin'/);
  }
});
