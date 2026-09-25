import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabasePort } from '../src/clinical/cloud/port';

test('bulut portu: sunucu limiti kaç olursa olsun tüm satırlar sıralı ve eksiksiz okunur (LOCAL taklit)', async () => {
  for (const serverLimit of [1000, 73]) {
    const rows = Array.from({ length: 1205 }, (_, i) => ({
      id: `id-${String(i).padStart(4, '0')}`,
      organization_id: 'org-a',
    }));
    const calls: { from: number; to: number; sorted: boolean }[] = [];
    const client = {
      from() {
        let orderedBy = '';
        let from = 0;
        let to = Number.MAX_SAFE_INTEGER;
        let filter = { key: '', value: '' };
        const builder = {
          select() { return builder; },
          eq(key: string, value: string) { filter = { key, value }; return builder; },
          order(key: string) { orderedBy = key; return builder; },
          range(start: number, end: number) { from = start; to = end; return builder; },
          then(resolve: (result: unknown) => unknown) {
            const visible = rows.filter(row => !filter.key || row[filter.key as keyof typeof row] === filter.value);
            calls.push({ from, to, sorted: orderedBy === 'id' });
            return Promise.resolve(resolve({ data: visible.slice(from, Math.min(to + 1, from + serverLimit)), count: visible.length, error: null }));
          },
        };
        return builder;
      },
    } as unknown as SupabaseClient;

    const result = await createSupabasePort(client).select('clients', { organization_id: 'org-a' });
    assert.equal(result.length, rows.length, `serverLimit=${serverLimit}: veri sessiz eksilmemeli`);
    assert.deepEqual(result.map(row => row.id), rows.map(row => row.id));
    assert.ok(calls.length > 1, 'birden fazla istek gönderilmeli');
    assert.ok(calls.every(call => call.sorted), 'sayfalar kararlı bir sırada olmalı');
  }
});

test('DELETE: RLS nedeniyle 0 satır silinmesi başarı değildir (LOCAL taklit)', async () => {
  const builder = {
    delete() { return builder; },
    eq() { return builder; },
    select: async () => ({ data: [], error: null }),
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  await assert.rejects(
    createSupabasePort(client).remove('clients', { id: 'hidden-record' }),
    /Kayıt bulunamadı veya silme yetkiniz yok/,
  );
});

test('upsert: sunucu hiç satır döndürmezse başarı uydurulmaz; yeniden deneme sahipliği değiştirmez', async () => {
  const { upsertRow } = await import('../src/clinical/cloud/repository');
  const base = {
    select: async () => [],
    remove: async () => {},
  };
  const neverInserted = { ...base, insert: async () => [], update: async () => [] } as unknown as import('../src/clinical/cloud/port').CloudPort;
  await assert.rejects(upsertRow(neverInserted, 'clients', { id: 'c1' }), /doğrulanamadı/);

  let patch: Record<string, unknown> = {};
  const alreadyExists = {
    ...base,
    insert: async () => { throw new Error('23505 duplicate key'); },
    update: async (_table: string, value: Record<string, unknown>) => { patch = value; return []; },
  } as unknown as import('../src/clinical/cloud/port').CloudPort;
  const row = { id: 'c1', created_by: 'admin', owner_user_id: 'admin', organization_id: 'org', client_id: 'c1', first_name: 'Yeni' };
  await assert.rejects(upsertRow(alreadyExists, 'clients', row), /değişmedi/);
  assert.deepEqual(patch, { first_name: 'Yeni' }, 'admin güncellemesi asıl sahibin kolonlarını değiştirmemeli');
});
