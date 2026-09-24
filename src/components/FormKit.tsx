import { useState } from 'react';
import { PAGE_COUNT } from '../form/layout';
import {
  FORM_PDF_FILE_NAME,
  PRINT_SETTINGS_HINT,
  downloadFormPdf,
  openFormPdf,
  printFormPdf,
} from '../print/formPdf';
import { Icon } from './Icon';

/**
 * Optik form hazırlık ekranı. İşlem akışıyla aynı tasarım dilini konuşur:
 * rozet + serif başlık, kart ızgarası, adım rehberi ve yazdırma kontrol listesi.
 * Pedagojik hedef: uzman formu ilk kez eline aldığında bile hatasız basar ve
 * okutur; "neden olmadı?" sorusu ekranda yanıtlanır.
 */
export function FormKit() {
  const [printNote, setPrintNote] = useState<'' | 'busy' | 'opened' | 'manual'>('');
  const busy = printNote === 'busy';

  async function handlePrint() {
    if (busy) return;
    setPrintNote('busy');
    try {
      const outcome = await printFormPdf();
      setPrintNote(outcome === 'printed' ? 'opened' : 'manual');
    } catch {
      setPrintNote('manual');
    }
  }

  return (
    <div className="ws-flow form-kit-flow">
      <section className="ws-panel" aria-labelledby="formkit-title">
        <header className="ws-panel-head form-kit-head">
          <div>
            <span className="section-badge badge-primary">Form · {PAGE_COUNT} sayfa A4</span>
            <h1 id="formkit-title" className="ws-panel-title">
              Optik cevap <em>formu</em>
            </h1>
            <p className="ws-muted">
              Yazdırılabilir, OMR ile okunabilir {PAGE_COUNT} sayfalık A4 set. Aynı danışanın {PAGE_COUNT} sayfası
              birlikte okutulur; her danışan için PDF’ten taze çıktı alın.
            </p>
          </div>
          <div className="form-kit-file" aria-label="Form dosyası">
            <Icon name="sheet" size={16} />
            <div>
              <strong>{FORM_PDF_FILE_NAME}</strong>
              <span>{PAGE_COUNT} sayfa · A4 dikey · doğrulanmış baskı</span>
            </div>
          </div>
        </header>

        <div className="form-kit-actions">
          <button type="button" className="btn-primary" onClick={() => void handlePrint()} disabled={busy}>
            {busy ? <span className="spinner-inline" aria-hidden="true" /> : <Icon name="print" size={16} />}
            {busy ? 'Hazırlanıyor…' : 'Yazdır'}
          </button>
          <button
            type="button"
            className="btn-secondary download-button"
            onClick={() => void downloadFormPdf().catch(() => setPrintNote('manual'))}
            disabled={busy}
          >
            <Icon name="download" size={16} />
            İndir
          </button>
          <button type="button" className="btn-secondary" onClick={() => void openFormPdf()} disabled={busy}>
            <Icon name="eye" size={16} />
            Yeni sekmede aç
          </button>
        </div>

        {printNote !== '' && (
          <p className="print-status-note" role="status" aria-live="polite">
            {printNote === 'busy'
              ? 'PDF hazırlanıyor… Yazdırma penceresi birazdan açılacak.'
              : printNote === 'opened'
                ? `Yazdırma gönderildi: ${PRINT_SETTINGS_HINT}.`
                : `Yazdırma penceresi açılamadı. “Yeni sekmede aç” ile yazdırın: ${PRINT_SETTINGS_HINT}.`}
          </p>
        )}

        <ol className="form-kit-steps" aria-label="Form akışı">
          <li>
            <span className="form-kit-step-no" aria-hidden="true">1</span>
            <div>
              <strong>Yazdır</strong>
              <span>Aşağıdaki ayarlarla tek yüz çıktı alın.</span>
            </div>
          </li>
          <li>
            <span className="form-kit-step-no" aria-hidden="true">2</span>
            <div>
              <strong>Kontrol et</strong>
              <span>Köşe kareleri ve QR net mi diye bakın.</span>
            </div>
          </li>
          <li>
            <span className="form-kit-step-no" aria-hidden="true">3</span>
            <div>
              <strong>Uygula</strong>
              <span>Danışan formu tek başına doldurur.</span>
            </div>
          </li>
          <li>
            <span className="form-kit-step-no" aria-hidden="true">4</span>
            <div>
              <strong>Okut</strong>
              <span>İşlem → OMR ile {PAGE_COUNT} sayfayı aktarın.</span>
            </div>
          </li>
        </ol>

        <div className="form-kit-grid">
          <article className="form-kit-card" aria-labelledby="formkit-print">
            <header>
              <span className="ws-method-icon" aria-hidden="true">
                <Icon name="print" size={18} />
              </span>
              <h2 id="formkit-print">Yazdırma ayarları</h2>
              <p>Bu altı madde OMR’nin okuyabilmesinin şartıdır.</p>
            </header>
            <ul className="form-kit-check">
              <li><Icon name="check" size={14} /> Kâğıt: <strong>A4, dikey</strong></li>
              <li><Icon name="check" size={14} /> Ölçek: <strong>%100 (gerçek boyut)</strong></li>
              <li><Icon name="check" size={14} /> Kenar boşluğu: <strong>yok</strong></li>
              <li><Icon name="check" size={14} /> Yüz: <strong>tek yüz</strong> (arka boş)</li>
              <li><Icon name="check" size={14} /> “Sayfaya sığdır”: <strong>kapalı</strong></li>
              <li><Icon name="check" size={14} /> Renk: siyah-beyaz yeterli, mürekkep net</li>
            </ul>
          </article>

          <article className="form-kit-card" aria-labelledby="formkit-check">
            <header>
              <span className="ws-method-icon" aria-hidden="true">
                <Icon name="scan" size={18} />
              </span>
              <h2 id="formkit-check">Okutma öncesi kontrol</h2>
              <p>30 saniyelik kontrol, saatlik yeniden taramayı önler.</p>
            </header>
            <ul className="form-kit-check">
              <li><Icon name="check" size={14} /> Dört köşe karesi tam ve net basılmış</li>
              <li><Icon name="check" size={14} /> Her sayfadaki QR okunur durumda</li>
              <li><Icon name="check" size={14} /> Sayfa sırası 1–{PAGE_COUNT} ve aynı danışana ait</li>
              <li><Icon name="check" size={14} /> Buruşuk, yırtık, ıslak sayfa yok</li>
              <li><Icon name="check" size={14} /> İşaretlemeler yuvarlağı taşırmamış</li>
            </ul>
          </article>

          <article className="form-kit-card" aria-labelledby="formkit-scan">
            <header>
              <span className="ws-method-icon" aria-hidden="true">
                <Icon name="camera" size={18} />
              </span>
              <h2 id="formkit-scan">Okutma ipuçları</h2>
              <p>Dosya ya da kamera ile; sonuç aynı hattan geçer.</p>
            </header>
            <ul className="form-kit-check">
              <li><Icon name="check" size={14} /> Düz zeminde, gölgesiz, dik açıdan çekin</li>
              <li><Icon name="check" size={14} /> Tüm sayfa kadrajda; köşeler kesilmesin</li>
              <li><Icon name="check" size={14} /> JPG / PNG / PDF; sayfa başına net tek görsel</li>
              <li><Icon name="check" size={14} /> Bulanık sayfayı silip yeniden okutun</li>
              <li><Icon name="check" size={14} /> Eksik sayfayla kayıt tamamlanmaz</li>
            </ul>
          </article>
        </div>

        <div className="status-banner warning-banner" role="note">
          <Icon name="alert" size={18} />
          <span>
            Fotokopi ile çoğaltmayın ve fotoğraf çıktısı kullanmayın: ölçek kayar, OMR reddeder.
            Her danışan için bu PDF’ten doğrudan çıktı alın.
          </span>
        </div>

        <details className="form-kit-faq">
          <summary>Sorun giderme: “Neden okumadı?”</summary>
          <dl>
            <div>
              <dt>İlk yazdırma boş çıktı</dt>
              <dd>PDF okuyucu geç açılmış olabilir. “Yeni sekmede aç” ile yazdırın; ikinci denemede düzelir.</dd>
            </div>
            <div>
              <dt>“Başka form setine ait” uyarısı</dt>
              <dd>Farklı baskıların sayfaları karışmış. Aynı PDF’ten alınmış {PAGE_COUNT} sayfayı birlikte okutun.</dd>
            </div>
            <div>
              <dt>QR / köşe karesi okunmuyor</dt>
              <dd>Ölçek %100 değil ya da kenarlar kesik. “Sayfaya sığdır” kapalı, kenar boşluğu yok olmalı.</dd>
            </div>
            <div>
              <dt>Kamera bulanık okuyor</dt>
              <dd>Işığı artırın, telefonu sabitleyin, yansıma yapan laminasyon kullanmayın. Gerekirse tarayıcı ile PDF alın.</dd>
            </div>
          </dl>
        </details>
      </section>
    </div>
  );
}
