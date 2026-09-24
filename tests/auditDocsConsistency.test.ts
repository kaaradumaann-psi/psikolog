import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  measureCodes,
  measureConflicts,
  measureDecisions,
  measureAuditFiles,
  measureSource,
  measureAuditState,
} from '../scripts/mmpi-audit/state.mjs';

const ROOT = process.cwd();

describe('PHASE 15, 16 & 17 — MMPI Audit State & Document Consistency', () => {
  const state = measureAuditState(ROOT, { skipTests: true, skipBuild: true, skipTypecheck: true });

  describe('A. Audit State Structure & Completeness', () => {
    it('üretilen state zorunlu alanların tümünü içerir', () => {
      assert.ok(typeof state.phase === 'number' && state.phase >= 15);
      assert.ok(typeof state.status === 'string' && state.status.length > 0);
      assert.ok(typeof state.generatedAt === 'string' && state.generatedAt.length > 0);

      // Tests
      assert.ok(typeof state.tests.suites === 'number' && state.tests.suites > 0);
      assert.ok(typeof state.tests.passed === 'number' && state.tests.passed > 0);
      assert.equal(state.tests.failed, 0);

      // Codes
      assert.equal(state.codes.canonical, 45);
      assert.equal(state.codes.block, 151);
      assert.equal(state.codes.ownBodies, 76);
      assert.equal(state.codes.aliases, 75);
      assert.equal(state.codes.ownBodies + state.codes.aliases, state.codes.block);

      // Conflicts & Decisions
      assert.ok(state.conflicts.headings >= 68);
      assert.ok(state.conflicts.uniqueIds >= 43);
      assert.ok(state.decisions.headings >= 33);
      assert.ok(state.decisions.uniqueIds >= 32);

      // Files & Source
      assert.ok(state.audit.fileCount >= 17);
      assert.equal(state.source.sourceIndexPresent, true);
      assert.equal(state.source.sourceFactsPresent, true);
      assert.equal(state.source.kaynakDenetimiPresent, true);
      assert.equal(state.source.sourcePdfPresent, true);

      // Build & Typecheck
      assert.equal(state.build, 'PASS');
      assert.equal(state.typecheck, 'PASS');
    });

    it('status.json dosyası makine tarafından okunabilir ve günceldir', () => {
      const statusJsonPath = path.join(ROOT, 'docs/mmpi-audit/status.json');
      assert.ok(fs.existsSync(statusJsonPath), 'status.json mevcut olmalıdır');
      const raw = fs.readFileSync(statusJsonPath, 'utf-8');
      const json = JSON.parse(raw);

      assert.ok(typeof json.phase === 'number' && json.phase >= 15);
      assert.equal(json.codes.canonical, 45);
      assert.equal(json.codes.block, 151);
      assert.ok(json.conflicts.headings >= 68);
      assert.ok(json.decisions.headings >= 33);
    });
  });

  describe('B. Test Sayaçları Tutarlılığı', () => {
    it('dokümanlarda sunulan güncel test sayaçları gerçek test ölçümüyle tutarlıdır', () => {
      const statusJsonPath = path.join(ROOT, 'docs/mmpi-audit/status.json');
      const json = JSON.parse(fs.readFileSync(statusJsonPath, 'utf-8'));

      assert.ok(json.tests.passed >= 503, 'Geçen test sayısı 503 veya üzeri olmalıdır');
      assert.equal(json.tests.failed, 0, 'Başarısız test olmamalıdır');
    });

    it('tarihsel ara kontrol test sayıları tarihsel kayıt olarak korunur', () => {
      const changelogPath = path.join(ROOT, 'docs/mmpi-audit/CHANGELOG.md');
      const changelog = fs.readFileSync(changelogPath, 'utf-8');
      assert.ok(changelog.length > 0, 'CHANGELOG.md mevcut olmalıdır');
    });
  });

  describe('C. Conflict ID Tekilliği ve Decision Gates', () => {
    it('CONFLICTS.md içerisindeki başlıklar ve mükerrer ID ler doğru tespit edilir', () => {
      const conflicts = measureConflicts(ROOT);
      assert.equal(conflicts.headings, 68);
      assert.equal(conflicts.uniqueIds, 43);

      const expectedDuplicates = [
        'CONFLICT-016',
        'CONFLICT-019',
        'CONFLICT-020',
        'CONFLICT-024',
        'CONFLICT-025',
        'CONFLICT-026',
        'CONFLICT-027',
        'CONFLICT-030',
        'CONFLICT-036',
      ];
      assert.deepEqual(conflicts.duplicateIds.sort(), expectedDuplicates.sort());

      // Mükerrer ID lerin otomatik sessizce silinmediğini doğrula
      assert.ok(conflicts.duplicateIds.includes('CONFLICT-016'));
      assert.ok(conflicts.duplicateIds.includes('CONFLICT-027'));
    });
  });

  describe('D. Decision ID Tekilliği ve Decision Gates', () => {
    it('DECISIONS.md içerisindeki başlıklar ve DECISION-028 mükerrerliği tespit edilir', () => {
      const decisions = measureDecisions(ROOT);
      assert.ok(decisions.headings >= 33);
      assert.ok(decisions.uniqueIds >= 32);

      assert.deepEqual(decisions.duplicateIds, ['DECISION-028']);

      // DECISION-028'in sessizce tekilleştirilmediğini doğrula (PHASE 16/17 karar kapısı)
      const content = fs.readFileSync(path.join(ROOT, 'docs/mmpi-audit/DECISIONS.md'), 'utf-8');
      const d28Matches = [...content.matchAll(/##\s*DECISION-028/g)];
      assert.equal(d28Matches.length, 2, 'DECISION-028 iki ayrı başlık olarak korunmalıdır');
    });
  });

  describe('E. Klinik Yorum Rehberi İzolasyonu ve Sahte Kaynak Yasağı', () => {
    it('kullanıcıya ve AI katmanına sahte kaynak veya uydurma sayfa referansı aktarılmaz', () => {
      const aiFile = fs.readFileSync(path.join(ROOT, 'src/ai/aiInterpretation.ts'), 'utf-8');
      const sourcesPage = fs.readFileSync(path.join(ROOT, 'src/components/SourcesPage.tsx'), 'utf-8');

      // AI katmanında sahte kaynak adı geçmez
      assert.doesNotMatch(aiFile, /klinik yorum rehberi/i);
      // SourcesPage yalnızca onaylı künyeyi (Ceyhun & Oral 2003 / Savaşır 1981) gösterir
      assert.match(sourcesPage, /Ceyhun, A\. A\., & Oral, G\. \(2003\)/);
    });

    it('mmpiSource.ts içerisindeki tarihsel FINDING-I-001 yorumları dokümantasyonla izole edilmiştir', () => {
      const findingPath = path.join(ROOT, 'docs/mmpi-audit/INTERPRETATION_AUDIT.md');
      const findingContent = fs.readFileSync(findingPath, 'utf-8');
      assert.match(findingContent, /FINDING-I-001/);
      assert.match(findingContent, /klinik yorum rehberi/);
    });
  });

  describe('F. SOURCE_INDEX & Sayfa Eşleme Tutarlılığı', () => {
    it('SOURCE_INDEX.md kanonik sayfa ve bölüm haritasını içerir', () => {
      const indexPath = path.join(ROOT, 'docs/mmpi-audit/SOURCE_INDEX.md');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Doğrulanmış kritik bölümler
      assert.match(content, /Ek 1: MMPI test kitabı/);
      assert.match(content, /215-233/);
      assert.match(content, /Tablo 30/);
      assert.match(content, /s\.195/);
    });

    it('docs/kaynak-denetimi.md Ek 1 ve Tablo 30 eşlemelerini doğrulanmış sayfalarla verir', () => {
      const filePath = path.join(ROOT, 'docs/kaynak-denetimi.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Ek 1: s.215-233 (PDF p115 R – p124 R)
      assert.match(content, /Ek 1 \(kitap s\.215-233 \/ PDF p115 R – p124 R/);
      // Eski yanlış s.201-209 referansı tabloda bulunmamalıdır
      assert.doesNotMatch(content, /s\.201-209/);
      // Tablo 30 s.195
      assert.match(content, /Tablo 30 \(kitap s\.195 \/ PDF p105 R\)/);
    });
  });

  describe('G. State ↔ STATE_METRICS.md Tutarlılığı', () => {
    it('STATE_METRICS.md generated state değerleri ile birebir örtüşür', () => {
      const metricsPath = path.join(ROOT, 'docs/mmpi-audit/STATE_METRICS.md');
      assert.ok(fs.existsSync(metricsPath), 'STATE_METRICS.md mevcut olmalıdır');
      const content = fs.readFileSync(metricsPath, 'utf-8');

      assert.match(content, /Generated from repository state/);
      assert.match(content, new RegExp(`Canonical Codes \\(\`CODES\`\\).*\`${state.codes.canonical}\``));
      assert.match(content, new RegExp(`Block Codes \\(\`BLOCK_CODES\`\\).*\`${state.codes.block}\``));
      assert.match(content, new RegExp(`Block Own Bodies.*\`${state.codes.ownBodies}\``));
      assert.match(content, new RegExp(`Block Aliases.*\`${state.codes.aliases}\``));
      assert.match(content, new RegExp(`\`CONFLICTS\\.md\`.*\`${state.conflicts.headings}\`.*\`${state.conflicts.uniqueIds}\``));
      assert.match(content, new RegExp(`\`DECISIONS\\.md\`.*\`${state.decisions.headings}\`.*\`${state.decisions.uniqueIds}\``));
      assert.match(content, /DECISION-028/);
    });

    it('PROTOCOL.md 10 temel ilkeyi açıkça içerir', () => {
      const protocolPath = path.join(ROOT, 'docs/mmpi-audit/PROTOCOL.md');
      assert.ok(fs.existsSync(protocolPath), 'PROTOCOL.md mevcut olmalıdır');
      const content = fs.readFileSync(protocolPath, 'utf-8');

      assert.match(content, /İlke 1: Otomatik Durum Ölçümü/);
      assert.match(content, /İlke 2: Eski Sayaçların Durum Kaynağı Olmaması/);
      assert.match(content, /İlke 3: Tarihsel Kayıtların Korunması/);
      assert.match(content, /İlke 4: Tarihsel Eksik Sayıları ve Güncel Durum Ayrımı/);
      assert.match(content, /İlke 5: Duplicate ID'lerin Sessizce Birleştirilmemesi/);
      assert.match(content, /İlke 6: ID Tekilliğinin Ayrı Bir Kalite Metriği Olması/);
      assert.match(content, /İlke 7: Klinik Kararların Değişmezliği/);
      assert.match(content, /İlke 8: Kaynak Sayfa Referanslarının `SOURCE_INDEX\.md` ile Uyumu/);
      assert.match(content, /İlke 9: Gerçek Olmayan Kaynak Referanslarının Yasaklanması/);
      assert.match(content, /İlke 10: PHASE 15 Kapsamının Dokümantasyon ve Durum Tutarlılığı Olması/);
    });
  });
});
