import type { MMPIProfile, ValidityFinding } from '../../scoring/mmpiScoring';
import { SCALE_MEANINGS } from '../../scoring/mmpiInterpretation';
import { VALIDITY_CUTOFFS } from '../../scoring/mmpiSource';
import { Icon } from '../Icon';

type Tone = ValidityFinding['tone'];

/** Uyarı tonlarının tek renk kaynağı (kart kenarı, rozet ve sayı renkleri). */
const TONE_COLOR: Record<Tone, string> = { alert: '#d2453a', watch: '#b4770b', ok: '#0e9e6a' };

/** Eşikler tek kaynaktan (mmpiSource.VALIDITY_CUTOFFS) — yerel kopya tutulmaz. */
const CANNOT_SAY_CUTOFF = VALIDITY_CUTOFFS.cannotSayInvalid;
const F_CUTOFF = VALIDITY_CUTOFFS.fInvalid;
/** F ham 16-22 → şüpheli bant (kaynak: "profil geçersiz olabilir"). */
const F_SUSPECT = VALIDITY_CUTOFFS.fSuspect;

function toneClass(tone: Tone): string {
  return tone === 'alert' ? 'is-alert' : tone === 'watch' ? 'is-watch' : 'is-ok';
}

/** Tek geçerlik ölçeği kartı: ham/T puanı, düzey rozeti ve düzey yorumu. */
function ScaleCard({ finding }: { finding: ValidityFinding }) {
  const meaning = SCALE_MEANINGS[finding.id];
  return (
    <article className={`mv-scale ${toneClass(finding.tone)}`}>
      <header className="mv-scale-head">
        <span className="mv-scale-letter">{finding.id}</span>
        <div className="mv-scale-title">
          <b>{finding.fullName}</b>
          <span>{finding.id === '?' ? 'Yanıtlanmayan madde' : 'Geçerlik ölçeği'}</span>
        </div>
      </header>

      <p className="mv-scale-desc">{meaning.measures}</p>

      <div className="mv-scale-stats">
        <div className="mv-stat">
          <span>Ham</span>
          <b>{finding.raw}</b>
        </div>
        {finding.t !== null && (
          <div className="mv-stat">
            <span>T puanı</span>
            <b>{finding.t.toFixed(1)}</b>
          </div>
        )}
        <div className="mv-stat is-wide">
          <span>Aralık</span>
          <b>{finding.rawRange}</b>
        </div>
      </div>

      <div className="mv-scale-foot">
        <span className="mv-band" style={{ background: TONE_COLOR[finding.tone] }}>
          {finding.band}
        </span>
      </div>

      <details className="mv-scale-more">
        <summary>Düzey yorumu</summary>
        <p className="mv-scale-comment">{finding.comment}</p>
        {finding.tDetail && (
          <p className="mv-scale-comment">
            <b>{finding.tRange}: </b>
            {finding.tDetail}
          </p>
        )}
      </details>
    </article>
  );
}

/**
 * Uyarı listesinde yalnızca ilk cümle gösterilir; bandın ayrıntılı metni ilgili
 * ölçek kartında ve endeks panelinde zaten yer alır.
 */
function warningHeadline(warning: string): string {
  const colon = warning.indexOf(': ');
  if (colon < 0) return warning;
  const head = warning.slice(0, colon + 1);
  const body = warning.slice(colon + 2);
  const end = body.search(/\.\s|\.$/);
  const sentence = end >= 0 ? body.slice(0, end + 1) : body;
  return `${head} ${sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence}`;
}

/**
 * Geçerlik Analizleri — üç adımlık tek akış:
 *  1) profil durumu (uyarı şeridi) + ?, L, F, K istatistik kartları,
 *  2) F-K endeksi ve yanıt tutarlılığı endeksleri,
 *  3) tespit edilen uyarılar ve genel değerlendirme.
 * Kaynak künyeleri bu ekranda yer almaz; uygulamanın “Kaynaklar” sayfasındadır.
 */
export function MMPIValidityTab({ profile }: { profile: MMPIProfile }) {
  const { validityAnalysis, itemLevel } = profile;
  const { fkAnalysis: fk, warnings, status, findings } = validityAnalysis;

  const reasons = [
    validityAnalysis.cannotSay >= CANNOT_SAY_CUTOFF
      ? `boş bırakılan madde sayısı ${validityAnalysis.cannotSay} (eşik ≥ ${CANNOT_SAY_CUTOFF})`
      : null,
    validityAnalysis.fRaw >= F_CUTOFF ? `F ham puanı ${validityAnalysis.fRaw} (eşik ≥ ${F_CUTOFF})` : null,
  ].filter((reason): reason is string => reason !== null);

  const bannerTone: Tone = status === 'GECERSIZ' ? 'alert' : status === 'SUPHELI' || warnings.length > 0 ? 'watch' : 'ok';
  const bannerTitle =
    status === 'GECERSIZ'
      ? 'PROFİL GEÇERSİZ'
      : status === 'SUPHELI'
        ? 'PROFİL ŞÜPHELİ — DİKKATLİ DEĞERLENDİRİLMELİ'
        : warnings.length > 0
          ? 'PROFİL GEÇERLİ — İNCELENMESİ GEREKEN BULGULAR VAR'
          : 'PROFİL GEÇERLİ';
  const bannerText =
    status === 'GECERSIZ'
      ? `${reasons.join(' ve ')} eşik değerin üzerinde olduğu için bu profil standart değerlendirmeye uygun değildir. Testin yenilenmesi ya da sonuçların klinik görüşmeyle doğrulanması önerilir.`
      : status === 'SUPHELI'
        ? `F ham puanı ${validityAnalysis.fRaw} (şüpheli aralık ${F_SUSPECT}–${F_CUTOFF - 1}): profil geçersiz olabilir; diğer geçerlilik skalaları ve klinik bağlam birlikte değerlendirilmelidir.`
        : warnings.length > 0
          ? 'Geçerliği düşüren bir bulgu yok; aşağıdaki ölçek ve endeks uyarıları yorumlamada birlikte değerlendirilmelidir.'
          : 'Yanıtlanmayan madde, uygun olmayan yaşantı ve savunma düzeyi beklenen aralıkta; profil standart yorumlamaya uygundur.';

  const config = validityAnalysis.validityConfig;

  return (
    <div role="tabpanel" className="mmpi-tab-panel mv-report">
      {/* 0 · Profil durumu */}
      <div className={`mv-alert ${toneClass(bannerTone)}`} role="status">
        <span className="mv-alert-icon">
          <Icon name={bannerTone === 'alert' ? 'alert' : bannerTone === 'watch' ? 'info' : 'checkCircle'} size={18} />
        </span>
        <div className="mv-alert-body">
          <b>{bannerTitle}</b>
          <p>{bannerText}</p>
        </div>
      </div>

      {/* 1 · Geçerlik ölçeği kartları */}
      <section className="mv-step">
        <header className="mv-step-head">
          <span className="mv-step-num">1</span>
          <h4 className="mv-step-title">Geçerlik Ölçekleri</h4>
          <span className="mv-step-note">?, L, F, K — ham puan ve T dönüşümü</span>
        </header>
        <div className="mv-scale-grid">
          {findings.map(finding => (
            <ScaleCard key={finding.id} finding={finding} />
          ))}
        </div>
      </section>

      {/* 2 · Endeks ve tutarlılık analizleri */}
      <section className="mv-step">
        <header className="mv-step-head">
          <span className="mv-step-num">2</span>
          <h4 className="mv-step-title">İndeks ve Tutarlılık Analizleri</h4>
          <span className="mv-step-note">F-K endeksi · yanıt tutarlılığı</span>
        </header>

        <div className="mv-two-col">
          <div className={`mv-panel ${toneClass(fk.tone)}`}>
            <header className="mv-panel-head">
              <Icon name="trend" size={14} />
              <span>F-K Endeksi</span>
            </header>
            <div className="mv-metric">
              <span className="mv-metric-value" style={{ color: TONE_COLOR[fk.tone] }}>
                {fk.value > 0 ? `+${fk.value}` : fk.value}
              </span>
              <span className="mv-band" style={{ background: TONE_COLOR[fk.tone] }}>
                {fk.level}
              </span>
            </div>
            <p className="mv-panel-note">
              F ham {validityAnalysis.fRaw} − K ham {validityAnalysis.kRaw} = {fk.value > 0 ? `+${fk.value}` : fk.value}
            </p>
            <p className="mv-panel-text">{fk.interpretation}</p>
          </div>

          <div className="mv-panel">
            <header className="mv-panel-head">
              <Icon name="layers" size={14} />
              <span>Yanıt Tutarlılığı</span>
            </header>

            {itemLevel ? (
              <div className="mv-rows">
                <div className={`mv-row ${itemLevel.trIndex.isWarning ? 'is-alert' : ''}`}>
                  <div className="mv-row-main">
                    <b>TR Endeksi</b>
                    <span>Tekrarlanan 16 madde çiftindeki tutarsız yanıt sayısı.</span>
                  </div>
                  <div className="mv-row-value">
                    {itemLevel.trIndex.score} / {itemLevel.trIndex.evaluated || 16}
                    <span className="mv-band" style={{ background: itemLevel.trIndex.isWarning ? '#d2453a' : '#0e9e6a' }}>
                      {itemLevel.trIndex.level}
                    </span>
                  </div>
                </div>

                <div className={`mv-row ${itemLevel.carelessness.isWarning ? 'is-alert' : ''}`}>
                  <div className="mv-row-main">
                    <b>Dikkatsizlik Endeksi</b>
                    <span>12 kritik madde çiftinde rastgele işaretleme göstergesi.</span>
                  </div>
                  <div className="mv-row-value">
                    {itemLevel.carelessness.score} / {itemLevel.carelessness.evaluated || 12}
                    <span
                      className="mv-band"
                      style={{ background: itemLevel.carelessness.isWarning ? '#d2453a' : '#0e9e6a' }}
                    >
                      {itemLevel.carelessness.level}
                    </span>
                  </div>
                </div>

                <div className="mv-row">
                  <div className="mv-row-main">
                    <b>L / F / K Konfigürasyonu</b>
                    <span>{config ? config.rule : 'Bilinen örüntülerin (V, ters V vb.) dışında bir dağılım.'}</span>
                  </div>
                  <div className="mv-row-value">
                    <span
                      className="mv-band"
                      style={{
                        background: config ? TONE_COLOR[config.tone] : '#8e8e93',
                      }}
                    >
                      {config ? config.name : 'Örüntü yok'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mv-panel-note">
                Bu kayıt ham puan yöntemiyle girildi; TR, dikkatsizlik ve konfigürasyon analizleri madde düzeyinde
                yanıt gerektirir.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 3 · Uyarılar ve genel değerlendirme */}
      <section className="mv-step">
        <header className="mv-step-head">
          <span className="mv-step-num">3</span>
          <h4 className="mv-step-title">Uyarılar ve Genel Değerlendirme</h4>
          <span className="mv-step-note">{warnings.length} uyarı</span>
        </header>

        <div className="mv-two-col">
          <div className="mv-panel">
            <header className="mv-panel-head">
              <Icon name="alert" size={14} />
              <span>Tespit Edilen Uyarılar</span>
            </header>
            {warnings.length === 0 ? (
              <p className="mv-panel-text">
                <Icon name="checkCircle" size={13} /> Profili geçersiz kılan ya da dikkat gerektiren bir bulgu
                saptanmadı.
              </p>
            ) : (
              <ul className="mv-warn-list">
                {warnings.map((warning, index) => (
                  <li key={index}>
                    <Icon name="alert" size={12} />
                    <span>{warningHeadline(warning)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`mv-panel ${status === 'GECERSIZ' ? 'is-alert' : status === 'SUPHELI' ? 'is-watch' : 'is-ok'}`}>
            <header className="mv-panel-head">
              <Icon name={status === 'GECERLI' ? 'checkCircle' : status === 'SUPHELI' ? 'info' : 'alert'} size={14} />
              <span>Genel Değerlendirme</span>
            </header>
            <p className="mv-verdict-text">{validityAnalysis.interpretation}</p>
            {config && (
              <p className="mv-panel-note">
                <b>{config.name}: </b>
                {config.interpretation}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
