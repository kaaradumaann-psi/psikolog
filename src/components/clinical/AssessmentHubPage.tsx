import { useEffect, useState } from 'react';
import type { BeckDepressionResult, BeckAnxietyResult, Scl90Result } from '../../clinical/clinicalTypes';
import type { RapidScreeningResult } from '../../clinical/rapidScreening';
import {
  getBeckDepressionTests,
  getBeckAnxietyTests,
  getScl90Tests,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { getScreenings, subscribePracticeStore } from '../../clinical/practiceStore';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import { navigate } from '../../router';
import { assessmentMeta, type AssessmentKey } from '../../clinical/assessmentCatalog';

type AssessmentTool = {
  key: AssessmentKey;
  code: string;
  title: string;
  detail: string;
  meta: string;
  icon: IconName;
  path: string;
  action: string;
};

const TOOLS: AssessmentTool[] = [
  {
    key: 'bdi', code: 'BDI', title: 'Beck Depresyon Envanteri', icon: 'pulse', meta: '21 MADDE · DEPRESYON',
    detail: 'Hisli (1989) Türkçe uyarlaması. Depresif belirti şiddetini izleyin; madde 9 için güvenlik uyarısı görünür.',
    path: '/testler/beck-depresyon', action: 'Beck Depresyon testini başlat',
  },
  {
    key: 'bai', code: 'BAI', title: 'Beck Anksiyete Envanteri', icon: 'activity', meta: '21 BELİRTİ · KAYGI',
    detail: 'Ulusoy, Şahin ve Erkmen (1998) Türkçe uyarlaması. Bedensel ve bilişsel kaygı şiddetini izleyin.',
    path: '/testler/beck-anksiyete', action: 'Beck Anksiyete testini başlat',
  },
  {
    key: 'scl90', code: 'SCL', title: 'SCL-90-R Belirti Tarama', icon: 'layers', meta: '90 MADDE · 9 BOYUT',
    detail: 'Dağ (1991) Türkçe uyarlaması. Dokuz belirti boyutu ile GSI, PST ve PSDI sonuçlarını birlikte görün.',
    path: '/testler/scl90', action: 'SCL-90-R testini başlat',
  },
  {
    key: 'phq9', code: 'KISA', title: 'PHQ-9 ve GAD-7', icon: 'trend', meta: 'KISA TARAMA · İKİ ÖLÇEK',
    detail: 'Seans içi depresyon ve kaygı izlemi. PHQ-9 madde 9 pozitifse güvenlik uyarısı açılır.',
    path: '/testler/tarama', action: 'PHQ-9 ve GAD-7 taramasını başlat',
  },
];

type HistoryItem = {
  id: string;
  clientId?: string;
  clientName: string;
  title: string;
  date: string;
  score: string;
  severity: string;
  tone: 'normal' | 'warning' | 'danger';
  safetyFlag?: boolean;
};

function severityTone(severity: string): HistoryItem['tone'] {
  if (severity.includes('Şiddetli')) return 'danger';
  if (severity.includes('Orta')) return 'warning';
  return 'normal';
}

export function AssessmentHubPage() {
  const [bdiTests, setBdiTests] = useState<BeckDepressionResult[]>(() => getBeckDepressionTests());
  const [baiTests, setBaiTests] = useState<BeckAnxietyResult[]>(() => getBeckAnxietyTests());
  const [scl90Tests, setScl90Tests] = useState<Scl90Result[]>(() => getScl90Tests());
  const [screenings, setScreenings] = useState<RapidScreeningResult[]>(() => getScreenings());

  useEffect(() => {
    const unsubClinical = subscribeClinicalStore(() => {
      setBdiTests(getBeckDepressionTests());
      setBaiTests(getBeckAnxietyTests());
      setScl90Tests(getScl90Tests());
    });
    const unsubPractice = subscribePracticeStore(() => setScreenings(getScreenings()));
    return () => {
      unsubClinical();
      unsubPractice();
    };
  }, []);

  const history: HistoryItem[] = [
    ...bdiTests.map((test) => ({
      id: test.id, clientId: test.clientId, clientName: test.clientName,
      title: 'Beck Depresyon · BDI', date: test.testDate, score: `${test.totalScore}/63`,
      severity: `${test.severity} depresyon`, tone: severityTone(test.severity), safetyFlag: test.suicideRisk,
    })),
    ...baiTests.map((test) => ({
      id: test.id, clientId: test.clientId, clientName: test.clientName,
      title: 'Beck Anksiyete · BAI', date: test.testDate, score: `${test.totalScore}/63`,
      severity: `${test.severity} anksiyete`, tone: severityTone(test.severity),
    })),
    ...scl90Tests.map((test) => ({
      id: test.id, clientId: test.clientId, clientName: test.clientName,
      title: 'SCL-90-R Belirti Tarama', date: test.testDate, score: `GSI ${test.gsi} · PST ${test.pst}`,
      severity: test.gsi >= 1 ? 'Klinik eşik üzerinde' : 'Eşik altında',
      tone: test.gsi >= 1 ? 'warning' as const : 'normal' as const,
      safetyFlag: (test.answers?.[14] ?? 0) > 0,
    })),
    ...screenings.map((test) => ({
      id: test.id, clientId: test.clientId, clientName: test.clientName,
      title: test.type === 'phq9' ? 'PHQ-9 Kısa Tarama' : 'GAD-7 Kısa Tarama',
      date: test.testDate, score: `${test.totalScore}/${test.type === 'phq9' ? 27 : 21}`,
      severity: test.severity, tone: severityTone(test.severity), safetyFlag: test.suicideRisk,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="clinical-container assessment-page">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker"><span className="clinical-kicker-dot" /><span>Ölçek kütüphanesi</span></div>
          <h1>Psikolojik Değerlendirme Araçları</h1>
          <p>Danışan sürecini izlemek için öz bildirim ölçekleri ve kısa taramalar. Bir araç seçerek değerlendirmeye başlayın.</p>
        </div>
      </div>

      <div className="assessment-note"><Icon name="info" size={18} /><span>Puanlar tarama amaçlıdır, tanı koymaz. Her araç kendi lisans koşuluyla kullanılır. PHQ-9 ve GAD-7 için danışanın elle doldurabileceği boş form; lisanslı araçlar için madde metni içermeyen yanıt aktarım sayfası PDF olarak hazırlanabilir.</span></div>

      <section aria-label="Değerlendirme araçları" className="tool-grid">
        {TOOLS.map((tool, index) => (
          <article className="assessment-card" key={tool.code}>
            <div className="assessment-card-top">
              <span className="assessment-card-icon"><Icon name={tool.icon} size={23} /></span>
              <span className="assessment-card-index">0{index + 1} / 0{TOOLS.length}</span>
            </div>
            <div className="assessment-card-content">
              <span className="assessment-card-code">{tool.code}</span>
              <h2>{tool.title}</h2>
              <p>{tool.detail}</p>
              <span className={`assessment-card-rights is-${assessmentMeta(tool.key).access}`}>{assessmentMeta(tool.key).accessLabel}</span>
            </div>
            <div className="assessment-card-foot">
              <span>{tool.meta}</span>
              <button type="button" onClick={() => navigate(tool.path)} aria-label={tool.action}>
                Başlat <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="assessment-history" aria-labelledby="assessment-history-title">
        <div className="board-section-head">
          <div><span className="board-eyebrow">DOSYA GEÇMİŞİ</span><h2 id="assessment-history-title">Tamamlanan değerlendirmeler <span className="assessment-count">{history.length}</span></h2></div>
        </div>
        {history.length === 0 ? (
          <div className="empty-state-card">
            <Icon name="clipboard" size={28} />
            <h4>Henüz değerlendirme kaydı yok</h4>
            <p>Yukarıdaki ölçeklerden birini seçtiğinizde tamamlanan sonuçlar burada listelenir.</p>
          </div>
        ) : (
          <div className="assessment-history-list">
            {history.map((item) => (
              <article className="assessment-history-item" key={item.id}>
                <span className="assessment-history-icon"><Icon name="fileText" size={20} /></span>
                <div className="assessment-history-main">
                  <strong>{item.clientName}</strong>
                  <span>{item.title} · {item.date} · {item.score}</span>
                </div>
                <div className="assessment-history-actions">
                  <span className={`badge ${item.tone === 'danger' ? 'badge-risk-high' : item.tone === 'warning' ? 'badge-risk-moderate' : 'badge-active'}`}>{item.severity}</span>
                  {item.safetyFlag && <span className="badge badge-risk-high">Güvenlik uyarısı</span>}
                  {item.clientId && <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/danisanlar/${item.clientId}`)}>Dosyaya git</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
