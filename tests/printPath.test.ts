import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('the print button uses the verified PDF, not HTML window.print', () => {
  const app = readFileSync(fileURLToPath(new URL('../src/App.tsx', import.meta.url)), 'utf8');
  // Yazdırma akışı FormKit bileşeninde yaşar; App yalnızca sekmeyi açar.
  assert.ok(app.includes('FormKit'));
  assert.ok(!app.includes('window.print()'));
  const kit = readFileSync(fileURLToPath(new URL('../src/components/FormKit.tsx', import.meta.url)), 'utf8');
  assert.ok(kit.includes('printFormPdf'));
  assert.ok(kit.includes('download-button'));
  assert.ok(!kit.includes('window.print()'));
  const pdf = readFileSync(fileURLToPath(new URL('../src/print/formPdf.ts', import.meta.url)), 'utf8');
  assert.ok(pdf.includes('export async function printFormPdf'));
  assert.match(pdf, /contentWindow\?\.print/);
});
