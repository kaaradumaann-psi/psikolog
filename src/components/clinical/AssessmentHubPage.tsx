import { useState, useEffect } from 'react';
import type {
  BeckDepressionResult,
  BeckAnxietyResult,
  Scl90Result,
} from '../../clinical/clinicalTypes';
import {
  getBeckDepressionTests,
  getBeckAnxietyTests,
  getScl90Tests,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function AssessmentHubPage() {
  const [bdiTests, setBdiTests] = useState<BeckDepressionResult[]>(() => getBeckDepressionTests());
  const [baiTests, setBaiTests] = useState<BeckAnxietyResult[]>(() => getBeckAnxietyTests());
  const [scl90Tests, setScl90Tests] = useState<Scl90Result[]>(() => getScl90Tests());

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setBdiTests(getBeckDepressionTests());
      setBaiTests(getBeckAnxietyTests());
      setScl90Tests(getScl90Tests());
    });
    return unsub;
  }, []);

  const totalCompleted = bdiTests.length + baiTests.length + scl90Tests.length;

  return (
    <div className="clinical-container">
      {/* Üst Başlık */}
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Psikometri &amp; Test Bataryası</span>
          </div>
          <h1>Psikolojik Değerlendirme Araçları</h1>
          <p>MMPI-566, Beck Envanterleri, SCL-90-R ve klinik tarama ölçekleri uygulama ve analiz merkezi.</p>
        </div>
      </div>

      {/* Test Kartları Izgarası */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 36 }}>
        {/* MMPI-566 */}
        <div className="assessment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="assessment-card-icon">
              <Icon name="scan" size={24} />
            </div>
            <span className="badge badge-active">OMR + Hızlı Giriş</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>MMPI-566 Kişilik Envanteri</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>
              566 Madde, Savaşır (1981) Türk Normları, 10 Klinik + 4 Geçerlik Ölçeği, 2-Noktalı Kod Tipleri, Harris-Lingoes, Wiggins, PDI-IV Kişilik Bozuklukları ve 4 Sayfalık OMR Optik Okuma.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button type="button" className="btn-primary btn-full" onClick={() => navigate('/islem')}>
              MMPI Uygula / OMR Oku
            </button>
            <button type="button" className="btn-secondary" title="Optik Form İndir" onClick={() => navigate('/form')}>
              <Icon name="sheet" size={16} />
            </button>
          </div>
        </div>

        {/* Beck Depresyon Envanteri (BDI) */}
        <div className="assessment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="assessment-card-icon" style={{ color: 'var(--accent)' }}>
              <Icon name="pulse" size={24} />
            </div>
            <span className="badge badge-followup">21 Madde · BDI</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Beck Depresyon Envanteri (BDI)</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>
              Depresif belirtilerin şiddetini, bilişsel-duygusal ve somatik-performans alt boyutlarını ölçen standart ölçek. Madde 9 intihar riski güvenlik alarmı içerir.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={() => navigate('/testler/beck-depresyon')}
            >
              BDI Testini Başlat
            </button>
          </div>
        </div>

        {/* Beck Anksiyete Envanteri (BAI) */}
        <div className="assessment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="assessment-card-icon" style={{ color: 'var(--warning)' }}>
              <Icon name="activity" size={24} />
            </div>
            <span className="badge badge-risk-low">21 Belirti · BAI</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Beck Anksiyete Envanteri (BAI)</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>
              Subjektif kaygı, nörovejetatif, otonomik ve motor anksiyete semptomlarının şiddetini ölçen standart klinik ölçek.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={() => navigate('/testler/beck-anksiyete')}
            >
              BAI Testini Başlat
            </button>
          </div>
        </div>

        {/* SCL-90-R */}
        <div className="assessment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="assessment-card-icon" style={{ color: 'var(--text)' }}>
              <Icon name="layers" size={24} />
            </div>
            <span className="badge badge-active">90 Madde · 9 Boyut</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>SCL-90-R Belirti Tarama Listesi</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>
              Somatizasyon, Obsesif-Kompulsif, Depresyon, Anksiyete, Öfke, Fobi, Paranoya, Psikotizm boyutları ile GSI, PST ve PSDI genel semptom indeksleri.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={() => navigate('/testler/scl90')}
            >
              SCL-90-R Testini Başlat
            </button>
          </div>
        </div>

        {/* Hızlı Tarama: GAD-7 & PHQ-9 */}
        <div className="assessment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="assessment-card-icon" style={{ color: 'var(--success)' }}>
              <Icon name="activity" size={24} />
            </div>
            <span className="badge badge-active">Hızlı Tarama · 2 Dk</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>GAD-7 &amp; PHQ-9 Hızlı Tarama</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--soft)' }}>
              Seans içi hızlı anksiyete (GAD-7, 7 madde) ve majör depresyon semptom yükü (PHQ-9, 9 madde) anlık tarama ve takip aracı.
            </p>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              className="btn-primary btn-full"
              onClick={() => navigate('/testler/tarama')}
            >
              Hızlı Taramayı Başlat
            </button>
          </div>
        </div>
      </div>

      {/* Son Uygulanan Testler Geçmişi */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 14 }}>Tamamlanan Son Test Kayıtları</h3>

        {totalCompleted === 0 ? (
          <div className="empty-state-card">
            <Icon name="clipboard" size={32} />
            <h4>Henüz Test Kaydı Bulunmuyor</h4>
            <p>Yukarıdaki ölçeklerden birini seçerek değerlendirme başlatabilirsiniz.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* BDI Listesi */}
            {bdiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--primary-tint)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="pulse" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 15 }}>{t.clientName} · Beck Depresyon Envanteri (BDI)</strong>
                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                      Tarih: {t.testDate} · Puan: {t.totalScore}/63
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>
                    {t.severity} Depresyon
                  </span>
                  {t.suicideRisk && (
                    <span className="badge badge-risk-high">İntihar Uyarısı!</span>
                  )}
                  {t.clientId && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => navigate(`/danisanlar/${t.clientId}`)}
                    >
                      Dosyaya Git
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* BAI Listesi */}
            {baiTests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--warning-tint)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="activity" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 15 }}>{t.clientName} · Beck Anksiyete Envanteri (BAI)</strong>
                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                      Tarih: {t.testDate} · Puan: {t.totalScore}/63
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${t.severity === 'Şiddetli' ? 'badge-risk-high' : t.severity === 'Orta' ? 'badge-risk-moderate' : 'badge-active'}`}>
                    {t.severity} Anksiyete
                  </span>
                  {t.clientId && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => navigate(`/danisanlar/${t.clientId}`)}
                    >
                      Dosyaya Git
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* SCL-90 Listesi */}
            {scl90Tests.map(t => (
              <div key={t.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-soft)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="layers" size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: 15 }}>{t.clientName} · SCL-90-R Belirti Tarama Listesi</strong>
                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                      Tarih: {t.testDate} · GSI: {t.gsi} · PST: {t.pst}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${t.gsi >= 1.0 ? 'badge-risk-moderate' : 'badge-active'}`}>
                    {t.gsi >= 1.0 ? 'Klinik Eşik Üzerinde' : 'Normal Sınırlar'}
                  </span>
                  {t.clientId && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => navigate(`/danisanlar/${t.clientId}`)}
                    >
                      Dosyaya Git
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
