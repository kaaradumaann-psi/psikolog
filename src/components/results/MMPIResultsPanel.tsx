import type { ReactNode } from 'react';
import { useState } from 'react';
import type { MMPIProfile } from '../../scoring/mmpiScoring';
import type { ItemAnswer } from '../../workspace/caseTypes';
import { tColor, validityStatusDisplay } from '../../scoring/mmpiInterpretation';
import type { IconName } from '../Icon';
import { Icon } from '../Icon';
import { MMPIScoreChart } from './MMPIScoreChart';
import { MMPIValidityTab } from './MMPIValidityTab';
import { MMPIClinicalTab } from './MMPIClinicalTab';
import { MMPICodeTab } from './MMPICodeTab';
import { MMPIExtraTab } from './MMPIExtraTab';
import { MMPIDerivedSection } from './MMPIDerivedSection';
import { MMPICriticalSection } from './MMPICriticalSection';
import { MMPIAnswersTab } from './MMPIAnswersTab';
import { AiInterpretationPanel } from './AiInterpretationPanel';

export type MmpiResultsTab =
  | 'overview'
  | 'validity'
  | 'clinical'
  | 'code'
  | 'derived'
  | 'extra'
  | 'critical'
  | 'answers'
  | 'reports'
  | 'ai';

const TABS: { id: MmpiResultsTab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: 'pulse' },
  { id: 'validity', label: 'Geçerlik Analizleri', icon: 'info' },
  { id: 'clinical', label: 'Klinik Ölçekler', icon: 'list' },
  { id: 'code', label: 'Kod Analizleri', icon: 'trend' },
  { id: 'derived', label: 'Türetilmiş Ölçekler', icon: 'layers' },
  { id: 'extra', label: 'Desenler & Sözlük', icon: 'file' },
  { id: 'critical', label: 'Kritik Bulgular', icon: 'alert' },
  { id: 'answers', label: 'Soru Yanıtları', icon: 'sheet' },
  { id: 'reports', label: 'Raporlar', icon: 'file' },
  // Sözleşme: "Yapay Zekâ Yorumu" her zaman EN SON sekmedir.
  { id: 'ai', label: 'Yapay Zekâ Yorumu', icon: 'sparkles' },
];

/** "Yapay Zekâ Yorumu" sekmesinin bağlamı — yalnız profil + yaş/cinsiyet taşınır (KVKK). */
export type MmpiAiContext = {
  method: 'quick' | 'raw' | 'omr';
  /** Yalnız yaş taşınır; ad/soyad LLM istemine katılmaz (KVKK). */
  client: { age: number } | null;
  /** Kayıt detayında verilir: kayıt sahipliği sunucuda yeniden doğrulanır. */
  recordId?: string;
  /** Verildiğinde sonuç, uzman notu taslağına eklenebilir. */
  onInsertIntoNotes?: (text: string) => void;
};

type Props = {
  profile: MMPIProfile;
  clientName?: string;
  /** Madde düzeyinde (566) yanıt dizisi — “Soru Yanıtları” sekmesinde gösterilir. */
  answers?: ItemAnswer[];
  /**
   * Doğruysa panel kendi başlık şeridini çizmez; sayfayı saran görünüm
   * (örn. kayıt detay sayfası) özet şeridi kendisi sunar ve tekrar önlenir.
   */
  embedded?: boolean;
  /**
   * "Yapay Zekâ Yorumu" sekmesi (son sekme) için bağlam. Verilmezse sekme yine
   * görünür ama içerik yerine bilgi kutusu gösterilir.
   */
  aiContext?: MmpiAiContext;
  reportsContent?: ReactNode;
};

function formatT(t: number): string {
  return t.toFixed(1);
}

/**
 * MMPI sonuç paneli — sekmeli düzen:
 * Genel Bakış (profil grafiği + özet tablo), Geçerlik Analizleri (TR,
 * Dikkatsizlik, F-K ve konfigürasyonlarla), Klinik Ölçekler, Kod Analizleri,
 * Türetilmiş Ölçekler & Endeksler, Desenler & Sözlük, Kritik Bulgular,
 * Soru Yanıtları ve en sonda Yapay Zekâ Yorumu.
 */
export function MMPIResultsPanel({ profile, clientName, answers, embedded = false, aiContext, reportsContent }: Props) {
  const [tab, setTab] = useState<MmpiResultsTab>('overview');
  const { validityAnalysis, profileCode } = profile;
  const clinical = profile.clinical;

  return (
    <div className={`mmpi-results-panel ${embedded ? 'is-embedded' : ''}`}>
      {!embedded && (
      <header className="mmpi-results-header">
        <div>
          <div className="mmpi-results-meta">
            <span className="section-badge badge-primary">Türk Normları · Cinsiyete Göre</span>
            {clientName && <span className="mmpi-chip">{clientName}</span>}
            <span className="mmpi-chip">{profile.gender} normları</span>
            {profileCode && <span className="mmpi-chip mmpi-chip-code">Profil Kodu: {profileCode}</span>}
          </div>
          <h3 className="mmpi-results-title">
            MMPI <em>Sonuçları</em>
          </h3>
        </div>
        <div className={`mmpi-validity-pill ${validityStatusDisplay(validityAnalysis.status).className}`}>
          <Icon name={validityAnalysis.status === 'GECERLI' ? 'checkCircle' : validityAnalysis.status === 'SUPHELI' ? 'info' : 'alert'} size={14} />
          <span>{validityStatusDisplay(validityAnalysis.status).label}</span>
        </div>
      </header>
      )}

      <nav className="mmpi-tabs" role="tablist" aria-label="MMPI sonuç sekmeleri">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`mmpi-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div role="tabpanel" className="mmpi-tab-panel">
          <section className="mmpi-chart-card">
            <h4 className="mmpi-card-title">
              <span className="mmpi-card-dot" />
              MMPI Profil Grafiği (T-Skorları)
            </h4>
            <MMPIScoreChart scales={profile.scales} />
            {/* Dar ekranda profil iki okunabilir panele ayrılır; tam sayılar
                aşağıdaki özet tabloda ve ölçek listelerinde de durur. */}
            <p className="mmpi-chart-hint">Profil iki parçada, okunabilir boyutta. Her ölçeğin T skoru adının altındadır; tam sayılar özet tabloda.</p>
          </section>

          <section className="mmpi-summary-card">
            <div className="mmpi-summary-table-wrap">
              <table className="mmpi-summary-table">
                <thead>
                  <tr>
                    <th className="row-head">Ölçek</th>
                    {clinical.map(s => (
                      <th key={s.id} title={s.fullName}>
                        {s.shortName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="row-head">Ham Puan</th>
                    {clinical.map(s => (
                      <td key={s.id} className="num">
                        {s.rawScore}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className="row-head">K Eklemesi (K+)</th>
                    {clinical.map(s => (
                      <td key={s.id} className="num k-add">
                        {s.kAdded !== undefined ? `+${s.kAdded}` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className="row-head">T Puanı</th>
                    {clinical.map(s => (
                      <td key={s.id} className="num t-val" style={{ color: tColor(s.tScore) }}>
                        {formatT(s.tScore)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mmpi-summary-note">
              T skorları cinsiyete özgü Türk normlarına göre hesaplanır; klinik ölçeklerde K düzeltmesi uygulanmıştır
              (standart ekleme tablosu). Ölçeğe özgü T puanı aralıkları ve yorumları “Klinik Ölçekler” sekmesinde;
              geçerlik kararları, TR/Dikkatsizlik endeksleri, F-K analizi ve geçerlik konfigürasyonu “Geçerlik
              Analizleri” sekmesinde gösterilir.
            </p>
          </section>
        </div>
      )}

      {tab === 'validity' && <MMPIValidityTab profile={profile} />}
      {tab === 'clinical' && <MMPIClinicalTab profile={profile} />}
      {tab === 'code' && <MMPICodeTab profile={profile} />}
      {tab === 'derived' && <MMPIDerivedSection profile={profile} />}
      {tab === 'extra' && <MMPIExtraTab profile={profile} />}
      {tab === 'critical' && <MMPICriticalSection profile={profile} />}
      {tab === 'answers' && <MMPIAnswersTab answers={answers} />}
      {tab === 'reports' && <div role="tabpanel" className="mmpi-tab-panel">{reportsContent || <p>Psikolog raporu oluşturmak için testi kaydedin ve kayıt detayındaki Raporlar alanını açın.</p>}</div>}
      {tab === 'ai' && (
        aiContext ? (
          <AiInterpretationPanel profile={profile} {...aiContext} />
        ) : (
          <div role="tabpanel" className="mmpi-tab-panel">
            <div className="mmpi-box info">
              <Icon name="info" size={14} />
              <span>Yapay zekâ yorumu bu görünümde kullanılamıyor.</span>
            </div>
          </div>
        )
      )}

      <p className="mmpi-info-foot">
        * T puanları cinsiyete özgü Türk normları ve klasik K düzeltme oranları (Hs, Pd, Pt, Sc, Ma) kullanılarak
        hesaplanır.
      </p>
    </div>
  );
}
