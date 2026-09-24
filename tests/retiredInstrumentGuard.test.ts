import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const FORBIDDEN = [
  'optik-form.html',
  'src/scoring/mmpiScoring.ts',
  'src/scoring/mmpiKeys.ts',
  'src/omr/analyzePage.ts',
  'src/scanner/scanAndAnalyze.ts',
  'docs/mmpi-audit/PROTOCOL.md',
  'MMPI-566-optik-cevap-formu.pdf',
];

test('MMPI scoring, OMR and optical form are not in this repository', () => {
  for (const path of FORBIDDEN) {
    assert.equal(existsSync(path), false, `${path} should not be vendored`);
  }
});

test('frontend dependencies do not include the optical-form stack', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies?: Record<string, string> };
  const deps = pkg.dependencies ?? {};
  for (const name of ['jsqr', 'pdfjs-dist', 'qrcode', '@noble/hashes']) {
    assert.equal(name in deps, false, name);
  }
});
