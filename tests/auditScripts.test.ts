import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Denetim betikleri (scripts/mmpi-audit/cmp-tablo*.ts) kaynak tablolarını
 * kodla karşılaştıran araçlardır. Bir betiğin ÇALIŞMAMASI (ör. veri yapısı
 * değiştiği için `undefined.length` patlaması) tablonun doğrulanmadığı anlamına
 * gelir ama sessiz kalır — bu yüzden her betiğin 0 çıkış koduyla çalıştığı
 * burada kilitlenir.
 *
 * Regresyon: `cmp-tablo12.ts` Mf'nin cinsiyete özel (`{male, female}`) anahtar
 * yapısına geçirilmesinden sonra eski düz alanları okuyor ve TypeError ile
 * çöküyordu; Tablo 12 fiilen denetlenmiyordu.
 */

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, 'scripts/mmpi-audit');

const tableScripts = fs
  .readdirSync(SCRIPTS_DIR)
  .filter(name => /^cmp-tablo\d+\.ts$/.test(name))
  .sort();

describe('Tablo karşılaştırma betikleri çalışır ve 0 fark verir', () => {
  it('denetim dizininde tablo betikleri bulunur', () => {
    // Tablo 9-14 kendi betiğinde; Tablo 8/15/16/17 batch betiklerinde doğrulanır.
    assert.deepEqual(tableScripts, [
      'cmp-tablo10.ts',
      'cmp-tablo11.ts',
      'cmp-tablo12.ts',
      'cmp-tablo13.ts',
      'cmp-tablo14.ts',
      'cmp-tablo9.ts',
    ]);
  });

  for (const script of tableScripts) {
    it(`${script} çökmeden çalışır ve BİREBİR MATCH verir`, () => {
      let output = '';
      try {
        output = execFileSync('npx', ['tsx', path.join(SCRIPTS_DIR, script)], {
          cwd: ROOT,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 120_000,
        });
      } catch (error) {
        const err = error as { stdout?: string; stderr?: string; message?: string };
        assert.fail(
          `${script} çalışmadı: ${err.stderr?.slice(0, 400) || err.message}\n${err.stdout?.slice(0, 400) ?? ''}`,
        );
      }
      assert.match(output, /MATCH/, `${script} karşılaştırma sonucu üretmedi`);
      assert.doesNotMatch(output, /FARK VAR/, `${script} kaynak ile kod arasında fark bildirdi`);
    });
  }
});
