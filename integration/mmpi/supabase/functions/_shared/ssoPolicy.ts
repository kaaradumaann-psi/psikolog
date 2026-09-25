import {
  HMAC_MAX_SKEW_MS,
  SSO_AUDIENCE_MMPI,
  SSO_TTL_MS,
  isAllowedRedirect,
  randomToken,
  sha256Hex,
  verifySignedRequest,
} from './ssoProtocol.ts';

export type SsoCodeRow = {
  codeHash: string;
  userId: string;
  audience: string;
  redirectUri: string;
  stateHash: string;
  expiresAt: number;
  usedAt: number | null;
};

export type SsoStore = {
  putCode: (row: SsoCodeRow) => Promise<void>;
  getCodeByHash: (codeHash: string) => Promise<SsoCodeRow | null>;
  markUsed: (codeHash: string, usedAt: number) => Promise<boolean>;
  putNonce: (nonceHash: string, expiresAt: number) => Promise<boolean>;
};

export type PolicyFailure = { ok: false; error: string; status: number };

export async function issueSsoCode(
  store: SsoStore,
  input: {
    userId: string;
    audience: string;
    redirectUri: string;
    state: string;
    allowedRedirects: readonly string[];
    nowMs?: number;
  },
): Promise<{ ok: true; code: string; expiresAt: number } | PolicyFailure> {
  if (!input.userId) return { ok: false, error: 'Authentication required', status: 401 };
  if (input.audience !== SSO_AUDIENCE_MMPI) return { ok: false, error: 'Invalid audience', status: 400 };
  if (!input.state || input.state.length < 16 || input.state.length > 128) {
    return { ok: false, error: 'Invalid state', status: 400 };
  }
  if (!isAllowedRedirect(input.redirectUri, input.allowedRedirects)) {
    return { ok: false, error: 'Redirect not allowed', status: 400 };
  }
  const now = input.nowMs ?? Date.now();
  const code = randomToken(32);
  const codeHash = await sha256Hex(code);
  const stateHash = await sha256Hex(input.state);
  const expiresAt = now + SSO_TTL_MS;
  await store.putCode({
    codeHash,
    userId: input.userId,
    audience: input.audience,
    redirectUri: input.redirectUri,
    stateHash,
    expiresAt,
    usedAt: null,
  });
  return { ok: true, code, expiresAt };
}

export async function redeemSsoCode(
  store: SsoStore,
  input: {
    code: string;
    state: string;
    audience: string;
    nowMs?: number;
  },
): Promise<{ ok: true; userId: string; redirectUri: string } | PolicyFailure> {
  if (!input.code || input.code.length < 16 || input.code.length > 128) {
    return { ok: false, error: 'Invalid code', status: 400 };
  }
  if (!input.state || input.state.length < 16 || input.state.length > 128) {
    return { ok: false, error: 'Invalid state', status: 400 };
  }
  if (input.audience !== SSO_AUDIENCE_MMPI) return { ok: false, error: 'Invalid audience', status: 403 };
  const now = input.nowMs ?? Date.now();
  const codeHash = await sha256Hex(input.code);
  const row = await store.getCodeByHash(codeHash);
  if (!row) return { ok: false, error: 'Invalid code', status: 400 };
  if (row.usedAt != null) return { ok: false, error: 'Code already used', status: 409 };
  if (row.expiresAt <= now) return { ok: false, error: 'Code expired', status: 401 };
  if (row.audience !== input.audience) return { ok: false, error: 'Wrong target', status: 403 };
  const stateHash = await sha256Hex(input.state);
  if (stateHash !== row.stateHash) return { ok: false, error: 'Invalid state', status: 403 };
  const marked = await store.markUsed(codeHash, now);
  if (!marked) return { ok: false, error: 'Code already used', status: 409 };
  return { ok: true, userId: row.userId, redirectUri: row.redirectUri };
}

export async function consumeSignedNonce(
  store: SsoStore,
  input: {
    secret: string;
    timestamp: string;
    nonce: string;
    signature: string;
    body: unknown;
    nowMs?: number;
  },
): Promise<{ ok: true } | PolicyFailure> {
  const verified = await verifySignedRequest(input);
  if (!verified.ok) return verified;
  const nonceHash = await sha256Hex(input.nonce);
  const now = input.nowMs ?? Date.now();
  const stored = await store.putNonce(nonceHash, now + HMAC_MAX_SKEW_MS);
  if (!stored) return { ok: false, error: 'Replay denied', status: 409 };
  return { ok: true };
}

export function memorySsoStore(): SsoStore & { codes: Map<string, SsoCodeRow>; nonces: Set<string> } {
  const codes = new Map<string, SsoCodeRow>();
  const nonces = new Set<string>();
  return {
    codes,
    nonces,
    async putCode(row) {
      codes.set(row.codeHash, { ...row });
    },
    async getCodeByHash(codeHash) {
      const row = codes.get(codeHash);
      return row ? { ...row } : null;
    },
    async markUsed(codeHash, usedAt) {
      const row = codes.get(codeHash);
      if (!row || row.usedAt != null) return false;
      codes.set(codeHash, { ...row, usedAt });
      return true;
    },
    async putNonce(nonceHash) {
      if (nonces.has(nonceHash)) return false;
      nonces.add(nonceHash);
      return true;
    },
  };
}
