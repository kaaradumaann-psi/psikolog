import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildProfileFromRawScoresObject } from '../src/scoring/mmpiScoring';
import type { MMPIProfile } from '../src/scoring/mmpiScoring';
import { MMPIClinicalTab } from '../src/components/results/MMPIClinicalTab';
import { MMPIPrintReport } from '../src/components/results/MMPIPrintReport';
import { K_CORRECTION } from '../src/scoring/mmpiKeys';
import { SCALE_DOSSIERS, grahamListsFor } from '../src/scoring/mmpiScaleDossiers';
import type { ClinicalScaleId } from '../src/scoring/mmpiScaleDossiers';

/**
 * Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987) — arayüz sözleşmesi.
 *
 * İki katman doğrulanır:
 *  1. Yapı: uzun kaynak listeleri (Graham 1987, demografik notlar, madde
 *     numaraları) kendi açılır-kapanır bölümünde; klinik anlatı her zaman
 *     görünür; içerik kapalıyken de DOM'da kalır.
 *  2. Tasarım: kart sitenin tipografi sözleşmesine uyar — arayüz yazı tipi,
 *     10px altı metin yok, 700 üstü ağırlık yok (yayında web fontu
 *     yüklenmediği için sistem karşılıkları sahte kalın üretir).
 */

/** Hs ve D yükselir; D daha yüksek olduğu için Graham listesi yalnız D'de açıktır. */
function mixedProfile(): MMPIProfile {
  return buildProfileFromRawScoresObject(
    {
      blank: 0, L: 4, F: 5, K: 15,
      Hs: 19, D: 40, Hy: 31, Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 15, Si: 20,
    } as never,
    'Erkek',
  );
}

/** Belirgin ölçek: T ≥ 70 ya da T ≤ 40. */
function flaggedOf(profile: MMPIProfile) {
  return profile.clinical.filter(s => s.tScore >= 70 || s.tScore <= 40);
}

/** JSX'in yaptığı HTML kaçışlamayı uygular (ör. `T>80` → `T&gt;80`). */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tek bir ölçek kartının HTML dilimi (iç içe `.mmpi-disc` makaleleri dahil). */
function cardOf(html: string, id: string): string {
  const start = html.indexOf(`id="dossier-${id}"`);
  assert.ok(start >= 0, `${id} kartı render olmalı`);
  const end = html.indexOf('<article id="dossier-', start + 1);
  return html.slice(start, end === -1 ? html.length : end);
}

describe('Klinik rapor arayüzü — açılır bölümler ve verimlilik', () => {
  const profile = mixedProfile();
  const html = renderToStaticMarkup(createElement(MMPIClinicalTab, { profile }));

  it('Graham (1987) listesi kendi açılır-kapanır bölümündedir', () => {
    const hs = cardOf(html, 'Hs');
    assert.match(hs, /ALT TESTİNDE YÜKSEK PUAN ALAN BİREYİN/);
    assert.match(hs, /\(GRAHAM 1987\)/);
    assert.match(hs, /aria-expanded="(true|false)"/);
    assert.match(hs, /aria-controls="/);
    // Katlanmış başlıkta kaç madde olduğu yazılı: kullanıcı kapalıyken de boyutu bilir.
    assert.match(hs, /23 madde/);
  });

  it('en belirgin ölçeğin Graham listesi açık, diğerlerininki kapalı gelir', () => {
    const flagged = flaggedOf(profile);
    const lead = flagged.reduce((a, b) => (b.tScore > a.tScore ? b : a));
    assert.equal(lead.id, 'D', 'test profili D ölçeğini en belirgin yapmalı');

    for (const scale of flagged) {
      const card = cardOf(html, scale.id);
      const titleAt = card.indexOf('ALT TESTİNDE');
      assert.ok(titleAt > 0, `${scale.id} Graham başlığı bulunmalı`);
      // Graham katlamasının KENDİ düğmesini oku (kart başlığı düğmesiyle karışmasın).
      const headAt = card.lastIndexOf('class="mmpi-disc-head"', titleAt);
      assert.ok(headAt > 0, `${scale.id} Graham katlama düğmesi bulunmalı`);
      const tagEnd = card.indexOf('>', headAt);
      const isOpen = /aria-expanded="true"/.test(card.slice(headAt, tagEnd));
      assert.equal(isOpen, scale.id === lead.id, `${scale.id} Graham bölümü açık durumu beklenenden farklı`);
    }
  });

  it('kart başlığının tamamı katlama düğmesidir ve özet kapalıyken de görünür', () => {
    for (const scale of flaggedOf(profile)) {
      const card = cardOf(html, scale.id);
      const toggleAt = card.indexOf('class="scale-dossier-toggle"');
      assert.ok(toggleAt > 0, `${scale.id} kart başlığı bir düğme olmalı`);
      const tagEnd = card.indexOf('>', toggleAt);
      assert.match(card.slice(toggleAt, tagEnd), /aria-expanded="true"/, 'kartlar varsayılan açık gelir');
      assert.match(card.slice(toggleAt, tagEnd), /aria-controls="/);
      // Özet bilgiler (durum rozeti, T, ham/K+) başlıkta, yani katlamadan bağımsız.
      const headSlice = card.slice(0, card.indexOf('class="scale-dossier-body"'));
      assert.match(headSlice, /KLİNİK (YÜKSEKLİK|DÜŞÜKLÜK)/);
      assert.match(headSlice, /T skoru/);
      assert.match(headSlice, /Ham: \d+/);
    }
  });

  it('kapalı bölümün maddeleri DOM’dan çıkarılmaz (ekran okuyucu + yazdırma eksik kalmaz)', () => {
    const hs = cardOf(html, 'Hs');
    assert.match(hs, /aria-expanded="false"/, 'Hs Graham bölümü kapalı olmalı');
    assert.match(hs, /hidden=""/);
    const items = SCALE_DOSSIERS.Hs.high.flatMap(list => list.items);
    assert.equal(items.length, 23);
    for (const item of items) {
      const text = typeof item === 'string' ? item : item.text;
      assert.ok(hs.includes(escapeHtml(text)), `kapalı listede eksik madde: ${text}`);
    }
  });

  it('her kartta katlanabilir bölümler için tek toplu denetim vardır', () => {
    assert.match(html, /Tümünü aç/);
    assert.match(html, /Tümünü kapat/);
    const flagged = flaggedOf(profile);
    const expected = flagged.reduce((total, s) => {
      const id = s.id as ClinicalScaleId;
      const hasNotes = (SCALE_DOSSIERS[id].notes?.length ?? 0) > 0;
      // kart gövdesi + graham + tablo + (varsa) demografik notlar
      return total + 3 + (hasNotes ? 1 : 0);
    }, 0);
    const openCount = flagged.length + 1; // tüm kartlar + en belirgin Graham listesi
    assert.match(
      html,
      new RegExp(`${openCount} / ${expected} açık`),
      'sayaç katlanabilir bölüm sayısıyla uyumlu olmalı',
    );
    assert.equal((html.match(/aria-expanded=/g) ?? []).length, expected);
  });

  it('hızlı gezinme çipleri her belirgin ölçeğin kartına bağlanır', () => {
    for (const scale of flaggedOf(profile)) {
      assert.ok(html.includes(`href="#dossier-${scale.id}"`), `${scale.id} için gezinme çipi yok`);
      assert.ok(html.includes(`id="dossier-${scale.id}"`), `${scale.id} kartı hedeflenebilir olmalı`);
    }
  });

  it('klinik anlatı her zaman görünür; yalnız uzun kaynak listeleri katlanır', () => {
    for (const scale of flaggedOf(profile)) {
      const card = cardOf(html, scale.id);
      assert.match(card, /KLİNİK AÇIKLAMA VE ANALİZ/);
      assert.match(card, /EK KLİNİK BİLGİLER/);
      // Klinik açıklama, karttaki ilk katlanmış gövdeden ÖNCE gelir; yani
      // hiçbir koşulda bir `hidden` gövdenin içinde değildir.
      const leadAt = card.indexOf('class="dossier-lead"');
      const firstBodyAt = card.indexOf('class="mmpi-disc-body"');
      assert.ok(leadAt >= 0, `${scale.id} klinik açıklaması render olmalı`);
      assert.ok(firstBodyAt >= 0, `${scale.id} katlanmış bölümü olmalı`);
      assert.ok(
        leadAt < firstBodyAt,
        `${scale.id} klinik açıklaması katlanmış bir gövdenin içinde kalmamalı`,
      );
    }
  });

  it('ölçü satırı dört değeri tek satırda taşır ve K oranı klasik ekleme tablosundan gelir', () => {
    const hs = cardOf(html, 'Hs');
    assert.match(hs, /<dt>Madde Sayısı<\/dt><dd>33<\/dd>/);
    assert.match(hs, /<dt>Doğru \(D\)<\/dt><dd>11 madde<\/dd>/);
    assert.match(hs, /<dt>Yanlış \(Y\)<\/dt><dd>22 madde<\/dd>/);
    // K_CORRECTION.Hs = 0.5 → kaynak: OCR_PDF_FULL_AUDIT.md "Hs (+.5K)"
    assert.match(hs, /<dt>K düzeltmesi<\/dt><dd>\+0\.5K<\/dd>/);
    assert.match(hs, /K Eklemeli bir alt testtir\. Klasik ekleme tablosuna göre ham puana 0\.5×K eklenir\./);
    // K düzeltmesi olmayan ölçek kendi tablo numarasıyla anılır (Tablo 9 = D).
    const d = cardOf(html, 'D');
    assert.match(d, /<dt>K düzeltmesi<\/dt><dd>Uygulanmaz<\/dd>/);
    assert.match(d, /Tablo 9’de “K Eklemeli” işareti yoktur/);
  });

  it('madde numarası tablosu başlığı kaynak başlığıyla birebir verilir', () => {
    const hs = cardOf(html, 'Hs');
    assert.match(hs, /Tablo 8: Hipokondriyazis alt testi: Madde numaraları ve puanlama yönü \(Madde Sayısı: 33\)/);
  });

  it('renkler tasarım token’larından gelir; satır içi yalnız geometri taşınır', () => {
    for (const style of html.match(/style="[^"]*"/g) ?? []) {
      assert.match(
        style,
        /^style="(?:width|left):[\d.]+%"$/,
        `satır içi stil yalnız genişlik/konum olmalı: ${style}`,
      );
    }
  });

  it('T ≤ 40 kartı klinik düşüklük olarak işaretlenir ve düşük listesini kullanır', () => {
    const low = buildProfileFromRawScoresObject(
      { blank: 0, L: 4, F: 5, K: 15, Hs: 1, D: 8, Hy: 30, Pd: 15, Mf: 25, Pa: 10, Pt: 15, Sc: 15, Ma: 2, Si: 20 } as never,
      'Erkek',
    );
    const lowHtml = renderToStaticMarkup(createElement(MMPIClinicalTab, { profile: low }));
    const hsCard = cardOf(lowHtml, 'Hs');
    assert.match(hsCard, /KLİNİK DÜŞÜKLÜK/);
    assert.match(hsCard, /ALT TESTİNDE DÜŞÜK PUAN ALAN BİREYİN/);
    const firstLowItem = grahamListsFor('Hs', 20, 'low').lists[0]!.items[0]!;
    assert.ok(lowHtml.includes(escapeHtml(typeof firstLowItem === 'string' ? firstLowItem : firstLowItem.text)));
  });
});

/* --------------------------------------------------------------------------
   CSS sözleşmesi — kurallar doğrudan stil dosyasından ölçülür.
   -------------------------------------------------------------------------- */

type CssRule = { selector: string; declarations: string; atRules: string[] };

/** Yorumları atıp `seçici { bildirimler }` çiftlerini @media bağlamıyla çıkarır. */
function parseCssRules(source: string): CssRule[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  const stack: string[] = [];
  let buffer = '';
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i]!;
    if (ch === '{') {
      const head = buffer.trim().replace(/\s+/g, ' ');
      buffer = '';
      if (head.startsWith('@')) {
        stack.push(head);
        continue;
      }
      let depth = 1;
      let j = i + 1;
      let body = '';
      while (j < css.length && depth > 0) {
        const c = css[j]!;
        if (c === '{') depth += 1;
        else if (c === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
        body += c;
        j += 1;
      }
      rules.push({ selector: head, declarations: body, atRules: [...stack] });
      i = j;
    } else if (ch === '}') {
      stack.pop();
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return rules;
}

const DOSSIER_MARKERS = [
  'clinical-report-note',
  'clin-report',
  'clin-quicknav',
  'scale-dossier',
  'dossier-',
  'graham-',
  'klinik-pill',
  'score-t',
  'cond-',
  'tablo-',
];

describe('Klinik rapor CSS’i sitenin tasarım sözleşmesine uyar', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/styles/workspace.css'), 'utf-8');
  const dossierRules = parseCssRules(css).filter(r => DOSSIER_MARKERS.some(m => r.selector.includes(m)));

  /**
   * Kâğıt kopyasında geçerli kurallar: medya sorgusuz (paylaşılan) ya da
   * yazdırmayı kapsayan medya bloklarındaki kurallar. `.pr-*` sunumu
   * 2026-09-24'ten beri `@media screen, print` içindedir: "TAM RAPOR"
   * önizlemesi ve kâğıt aynı sınıfları paylaşır (ekranda stilsiz görünme
   * hatası böyle düzeltildi), bu yüzden yalnız `@media print` aranmaz.
   */
  const appliesOnPaper = (rule: { atRules: string[] }): boolean =>
    rule.atRules.length === 0 ||
    rule.atRules.every(at => !at.startsWith('@media screen') || /print/.test(at));

  it('rapor kartına ait kurallar bulunur', () => {
    assert.ok(dossierRules.length >= 40, `beklenenden az kural: ${dossierRules.length}`);
  });

  it('hiçbir kural @media bloğu dışında kalmaz (ekran/kâğıt ayrımı korunur)', () => {
    for (const rule of dossierRules) {
      assert.ok(
        rule.atRules.some(a => a.startsWith('@media')),
        `${rule.selector} bir @media bloğu dışında — yazdırılabilir A4 sayfaya sızar`,
      );
    }
  });

  it('ekran kuralları @media screen içindedir', () => {
    const screenRules = dossierRules.filter(r => r.atRules.some(a => a.startsWith('@media screen')));
    assert.ok(screenRules.length >= 35);
  });

  // Tipografi sözleşmesi yalnız siteye ait EKRAN (UI) kuralları için geçerlidir:
  // kâğıt (A4) bloğu kendi ölçüsünü kullanır. `.pr-*` ailesi 2026-09-24'ten beri
  // `@media screen, print` içinde paylaşılır (TAM RAPOR önizlemesi ekranda aynı
  // sunumu gösterir) ve bir BELGE tipografisidir — UI kartı değil; bu yüzden
  // ekran-ÖZEL kurallar süzülürken dışarıda kalır.
  const isScreenOnly = (rule: { atRules: string[] }): boolean =>
    rule.atRules.some(at => at.startsWith('@media screen') && !/print/.test(at));
  const screenDossierRules = dossierRules.filter(isScreenOnly);

  it('kartın içinde serif (var(--font-display)) kullanılmaz', () => {
    assert.ok(screenDossierRules.length >= 35);
    for (const rule of screenDossierRules) {
      assert.doesNotMatch(
        rule.declarations,
        /font-family:\s*var\(--font-display\)/,
        `${rule.selector} serif istiyor — veri kartında arayüz yazı tipi kullanılır`,
      );
      assert.doesNotMatch(rule.declarations, /font-style:\s*italic/, `${rule.selector} italik istiyor`);
    }
  });

  it('10px altı metin ve 700 üstü ağırlık yoktur', () => {
    for (const rule of screenDossierRules) {
      for (const size of [...rule.declarations.matchAll(/font-size:\s*([\d.]+)px/g)]) {
        assert.ok(Number(size[1]) >= 10, `${rule.selector} font-size ${size[1]}px okunabilirlik sınırının altında`);
      }
      for (const weight of [...rule.declarations.matchAll(/font-weight:\s*(\d+)/g)]) {
        assert.ok(
          Number(weight[1]) <= 700,
          `${rule.selector} font-weight ${weight[1]} — sistem karşılığı yüzlerde sahte kalın üretir`,
        );
      }
    }
  });

  it('ölçü satırı flex’tir: ızgarada boş (gri) hücre bırakmaz', () => {
    const facts = screenDossierRules.find(r => r.selector === '.dossier-facts');
    assert.ok(facts, '.dossier-facts kuralı bulunmalı');
    assert.match(facts!.declarations, /display:\s*flex/, 'hücreler genişliği paylaşmalı');
    assert.match(facts!.declarations, /flex-wrap:\s*wrap/);
    assert.doesNotMatch(
      facts!.declarations,
      /grid-template-columns/,
      'auto-fit ızgara, sığmayan hücrede gri boşluk bırakır',
    );
    assert.ok(
      !dossierRules.some(r => r.selector === '.dossier-fact.is-wide'),
      'K düzeltmesi artık satırı kaplamıyor; dört ölçü aynı satırda',
    );
  });

  it('Graham listesi geniş ekranda iki sütun, dar ekranda tek sütundur', () => {
    const wide = dossierRules.find(r => r.selector === '.graham-list' && !r.atRules.some(a => a.includes('max-width')));
    assert.ok(wide, '.graham-list kuralı bulunmalı');
    assert.match(wide!.declarations, /columns:\s*2/);
    assert.match(wide!.declarations, /column-rule/);
    const wideItem = dossierRules.find(r => r.selector === '.graham-list > li');
    assert.ok(wideItem, '.graham-list > li kuralı bulunmalı');
    assert.match(wideItem!.declarations, /break-inside:\s*avoid/, 'maddeler sütunlar arasında bölünmemeli');
    const narrow = dossierRules.find(
      r => r.selector === '.graham-list' && r.atRules.some(a => a.includes('max-width')),
    );
    assert.ok(narrow, 'dar ekran için .graham-list kuralı olmalı');
    assert.match(narrow!.declarations, /columns:\s*1/);
  });

  it('kâğıtta ölçek dosyası çıktı özeti olarak basılır; madde listesi kuralı kalkar', () => {
    const printRules = parseCssRules(css).filter(appliesOnPaper);
    for (const selector of [
      '.pr-dossier',
      '.pr-block .pr-dossier-head',
      '.pr-dossier-notes',
      '.pr-dossier-cond',
      '.pr-dossier-facts',
      '.pr-dossier-source',
    ]) {
      assert.ok(printRules.some(r => r.selector === selector), `${selector} kâğıt kuralı olmalı`);
    }
    // Kaynak enumerasyonu kâğıda basılmadığı için onun kâğıt kuralı da yoktur.
    assert.ok(
      !printRules.some(r => r.selector.startsWith('.pr-graham')),
      'kâğıtta Graham madde listesi kuralı kalmamalı',
    );
    const head = printRules.find(r => r.selector === '.pr-block .pr-dossier-head')!;
    // .pr-block h3 büyük harf tanımlar; başlık satırı bunu bastırmalı.
    assert.match(head.declarations, /display:\s*flex/);
    assert.match(head.declarations, /text-transform:\s*none/);
  });

  it('kâğıtta düz yazı blokları yapılandırılır (salt metin yığını değil)', () => {
    const printRules = parseCssRules(css).filter(appliesOnPaper);
    const note = printRules.find(r => r.selector === '.pr-note')!;
    assert.match(note.declarations, /border-left/, 'not blokları sol çizgiyle ayrılmalı');
    assert.match(note.declarations, /break-inside:\s*avoid/);
    for (const selector of ['.pr-note-head', '.pr-note-body', '.pr-note-band']) {
      assert.ok(printRules.some(r => r.selector === selector), `${selector} kâğıt kuralı olmalı`);
    }
    const zebra = printRules.find(r => r.selector === '.pr-table tbody tr:nth-child(even)');
    assert.ok(zebra, 'tablolarda satır ayracı olmalı');
    const thead = printRules.find(r => r.selector === '.pr-table thead');
    assert.match(thead!.declarations, /table-header-group/, 'uzun tabloda başlık sayfada tekrarlanmalı');
    const widow = printRules.find(r => r.selector === '.pr-report p');
    assert.match(widow!.declarations, /widows:\s*2/);
  });

  it('kâğıtta katlanmış hiçbir bölüm eksik basılmaz', () => {
    const printRules = parseCssRules(css).filter(r => r.atRules.includes('@media print'));
    const unfold = printRules.find(r => r.selector === '.mmpi-disc-body[hidden]');
    assert.ok(unfold, 'yazdırmada katlanmış gövdeleri açan kural olmalı');
    assert.match(unfold!.declarations, /display:\s*flex\s*!important/);
    const cardBody = printRules.find(r => r.selector === '.scale-dossier-body[hidden]');
    assert.ok(cardBody, 'yazdırmada katlanmış kart gövdeleri de açılmalı');
    assert.match(cardBody!.declarations, /display:\s*flex\s*!important/);
    const chrome = printRules.find(r => r.selector.includes('.clin-report-tools'));
    assert.ok(chrome, 'yazdırmada toplu denetimler gizlenmeli');
    assert.match(chrome!.declarations, /display:\s*none\s*!important/);
  });
});


/* --------------------------------------------------------------------------
   Yazdırma / PDF raporu — kâğıt da aynı kaynağı taşır.
   -------------------------------------------------------------------------- */

describe('Yazdırma raporu (PDF) kaynak içeriği eksiksiz taşır', () => {
  const profile = mixedProfile();
  const html = renderToStaticMarkup(
    createElement(MMPIPrintReport, {
      profile,
      meta: {
        fullName: 'Örnek Danışan',
        testDate: '2026-09-23',
        reportDate: '2026-09-23',
        psychologist: 'Uzm. Psk.',
        gender: 'Erkek',
        age: '32',
        occupation: '—',
        education: 'Lisans',
        method: 'Örnek',
        duration: '45 dk',
        reason: 'Doğrulama',
        followUp: '—',
        marital: '—',
        revisionOf: 'ec1b0864-d76b-4cbd-9f58-2404cd73ff41',
        revisionReason: 'Düzenleme',
      },
    }),
  );

  /** Kâğıt çıktısında adı geçen ölçeğin `pr-dossier` bloğunu ayıklar. */
  function chunksFor(source: string, fullName: string): string | undefined {
    return source.split('class="pr-dossier"').slice(1).find(chunk => chunk.includes(fullName));
  }

  it('kâğıtta ölçek başına çıktı özeti basılır; Graham madde listeleri basılmaz', () => {
    assert.match(html, /Ölçek Bazlı Klinik Yorum \(Graham 1987\)/);
    // `class="pr-dossier"` (tırnak dahil) yalnız blok kökünde geçer; -notes/-cond
    // gibi türetilmiş sınıflarla karışmaz.
    const chunks = html.split('class="pr-dossier"').slice(1);
    assert.equal(chunks.length, flaggedOf(profile).length, 'belirgin ölçek sayısı kadar blok basılmalı');
    for (const scale of flaggedOf(profile)) {
      const block = chunks.find(chunk => chunk.includes(`>${scale.fullName} (${scale.shortName})</span>`));
      assert.ok(block, `${scale.id} blok başlığı basılmalı`);
      assert.match(block!, /KLİNİK (YÜKSEKLİK|DÜŞÜKLÜK)/, 'düzey rozeti basılmalı');
      assert.match(block!, new RegExp(`T ${scale.tScore.toFixed(1)}`), 'T skoru basılmalı');
      assert.match(block!, /Tablo \d+: \d+ madde \(\d+ doğru \/ \d+ yanlış\)/, 'Tablo özeti basılmalı');
      assert.match(block!, /Kaynak: Graham \(1987\)/, 'kâğıtta kaynak künyesi olmalı');

      // Kaynak enumerasyonu kâğıda taşınmaz: her hastada aynı 20-45 maddelik
      // liste sayfa yükü yaratır; ekran raporundaki katlanabilir kartta kalır.
      const items = grahamListsFor(
        scale.id as ClinicalScaleId,
        scale.tScore,
        scale.tScore >= 70 ? 'high' : 'low',
      ).lists.flatMap(l => l.items);
      assert.ok(items.length > 0);
      const first = items[0]!;
      assert.ok(
        !block!.includes(escapeHtml(typeof first === 'string' ? first : first.text)),
        `${scale.id} Graham madde listesi kâğıda basılmamalı`,
      );
      assert.ok(!block!.includes('pr-graham'), `${scale.id} blokunda madde listesi kalmamalı`);
    }
    // Okur ayrıntının nerede olduğunu bilmeli.
    assert.match(
      html,
      /Graham \(1987\) madde listelerinin tamamı ekran raporundaki ölçek\s+kartlarındadır/,
    );
  });

  it('kâğıtta aynı demografik not başlığı ardışık notlarda yinelenmez', () => {
    // Hs'nin iki başlıksız notu vardır; etiket bir kez basılmalı, metin eksilmemeli.
    const hs = chunksFor(html, 'Hipokondriazis');
    assert.ok(hs, 'Hipokondriazis bloğu basılmalı');
    const labels = hs!.match(/Demografik ve klinik notlar: /g) ?? [];
    assert.equal(labels.length, 1, 'etiket yalnız bir kez basılmalı');
    for (const fragment of [
      '40 yaşın üzerindekilerde daha çok yükseldiği',
      'Ciddi bedensel hastalığı olan bireylerde de bu alt testte yükselme vardır',
      'sık sık doktor doktor gezerler',
    ]) {
      assert.ok(hs!.includes(fragment), `kaynak metni eksiksiz taşınmalı: ${fragment}`);
    }
  });

  it('K düzeltmesi oranları klasik ekleme tablosuyla birebir verilir', () => {
    // Kaynak: Tablo 8-17 dipnotları + OCR denetimi (Hs +.5K, Pd +.4K, Pt +1K, Sc +1K, Ma +.2K)
    assert.equal(K_CORRECTION.Hs, 0.5);
    assert.equal(K_CORRECTION.Pd, 0.4);
    assert.equal(K_CORRECTION.Pt, 1.0);
    assert.equal(K_CORRECTION.Sc, 1.0);
    assert.equal(K_CORRECTION.Ma, 0.2);
    assert.match(html, /K düzeltmesi \(klasik ekleme tablosu\): Hs \+0\.5K, Pd \+0\.4K, Pt \+1K, Sc \+1K, Ma \+0\.2K/);
    assert.match(html, /D, Hy, Mf, Pa ve\s+Si ölçeklerine K eklenmez/);
  });

  it('künye basılır; dosya adı ve satır içi sayfa referansı sızmaz', () => {
    assert.match(html, /Ceyhun, A\. A\., &amp; Oral, G\. \(2003\)/);
    assert.match(html, /Savaşır, I\. \(1981\)/);
    assert.doesNotMatch(html, /kaynak\.pdf/i);
    // Künye satırları dışında gövdeye sayfa referansı girmez.
    const body = html
      .replace(/<p class="pr-dossier-source">[\s\S]*?<\/p>/g, '')
      .replace(/<p class="pr-foot">[\s\S]*?<\/p>/g, '');
    assert.doesNotMatch(body, /s\.\d/);
  });

  it('revizyon kökeni kâğıtta izlenebilir kalır', () => {
    assert.match(html, /ec1b0864-d76b-4cbd-9f58-2404cd73ff41/);
    assert.match(html, /Neden: Düzenleme/);
  });
});
