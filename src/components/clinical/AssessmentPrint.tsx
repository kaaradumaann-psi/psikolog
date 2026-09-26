import type { AssessmentKey } from '../../clinical/assessmentCatalog';
import { assessmentMeta } from '../../clinical/assessmentCatalog';
import { COPYRIGHT_HOLDER, COPYRIGHT_YEAR } from '../../site';
import { formatClinicDate } from '../../clinical/recordRules';
import { Icon } from '../Icon';

type PaperItem = {
  id: number;
  text: string;
};

type PaperOption = {
  score: number;
  label: string;
};

export function AssessmentLegalNotice({ assessment }: { assessment: AssessmentKey }) {
  const meta = assessmentMeta(assessment);
  return (
    <aside className={`assessment-legal-note is-${meta.access}`} aria-label={`${meta.code} kullanım ve telif bilgisi`}>
      <span className="assessment-legal-icon" aria-hidden="true"><Icon name={meta.access === 'licensed' ? 'shield' : 'fileText'} size={17} /></span>
      <div>
        <span className="assessment-legal-label">{meta.accessLabel}</span>
        <p>{meta.rightsNotice}</p>
        <a href="/kaynaklar">Kaynakça ve kullanım ayrıntıları</a>
      </div>
    </aside>
  );
}

export function AssessmentResultPrintHeader({
  assessment,
  respondentName,
  date,
  instrumentVersion,
  demographics,
}: {
  assessment: AssessmentKey;
  respondentName: string;
  date: string;
  instrumentVersion?: string;
  demographics?: string;
}) {
  const meta = assessmentMeta(assessment);
  return (
    <header className="assessment-result-print-header">
      <div>
        <span>KLİNİK DEĞERLENDİRME SONUÇ ÖZETİ</span>
        <h1>{meta.title}</h1>
      </div>
      <dl>
        <div><dt>Danışan</dt><dd>{respondentName.trim() || '—'}</dd></div>
        <div><dt>Uygulama tarihi</dt><dd>{formatClinicDate(date)}</dd></div>
        {instrumentVersion && <div><dt>Sürüm</dt><dd>{instrumentVersion}</dd></div>}
        {demographics && <div><dt>Demografi</dt><dd>{demographics}</dd></div>}
      </dl>
      <p>{meta.citation} {meta.rightsNotice}</p>
      <span className="assessment-result-product-copyright">Uygulama çıktısı © {COPYRIGHT_YEAR} {COPYRIGHT_HOLDER}</span>
    </header>
  );
}

export function AssessmentPaperSheet({
  assessment,
  respondentName,
  date,
  items,
  options,
}: {
  assessment: AssessmentKey;
  respondentName: string;
  date: string;
  items: PaperItem[];
  options: PaperOption[];
}) {
  const meta = assessmentMeta(assessment);
  const licensed = meta.access === 'licensed';

  return (
    <article className={`paper-assessment-sheet${licensed ? ' is-licensed-response-sheet' : ''}`}>
      <header className="paper-assessment-header">
        <div>
          <span>{licensed ? 'LİSANSLI FORM İÇİN YANIT AKTARIM SAYFASI' : 'DANIŞAN ÖZ BİLDİRİM FORMU'}</span>
          <h1>{meta.title}</h1>
          <p>{meta.period} · {items.length} madde</p>
        </div>
        <strong>{meta.code}</strong>
      </header>

      <div className="paper-assessment-identity">
        <div><span>Ad Soyad</span><strong>{respondentName.trim() || ' '}</strong></div>
        <div><span>Tarih</span><strong>{date || ' '}</strong></div>
      </div>

      <section className={`paper-assessment-instruction${licensed ? ' is-rights-restricted' : ''}`}>
        <strong>{licensed ? 'Önemli lisans sınırı' : 'Yönerge'}</strong>
        <p>{licensed ? meta.printNotice : meta.respondentInstruction}</p>
      </section>

      <table className="paper-assessment-table">
        <thead>
          <tr>
            <th scope="col">No</th>
            {!licensed && <th scope="col">Madde</th>}
            {options.map((option) => <th scope="col" key={option.score}><b>{option.score}</b><span>{option.label}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.id}</th>
              {!licensed && <td>{item.text}</td>}
              {options.map((option) => <td key={option.score}><span className="paper-answer-circle" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <section className="paper-assessment-clinician">
        <div><span>Toplam puan</span></div>
        <div><span>Klinisyen notu</span></div>
      </section>

      <footer className="paper-assessment-footer">
        <p><strong>{meta.registeredName}</strong> · {meta.citation}</p>
        <p>{meta.rightsNotice}</p>
        <p>Bu form tek başına tanı koymaz. Klinik karar ve güvenlik değerlendirmesi uygulayıcı uzmana aittir.</p>
        <p className="paper-assessment-product-copyright">Uygulama çıktısı © {COPYRIGHT_YEAR} {COPYRIGHT_HOLDER}</p>
      </footer>
    </article>
  );
}

function preparePrint(mode: 'paper' | 'result', title: string) {
  const root = document.documentElement;
  const previousTitle = document.title;
  root.dataset.assessmentPrint = mode;
  document.title = title;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    delete root.dataset.assessmentPrint;
    document.title = previousTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(() => {
    try {
      window.print();
    } finally {
      // Some embedded/WebView print implementations do not fire afterprint.
      window.setTimeout(cleanup, 1500);
    }
  }, 0);
}

export function printAssessmentPaper(assessment: AssessmentKey) {
  const meta = assessmentMeta(assessment);
  const suffix = meta.access === 'licensed' ? 'yanit-aktarim-formu' : 'bos-form';
  preparePrint('paper', `${meta.code}-${suffix}`);
}

export function printAssessmentResult(assessment: AssessmentKey) {
  const meta = assessmentMeta(assessment);
  preparePrint('result', `${meta.code}-sonuc-ozeti`);
}
