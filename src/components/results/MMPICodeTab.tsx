import type { MMPIProfile } from '../../scoring/mmpiScoring';
import { codeInterpretationForProfile, thirdHighestClinical } from '../../scoring/mmpiInterpretation';
import { stripPageRefs } from '../../scoring/mmpiScaleDossiers';
import { Icon } from '../Icon';

/**
 * Kod Analizleri sekmesi — profil kodu (Mf ve Si hariç en yüksek iki klinik
 * ölçek) ve iki noktalı kod yorumları. Kodlar kanonik biçimde eşlenir
 * (21 → 12/21); yorumu tanımlı olmayan kodlar için genel not verilir.
 */
export function MMPICodeTab({ profile }: { profile: MMPIProfile }) {
  const code = profile.profileCode;
  // DECISION-029/A: blok-yerel gövde öncelikli, eşleşme yoksa yorum gösterilmez
  // (eski davranış kodu iki haneye kırparak BAŞKA bir kodun yorumunu gösteriyordu).
  const resolved = codeInterpretationForProfile(code, profile);
  const entry = resolved?.entry;
  const blockName = entry?.block ? profile.clinical.find(x => x.id === entry.block)?.fullName : undefined;
  const codeDigits = (code ?? '').split('');
  const idByDigit: Record<string, string> = {
    '1': 'Hs', '2': 'D', '3': 'Hy', '4': 'Pd', '5': 'Mf', '6': 'Pa', '7': 'Pt', '8': 'Sc', '9': 'Ma', '0': 'Si',
  };
  const codeScales = codeDigits
    .map(digit => profile.clinical.find(s => idByDigit[digit] === s.id))
    .filter(s => s !== undefined);
  const third = thirdHighestClinical(profile, codeDigits.map(digit => idByDigit[digit] ?? ''));

  const digitById: Record<string, string> = {
    Hs: '1', D: '2', Hy: '3', Pd: '4', Mf: '5', Pa: '6', Pt: '7', Sc: '8', Ma: '9', Si: '0',
  };
  const thirdDigit = third ? digitById[third.id] : undefined;
  const triadCandidate = code && thirdDigit ? `${code}${thirdDigit}` : undefined;
  const triadResolved = triadCandidate ? codeInterpretationForProfile(triadCandidate, profile) : undefined;

  let multiResolved = triadResolved;
  if (!multiResolved && code && thirdDigit) {
    const fourth = profile.clinical
      .filter(s => !codeDigits.map(d => idByDigit[d]).concat(third?.id ?? '').includes(s.id))
      .sort((a, b) => b.tScore - a.tScore)[0];
    const fourthDigit = fourth ? digitById[fourth.id] : undefined;
    if (fourthDigit) {
      const quadCandidate = `${code}${thirdDigit}${fourthDigit}`;
      const quadResolved = codeInterpretationForProfile(quadCandidate, profile);
      if (quadResolved) multiResolved = quadResolved;
    }
  }

  return (
    <div role="tabpanel" className="mmpi-tab-panel">
      <div className="mmpi-code-grid">
        <section className="mmpi-code-card">
          <h4 className="mmpi-card-title">
            <span className="mmpi-card-dot" />
            Profil Kodu
          </h4>
          <div className="mmpi-code-value">{code ?? '—'}</div>
          <div className="mmpi-code-name">
            {entry
              ? `Kod ${entry.code}${blockName ? ` — ${blockName} bloğunun gövdesi` : ' — yorumu aşağıdadır'}`
              : code
                ? 'Kod noktası — kaynak yorumu tanımlı değil'
                : 'Kod hesaplanamadı'}
          </div>
          {codeScales.map((scale, index) => (
            <div className="mmpi-code-scale" key={scale.id}>
              <b>
                {index + 1}. {scale.fullName} — T {scale.tScore.toFixed(1)}
              </b>
              <span>
                {index === 0
                  ? 'Kodun birinci (en yüksek) ölçeği'
                  : index === 1
                    ? 'Kodun ikinci ölçeği'
                    : `${index + 1}. ölçek`}
              </span>
            </div>
          ))}
          {third && (
            <div className="mmpi-code-scale">
              <b>
                3. yükselen: {third.fullName} — T {third.tScore.toFixed(1)}
              </b>
              <span>Üçüncü yükselen alt test koda ek bilgi katar.</span>
            </div>
          )}
          <p className="mmpi-code-desc">
            <Icon name="info" size={13} />
            Kod, Mf ve Si hariç en yüksek iki klinik ölçekten oluşur; her iki sıralama (ör. 12/21) aynı örüntüyü
            temsil eder. Kod tek başına tanı değil, yorumlamada başlangıç noktasıdır.
          </p>
        </section>

        <section className="mmpi-code-bars">
          <h4 className="mmpi-card-title">
            <span className="mmpi-card-dot" />
            Kod Yorumu
          </h4>
          {entry ? (
            <>
              <p className="clin-signal">{stripPageRefs(entry.text)}</p>
              {entry.diagnosis && entry.diagnosis.length > 0 && (
                <div className="mmpi-box info">
                  <b>Olası Tanı:</b>
                  <ul>
                    {entry.diagnosis.map((d, i) => (
                      <li key={i}>
                        <Icon name="info" size={12} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.seeAlso && <p className="mmpi-summary-note">{stripPageRefs(entry.seeAlso)}</p>}
              {resolved && resolved.activeConditions.length > 0 && (
                <div className="mmpi-box info">
                  <b>Koşullu ek yorum:</b>
                  <ul>
                    {resolved.activeConditions.map((c, i) => (
                      <li key={i}>
                        <Icon name="info" size={12} />
                        {stripPageRefs(c.quote)}
                        {c.manual ? (
                          <span className="mmpi-code-name"> (yaş/süre bilgisi gerekir, elle değerlendirilmelidir)</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {multiResolved && multiResolved.entry.code !== entry.code && (
                <div className="mmpi-box info" style={{ marginTop: '0.75rem' }}>
                  <b>Genişletilmiş Çok Noktalı Kod Analizi: {multiResolved.entry.code}</b>
                  <p className="clin-signal" style={{ marginTop: '0.35rem' }}>{stripPageRefs(multiResolved.entry.text)}</p>
                  {multiResolved.entry.diagnosis && multiResolved.entry.diagnosis.length > 0 && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <b>Olası Tanı ({multiResolved.entry.code}):</b>
                      <ul>
                        {multiResolved.entry.diagnosis.map((d, i) => (
                          <li key={i}>
                            <Icon name="info" size={12} />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {multiResolved.entry.seeAlso && (
                    <p className="mmpi-summary-note" style={{ marginTop: '0.35rem' }}>
                      {stripPageRefs(multiResolved.entry.seeAlso)}
                    </p>
                  )}
                  {multiResolved.activeConditions.length > 0 && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <b>Koşullu ek yorum:</b>
                      <ul>
                        {multiResolved.activeConditions.map((c, i) => (
                          <li key={i}>
                            <Icon name="info" size={12} />
                            {stripPageRefs(c.quote)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="clin-desc">
              Bu koda ilişkin tanımlı bir kaynak yorumu yoktur. Kaynak, üç ve daha çok ölçekli ya da
              blok-yerel kodları (ör. 123, 8726, 049, 027(8)) ayrı başlıklar olarak verir; bu gövdeler
              çıkarılmadığı sürece burada <b>bilerek başka bir kodun yorumu gösterilmez</b>. Klinik ölçeklerin
              ayrıntılı T puanı yorumları için “Klinik Ölçekler” sekmesine, profil konfigürasyonları için
              “Ek Ölçekler &amp; Kritikler” sekmesine bakınız.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
