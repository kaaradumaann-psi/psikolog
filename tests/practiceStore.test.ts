import assert from 'node:assert/strict';
import test from 'node:test';
import { newId, saveTask, getTasks, saveScreening, getScreenings, importPracticeData } from '../src/clinical/practiceStore.ts';
import { calculateGad7 } from '../src/clinical/rapidScreening.ts';
import { configureStorageScope } from '../src/clinical/storageScope';

if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
}

configureStorageScope('test-hesap');

test('görev kaydı örnek kişi üretmez', () => {
  localStorage.clear();
  const now = new Date().toISOString();
  saveTask({
    id: 'task_real_1',
    title: 'Ölçek tekrarını planla',
    status: 'todo',
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(getTasks().some((task) => task.id === 'task_real_1'), true);
  assert.equal(getTasks().some((task) => /candan|mert/i.test(task.title)), false);
});

test('tarama sonucu kaydedilir, güvenli olmayan belge yedeği reddedilir', () => {
  const result = calculateGad7([1, 1, 1, 1, 1, 1, 1], { name: 'Deneme', clientId: 'c1' });
  saveScreening(result);
  assert.ok(getScreenings().some((item) => item.id === result.id));
  assert.equal(newId('task').startsWith('task_'), true);
  assert.throws(() => importPracticeData({
    documents: [{
      id: 'doc_bad',
      clientId: 'c1',
      fileName: 'x.html',
      mimeType: 'text/html',
      sizeBytes: 20,
      dataUrl: 'data:text/html,<script>alert(1)</script>',
      createdAt: new Date().toISOString(),
    }],
  }));
});
