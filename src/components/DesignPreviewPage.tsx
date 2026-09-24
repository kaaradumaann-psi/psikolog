import { useState } from 'react';
import { DEMO_CASES } from '../preview/demoProfile';
import { MMPIResultsPanel } from './results/MMPIResultsPanel';
import { MMPIPrintReport } from './results/MMPIPrintReport';
import { SiteFooter } from './SiteFooter';
import type { PrintReportMeta } from './results/MMPIPrintReport';
import { Icon } from './Icon';

/**
 * Tasarım önizlemesi — `/onizleme` rotasıyla açılır ve yalnızca Supabase
 * yapılandırılmadığında (kurulum/önizleme ortamı) gösterilir.
 *
 * Buradaki profil, uygulamanın kendi puanlama hattıyla üretilen örnek veriyle
 * hesaplanır (bkz. src/preview/demoProfile.ts). Amaç, Geçerlik Analizleri başta
 * olmak üzere tüm sonuç ekranlarının gerçek yerleşimini gerçek kayda ihtiyaç
 * duymadan gösterebilmektir.
 */
export function DesignPreviewPage({ onExit }: { onExit?: () => void }) {
  const [caseId, setCaseId] = useState(DEMO_CASES[0]!.id);
  const demo = DEMO_CASES.find(item => item.id === caseId) ?? DEMO_CASES[0]!;

  const meta: PrintReportMeta = {
    fullName: 'Örnek Danışan',
    testDate: new Date().toLocaleDateString('tr-TR'),
    reportDate: new Date().toLocaleDateString('tr-TR'),
    psychologist: 'Örnek Uzman',
    gender: demo.profile.gender,
    age: '32',
    occupation: 'Örnek meslek',
    education: 'Lisans',
    method: 'Örnek veri',
    duration: '45 dk',
    reason: 'Tasarım önizlemesi',
    followUp: '—',
    marital: '—',
  };

  return (
    <div className="preview-page">
      <div className="screen-only">
        <header className="preview-topbar">
          <div className="preview-topbar-text">
            <span className="section-badge badge-primary">Tasarım Önizlemesi</span>
            <h1>Örnek MMPI kaydı</h1>
            <p>
              Bu ekran yalnızca tasarım amaçlıdır: veriler örnek olarak üretilir ve hiçbir gerçek danışana ait
              değildir. Sekmelerin tamamı, gerçek kayıtta göründüğü biçimiyle çalışır.
            </p>
          </div>
          <div className="preview-actions">
            <div className="preview-switch" role="tablist" aria-label="Örnek profil seçimi">
              {DEMO_CASES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={item.id === demo.id}
                  className={`preview-switch-btn ${item.id === demo.id ? 'active' : ''}`}
                  onClick={() => setCaseId(item.id)}
                  title={item.summary}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}>
              <Icon name="sheet" size={15} />
              <span>Yazdır / PDF</span>
            </button>
            {onExit && (
              <button type="button" className="btn-secondary btn-sm" onClick={onExit}>
                <Icon name="left" size={15} />
                <span>Kurulum ekranı</span>
              </button>
            )}
          </div>
        </header>

        <p className="preview-note">{demo.summary}</p>

        <MMPIResultsPanel profile={demo.profile} clientName="Örnek Danışan" answers={demo.answers} />

        {/* Tam alt bilgi: "Yeni Veri Girişi" bağlantısı `/` hedefiyle kurulum ekranına döndürür. */}
        <SiteFooter />
      </div>

      <div className="print-only">
        <MMPIPrintReport profile={demo.profile} meta={meta} />
      </div>
    </div>
  );
}
