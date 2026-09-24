import { useState } from 'react';
import type { MMPIProfile } from '../../scoring/mmpiScoring';
import type { DerivedIndexResult, DerivedScaleResult } from '../../scoring/mmpiDerived';
import { PERSONALITY_CUTOFFS_READ_ONLY } from '../../scoring/mmpiDerived';
import { DisclosureCard, DisclosureRow, ResultSection, useDisclosureGroup } from './Disclosure';
import { Icon } from '../Icon';

const toneColor = (tone: DerivedScaleResult['tone']): string =>
  tone === 'alert' ? '#d2453a' : tone === 'watch' ? '#b4770b' : '#0e9e6a';

type Cutoff = { mild: number; marked: number };

/** Eşik çubuğu — ham puanın “hafif” ve “belirgin” kesimlerine göre konumu. */
function ThresholdBar({ score, cutoff, color }: { score: number; cutoff: Cutoff; color: string }) {
  const max = Math.max(score, cutoff.marked) * 1.2;
  const pct = (value: number) => `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <div className="ds-threshold" aria-hidden="true">
      <span className="ds-threshold-fill" style={{ width: pct(score), background: color }} />
      <span className="ds-threshold-mark" style={{ left: pct(cutoff.mild) }} />
      <span className="ds-threshold-mark is-marked" style={{ left: pct(cutoff.marked) }} />
    </div>
  );
}

function ScaleValue({ scale }: { scale: DerivedScaleResult }) {
  const color = toneColor(scale.tone);
  return (
    <>
      <span className="mmpi-disc-num" style={{ color }}>
        {scale.rawScore}
        {scale.tScore !== null && <em>T {scale.tScore.toFixed(0)}</em>}
      </span>
      <span className="mv-band" style={{ background: color }}>
        {scale.levelLabel}
      </span>
    </>
  );
}

function ScaleBody({ scale, cutoff }: { scale: DerivedScaleResult; cutoff?: Cutoff }) {
  return (
    <>
      <p className="clin-desc">{scale.description}</p>
      {cutoff && <ThresholdBar score={scale.rawScore} cutoff={cutoff} color={toneColor(scale.tone)} />}
      {cutoff && (
        <span className="index-card-cutoff">
          Eşik: Hafif ≥ {cutoff.mild} · Belirgin ≥ {cutoff.marked}
        </span>
      )}
      <p className="mmpi-vcard-signal">{scale.interpretation}</p>
    </>
  );
}

/** Ayrım endekslerinin ölçüt aralıkları ve kesim sınırları (yalnızca görselleştirme). */
const INDEX_BANDS: Record<
  DerivedIndexResult['scaleId'],
  { min: number; max: number; bands: { from: number; to: number; short: string; color: string }[] }
> = {
  GOLDBERG: {
    min: -100,
    max: 100,
    bands: [
      { from: -100, to: 45, short: '≤ 45 nevrotik yönü', color: '#c8e8d6' },
      { from: 45, to: 100, short: '> 45 psikotik yönü', color: '#f2c4be' },
    ],
  },
  TAULBEE: {
    min: 0,
    max: 16,
    bands: [
      { from: 0, to: 6.5, short: '≤ 6 psikotik', color: '#f2c4be' },
      { from: 6.5, to: 12.5, short: '7–12 belirsiz', color: '#f2ddb2' },
      { from: 12.5, to: 16, short: '≥ 13 nevrotik', color: '#c8e8d6' },
    ],
  },
  PETERSON: {
    min: 0,
    max: 6,
    bands: [
      { from: 0, to: 2.5, short: '≤ 2 ölçüt', color: '#dde4ec' },
      { from: 2.5, to: 6, short: '≥ 3 psikotik yük', color: '#f2c4be' },
    ],
  },
};

/** Endeks puanının ölçüt aralığındaki yerini gösteren küçük bant + işaretçi. */
function IndexRangeBar({ scaleId, value }: { scaleId: string; value: number }) {
  const spec = INDEX_BANDS[scaleId as keyof typeof INDEX_BANDS];
  if (!spec) return null;
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  const markerPct = ((clamped - spec.min) / (spec.max - spec.min)) * 100;
  return (
    <div className="index-range" aria-hidden="true">
      <div className="index-range-track">
        {spec.bands.map(band => (
          <span
            key={band.short}
            style={{ flexGrow: band.to - band.from, flexBasis: 0, background: band.color }}
          />
        ))}
        <span className="index-range-marker" style={{ left: `${markerPct}%` }} />
      </div>
      <div className="index-range-labels">
        {spec.bands.map(band => (
          <span key={band.short} style={{ flexGrow: band.to - band.from, flexBasis: 0 }}>
            {band.short}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Türetilmiş Ölçekler & Endeksler — madde düzeyinde cevap verisinden hesaplanır:
 * ayrım endeksleri (Goldberg, Taulbee, Peterson) her zaman görünür; kişilik
 * eğilimleri, alkol/madde ve özel ölçekler ile Wiggins içerik ölçekleri açılır
 * satırlar hâlinde sunulur. Eşik üstü ölçekler açık gelir, geri kalanı kapalı.
 */
export function MMPIDerivedSection({ profile }: { profile: MMPIProfile }) {
  const itemLevel = profile.itemLevel;

  if (!itemLevel) {
    return (
      <div className="mmpi-tab-panel">
        <div className="mmpi-box info">
          <Icon name="info" size={14} />
          <span>
            {' '}Türetilmiş ölçekler ve endeksler madde düzeyinde (566) cevap verisi gerektirir. Bu kayıt ham puan
            yöntemiyle girildiği için hesaplanamıyorlar; T skoru temelli yorumlar diğer bölümlerde yer alır.
          </span>
        </div>
      </div>
    );
  }

  return <DerivedContent itemLevel={itemLevel} />;
}

/** Madde düzeyi verisi bulunan kayıtlar için türetilmiş ölçek içeriği. */
function DerivedContent({ itemLevel }: { itemLevel: NonNullable<MMPIProfile['itemLevel']> }) {
  const [onlyNotable, setOnlyNotable] = useState(true);
  const indexes = itemLevel.derivedIndexes;
  const personality = itemLevel.derivedScales.filter(s => s.category === 'personality');
  const addiction = itemLevel.derivedScales.filter(s => s.category === 'addiction');
  const special = itemLevel.derivedScales.filter(s => s.category === 'special');
  const wiggins = [...itemLevel.derivedScales.filter(s => s.category === 'wiggins')].sort(
    (a, b) => (b.tScore ?? 0) - (a.tScore ?? 0),
  );

  // Yalnızca “Belirgin” (eşik üstü) satırlar açık gelir; “Hafif” ve normal
  // satırlar kapalı durur ve başlıktaki düzey rozetiyle birlikte görünür.
  const notable = (list: DerivedScaleResult[]) => list.filter(scale => scale.tone !== 'ok');
  const mustOpen = (list: DerivedScaleResult[]) => list.filter(scale => scale.tone === 'alert');
  const personalityOpen = mustOpen(personality).map(scale => scale.scaleId);
  const otherOpen = mustOpen([...addiction, ...special]).map(scale => scale.scaleId);
  const personalityGroup = useDisclosureGroup(personalityOpen);
  const otherGroup = useDisclosureGroup(otherOpen);

  const personalityNote = `${personality.length} ölçek · ${notable(personality).length} eşik üstü (${personalityOpen.length} belirgin açık)`;
  const otherNote = `${addiction.length + special.length} ölçek · ${notable([...addiction, ...special]).length} eşik üstü (${otherOpen.length} belirgin açık)`;
  const wigginsNotable = notable(wiggins);
  const wigginsRows = onlyNotable && wigginsNotable.length > 0 ? wigginsNotable : wiggins;

  return (
    <div className="mmpi-tab-panel">
      <section className="mmpi-list-card">
        <header className="mmpi-list-head">
          <div className="mmpi-list-title">
            <span className="mmpi-card-dot" />
            <b>Ayrım Endeksleri</b>
            <span className="mmpi-list-note">
              Profilin nevrotik–psikotik eksenindeki konumuna dair yardımcı göstergeler; tek başına tanı koymaz.
            </span>
          </div>
        </header>
        <div className="mmpi-index-grid">
          {indexes.map(index => {
            const color = toneColor(index.tone);
            return (
              <div key={index.scaleId} className={`index-card ${index.tone === 'alert' ? 'is-high' : ''}`}>
                <div className="index-card-head">
                  <div className="index-card-value" style={{ color }}>
                    {index.value}
                  </div>
                  <div className="index-card-title">
                    <b>{index.scaleName}</b>
                    <span className="index-card-level" style={{ color }}>
                      {index.levelLabel}
                    </span>
                  </div>
                </div>
                <IndexRangeBar scaleId={index.scaleId} value={index.value} />
                <p>{index.interpretation}</p>
              </div>
            );
          })}
        </div>
      </section>

      <ResultSection
        title="Kişilik Bozukluğu Eğilimleri"
        note={personalityNote}
        ids={personality.map(scale => scale.scaleId)}
        group={personalityGroup}
      >
        {personality.map(scale => (
          <DisclosureRow
            key={scale.scaleId}
            id={scale.scaleId}
            tone={scale.tone}
            open={personalityGroup.isOpen(scale.scaleId)}
            onToggle={personalityGroup.toggle}
            title={scale.scaleName}
            summary={scale.description}
            value={<ScaleValue scale={scale} />}
          >
            <ScaleBody
              scale={scale}
              cutoff={PERSONALITY_CUTOFFS_READ_ONLY[scale.scaleId as keyof typeof PERSONALITY_CUTOFFS_READ_ONLY]}
            />
          </DisclosureRow>
        ))}
      </ResultSection>

      <ResultSection
        title="Madde Bağımlılığı ve Özel Ölçekler"
        note={otherNote}
        ids={[...addiction, ...special].map(scale => scale.scaleId)}
        group={otherGroup}
      >
        {[...addiction, ...special].map(scale => (
          <DisclosureRow
            key={scale.scaleId}
            id={scale.scaleId}
            tone={scale.tone}
            open={otherGroup.isOpen(scale.scaleId)}
            onToggle={otherGroup.toggle}
            title={scale.scaleName}
            summary={scale.description}
            value={<ScaleValue scale={scale} />}
          >
            <ScaleBody scale={scale} />
          </DisclosureRow>
        ))}
      </ResultSection>

      <DisclosureCard
        title="Wiggins İçerik Ölçekleri"
        note={`${wiggins.length} ölçek · ${wigginsNotable.length} belirgin (T ≥ 70)`}
        value={wigginsNotable.length > 0 ? <span className="mmpi-disc-hint">Kapalı — incelemek için açın</span> : undefined}
        tone={wigginsNotable.length > 0 ? 'watch' : 'ok'}
      >
        <div className="wiggins-toolbar">
          <button type="button" className="quicknav-chip" onClick={() => setOnlyNotable(value => !value)}>
            {onlyNotable ? 'Tüm ölçekleri göster' : 'Sadece belirginleri göster'}
          </button>
          <span className="mmpi-list-note">
            İçerik ölçekleri T puanları cinsiyete göre Türk örneklemi ortalama/standart sapma değerleriyle hesaplanır;
            T ≥ 70 belirgin içerik yükselmesi kabul edilir.
          </span>
        </div>
        <div className="mmpi-summary-table-wrap">
          <table className="mmpi-summary-table wiggins-table">
            <thead>
              <tr>
                <th className="row-head">Ölçek</th>
                <th>Ham</th>
                <th>T</th>
                <th>Düzey</th>
                <th className="col-note">Not</th>
              </tr>
            </thead>
            <tbody>
              {wigginsRows.map(scale => (
                <tr key={scale.scaleId}>
                  <th className="row-head" title={scale.description}>
                    {scale.scaleName}
                  </th>
                  <td className="num">{scale.rawScore}</td>
                  <td className="num" style={{ color: toneColor(scale.tone), fontWeight: 700 }}>
                    {scale.tScore !== null ? scale.tScore.toFixed(1) : '—'}
                  </td>
                  <td>
                    <span className="level-badge" style={{ background: toneColor(scale.tone) }}>
                      {scale.levelLabel}
                    </span>
                  </td>
                  <td className="col-note ws-muted">{scale.tone !== 'ok' ? scale.interpretation : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DisclosureCard>
    </div>
  );
}
