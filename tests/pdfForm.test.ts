import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { FORM_SET_CODE } from '../src/form/formSet';

const tsx = join(process.cwd(), 'node_modules', '.bin', 'tsx');

/**
 * End-to-end print check: generate the sheet, then read the written file back and
 * compare its geometry with the shared FormDefinition. Nothing here trusts the
 * generator's own bookkeeping.
 */
test('printed sheet is generated from the shared definition and verified from the file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mmpi-pdf-'));
  const target = join(directory, 'form.pdf');
  try {
    execFileSync(tsx, ['scripts/generate-pdf.ts', target], { encoding: 'utf8' });
    const bytes = readFileSync(target);
    assert.ok(bytes.subarray(0, 8).toString('latin1').startsWith('%PDF-1.7'));
    assert.ok(bytes.length > 100_000, 'Gömülü yazı tipleri PDF boyutuna yansımıyor.');
    const report = execFileSync(tsx, ['scripts/verify-pdf.ts', target], { encoding: 'utf8' });
    assert.match(report, /Doğrulandı: 4 A4 sayfa, 566 madde numarası tanımlı koordinatlarında/);
    assert.match(report, /Sayfa 1:.*kimlik alanı var/);
    for (const page of [2, 3, 4]) {
      assert.match(report, new RegExp(`Sayfa ${page}:.*kimlik alanı yok`), `Sayfa ${page} kimlik alanı içermemeli.`);
    }
    // 144 items x 2 choices per full page, 134 x 2 on the last one: 1,132 in total.
    assert.equal(report.match(/288\/288 işaretleme dairesi yerinde/g)?.length, 3);
    assert.match(report, /268\/268 işaretleme dairesi yerinde/);
    assert.match(report, /en büyük sapma 0\.000 mm/g);
    // The printed sheets carry the same set code the app's own print path uses, so pages printed
    // on different days belong to one set instead of refusing each other in the scanner.
    assert.ok(report.includes(`Set kodu: ${FORM_SET_CODE} (dört sayfada aynı`),
      `Basılı set kodu ${FORM_SET_CODE} olmalı, rapor: ${report}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
