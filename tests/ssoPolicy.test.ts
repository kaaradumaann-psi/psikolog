import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeSignedNonce,
  issueSsoCode,
  memorySsoStore,
  redeemSsoCode,
} from '../supabase/functions/_shared/ssoPolicy.ts';
import {
  HMAC_MAX_SKEW_MS,
  SSO_AUDIENCE_MMPI,
  buildSsoRedirectUrl,
  looksLikeJwtOrAccessToken,
  randomToken,
  signRequest,
} from '../supabase/functions/_shared/ssoProtocol.ts';

const USER_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const USER_B = '11111111-1111-4111-8111-111111111111';
const REDIRECT = 'https://mmpi.halilkaraduman.com.tr/sso';
const SECRET = 's'.repeat(48);

test('issue + redeem happy path binds the authenticated user', async () => {
  const store = memorySsoStore();
  const state = randomToken(24);
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: REDIRECT,
    state,
    allowedRedirects: [REDIRECT],
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  assert.equal(looksLikeJwtOrAccessToken(issued.code), false);
  const url = buildSsoRedirectUrl('https://mmpi.halilkaraduman.com.tr', issued.code, state);
  assert.equal(url.includes('access_token'), false);
  assert.equal(url.includes('refresh_token'), false);
  const redeemed = await redeemSsoCode(store, { code: issued.code, state, audience: SSO_AUDIENCE_MMPI });
  assert.equal(redeemed.ok, true);
  if (!redeemed.ok) return;
  assert.equal(redeemed.userId, USER_A);
});

test('expired code cannot be redeemed', async () => {
  const store = memorySsoStore();
  const state = randomToken(24);
  const now = 1_000_000;
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: REDIRECT,
    state,
    allowedRedirects: [REDIRECT],
    nowMs: now,
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const redeemed = await redeemSsoCode(store, {
    code: issued.code,
    state,
    audience: SSO_AUDIENCE_MMPI,
    nowMs: now + 61_000,
  });
  assert.equal(redeemed.ok, false);
  if (redeemed.ok) return;
  assert.equal(redeemed.status, 401);
});

test('replay: same code cannot be redeemed twice', async () => {
  const store = memorySsoStore();
  const state = randomToken(24);
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: REDIRECT,
    state,
    allowedRedirects: [REDIRECT],
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const first = await redeemSsoCode(store, { code: issued.code, state, audience: SSO_AUDIENCE_MMPI });
  assert.equal(first.ok, true);
  const second = await redeemSsoCode(store, { code: issued.code, state, audience: SSO_AUDIENCE_MMPI });
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.status, 409);
});

test('wrong user cannot be injected via redeem body — user comes from stored code', async () => {
  const store = memorySsoStore();
  const state = randomToken(24);
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: REDIRECT,
    state,
    allowedRedirects: [REDIRECT],
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const redeemed = await redeemSsoCode(store, { code: issued.code, state, audience: SSO_AUDIENCE_MMPI });
  assert.equal(redeemed.ok, true);
  if (!redeemed.ok) return;
  assert.notEqual(redeemed.userId, USER_B);
  assert.equal(redeemed.userId, USER_A);
});

test('wrong target audience is rejected', async () => {
  const store = memorySsoStore();
  const state = randomToken(24);
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: REDIRECT,
    state,
    allowedRedirects: [REDIRECT],
  });
  assert.equal(issued.ok, true);
  if (!issued.ok) return;
  const redeemed = await redeemSsoCode(store, { code: issued.code, state, audience: 'other-app' });
  assert.equal(redeemed.ok, false);
  if (redeemed.ok) return;
  assert.equal(redeemed.status, 403);
});

test('tampered HMAC body fails signature verification', async () => {
  const store = memorySsoStore();
  const nonce = randomToken(16);
  const body = { code: 'abc', state: 'def' };
  const signed = await signRequest({ secret: SECRET, timestampMs: Date.now(), nonce, body });
  const tampered = await consumeSignedNonce(store, {
    secret: SECRET,
    timestamp: signed.timestamp,
    nonce,
    signature: signed.signature,
    body: { code: 'TAMPER', state: 'def' },
  });
  assert.equal(tampered.ok, false);
  if (tampered.ok) return;
  assert.equal(tampered.status, 401);
});

test('HMAC replay nonce is rejected', async () => {
  const store = memorySsoStore();
  const nonce = randomToken(16);
  const body = { code: 'abc', state: 'def' };
  const signed = await signRequest({ secret: SECRET, timestampMs: Date.now(), nonce, body });
  const first = await consumeSignedNonce(store, {
    secret: SECRET,
    timestamp: signed.timestamp,
    nonce,
    signature: signed.signature,
    body,
  });
  assert.equal(first.ok, true);
  const second = await consumeSignedNonce(store, {
    secret: SECRET,
    timestamp: signed.timestamp,
    nonce,
    signature: signed.signature,
    body,
  });
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.status, 409);
});

test('HMAC expired timestamp is rejected', async () => {
  const store = memorySsoStore();
  const nonce = randomToken(16);
  const body = { code: 'abc', state: 'def' };
  const now = Date.now();
  const signed = await signRequest({ secret: SECRET, timestampMs: now - HMAC_MAX_SKEW_MS - 1000, nonce, body });
  const result = await consumeSignedNonce(store, {
    secret: SECRET,
    timestamp: signed.timestamp,
    nonce,
    signature: signed.signature,
    body,
    nowMs: now,
  });
  assert.equal(result.ok, false);
});

test('disallowed redirect is rejected at issue', async () => {
  const store = memorySsoStore();
  const issued = await issueSsoCode(store, {
    userId: USER_A,
    audience: SSO_AUDIENCE_MMPI,
    redirectUri: 'https://evil.example/sso',
    state: randomToken(24),
    allowedRedirects: [REDIRECT],
  });
  assert.equal(issued.ok, false);
});

test('buildSsoRedirectUrl rejects access tokens', () => {
  assert.throws(() =>
    buildSsoRedirectUrl('https://mmpi.halilkaraduman.com.tr', 'header.payload.signature-access_token', 'state'),
  );
});
