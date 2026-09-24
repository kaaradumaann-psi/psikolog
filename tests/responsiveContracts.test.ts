import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Responsive sözleşme testleri.
 *
 * Bu testler görsel doğrulamanın yerini TUTMAZ; tarayıcı çalıştırılamayan
 * ortamlarda responsive katmanın sözleşmesini kilitler:
 *
 *   1. `viewport` meta etiketi cihaz genişliğini ve çentik güvenli alanını bildirir.
 *   2. `responsive.css` son sırada yüklenir ve hiç `!important` / `@media print`
 *      içermez — yazdırma hattı bu dosyadan tek bildirim almaz.
 *   3. 100vh yerine dvh: mobil tarayıcı çubuğu tam ekran kolonları zıplatmasın.
 *   4. Mobilde (≤720px) her form kontrolü ≥16px: iOS Safari focus zoom'u oluşmaz.
 *   5. Mobilde kompakt kontroller ≥44px dokunma hedefi.
 *   6. Kuralların tamamı ekran medya sorgularının içindedir.
 */

const STYLE_DIR = 'src/styles';
const RESPONSIVE = `${STYLE_DIR}/responsive.css`;

type CssRule = { atRules: string[]; selector: string; declarations: string };

/** Yorumları temizler, iç içe geçmiş @media bloklarını takip ederek kuralları düzleştirir. */
function parseCss(input: string): CssRule[] {
  const css = input.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  const walk = (text: string, atRules: string[]): void => {
    let i = 0;
    let buffer = '';
    while (i < text.length) {
      const ch = text[i]!;
      if (ch === '{') {
        let depth = 1;
        let j = i + 1;
        while (j < text.length && depth > 0) {
          if (text[j] === '{') depth += 1;
          else if (text[j] === '}') depth -= 1;
          j += 1;
        }
        const body = text.slice(i + 1, j - 1);
        const prelude = buffer.trim().replace(/\s+/g, ' ');
        if (prelude.startsWith('@')) {
          // Only conditional group rules nest further; @keyframes/@page are leaves.
          if (/^@(media|supports|layer|container)\b/.test(prelude)) walk(body, [...atRules, prelude]);
        } else if (prelude) {
          rules.push({ atRules, selector: prelude, declarations: body.trim() });
        }
        buffer = '';
        i = j;
      } else if (ch === '}') {
        buffer = '';
        i += 1;
      } else {
        buffer += ch;
        i += 1;
      }
    }
  };
  walk(css, []);
  return rules;
}

const responsiveCss = readFileSync(RESPONSIVE, 'utf8');
const responsiveRules = parseCss(responsiveCss);

/** Verilen üst sınırı kapsayan ekran media sorgularında geçen kurallar. */
function rulesWithin(maxWidth: number): CssRule[] {
  return responsiveRules.filter(rule =>
    rule.atRules.some(at => {
      if (!/^@media\s+screen/.test(at)) return false;
      const match = /max-width:\s*(\d+)px/.exec(at);
      return match ? Number(match[1]) >= maxWidth : false;
    }),
  );
}

/** Belirli bir üst sınırın altındaki katmanda bir seçiciye yazılan tüm bildirimler. */
function selectorDeclarations(selector: string, maxWidth: number): string {
  return rulesWithin(maxWidth)
    .filter(rule => rule.selector.split(',').some(s => s.trim() === selector))
    .map(rule => rule.declarations)
    .join('\n');
}

/** `input`, `select`, `textarea` öğelerini hedefleyen seçiciler (sınıf adı içindeki eşleşmeler hariç). */
function isControlSelector(selector: string): boolean {
  return /(?:^|[\s,>+~])(?:input|select|textarea)(?![\w-])/.test(selector);
}

test('viewport meta etiketi çentik (notch) güvenli alanını bildirir', () => {
  const html = readFileSync('index.html', 'utf8');
  const meta = /<meta name="viewport" content="([^"]+)"/.exec(html);
  assert.ok(meta, 'viewport meta etiketi bulunamadı');
  assert.match(meta![1]!, /width=device-width/);
  assert.match(meta![1]!, /viewport-fit=cover/, 'viewport-fit=cover olmalı (safe-area insets)');
});

test('responsive.css en son yüklenir; !important ve @media print içermez', () => {
  const main = readFileSync('src/main.tsx', 'utf8');
  const imports = [...main.matchAll(/import\s+'\.\/styles\/([^']+)'/g)].map(m => m[1]!);
  assert.equal(imports.at(-1), 'responsive.css', 'responsive.css en son import edilmeli');
  const withoutComments = responsiveCss.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/!important/.test(withoutComments), 'responsive.css !important içermemeli');
  assert.ok(!/@media\s+print/.test(withoutComments), 'responsive.css yazdırma hattına dokunmamalı');
  assert.ok(!/@page/.test(withoutComments), 'responsive.css @page tanımlamamalı');
});

test('tüm responsive kuralları ekran medya sorgusu içindedir', () => {
  const naked = responsiveRules.filter(rule => !rule.atRules.some(at => at.startsWith('@media screen')));
  assert.deepEqual(naked.map(rule => rule.selector), [], 'ekran medya sorgusu dışında kural var');
});

test('100vh yerine dvh: mobil tarayıcı çubuğu tam ekran kolonları zıplatmasın', () => {
  const targets = ['.portal-layout', '.auth-page', '.info-shell', '.modal-container'];
  for (const target of targets) {
    const rules = responsiveRules.filter(rule => rule.selector.split(',').some(s => s.trim() === target));
    const declarations = rules.map(rule => rule.declarations).join('\n');
    assert.match(declarations, /100dvh|90dvh/, `${target} için dvh kuralı olmalı`);
    assert.match(declarations, /100vh|90vh/, `${target} için vh fallback olmalı`);
  }
});

test('mobilde (≤720px) form kontrolleri en az 16px: iOS focus zoom oluşmaz', () => {
  const mobile = rulesWithin(720);
  const catchAll = mobile.some(rule =>
    rule.selector.split(',').some(s => s.trim() === 'input') &&
    /font-size:\s*16px/.test(rule.declarations),
  );
  assert.ok(catchAll, 'stylesiz kontroller için 16px catch-all kuralı olmalı');

  // Tasarım sisteminin kendi küçük boyutunu verdiği kontroller açıkça düzeltilmeli.
  const styledControls = [
    '.form-group input',
    '.form-group select',
    '.search-input-wrapper input',
    '.date-filter-field input',
    '.date-filter-field select',
    '.filter-group select',
    '.raw-field input',
    '.expert-notes-input',
    '.ws-form textarea',
    '.report-settings-grid input',
    '.report-toolbar select',
  ];
  const overridden = mobile
    .filter(rule => /font-size:\s*(?:1[6-9]|[2-9]\d)px/.test(rule.declarations))
    .flatMap(rule => rule.selector.split(',').map(s => s.trim()));
  for (const control of styledControls) {
    assert.ok(overridden.includes(control), `${control} mobilde 16px'e çıkarılmalı`);
  }
});

test('mobilde kompakt kontroller ≥44px dokunma hedefi', () => {
  const mobile = rulesWithin(720);
  const minHeight44 = mobile
    .filter(rule => /min-height:\s*44px/.test(rule.declarations))
    .flatMap(rule => rule.selector.split(',').map(s => s.trim()));
  for (const control of ['.btn-sm', '.icon-close-btn', '.portal-tab', '.mmpi-tab', '.site-footer-link']) {
    assert.ok(minHeight44.includes(control), `${control} mobilde ≥44px olmalı`);
  }

  const heights44 = mobile
    .filter(rule => /height:\s*44px/.test(rule.declarations))
    .flatMap(rule => rule.selector.split(',').map(s => s.trim()));
  for (const field of ['.date-filter-field input', '.date-filter-field select', '.raw-field input']) {
    assert.ok(heights44.includes(field), `${field} mobilde 44px yüksekliğe çıkmalı`);
  }
});

test('küçük telefon katmanı (≤430px) vardır ve 320px için gutter tanımlar', () => {
  const small = responsiveRules.filter(rule => rule.atRules.some(at => /max-width:\s*430px/.test(at)));
  assert.ok(small.length > 0, '≤430px katmanı olmalı');
  const appMain = small.find(rule => rule.selector.split(',').some(s => s.trim() === '.app-main'));
  assert.ok(appMain, '.app-main için ≤430px kuralı olmalı');
  assert.match(appMain!.declarations, /padding:\s*16px 12px/);
});

test('temel CSS’te kalan her <16px kontrol responsive.css mobil katmanında düzeltilir', () => {
  // `:not(...)` grupları iki taraftan da soyulur: kuralın hedefi aynı kontrol kümesidir.
  const normalize = (selector: string): string => selector.replace(/:not\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();

  const mobileOverrides = new Set(
    rulesWithin(720)
      .filter(rule => /font-size:\s*(?:1[6-9]|[2-9]\d)px/.test(rule.declarations))
      .flatMap(rule => rule.selector.split(',').map(s => normalize(s))),
  );

  // Kasıtlı istisna: APA rapor başlığı display tipografidir (mobilde 19–24px clamp alır).
  const isDocumentedException = (selector: string): boolean => selector.includes('report-title-input');

  const files = ['auth.css', 'reports.css', 'scanner.css', 'scanner-enhancements.css', 'screen.css', 'site.css', 'theme.css', 'workspace.css', 'mobile.css'];
  const offenders: string[] = [];
  for (const file of files) {
    for (const rule of parseCss(readFileSync(`${STYLE_DIR}/${file}`, 'utf8'))) {
      if (!isControlSelector(rule.selector)) continue;
      const size = /font-size:\s*([\d.]+)px/.exec(rule.declarations);
      if (!size || Number(size[1]) >= 16) continue;
      for (const raw of rule.selector.split(',').map(s => s.trim())) {
        if (!isControlSelector(raw)) continue;
        const selector = normalize(raw);
        if (isDocumentedException(selector)) continue;
        if (!mobileOverrides.has(selector)) offenders.push(`${file}: ${raw} → ${size[1]}px`);
      }
    }
  }
  assert.deepEqual(offenders, [], `Mobil düzeltmesi olmayan küçük kontrol boyutları: ${offenders.join(' | ')}`);
});

/* --------------------------------------------------------------------------
   Phase 2 — navigasyon ve sayfa kabuğu
   -------------------------------------------------------------------------- */

test('yönetim alt sekmeleri ≤720px’te taşma yerine kendi içinde kaydırılır', () => {
  const declarations = selectorDeclarations('.admin-subnav-tabs', 720);
  assert.match(declarations, /flex-wrap:\s*nowrap/);
  assert.match(declarations, /overflow-x:\s*auto/);
  const tabDeclarations = selectorDeclarations('.subnav-tab', 720);
  assert.match(tabDeclarations, /flex:\s*0 0 auto/);
  assert.match(tabDeclarations, /white-space:\s*nowrap/);
});

test('tablet başlığı (≤1100px) uzun kullanıcı adını kırpar, satırı genişletmez', () => {
  const header = responsiveRules.filter(rule => rule.atRules.some(at => /max-width:\s*1100px/.test(at)));
  assert.ok(header.length > 0, '≤1100px tablet katmanı olmalı');
  const declarations = selectorDeclarations('.user-full-name', 1100);
  assert.match(declarations, /text-overflow:\s*ellipsis/);
  assert.match(declarations, /overflow:\s*hidden/);
});

test('mobil sayfa kabukları daraltılmış gutter kullanır', () => {
  assert.match(selectorDeclarations('.reports-page', 720), /padding:\s*20px 16px 36px/);
  assert.match(selectorDeclarations('.app-main', 430), /padding:\s*16px 12px 40px/);
});

/* --------------------------------------------------------------------------
   Phase 3 — formlar ve etkileşim bileşenleri
   -------------------------------------------------------------------------- */

test('mobilde onay modalı içeriği ekran genişliğini kullanır', () => {
  assert.match(selectorDeclarations('.modal-header', 720), /padding:\s*16px 16px 14px/);
  assert.match(selectorDeclarations('.modal-body', 720), /padding:\s*16px/);
  const footer = selectorDeclarations('.modal-footer', 720);
  assert.match(footer, /padding:\s*12px 16px/);
  assert.match(footer, /flex-wrap:\s*wrap/);
  assert.match(selectorDeclarations('.modal-backdrop', 430), /padding:\s*12px/);
});

test('mobilde dar form ızgaraları tek kolona iner', () => {
  assert.match(selectorDeclarations('.form-grid-2col', 560), /grid-template-columns:\s*1fr/);
  assert.match(selectorDeclarations('.form-grid-3col', 560), /grid-template-columns:\s*1fr/);
});

test('rapor editörü araç çubuğu mobilde sabit kalmaz, hücre alanları büyür', () => {
  assert.match(selectorDeclarations('.report-toolbar', 720), /position:\s*static/);
  assert.match(selectorDeclarations('.report-edit-table textarea', 720), /min-height:\s*44px/);
});

/* --------------------------------------------------------------------------
   Phase 4 — tablolar, listeler, kartlar
   -------------------------------------------------------------------------- */

test('kayıt tabloları mobilde sıkışmak yerine kendi içinde kaydırılır', () => {
  // Kart moduna geçmeyen tablolar için yatay kaydırma katmanı korunur.
  const table = selectorDeclarations('.modern-data-table:not([data-mobile-cards])', 720);
  assert.match(table, /min-width:\s*640px/, 'tablo doğal kolon genişliğini korumalı');
  const cells = selectorDeclarations('.modern-data-table:not([data-mobile-cards]) td:first-child', 720);
  assert.match(cells, /position:\s*sticky/, 'kimlik kolonu yatay kaydırmada sabit kalmalı');
  assert.match(cells, /background:/, 'sticky hücrenin arka planı olmalı (aksi hâlde metin üst üste biner)');
  const scroller = selectorDeclarations('.table-responsive', 720);
  assert.match(scroller, /overflow-x:\s*auto/);
});

test('işlem sütunlu tablolar telefonda kart olur: eylemler kaydırmasız görünür', () => {
  // Kullanıcı geri bildirimi: "Yönetim → Testler'de işlemleri görmek için sağa
  // kaydırmak gerekiyor." data-mobile-cards işaretli tablolar ≤720px'te karta
  // dönüşür; satır eylemleri kartın altında tam genişlik durur.
  const cardTable = selectorDeclarations('.modern-data-table[data-mobile-cards]', 720);
  assert.match(cardTable, /display:\s*block/, 'kart modunda tablo blok akışa geçmeli');
  const rows = selectorDeclarations('.modern-data-table[data-mobile-cards] tbody tr', 720);
  assert.match(rows, /display:\s*block/, 'her satır bir kart olmalı');
  const cells = selectorDeclarations('.modern-data-table[data-mobile-cards] td', 720);
  assert.match(cells, /display:\s*block/, 'hücreler alt alta akmalı');
  const labels = selectorDeclarations('.modern-data-table[data-mobile-cards] td::before', 720);
  assert.match(labels, /content:\s*attr\(data-label\)/, 'hücre etiketi data-label niteliğinden gelmeli');
  const actions = selectorDeclarations('.modern-data-table[data-mobile-cards] .table-row-actions > *', 720);
  assert.match(actions, /min-height:\s*44px/, 'kart eylemleri dokunma hedefi olmalı');
  const wrap = selectorDeclarations('.table-responsive:has(.modern-data-table[data-mobile-cards])', 720);
  assert.match(wrap, /overflow-x:\s*visible/, 'kart modunda yatay kaydırma kabı kalmamalı');
  // Gerçek tablolar işaretlenmiş mi?
  for (const file of ['src/components/AdminPanel.tsx', 'src/components/MyRecordsPanel.tsx', 'src/reports/ReportsPage.tsx']) {
    const tsx = readFileSync(file, 'utf8');
    assert.match(tsx, /data-mobile-cards/, `${file} tablosu kart modunu kullanmalı`);
    assert.match(tsx, /data-label="İşlemler"/, `${file} işlem hücresi etiketli olmalı`);
  }
});

test('küçük telefonlarda liste/kart ayakları ve filtre satırı sarar', () => {
  assert.match(selectorDeclarations('.review-pagination-bar', 430), /flex-wrap:\s*wrap/);
  assert.match(selectorDeclarations('.search-filter-box > div', 430), /flex-wrap:\s*wrap/);
});

/* --------------------------------------------------------------------------
   Phase 5 — raporlar, grafikler, yazdırma
   -------------------------------------------------------------------------- */

test('rapor bölünmüş görünümü 1240px altında tek kolona iner (editör daralmasın)', () => {
  const reports = readFileSync(`${STYLE_DIR}/reports.css`, 'utf8');
  const rules = parseCss(reports);
  const split = rules.filter(rule =>
    rule.selector.split(',').some(s => s.trim() === '.report-split') &&
    rule.declarations.includes('grid-template-columns'),
  );
  // Geniş ekran: sabit 760px önizleme kolonu ile iki kolon.
  assert.ok(split.some(rule => /minmax\(0, 1\.1fr\) 760px/.test(rule.declarations)), 'masaüstü iki kolon korunmalı');
  // Dar ekran: tek kolon + sekme geçişi 1240px'e kadar geçerli olmalı.
  const band = rules.find(rule => rule.atRules.some(at => /max-width:\s*1240px/.test(at)) &&
    rule.selector.split(',').some(s => s.trim() === '.report-split'));
  assert.ok(band, '≤1240px bandı için .report-split kuralı olmalı');
  assert.match(band!.declarations, /grid-template-columns:\s*minmax\(0, 1fr\)/);
  const tabs = rules.find(rule => rule.atRules.some(at => /max-width:\s*1240px/.test(at)) &&
    rule.selector.split(',').some(s => s.trim() === '.report-mobile-tabs'));
  assert.ok(tabs, '≤1240px bandında editör/önizleme sekmeleri görünür olmalı');
  assert.match(tabs!.declarations, /display:\s*flex/);
});

test('önizleme paneli yükseklik sınırı yalnızca iki kolonlu görünümde uygulanır', () => {
  const scoped = responsiveRules.filter(rule =>
    rule.selector.split(',').some(s => s.trim() === '.report-preview-paper') &&
    rule.declarations.includes('max-height'),
  );
  assert.ok(scoped.length > 0, 'önizleme paneli dvh kuralı olmalı');
  for (const rule of scoped) {
    assert.ok(
      rule.atRules.some(at => /min-width:\s*1241px/.test(at)),
      'önizleme paneli yükseklik sınırı yalnızca >1240px için tanımlanmalı',
    );
  }
});

test('mobilde grafik ve geniş tablolar kaydırma affordance’ı taşır', () => {
  const chart = selectorDeclarations('.mmpi-chart-card', 720);
  assert.match(chart, /scrollbar-width:\s*thin/);
  assert.match(chart, /overscroll-behavior-x:\s*contain/);
  const hint = parseCss(responsiveCss).find(rule => rule.selector.trim() === '.mmpi-chart-hint');
  assert.ok(hint, 'grafik ipucu sınıfı tanımlı olmalı');
  assert.match(hint!.declarations, /display:\s*none/, 'ipucu masaüstünde gizli olmalı');
  assert.match(selectorDeclarations('.mmpi-chart-hint', 720), /display:\s*block/);
  for (const surface of ['.mmpi-summary-table-wrap', '.mmpi-answers-grid']) {
    assert.match(selectorDeclarations(surface, 720), /scrollbar-width:\s*thin/);
  }
});

test('grafik ipucu metni sonuç panelinde gerçekten basılır', () => {
  const panel = readFileSync('src/components/results/MMPIResultsPanel.tsx', 'utf8');
  assert.match(panel, /className="mmpi-chart-hint"/, 'ipucu DOM’da bulunmalı');
  assert.match(panel, /okunabilir boyutta/, 'ipucu metni grafiğin okunabilir boyutta olduğunu söylemeli');
});

test('dar ekranda MMPI profili okunabilir HTML panele döner, sayfa kaydırmaz', () => {
  const mobile = selectorDeclarations('.mmpi-chart-card .mmpi-chart-mobile', 1024);
  assert.match(mobile, /display:\s*flex/, 'analiz kartında mobil profil görünmeli');
  const desktop = selectorDeclarations('.mmpi-chart-card .mmpi-chart-desktop', 1024);
  assert.match(desktop, /display:\s*none/, 'küçültülmüş 1400px SVG analiz kartında gizlenmeli');
  const wrap = selectorDeclarations('.mmpi-chart-card .mmpi-chart-wrap', 1024);
  assert.match(wrap, /min-width:\s*0/, 'grafik sarmalayıcısı sayfayı genişletmemeli');
  const chart = readFileSync('src/components/results/MMPIScoreChart.tsx', 'utf8');
  assert.match(chart, /mmpi-chart-mobile/);
  assert.match(chart, /mmpi-mini-x/, 'her ölçeğin altında okunabilir T skoru olmalı');
  const workspaceCss = readFileSync(`${STYLE_DIR}/workspace.css`, 'utf8');
  assert.match(workspaceCss, /\.mmpi-chart-mobile[\s\S]*display:\s*none !important/, 'baskıda mobil profil gizlenmeli');
});

test('rapor araç çubuğu mobilde sarar, Tablo düğmesi sayfayı kaydırmaz', () => {
  const group = selectorDeclarations('.report-toolbar-group', 720);
  assert.match(group, /flex-wrap:\s*wrap/);
  assert.match(group, /max-width:\s*100%/);
  const structure = selectorDeclarations(".report-toolbar-group[aria-label='Yapı']", 720);
  assert.match(structure, /width:\s*100%/, 'H1–Tablo grubu editör genişliğine sığmalı');
  assert.match(selectorDeclarations('.report-toolbar', 720), /overflow-x:\s*clip/);
});

test('OMR uzun dosya adı sayfayı genişletmeden kırılır', () => {
  const live = selectorDeclarations('.status-live-text', 1200);
  assert.match(live, /overflow-wrap:\s*anywhere/);
  assert.match(live, /min-width:\s*0/);
  const source = selectorDeclarations('.scan-source-name', 1200);
  assert.match(source, /overflow-wrap:\s*anywhere/);
  assert.match(selectorDeclarations('.scanner-status-strip', 1200), /overflow-x:\s*clip/);
});

test('mobilde katlanmış kağıt önizlemeleri görünür viewport yüksekliğini aşmaz', () => {
  assert.match(selectorDeclarations('.report-full-preview-body', 720), /max-height:\s*70dvh/);
  assert.match(selectorDeclarations('.report-examples-body .report-sample-frame', 720), /max-height:\s*60dvh/);
});

test('yazdırma hattı responsive katmandan etkilenmez (tüm @page ve @media print korunur)', () => {
  const printCss = readFileSync(`${STYLE_DIR}/print.css`, 'utf8');
  assert.match(printCss, /@page\s*\{\s*size:\s*A4 portrait/);
  assert.match(printCss, /\.form-page\s*\{[\s\S]*210mm/);
  const reportsCss = readFileSync(`${STYLE_DIR}/reports.css`, 'utf8');
  assert.match(reportsCss, /@page psych-report/, 'isimli @page korunmalı');
  const workspaceCss = readFileSync(`${STYLE_DIR}/workspace.css`, 'utf8');
  assert.match(workspaceCss, /@page mmpi-report/, 'isimli @page korunmalı');
  // responsive.css yazdırma katmanına hiçbir kural eklemez (yorumlar hariç).
  const withoutComments = responsiveCss.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/@media\s+print/.test(withoutComments));
  assert.ok(!/@page/.test(withoutComments), 'responsive.css @page tanımlamamalı');
});

/* --------------------------------------------------------------------------
   Phase 6 — tarayıcı, kamera ve OMR akışı
   -------------------------------------------------------------------------- */

test('kamera eylem düğmeleri tasarım sisteminin düğmelerini kullanır', () => {
  const camera = readFileSync('src/components/CameraCapture.tsx', 'utf8');
  assert.ok(!/className="scan-primary"/.test(camera), 'stilsiz .scan-primary kullanılmamalı');
  assert.match(camera, /className="btn-primary"/, 'birincil kamera eylemi btn-primary olmalı');
  assert.match(camera, /className="btn-secondary"/, 'ikincil kamera eylemi btn-secondary olmalı');
  // Sınıfın CSS karşılığı olmadığı için stil sessizce kayboluyordu; kural burada kilitlenir.
  const css = ['scanner.css', 'theme.css', 'screen.css', 'workspace.css']
    .map(f => readFileSync(`${STYLE_DIR}/${f}`, 'utf8')).join('\n');
  assert.ok(!/\.scan-primary\b/.test(css), '.scan-primary için CSS tanımı yok — kullanılmamalı');
});

test('birincil/ikincil düğmeler mobilde ≥44px dokunma hedefi', () => {
  const declarations = selectorDeclarations('.btn-primary', 720);
  assert.match(declarations, /min-height:\s*44px/);
  assert.match(selectorDeclarations('.btn-secondary', 720), /min-height:\s*44px/);
});

test('kamera sahnesi ve manuel köşe önizlemesi telefonda taşmaz', () => {
  assert.match(selectorDeclarations('.scan-camera-stage', 720), /max-width:\s*100%/);
  const canvas = selectorDeclarations('.manual-corner-preview-canvas', 720);
  assert.match(canvas, /width:\s*100%/);
  assert.match(canvas, /max-width:\s*280px/);
  assert.match(selectorDeclarations('.scan-actions', 720), /flex-wrap:\s*wrap/);
});

test('OMR inceleme yüzeyleri mobilde yeniden dolgulanır', () => {
  assert.match(selectorDeclarations('.item-inspection-box', 720), /padding:\s*14px/);
  assert.match(selectorDeclarations('.scanner-metrics-strip > *', 720), /min-height:\s*44px/);
});

/* --------------------------------------------------------------------------
   Phase 7 — UX tutarlılığı, okunabilirlik ve erişilebilirlik cilası
   -------------------------------------------------------------------------- */

test('onay kutuları ve radyo düğmeleri klavye odağını görünür gösterir', () => {
  const theme = readFileSync(`${STYLE_DIR}/theme.css`, 'utf8');
  const rule = /input\[type='checkbox'\]:focus-visible,\s*input\[type='radio'\]:focus-visible\s*\{([^}]*)\}/.exec(theme);
  assert.ok(rule, 'checkbox/radio için focus-visible kuralı yok');
  assert.match(rule[1]!, /outline:\s*2px solid var\(--text\)/);
});

test('mobilde küçük etiketler 11px tabanına yükselir', () => {
  const declarations = selectorDeclarations('.user-role-badge', 720);
  assert.match(declarations, /font-size:\s*11px/);
  assert.match(selectorDeclarations('.site-footer-disclaimer', 720), /font-size:\s*11px/);
  assert.match(selectorDeclarations('.item-select-chip .item-ans', 720), /font-size:\s*11px/);
});

test('madde seçim çipleri dokunma hedefi kadar yüksek', () => {
  assert.match(selectorDeclarations('.item-select-chip', 720), /min-height:\s*44px/);
});

test('dar ekranda alt bilgi ve skor çipleri taşmak yerine sarar', () => {
  assert.match(selectorDeclarations('.site-footer-copyright', 430), /white-space:\s*normal/);
  assert.match(selectorDeclarations('.site-footer-meta', 430), /white-space:\s*normal/);
  assert.match(selectorDeclarations('.scale-dossier-stats', 430), /flex-wrap:\s*wrap/);
  assert.match(selectorDeclarations('.dossier-stat', 430), /white-space:\s*normal/);
});

test('hata durumları tasarım sisteminin banner sınıfını kullanır', () => {
  const reports = readFileSync('src/reports/ReportsPage.tsx', 'utf8');
  assert.ok(!/<p role="alert">/.test(reports), 'stilsiz <p role="alert"> kalmamalı');
  assert.match(reports, /className="status-banner error-banner" role="alert"/);
});

/* --------------------------------------------------------------------------
   Phase 9 — gerçek tarayıcı QA bulgularının regresyon kilitleri
   -------------------------------------------------------------------------- */

test('Kaynakça kaydı telefon genişliğinde sayfayı taşırmaz', () => {
  // Ölçüm: 320–414px'te scrollWidth 425 idi; sebep, DOI içeren flex öğesinin
  // min-width: auto ile içeriğinden dar olamaması.
  const citation = selectorDeclarations('.sources-citation', 720);
  assert.match(citation, /min-width:\s*0/);
  assert.match(citation, /overflow-wrap:\s*anywhere/);
  assert.match(selectorDeclarations('.sources-entry-head', 720), /min-width:\s*0/);
});

test('tarayıcı geliştirme pilleri mobilde ≥44px', () => {
  const pill = selectorDeclarations('.scan-enhancer-pill', 720);
  assert.match(pill, /min-height:\s*44px/);
  assert.match(selectorDeclarations('.scan-enhancer-pills', 720), /flex-wrap:\s*wrap/);
});

test('onay diyaloğu odak tuzağı ve arka plan kaydırma kilidi içerir', () => {
  const dialog = readFileSync('src/components/ConfirmDialog.tsx', 'utf8');
  // Odak tuzağı: Tab/Shift+Tab diyalog içinde döner.
  assert.match(dialog, /event\.key !== 'Tab'/, 'Tab tuşu ele alınmalı');
  assert.match(dialog, /dialogRef\.current\?\.contains/, 'odak diyalog içinde mi diye bakılmalı');
  // Arka plan kaydırması kilitlenir ve kaydırma çubuğu telafi edilir.
  assert.match(dialog, /body\.style\.overflow = 'hidden'/, 'gövde kaydırması kilitlenmeli');
  assert.match(dialog, /body\.style\.paddingRight = `\$\{scrollbar\}px`/, 'kaydırma çubuğu telafisi olmalı');
  // Kapanınca odak tetikleyiciye döner.
  assert.match(dialog, /previouslyFocused\?\.focus\(\)/, 'odak tetikleyiciye geri verilmeli');
  // Mevcut davranışlar korunur.
  assert.match(dialog, /event\.key === 'Escape'/);
  assert.match(dialog, /aria-modal="true"/);
});

test('yatay telefon ve tablette (kaba imleç) hedefler 44px kalır', () => {
  const css = readFileSync(`${STYLE_DIR}/responsive.css`, 'utf8');
  // Ölçüm: 844×390'da (genişlik > 720px) düğmeler 34px'e düşüyordu.
  const block = /@media screen and \(pointer: coarse\) and \(max-width: 1024px\)\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(block, 'kaba imleç bandı yok');
  assert.match(block[1]!, /min-height:\s*44px/);
  assert.match(block[1]!, /\.scan-actions > button/);
  assert.match(block[1]!, /\.scanner-input-card button/);
  // Masaüstü yoğunluğu korunmalı: bant 1280px'i kapsamaz.
  assert.match(css, /pointer: coarse\) and \(max-width: 1024px\)/);
});

test('rapor blok denetimleri dokunmatikte ≥44px', () => {
  const css = readFileSync(`${STYLE_DIR}/responsive.css`, 'utf8');
  const block = /@media screen and \(pointer: coarse\) and \(max-width: 1024px\)\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(block, 'kaba imleç bandı yok');
  assert.match(block[1]!, /\.report-block-controls > button/);
  assert.match(block[1]!, /min-width:\s*44px/);
});

test('TAM RAPOR önizlemesinin .pr-* sunumu ekran medyasında kalır (baskı bloğuna hapsolmaz)', () => {
  const rules = parseCss(readFileSync(`${STYLE_DIR}/workspace.css`, 'utf8'));
  // `.pr-*` ağacının ekranda göründüğü TEK yer TAM RAPOR önizlemesidir. Kurallar
  // `@media print` içinde kalırsa önizleme stilsiz (düz metin, çerçevesiz tablo)
  // görünür — bu regresyon 2026-09-24'te düzeltildi, tekrarına izin verilmez.
  const presentation = rules.filter(
    rule => !rule.atRules.some(at => at.startsWith('@media print')) && /\.pr-/.test(rule.selector),
  );
  assert.ok(
    presentation.length >= 50,
    `ekran medyasında yeterli .pr-* sunum kuralı yok: ${presentation.length}`,
  );
  // Baskı bloğunda yalnızca sayfa bağlaması kalır; sunum bildirimi taşımaz.
  const inPrint = rules.filter(
    rule => rule.atRules.some(at => at.startsWith('@media print')) && /\.pr-/.test(rule.selector),
  );
  const styleLeaks = inPrint
    .filter(rule => /font-size|border|padding|background|margin/.test(rule.declarations))
    .map(rule => rule.selector);
  assert.deepEqual(styleLeaks, [], 'baskı bloğunda .pr-* sunum bildirimi kalmamalı');
  assert.ok(
    inPrint.some(rule => /page:\s*mmpi-report/.test(rule.declarations)),
    '.pr-report sayfa bağlaması (@page mmpi-report) korunmalı',
  );
});

test('TAM RAPOR kâğıdı örnek önizlemeyle aynı çerçeveyi kullanır; okunabilirlik ölçeği yalnız ekranda', () => {
  const rules = parseCss(readFileSync(`${STYLE_DIR}/reports.css`, 'utf8'));
  const declsOf = (selector: string): string =>
    rules
      .filter(rule => rule.selector.split(',').some(part => part.trim() === selector))
      .map(rule => rule.declarations)
      .join('\n');
  const paper = declsOf('.psych-paper');
  const fullPaper = declsOf('.report-full-preview-body .pr-report');
  assert.ok(paper.length > 0 && fullPaper.length > 0, 'kâğıt kuralları bulunamadı');
  // İki önizleme aynı sayfada alt alta durur: genişlik/kenar/köşe/gölge aynı olmalı.
  assert.match(paper, /max-width:\s*760px/, 'örnek önizleme kâğıdı 760px olmalı');
  assert.match(fullPaper, /max-width:\s*760px/, 'tam rapor kâğıdı da 760px olmalı');
  assert.match(fullPaper, /border:\s*1px solid #e6e8eb/);
  assert.match(fullPaper, /box-shadow:\s*0 12px 32px rgba\(13,\s*13,\s*13,\.12\)/);
  // Ekran okunabilirlik ölçeği (10.5px → 12.5px) yalnız ekran medyasındadır;
  // baskı/PDF çıktısı ayrı `.print-only` kopyasından üretilir.
  const paperProof = rules.find(
    rule =>
      rule.selector.split(',').some(part => part.trim() === '.report-full-preview-body .pr-report') &&
      rule.atRules.some(at => at.startsWith('@media screen')) &&
      /font-size:\s*13\.5px/.test(rule.declarations),
  );
  assert.ok(paperProof, 'ekran önizleme ölçeği @media screen içinde olmalı');
  // Değişmez: ekran önizlemesi örnek kâğıtla AYNI yazı ailesini kullanır.
  const sampleFamily = /font-family:\s*([^;]+);/.exec(paper)?.[1]?.trim();
  assert.ok(sampleFamily, 'örnek kâğıdın yazı ailesi bulunamadı');
  assert.ok(
    paperProof.declarations.includes(sampleFamily),
    `tam rapor kâğıdı örnekle aynı yazı ailesini kullanmalı: ${sampleFamily}`,
  );
  const printLeaks = rules
    .filter(rule => rule.atRules.some(at => at.startsWith('@media print')) && /\.report-full-preview-body/.test(rule.selector))
    .map(rule => rule.selector);
  assert.deepEqual(printLeaks, [], 'önizleme ölçeği baskı medyasına sızmamalı');
});

test('A4 kâğıt mobilde masaüstü düzeniyle ölçeklenir (PaperViewport)', () => {
  // Kullanıcı geri bildirimi: "Tam rapor kısmı mobilde desktop tasarımında değil."
  // Kâğıt artık dar ekranda yeniden dizilmez; 760px masaüstü kompozisyonu
  // transform:scale ile sığdırılır, %100 modunda çerçeve içinde yatay kaydırılır.
  const screenDecls = (selector: string): string =>
    responsiveRules
      .filter(rule => rule.selector.split(',').some(part => part.trim() === selector))
      .map(rule => rule.declarations)
      .join('\n');
  const sheet = screenDecls('.paper-viewport-sheet');
  assert.match(sheet, /width:\s*760px/, 'kâğıt her ekranda masaüstü genişliğinde dizilir');
  assert.match(sheet, /transform-origin:\s*top left/, 'ölçekleme sol üstten yapılmalı');
  const full = screenDecls(".paper-viewport-scroll[data-paper-mode='full']");
  assert.match(full, /overflow-x:\s*auto/, '%100 modunda kaydırma yalnız çerçevede olmalı');
  const component = readFileSync('src/components/PaperViewport.tsx', 'utf8');
  assert.match(component, /transform = `scale\(/, 'sığdırma modu ölçek dönüşümü uygulamalı');
  assert.match(component, /ResizeObserver/, 'çerçeve/kâğıt boyutu izlenmeli');
  assert.match(component, /Sığdır/, 'kullanıcıya sığdır seçeneği sunulmalı');
  assert.match(component, /%100/, 'kullanıcıya gerçek boyut seçeneği sunulmalı');
  // Kâğıt içi yeniden dizim katmanları kaldırıldı: tablolar kâğıttan taşmaz,
  // kâğıt ölçeklenir. Eski ≤480px iç-kaydırma bloğu geri gelmemeli.
  assert.ok(!/report-full-preview-body \.pr-table\s*\{[^}]*overflow-x/.test(responsiveCss),
    'kâğıt içi tablo kaydırma katmanı kaldırılmalı (kâğıt masaüstü düzeniyle ölçeklenir)');
  // Ölçek yalnız ekranda: baskı katmanı bileşeni kullanmaz.
  const reportsPage = readFileSync('src/reports/ReportsPage.tsx', 'utf8');
  assert.match(reportsPage, /<PaperViewport/, 'raporlar sayfası kâğıdı PaperViewport içinde göstermeli');
});

/* --------------------------------------------------------------------------
   Phase 11 — tam ekran mobil gezinme katmanı ve OMR metin sığdırma
   -------------------------------------------------------------------------- */

test('≤900px başlık tek satıra iner: sekmeler ve kullanıcı alanı menüye taşınır', () => {
  const hidden = selectorDeclarations('.header-left .workspace-tabs', 900) +
    selectorDeclarations('.header-user', 900);
  assert.match(hidden, /display:\s*none/, 'sekme şeridi ve kullanıcı alanı mobilde gizlenmeli');
  const row = selectorDeclarations('.header-inner', 900);
  assert.match(row, /flex-direction:\s*row/, 'başlık mobilde tek satır olmalı');
  const toggle = selectorDeclarations('.nav-toggle', 900);
  assert.match(toggle, /display:\s*inline-flex/, 'menü düğmesi mobilde görünür olmalı');
  assert.match(toggle, /width:\s*44px/, 'menü düğmesi dokunma hedefi olmalı');
  const desktop = parseCss(responsiveCss).find(
    rule => rule.selector.split(',').some(s => s.trim() === '.nav-toggle') &&
      rule.atRules.some(at => /min-width:\s*901px/.test(at)),
  );
  assert.ok(desktop && /display:\s*none/.test(desktop.declarations), 'masaüstünde düğme gizli olmalı');
});

test('tam ekran gezinme katmanı site bağlantısını ve çıkışı içerir', () => {
  const overlay = selectorDeclarations('.mobile-nav-overlay', 900);
  assert.match(overlay, /position:\s*fixed/, 'katman ekranı tamamen kaplamalı');
  assert.match(overlay, /z-index:\s*90/, 'katman başlığın üstünde durmalı');
  const link = selectorDeclarations('.mobile-nav-link', 900);
  assert.match(link, /min-height:\s*52px/, 'menü satırları dokunma hedefi olmalı');
  const nav = readFileSync('src/components/MobileNav.tsx', 'utf8');
  assert.match(nav, /SITE_URL/, 'halilkaraduman.com.tr bağlantısı menü içinde olmalı');
  assert.match(nav, /aria-modal="true"/, 'katman modal olarak duyurulmalı');
  assert.match(nav, /Escape/, 'Escape katmanı kapatmalı');
  assert.match(nav, /createPortal/, 'katman header dışına (body) taşınmalı: backdrop-filter containing block');
  assert.match(nav, /document\.body\.style\.overflow/, 'katman açıkken arka plan kaydırması kilitlenmeli');
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /<MobileNav/, 'başlık menü bileşenini bağlamalı');
});

test('OMR uyarı bandı metni dar ekranda taşmaz (inline flex kaldırıldı)', () => {
  const tsx = readFileSync('src/components/ScannerWorkspace.tsx', 'utf8');
  assert.ok(!/className="auto-resolve-body" style=\{\{ flex: 1 \}\}/.test(tsx),
    'inline flex:1, medya sorgusu kurallarını ezdiği için kaldırılmalı');
  const base = parseCss(readFileSync(`${STYLE_DIR}/scanner-enhancements.css`, 'utf8'))
    .filter(rule => rule.selector.split(',').some(s => s.trim() === '.auto-resolve-body'))
    .map(rule => rule.declarations)
    .join('\\n');
  assert.match(base, /flex:\s*1 1 240px/, 'gövde daralınca kendi satırına sarmalanmalı');
  const mobile = selectorDeclarations('.auto-resolve-banner .auto-resolve-body', 720);
  assert.match(mobile, /flex:\s*1 1 100%/, 'telefonda gövde tam satır olmalı');
});

test('OMR yüzeyleri telefonda tek/okunur kolona iner', () => {
  assert.match(selectorDeclarations('.scan-pages-grid', 720), /grid-template-columns:\s*1fr/,
    'sayfa kartları dar ekranda tek kolon olmalı');
  assert.match(selectorDeclarations('.scanner-metrics-strip', 720), /grid-template-columns:\s*1fr/,
    'metrik şeridi dar ekranda tek kolon olmalı');
});
