import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RevisionNotice } from '../src/components/RecordDetailPage';

/**
 * Kayıt detay sayfası — revizyon kökeni şeridi.
 *
 * Sözleşme: şerit KAPATILABİLİR, ama kapatma durumu kalıcı DEĞİLDİR. Sayfa
 * yenilendiğinde (F5) ya da başka bir kayıt açıldığında geri gelmelidir; aksi
 * hâlde bir revizyon kaydının orijinalinden türediği bilgisi kalıcı olarak
 * gizlenebilir ve klinik izlenebilirlik kırılır.
 */

const REVISION_OF = 'ec1b0864-d76b-4cbd-9f58-2404cd73ff41';

describe('RevisionNotice — revizyon kökeni şeridi', () => {
  const html = renderToStaticMarkup(
    createElement(RevisionNotice, {
      revisionOf: REVISION_OF,
      revisionReason: 'Düzenleme',
      onDismiss: () => {},
    }),
  );

  it('kaynağı, nedeni ve orijinal kayıt bağlantısını gösterir', () => {
    assert.match(html, /Bu kayıt <strong>ec1b0864…<\/strong> kaydının düzenlenmiş \(revizyon\) halidir\./);
    assert.match(html, /Neden: Düzenleme\./);
    assert.ok(html.includes(`href="/kayitlar/${REVISION_OF}"`), 'orijinal kayda bağlantı olmalı');
    assert.match(html, /Orijinal kaydı görüntüle/);
    assert.match(html, /role="status"/);
  });

  it('kapatma düğmesi erişilebilir etiketlidir ve kâğıda basılmaz', () => {
    assert.match(html, /class="close-banner-btn no-print"/);
    assert.match(html, /aria-label="Revizyon bilgisini gizle \(sayfa yenilenince geri gelir\)"/);
    assert.match(html, /Sayfa yenilenince \(F5\) tekrar görünür/);
  });

  it('neden boşsa "Neden:" satırı basılmaz', () => {
    const withoutReason = renderToStaticMarkup(
      createElement(RevisionNotice, { revisionOf: REVISION_OF, onDismiss: () => {} }),
    );
    assert.doesNotMatch(withoutReason, /Neden:/);
    assert.match(withoutReason, /ec1b0864…/);
  });

  it('kapatma durumu kalıcı depolamaya yazılmaz ve kayıt değişince sıfırlanır', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/RecordDetailPage.tsx'),
      'utf-8',
    );

    // Gizleme durumu yalnız bellekte (useState) tutulur.
    assert.match(source, /const \[revisionHidden, setRevisionHidden\] = useState\(false\);/);

    // Kapatma durumu hiçbir kalıcı depolamaya yazılmaz.
    const persisted = source
      .split('\n')
      .filter(line => /localStorage|sessionStorage/.test(line) && !line.trim().startsWith('*') && !line.trim().startsWith('/*') && !line.trim().startsWith('//'));
    assert.deepEqual(
      persisted.filter(line => /revisionHidden/i.test(line)),
      [],
      'revisionHidden kalıcı depolamaya yazılmamalı — F5 sonrası geri gelmeli',
    );

    // Başka bir kayda geçildiğinde gizleme sıfırlanır.
    assert.match(source, /useEffect\(\(\) => \{\s*setRevisionHidden\(false\);\s*\}, \[recordId\]\);/);

    // Şerit hem kaynağa hem gizleme durumuna bağlıdır.
    assert.match(source, /parsed\.revisionOf && !revisionHidden &&/);
  });
});
