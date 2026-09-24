import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * WCAG 2.1 kontrast sözleşmesi.
 *
 * Metin taşıyan yüzeyler AA (4,5:1) eşiğini geçmelidir. Dolgu eylem butonu
 * beyaz etiket taşıdığı için `--action` token'ını kullanır; marka vurgusu
 * `--primary` (#0a84ff) beyaz metinle yalnızca 3,65:1 verir ve dolgu butonda
 * kullanılamaz.
 */

const SCREEN = 'src/styles/screen.css';
const WORKSPACE = 'src/styles/workspace.css';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function token(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  assert.ok(match, `--${name} tanımlı olmalı`);
  return match![1];
}

const screen = readFileSync(SCREEN, 'utf8');

test('dolgu eylem rengi beyaz metinle AA eşiğini geçer', () => {
  const action = token(screen, 'action');
  const actionHover = token(screen, 'action-hover');
  assert.ok(
    contrast('#ffffff', action) >= 4.5,
    `--action (${action}) beyaz metinle ${contrast('#ffffff', action).toFixed(2)}:1 — AA için 4,5:1 gerekir`,
  );
  assert.ok(
    contrast('#ffffff', actionHover) >= 4.5,
    `--action-hover (${actionHover}) ${contrast('#ffffff', actionHover).toFixed(2)}:1`,
  );
});

test('marka vurgusu dolgu butonda kullanılmaz', () => {
  // Vurgu mavisi beyaz metinle AA'yı geçmez; bu yüzden dolgu yüzeyler --action kullanır.
  const accent = token(screen, 'primary');
  assert.ok(contrast('#ffffff', accent) < 4.5, 'varsayım değişti: --primary artık AA geçiyor olabilir');

  const workspace = readFileSync(WORKSPACE, 'utf8');
  assert.match(workspace, /\.btn-primary[^{]*\{[^}]*background:\s*var\(--action\)/s, 'birincil buton --action kullanmalı');
  assert.match(workspace, /\.auth-submit-btn[^{]*\{[^}]*background:\s*var\(--action\)/s, 'giriş butonu --action kullanmalı');
  assert.doesNotMatch(
    workspace,
    /background:\s*var\(--primary\);/,
    'workspace katmanında beyaz metinli dolgu --primary kullanmamalı',
  );
});

test('soluk metin renkleri beyaz zeminde okunur', () => {
  const soft = token(screen, 'soft');
  const ink = token(screen, 'accent-ink');
  assert.ok(contrast(soft, '#ffffff') >= 4.5, `--soft ${contrast(soft, '#ffffff').toFixed(2)}:1`);
  assert.ok(contrast(ink, '#ffffff') >= 4.5, `--accent-ink ${contrast(ink, '#ffffff').toFixed(2)}:1`);
});

test('ödeme rozeti metni kendi zemininde okunur', () => {
  const clinical = readFileSync('src/styles/clinical.css', 'utf8');
  const badge = clinical.match(/\.badge-fee-pending\s*\{([^}]*)\}/s);
  assert.ok(badge, 'ödeme rozeti stili bulunmalı');
  const color = badge![1].match(/color:\s*(#[0-9a-fA-F]{3,8})/);
  const tint = badge![1].match(/background:\s*var\(--warning-tint\)/) ? '#fffbf1' : null;
  assert.ok(color && tint, 'rozet renk ve uyarı zemini kullanmalı');
  assert.ok(
    contrast(color![1], tint!) >= 4.5,
    `ödeme rozeti ${contrast(color![1], tint!).toFixed(2)}:1`,
  );
});
