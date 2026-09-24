import type { MMPIProfile } from '../../scoring/mmpiScoring';
import type { ScaleId } from '../../scoring/mmpiKeys';
import { MMPI_PATTERN_CAVEATS, SCALE_MEANINGS, clinicalBandFor, detectPatterns, detectSingleElevations } from '../../scoring/mmpiInterpretation';
import { DisclosureCard } from './Disclosure';
import { Icon } from '../Icon';

const GLOSSARY_ORDER: ScaleId[] = ['?', 'L', 'F', 'K', 'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];

/**
 * Ek Ölçekler & Kritikler sekmesi — T puanı band yorumlarıyla klinik eşiği
 * aşan ölçekler, profil konfigürasyonları ve tek ölçek yükselmeleri, ayrıca
 * tüm ölçeklerin sözlüğü.
 *
 * DECISION-030/A (CHANGE-015): desen kartları **kaynak referansı + birebir alıntı +
 * kaynak çekincesi** gösterir; kaynağın nicel eşiği olmayan örüntüleri ayrı bir
 * “elle değerlendirilir” listesindedir ve sekmenin altında BÖLÜM 6’nın genel
 * yorum direktifleri basılır.
 */
export function MMPIExtraTab({ profile }: { profile: MMPIProfile }) {
  const critical = profile.clinical.filter(s => s.tScore >= 70);
  const patterns = detectPatterns(profile);
  const manualPatterns = patterns.filter(pattern => pattern.manual);
  const hitPatterns = patterns.filter(pattern => pattern.hit && !pattern.manual);
  const missPatterns = patterns.filter(pattern => !pattern.hit && !pattern.manual);
  const singles = detectSingleElevations(profile);

  return (
    <div role="tabpanel" className="mmpi-tab-panel">
      <div>
        <h4 className="mmpi-section-title">Kritik Ölçekler (T ≥ 70)</h4>
        {critical.length === 0 ? (
          <div className="mmpi-box ok">
            <Icon name="checkCircle" size={14} />
            <span> Klinik eşiği (T ≥ 70) aşan klinik ölçek yok — profil genel olarak normal aralıkta.</span>
          </div>
        ) : (
          <div className="mmpi-crit-list">
            {critical.map(scale => {
              const band = clinicalBandFor(scale.id as ScaleId, profile.gender, scale.tScore);
              return (
                <div className="mmpi-crit-item" key={scale.id}>
                  <span className="mmpi-crit-dot" />
                  <div>
                    <b>
                      {scale.fullName} — T {scale.tScore.toFixed(1)}
                      {band ? ` (${band.rangeLabel})` : ''}
                    </b>
                    <p>{band?.text ?? SCALE_MEANINGS[scale.id as ScaleId].high}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h4 className="mmpi-section-title">Tek Ölçek Yükselmeleri</h4>
        {singles.length === 0 ? (
          <div className="mmpi-box info">
            <Icon name="info" size={14} />
            <span>
              {' '}“Sadece X alt testinin yükselmesi” koşullarından hiçbiri sağlanmıyor (birden fazla ölçek
              yükseldiğinde kod analizleri önceliklidir).
            </span>
          </div>
        ) : (
          <div className="mmpi-crit-list">
            {singles.map(hit => (
              <div className="mmpi-crit-item" key={hit.scale}>
                <span className="mmpi-crit-dot" />
                <div>
                  <b>{hit.entry.rule}</b>
                  <p>{hit.entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mmpi-section-title">Desen Göstergeleri</h4>
        {hitPatterns.length === 0 ? (
          <div className="mmpi-box info">
            <Icon name="info" size={14} />
            <span> Profilde anlamlı bir örüntü göstergesi saptanmadı; tanımlı örüntülerin tamamı kapalı listede.</span>
          </div>
        ) : (
          <div className="mmpi-pattern-list">
            {hitPatterns.map(pattern => (
              <div className="mmpi-pattern-row is-hit" key={pattern.id}>
                <div className="mmpi-pattern-main">
                  <b>{pattern.name}</b>
                  <span>{pattern.rule}</span>
                  {pattern.source && (
                    <span className="mmpi-pattern-source">Kaynak: {pattern.source}</span>
                  )}
                  <p>{pattern.detail}</p>
                  {pattern.quote && (
                    <p className="mmpi-pattern-quote">“{pattern.quote}”</p>
                  )}
                  {pattern.manualNote && (
                    <p className="mmpi-pattern-note">
                      <Icon name="info" size={12} /> Elle doğrulanacak: {pattern.manualNote}
                    </p>
                  )}
                  {pattern.caveat && (
                    <div className="mmpi-box warn">
                      <Icon name="alert" size={14} />
                      <span>
                        <b>Kaynak çekincesi:</b> {pattern.caveat}
                      </span>
                    </div>
                  )}
                </div>
                <span className="pattern-pill hit">Görüldü</span>
              </div>
            ))}
          </div>
        )}
        {missPatterns.length > 0 && (
          <DisclosureCard
            title="Görülmeyen Örüntüler"
            note={`${missPatterns.length} örüntü bu profilde sağlanmıyor`}
            value={<span className="mmpi-disc-hint">Kapalı</span>}
          >
            <div className="mmpi-pattern-list">
              {missPatterns.map(pattern => (
                <div className="mmpi-pattern-row" key={pattern.id}>
                  <div className="mmpi-pattern-main">
                    <b>{pattern.name}</b>
                    <span>{pattern.rule}</span>
                    {pattern.source && (
                      <span className="mmpi-pattern-source">Kaynak: {pattern.source}</span>
                    )}
                  </div>
                  <span className="pattern-pill miss">Görülmedi</span>
                </div>
              ))}
            </div>
          </DisclosureCard>
        )}
        {manualPatterns.length > 0 && (
          <div className="mmpi-pattern-list mmpi-pattern-manual">
            {manualPatterns.map(pattern => (
              <div className="mmpi-pattern-row" key={pattern.id}>
                <div className="mmpi-pattern-main">
                  <b>{pattern.name}</b>
                  <span>{pattern.rule}</span>
                  {pattern.source && (
                    <span className="mmpi-pattern-source">Kaynak: {pattern.source}</span>
                  )}
                  <p>{pattern.detail}</p>
                  {pattern.quote && <p className="mmpi-pattern-quote">“{pattern.quote}”</p>}
                  {pattern.manualNote && (
                    <p className="mmpi-pattern-note">
                      <Icon name="info" size={12} /> {pattern.manualNote}
                    </p>
                  )}
                  {pattern.caveat && (
                    <div className="mmpi-box warn">
                      <Icon name="alert" size={14} />
                      <span>
                        <b>Kaynak çekincesi:</b> {pattern.caveat}
                      </span>
                    </div>
                  )}
                </div>
                <span className="pattern-pill miss">Elle değerlendirilir</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mmpi-section-title">Yorum Çekinceleri (BÖLÜM 6)</h4>
        <div className="mmpi-box info">
          <Icon name="alert" size={14} />
          <span>
            Aşağıdaki satırlar yorum rehberinin kendi cümleleridir; desen eşiklerinden bağımsız
            olarak her profil için geçerlidir ve hiçbir bulgu tek başına tanı yerine geçmez.
          </span>
        </div>
        <div className="mmpi-crit-list">
          {MMPI_PATTERN_CAVEATS.map(caveat => (
            <div className="mmpi-crit-item" key={caveat.source + caveat.text.slice(0, 16)}>
              <span className="mmpi-crit-dot" />
              <div>
                <b>{caveat.source}</b>
                <p>{caveat.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DisclosureCard
        title="Ölçek Sözlüğü"
        note="Her ölçeğin ne ölçtüğüne dair kısa tanımlar — incelemek için açın"
        value={<span className="mmpi-disc-hint">Kapalı</span>}
      >
        <div className="mmpi-glossary">
          {GLOSSARY_ORDER.map(id => {
            const scale = profile.scales.find(s => s.id === id);
            const meaning = SCALE_MEANINGS[id];
            if (!scale) return null;
            return (
              <div className="mmpi-glossary-item" key={id}>
                <b>
                  <i>{scale.shortName}</i> {scale.name}
                </b>
                <p>{meaning.measures}</p>
              </div>
            );
          })}
        </div>
      </DisclosureCard>
    </div>
  );
}
