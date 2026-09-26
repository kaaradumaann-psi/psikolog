import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('içerik tasarım katmanı sidebar/header/footer seçicilerine dokunmaz', () => {
  const css = readFileSync('src/styles/content-system.css', 'utf8');
  assert.doesNotMatch(css, /\.workspace-sidebar\b/);
  assert.doesNotMatch(css, /\.sidebar-(?:link|bottom|nav|privacy)\b/);
  assert.doesNotMatch(css, /\.app-header\b/);
  assert.doesNotMatch(css, /\.site-footer\b/);
});

test('normal kart ve seçili kart ayrımı açıkça tanımlıdır', () => {
  const css = readFileSync('src/styles/content-system.css', 'utf8');
  assert.match(css, /\.modern-table-card,[\s\S]*border: 1px solid var\(--hairline\)/);
  assert.match(css, /\.report-list-item\.is-selected[\s\S]*inset 3px 0 0 var\(--accent\)/);
  assert.match(css, /\.task-card\.status-in_progress[\s\S]*border-left: 3px solid var\(--accent\)/);
  assert.match(css, /\.task-card\.priority-high[\s\S]*border-left: 3px solid var\(--danger\)/);
});

test('genel hata ekranı yenileme döngüsü yerine veri silmeyen kurtarma yolları sunar', () => {
  const source = readFileSync('src/components/ClinicErrorBoundary.tsx', 'utf8');
  assert.match(source, /Yeniden dene/);
  assert.match(source, /Güvenli Ayarlar ekranını aç/);
  assert.match(source, /Tarayıcı verilerini silmeyin/);
  assert.match(source, /replaceState\(\{\}, '', '\/ayarlar'\)/);
});
