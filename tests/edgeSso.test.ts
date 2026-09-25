import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const FUNCTIONS = ['sso-issue', 'sso-redeem', 'admin-users'] as const;

function source(name: string): string {
  return readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
}

for (const name of FUNCTIONS) {
  test(`${name}: handler exists`, () => {
    const code = source(name);
    assert.match(code, /Deno\.serve/);
    assert.ok(code.length > 200);
  });
}

test('sso-issue authenticates via getUser and ignores body userId', () => {
  const code = source('sso-issue');
  assert.match(code, /adminClient\.auth\.getUser/);
  assert.match(code, /userId: authData\.user\.id/);
  assert.doesNotMatch(code, /userId: body\.userId/);
  assert.match(code, /Deno\.serve\(async \(request\) => \{/);
});

test('sso-redeem verifies HMAC and never returns access tokens', () => {
  const code = source('sso-redeem');
  assert.match(code, /SSO_HMAC_SECRET/);
  assert.match(code, /consumeSignedNonce/);
  assert.match(code, /redeemSsoCode/);
  assert.doesNotMatch(code, /access_token/);
  assert.doesNotMatch(code, /refresh_token/);
  assert.doesNotMatch(code, /VITE_/);
});

test('frontend SSO helper does not put long-lived tokens in the URL', () => {
  const code = readFileSync('src/auth/sso.ts', 'utf8');
  assert.match(code, /buildSsoRedirectUrl/);
  assert.doesNotMatch(code, /SERVICE_ROLE/);
});

test('sso-consume never auto-provisions MMPI users', () => {
  const code = readFileSync('integration/mmpi/supabase/functions/sso-consume/index.ts', 'utf8');
  assert.doesNotMatch(code, /createUser/);
  assert.match(code, /MMPI account required/);
  assert.doesNotMatch(code, /access_token/);
});
