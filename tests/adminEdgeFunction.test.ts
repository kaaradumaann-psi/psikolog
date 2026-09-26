import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// LOCAL Edge handler contract: Deno and Supabase are stubbed; NO live project,
// Auth account, organization or patient row is touched by these tests.
const orgA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const orgB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const callerId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const createdId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function edgeHarness(role: 'ADMIN' | 'ORG_ADMIN', assignedOrg: string | null = null, profileUpdateMissing = false) {
  const profiles = new Map<string, Record<string, unknown>>([[callerId, {
    id: callerId, email: 'caller@example.com', first_name: 'Test', last_name: 'Yönetici',
    role, active: true, organization_id: assignedOrg,
  }]]);
  const existingOrgIds = new Set([orgA]);
  let created = 0;
  let handler: ((request: Request) => Promise<Response>) | null = null;
  const service = {
    auth: {
      getUser: async () => ({ data: { user: { id: callerId } }, error: null }),
      admin: {
        createUser: async ({ email, user_metadata }: { email: string; user_metadata: Record<string, string> }) => {
          created += 1;
          profiles.set(createdId, {
            id: createdId, email, first_name: user_metadata.first_name,
            last_name: user_metadata.last_name, role: 'PSYCHOLOG', active: true, organization_id: null,
          });
          return { data: { user: { id: createdId } }, error: null };
        },
        deleteUser: async (id: string) => { profiles.delete(id); return { error: null }; },
      },
    },
    from: (table: string) => {
      let id = '';
      let update: Record<string, unknown> | null = null;
      const query = {
        select: (_columns: string) => query,
        update: (patch: Record<string, unknown>) => { update = patch; return query; },
        eq: (_column: string, value: string) => { id = value; return query; },
        maybeSingle: async () => ({ data: table === 'organizations'
          ? existingOrgIds.has(id) ? { id } : null
          : profiles.get(id) ?? null, error: null }),
        single: async () => {
          if (update && table === 'profiles' && id === createdId && profileUpdateMissing) {
            return { data: null, error: null };
          }
          if (update && table === 'profiles' && profiles.has(id)) {
            profiles.set(id, { ...profiles.get(id), ...update });
          }
          return { data: profiles.get(id) ?? null, error: null };
        },
      };
      return query;
    },
  };
  const source = readFileSync('supabase/functions/admin-users/index.ts', 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const moduleFactory = new Function('require', 'Deno', 'Response', 'Request', 'TextEncoder', 'URL', 'console', 'exports', js);
  moduleFactory(
    (specifier: string) => {
      assert.equal(specifier, 'https://esm.sh/@supabase/supabase-js@2');
      return { createClient: () => service };
    },
    { env: { get: (name: string) => name === 'SUPABASE_URL' ? 'https://example.test' : name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'fake-test-only' : '' },
      serve: (fn: typeof handler) => { handler = fn; } },
    Response, Request, TextEncoder, URL, console, {},
  );
  assert.ok(handler);
  async function invoke(body: Record<string, unknown>) {
    const response = await handler!(new Request('https://example.test/functions/v1/admin-users', {
      method: 'POST', headers: { authorization: 'Bearer local-test-token' },
      body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  }
  return { invoke, get created() { return created; }, profiles };
}

const payload = {
  action: 'create', firstName: 'Ayşe', lastName: 'Deniz', email: 'new@example.com',
  password: '123456789012', role: 'PSYCHOLOG',
};

test('Edge: kurumsuz ADMIN hesap açmadan önce gerçek kurumu seçmeli, geçersiz kurum kullanıcı üretmez', async () => {
  const edge = edgeHarness('ADMIN');
  const missing = await edge.invoke(payload);
  assert.equal(missing.status, 400);
  assert.equal(edge.created, 0);
  const nonexistent = await edge.invoke({ ...payload, organizationId: orgB });
  assert.equal(nonexistent.status, 400);
  assert.equal(edge.created, 0);
  const ok = await edge.invoke({ ...payload, organizationId: orgA });
  assert.equal(ok.status, 200);
  assert.equal((ok.body.profile as { organization_id: string }).organization_id, orgA);
  assert.equal(edge.created, 1);
});

test('Edge: kurumsuz ORG_ADMIN kurumsuz başka profil açamaz; atanmış ORG_ADMIN yalnız kendi orgunda psikolog açar', async () => {
  const unassigned = edgeHarness('ORG_ADMIN');
  const denied = await unassigned.invoke({ ...payload, organizationId: orgA });
  assert.equal(denied.status, 403);
  assert.equal(unassigned.created, 0);
  const scoped = edgeHarness('ORG_ADMIN', orgA);
  assert.equal((await scoped.invoke({ ...payload, organizationId: orgB })).status, 403);
  assert.equal((await scoped.invoke({ ...payload, organizationId: orgA, role: 'ORG_ADMIN' })).status, 403);
  const allowed = await scoped.invoke({ ...payload, organizationId: orgA });
  assert.equal(allowed.status, 200);
  assert.equal(scoped.created, 1);
});

test('Edge: Auth döndü ama trigger profili güncellenmediyse başarı gösterilmez; sadece yeni Auth ID geri alınır', async () => {
  const edge = edgeHarness('ADMIN', null, true);
  const failed = await edge.invoke({ ...payload, organizationId: orgA });
  assert.equal(failed.status, 500);
  assert.equal(edge.created, 1);
  assert.equal(edge.profiles.has(createdId), false);
  assert.equal(edge.profiles.has(callerId), true, 'yönetici ve var olan klinik hesap korunur');
});
