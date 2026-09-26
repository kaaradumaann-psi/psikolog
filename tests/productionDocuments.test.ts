import assert from 'node:assert/strict';
import test from 'node:test';
import type { CloudPort } from '../src/clinical/cloud/port';
import { pushDocument, removeDocument, signedDocumentUrl } from '../src/clinical/cloud/repository';
import type { PracticeDocument } from '../src/clinical/practiceStore';

const org = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const clientId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ctx = { organizationId: org, userId: user, resolveId: (id: string) => id };
const doc: PracticeDocument = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', clientId,
  fileName: 'onam.pdf', mimeType: 'application/pdf', sizeBytes: 8,
  createdAt: '2026-09-26T00:00:00Z',
  storagePath: `${org}/${clientId}/onam.pdf`,
};

test('belge bağlantısı: sadece kendi danışanının özel Storage yolu, 1 saatlik imza (LOCAL port)', async () => {
  let calls = 0;
  const port = { downloadUrl: async (bucket: string, path: string, expires: number) => {
    calls++;
    assert.equal(bucket, 'client-documents');
    assert.equal(path, doc.storagePath);
    assert.equal(expires, 3600);
    return 'https://example.test/storage/v1/object/sign/client-documents/onam.pdf?token=short';
  } } as CloudPort;
  assert.match(await signedDocumentUrl(port, ctx, doc), /token=short/);
  await assert.rejects(signedDocumentUrl(port, ctx, {
    ...doc, storagePath: `${org}/other-client/onam.pdf`,
  }), /ait değil/);
  assert.equal(calls, 1, 'başka danışan dosyası için signed URL istenmemeli');
});

test('belge: içeriği okunmamış metadatayı buluta başarı gibi kaydetmez (LOCAL port)', async () => {
  let inserted = 0;
  const port = { insert: async () => { inserted++; return []; } } as unknown as CloudPort;
  await assert.rejects(pushDocument(port, ctx, { ...doc, storagePath: undefined }), /Belge okunamadı/);
  assert.equal(inserted, 0);
});

test('belge: yükleme başarılı fakat metadata hatalıysa aynı özel yola güvenli yeniden deneme', async () => {
  let inserts = 0;
  let signed = 0;
  const port = {
    upload: async () => { throw new Error('409 The resource already exists'); },
    downloadUrl: async (_bucket: string, path: string) => { signed++; assert.match(path, new RegExp(`^${org}/${clientId}/`)); return 'signed'; },
    insert: async (_table: string, rows: Record<string, unknown>[]) => { inserts++; return rows; },
  } as CloudPort;
  await pushDocument(port, ctx, {
    ...doc, storagePath: undefined, dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
  });
  assert.equal(signed, 1);
  assert.equal(inserts, 1);
});

test('belge silme: Storage hata verirse metadata referansı korunur', async () => {
  let removedRows = 0;
  const port = {
    removeObject: async () => { throw new Error('Failed to fetch'); },
    remove: async () => { removedRows++; },
  } as unknown as CloudPort;
  await assert.rejects(removeDocument(port, ctx, doc), /Failed to fetch/);
  assert.equal(removedRows, 0, 'erişilemeyen nesnenin metadata kaydı silinmemeli');
});
