import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/**
 * Klinik iş akışında `alert()` / `confirm()` / `prompt()` kullanımı yasak:
 * bunlar erişilebilir değildir, uygulamanın kendi ConfirmDialog/ClinicalDialog
 * sistemiyle tutarsızdır ve test edilemez. Bu koruma, birinin yeniden bir
 * native dialog eklemesini derleme zamanında değil ama test aşamasında yakalar.
 */
function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

test('no native alert/confirm/prompt dialogs in application source', () => {
  const offenders: string[] = [];
  for (const file of listSourceFiles('src')) {
    const content = readFileSync(file, 'utf8');
    // Yorumlardaki kelimeler (örn. "native confirm() yerine") sorun değildir;
    // yalnız gerçek çağrıları (parantezden önce nokta olmayan) yakalarız.
    const callPattern = /(^|[^.\w])(alert|confirm|prompt)\s*\(/g;
    for (const match of content.matchAll(callPattern)) {
      const lineStart = content.lastIndexOf('\n', match.index ?? 0) + 1;
      const lineEnd = content.indexOf('\n', match.index ?? 0);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
      if (line.startsWith('//') || line.startsWith('*')) continue;
      offenders.push(`${file}: ${line}`);
    }
  }
  assert.deepEqual(offenders, []);
});
