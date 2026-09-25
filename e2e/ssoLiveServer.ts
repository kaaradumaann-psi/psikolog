import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { consumeSignedNonce, issueSsoCode, memorySsoStore, redeemSsoCode } from '../supabase/functions/_shared/ssoPolicy.ts';
import { canonicalJson, mmpiSsoRedirect, randomToken, signRequest } from '../supabase/functions/_shared/ssoProtocol.ts';

export const HMAC_SECRET = 'e2e-sso-hmac-secret-must-be-32-chars!';
export const PSY_ANON = 'psikolog-e2e-anon-key';
export const MMPI_ANON = 'mmpi-e2e-anon-key';
export const PASSWORD = 'correct-horse-battery';

export const PSY_USER = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'psy@example.com',
  first_name: 'Pinar',
  last_name: 'Yilmaz',
  role: 'PSYCHOLOG' as const,
  active: true,
  organization_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  global_user_id: null as string | null,
};

export const PSY_UNMATCHED = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  email: 'nommpi@example.com',
  first_name: 'Nazan',
  last_name: 'Demir',
  role: 'PSYCHOLOG' as const,
  active: true,
  organization_id: PSY_USER.organization_id,
  global_user_id: null as string | null,
};

export const MMPI_USER = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: PSY_USER.email,
  first_name: PSY_USER.first_name,
  last_name: PSY_USER.last_name,
  role: 'PSYCHOLOG' as const,
  active: true,
  global_user_id: null as string | null,
};

type Session = { access: string; refresh: string; userId: string; email: string };

function b64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function mintJwt(userId: string, email: string): string {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.e2e`;
}

function authUser(userId: string, email: string) {
  return {
    id: userId,
    email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function sessionBody(session: Session) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: session.access,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: session.refresh,
    user: authUser(session.userId, session.email),
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function cors(req: IncomingMessage, extra: Record<string, string> = {}) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers':
      'authorization, apikey, content-type, x-client-info, prefer, x-supabase-api-version, accept, accept-profile, content-profile, x-sso-timestamp, x-sso-nonce, x-sso-signature',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-expose-headers': 'content-type',
    vary: 'Origin',
    ...extra,
  };
}

function send(req: IncomingMessage, res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...cors(req) });
  res.end(JSON.stringify(body));
}

function bearer(req: IncomingMessage): string {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

export type LiveSso = {
  psychologyOrigin: string;
  mmpiOrigin: string;
  psychologySupabase: string;
  mmpiSupabase: string;
  expireCodes: () => void;
  stop: () => Promise<void>;
};

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });
}

async function waitHttp(url: string, timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      /* not up */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startVite(cwd: string, port: number, env: Record<string, string>): ChildProcess {
  const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', () => undefined);
  child.stderr?.on('data', () => undefined);
  return child;
}

export async function startLiveSso(ports?: {
  psyVite?: number;
  mmpiVite?: number;
  psyApi?: number;
  mmpiApi?: number;
}): Promise<LiveSso> {
  const psyVite = ports?.psyVite ?? 4177;
  const mmpiVite = ports?.mmpiVite ?? 4178;
  const psyApi = ports?.psyApi ?? 8787;
  const mmpiApi = ports?.mmpiApi ?? 8788;
  const psychologyOrigin = `http://127.0.0.1:${psyVite}`;
  const mmpiOrigin = `http://127.0.0.1:${mmpiVite}`;
  const store = memorySsoStore();
  const sessions = new Map<string, Session>();
  const psyProfiles = [PSY_USER, PSY_UNMATCHED];
  const mmpiProfiles = [MMPI_USER];
  const otpHashes = new Map<string, { email: string; userId: string }>();

  function putSession(userId: string, email: string): Session {
    const session: Session = { access: mintJwt(userId, email), refresh: randomToken(24), userId, email };
    sessions.set(session.access, session);
    return session;
  }

  function profileByToken(list: Array<{ id: string; email: string }>, token: string) {
    const session = sessions.get(token);
    if (!session) return null;
    return list.find((row) => row.id === session.userId) ?? null;
  }

  const psyServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${psyApi}`);
      if (req.method === 'OPTIONS') {
        res.writeHead(200, cors(req));
        res.end('ok');
        return;
      }
      if (req.method === 'POST' && url.pathname === '/_test/expire-codes') {
        const now = Date.now() - 120_000;
        for (const row of store.codes.values()) row.expiresAt = now;
        send(req, res, 200, { ok: true });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/auth/v1/token') {
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}') as { email?: string; password?: string; refresh_token?: string };
        if (url.searchParams.get('grant_type') === 'refresh_token' || body.refresh_token) {
          const existing = [...sessions.values()].find((row) => row.refresh === body.refresh_token);
          if (!existing) {
            send(req, res, 401, { error: 'invalid_grant' });
            return;
          }
          send(req, res, 200, sessionBody(existing));
          return;
        }
        const email = String(body.email ?? '').trim().toLowerCase();
        const profile = psyProfiles.find((row) => row.email === email);
        if (!profile || body.password !== PASSWORD) {
          send(req, res, 400, { error: 'invalid_grant', error_description: 'Invalid login' });
          return;
        }
        send(req, res, 200, sessionBody(putSession(profile.id, profile.email)));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
        const profile = profileByToken(psyProfiles, bearer(req));
        if (!profile) {
          send(req, res, 401, { error: 'invalid_token' });
          return;
        }
        send(req, res, 200, authUser(profile.id, profile.email));
        return;
      }
      if (url.pathname === '/rest/v1/profiles') {
        const token = bearer(req);
        const self = profileByToken(psyProfiles, token);
        const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
        const found = idEq ? psyProfiles.find((row) => row.id === idEq) : self ? [self] : [];
        const row = Array.isArray(found) ? found[0] : found;
        if (!row || (self && row.id !== self.id && self.id !== PSY_USER.id)) {
          send(req, res, 406, { message: 'JSON object requested, multiple (or no) rows returned' });
          return;
        }
        send(req, res, 200, row);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/functions/v1/sso-issue') {
        const profile = profileByToken(psyProfiles, bearer(req));
        if (!profile || !('active' in profile) || profile.active !== true) {
          send(req, res, 401, { error: 'Authentication required' });
          return;
        }
        const body = JSON.parse((await readBody(req)) || '{}') as { state?: string; redirectUri?: string; userId?: string };
        if (typeof body.state !== 'string' || typeof body.redirectUri !== 'string') {
          send(req, res, 400, { error: 'Invalid request' });
          return;
        }
        const issued = await issueSsoCode(store, {
          userId: profile.id,
          audience: 'mmpi',
          redirectUri: body.redirectUri,
          state: body.state,
          allowedRedirects: [mmpiSsoRedirect(mmpiOrigin)],
        });
        if (!issued.ok) {
          send(req, res, issued.status, { error: issued.error });
          return;
        }
        send(req, res, 200, { code: issued.code, expiresAt: new Date(issued.expiresAt).toISOString() });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/functions/v1/sso-redeem') {
        const raw = await readBody(req);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          send(req, res, 400, { error: 'Invalid request' });
          return;
        }
        const signed = await consumeSignedNonce(store, {
          secret: HMAC_SECRET,
          timestamp: String(req.headers['x-sso-timestamp'] ?? ''),
          nonce: String(req.headers['x-sso-nonce'] ?? ''),
          signature: String(req.headers['x-sso-signature'] ?? ''),
          body,
        });
        if (!signed.ok) {
          send(req, res, signed.status, { error: signed.error });
          return;
        }
        const payload = body as { code?: string; state?: string; audience?: string };
        if (typeof payload.code !== 'string' || typeof payload.state !== 'string') {
          send(req, res, 400, { error: 'Invalid request' });
          return;
        }
        const redeemed = await redeemSsoCode(store, {
          code: payload.code,
          state: payload.state,
          audience: typeof payload.audience === 'string' ? payload.audience : 'mmpi',
        });
        if (!redeemed.ok) {
          send(req, res, redeemed.status, { error: redeemed.error });
          return;
        }
        const profile = psyProfiles.find((row) => row.id === redeemed.userId);
        if (!profile || profile.active !== true) {
          send(req, res, 403, { error: 'Account is not active' });
          return;
        }
        if (!profile.global_user_id) profile.global_user_id = crypto.randomUUID();
        send(req, res, 200, {
          psychologyUserId: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
          globalUserId: profile.global_user_id,
          nonce: randomToken(16),
        });
        return;
      }
      send(req, res, 404, { error: 'not found' });
    } catch (error) {
      console.error('psy handler', req.url, error);
      send(req, res, 500, { error: error instanceof Error ? error.message : 'fail' });
    }
  });

  const mmpiServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${mmpiApi}`);
      if (req.method === 'OPTIONS') {
        res.writeHead(200, cors(req));
        res.end('ok');
        return;
      }
      if (req.method === 'POST' && url.pathname === '/auth/v1/token') {
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}') as { email?: string; password?: string; refresh_token?: string };
        if (url.searchParams.get('grant_type') === 'refresh_token' || body.refresh_token) {
          const existing = [...sessions.values()].find((row) => row.refresh === body.refresh_token);
          if (!existing) {
            send(req, res, 401, { error: 'invalid_grant' });
            return;
          }
          send(req, res, 200, sessionBody(existing));
          return;
        }
        const email = String(body.email ?? '').trim().toLowerCase();
        const profile = mmpiProfiles.find((row) => row.email === email);
        if (!profile || body.password !== PASSWORD) {
          send(req, res, 400, { error: 'invalid_grant' });
          return;
        }
        send(req, res, 200, sessionBody(putSession(profile.id, profile.email)));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/auth/v1/verify') {
        const body = JSON.parse((await readBody(req)) || '{}') as { email?: string; token_hash?: string; type?: string };
        const row = otpHashes.get(String(body.token_hash ?? ''));
        if (!row || row.email !== String(body.email ?? '').toLowerCase()) {
          send(req, res, 401, { error: 'otp_expired' });
          return;
        }
        otpHashes.delete(String(body.token_hash));
        send(req, res, 200, sessionBody(putSession(row.userId, row.email)));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
        const profile = profileByToken(mmpiProfiles, bearer(req));
        if (!profile) {
          send(req, res, 401, { error: 'invalid_token' });
          return;
        }
        send(req, res, 200, authUser(profile.id, profile.email));
        return;
      }
      if (url.pathname === '/rest/v1/profiles') {
        const idEq = url.searchParams.get('id')?.replace(/^eq\./, '');
        const emailEq = url.searchParams.get('email')?.replace(/^(eq|ilike)\./, '').replaceAll('%', '');
        const row = idEq
          ? mmpiProfiles.find((item) => item.id === idEq)
          : emailEq
            ? mmpiProfiles.find((item) => item.email.toLowerCase() === emailEq.toLowerCase())
            : null;
        if (!row) {
          send(req, res, 406, { message: 'JSON object requested, multiple (or no) rows returned' });
          return;
        }
        send(req, res, 200, row);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/rest/v1/identity_links') {
        send(req, res, 201, { ok: true });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/functions/v1/sso-consume') {
        const raw = await readBody(req);
        let parsed: { code?: unknown; state?: unknown };
        try {
          parsed = JSON.parse(raw) as { code?: unknown; state?: unknown };
        } catch {
          send(req, res, 400, { error: 'Invalid request' });
          return;
        }
        if (typeof parsed.code !== 'string' || typeof parsed.state !== 'string') {
          send(req, res, 400, { error: 'Invalid request' });
          return;
        }
        const payload = { code: parsed.code, state: parsed.state, audience: 'mmpi' };
        const signed = await signRequest({
          secret: HMAC_SECRET,
          timestampMs: Date.now(),
          nonce: randomToken(16),
          body: payload,
        });
        const redeemResponse = await fetch(`http://127.0.0.1:${psyApi}/functions/v1/sso-redeem`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sso-timestamp': signed.timestamp,
            'x-sso-nonce': signed.nonce,
            'x-sso-signature': signed.signature,
          },
          body: canonicalJson(payload),
        });
        const redeemJson = (await redeemResponse.json().catch(() => ({}))) as {
          error?: string;
          email?: string;
          psychologyUserId?: string;
        };
        if (!redeemResponse.ok) {
          send(req, res, redeemResponse.status === 409 ? 409 : 401, { error: 'SSO verification failed' });
          return;
        }
        const email = typeof redeemJson.email === 'string' ? redeemJson.email.trim().toLowerCase() : '';
        const profile = mmpiProfiles.find((row) => row.email === email && row.active);
        if (!email || !profile || (profile.role !== 'PSYCHOLOG' && profile.role !== 'ADMIN')) {
          send(req, res, 403, { error: 'MMPI account required' });
          return;
        }
        const tokenHash = randomToken(32);
        otpHashes.set(tokenHash, { email: profile.email, userId: profile.id });
        send(req, res, 200, { email: profile.email, tokenHash });
        return;
      }
      send(req, res, 404, { error: 'not found' });
    } catch (error) {
      console.error('mmpi handler', req.url, error);
      send(req, res, 500, { error: error instanceof Error ? error.message : 'fail' });
    }
  });

  await listen(psyServer, psyApi);
  await listen(mmpiServer, mmpiApi);

  const psyViteProc = startVite('/home/user/psikolog', psyVite, {
    VITE_SUPABASE_URL: `http://127.0.0.1:${psyApi}`,
    VITE_SUPABASE_ANON_KEY: PSY_ANON,
    VITE_MMPI_ORIGIN: mmpiOrigin,
  });
  const mmpiViteProc = startVite('/tmp/mmpi', mmpiVite, {
    VITE_SUPABASE_URL: `http://127.0.0.1:${mmpiApi}`,
    VITE_SUPABASE_ANON_KEY: MMPI_ANON,
  });

  const stop = async () => {
    for (const child of [psyViteProc, mmpiViteProc]) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
    }
    await Promise.all([
      new Promise<void>((resolve) => psyServer.close(() => resolve())),
      new Promise<void>((resolve) => mmpiServer.close(() => resolve())),
    ]);
    for (const child of [psyViteProc, mmpiViteProc]) {
      if (child.pid) {
        try {
          process.kill(child.pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
      }
    }
  };

  try {
    await waitHttp(psychologyOrigin);
    await waitHttp(mmpiOrigin);
  } catch (error) {
    await stop();
    throw error;
  }

  return {
    psychologyOrigin,
    mmpiOrigin,
    psychologySupabase: `http://127.0.0.1:${psyApi}`,
    mmpiSupabase: `http://127.0.0.1:${mmpiApi}`,
    expireCodes: () => {
      const now = Date.now() - 120_000;
      for (const row of store.codes.values()) row.expiresAt = now;
    },
    stop,
  };
}
