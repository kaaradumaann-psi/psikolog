import { useId } from 'react';
import type { MMPIProfile, ScaleResult } from '../../scoring/mmpiScoring';
import { K_CORRECTION } from '../../scoring/mmpiKeys';
import type { ScaleId } from '../../scoring/mmpiKeys';
import {
  SCALE_MEANINGS,
  clinicalBandFor,
  detectSingleElevations,
  type SingleElevationHit,
} from '../../scoring/mmpiInterpretation';
import {
  SCALE_DOSSIERS,
  dossierSourceLine,
  grahamListsFor,
  tabloDetail,
  type ClinicalScaleId,
  type GrahamItem,
  type GrahamList,
} from '../../scoring/mmpiScaleDossiers';
import { DisclosureControls, DisclosureRow, useDisclosureGroup } from './Disclosure';
import { Icon } from '../Icon';

/* ==========================================================================
   Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987)
   --------------------------------------------------------------------------
   Tasarım sözleşmesi — sitenin geri kalanıyla birebir aynı dil:
   • Tipografi: kartın tamamı arayüz yazı tipinde (var(--font-sans)). Serif
     (--font-display) yalnız 300 ağırlıkta, panel başlıklarında kullanılır;
     veri kartının içinde serif ya da italik gövde metni yoktur.
   • Yüzey: kâğıt beyazı + saç teli ayraç + fısıltı düzeyinde gölge; renk
     yalnızca durum noktası ve T sayısında.
   • Açılır-kapanır bölümler diğer sekmelerle AYNI bileşeni paylaşır
     (DisclosureRow / DisclosureControls), böylece davranış sekmeden sekmeye
     değişmez.
   • Uzun kaynak listeleri (Graham 1987 maddeleri, demografik notlar, madde
     numaraları tabloları) katlanabilir; klinik anlatı her zaman görünür
     kalır. Yazdırmada tümü kendiliğinden açılır.
   ========================================================================== */

/**
 * Katlanabilir bölüm anahtarları. `card` kartın bütün gövdesini kapatır
 * (başlık her zaman görünür kalır); diğer üçü gövdenin içindeki uzun kaynak
 * bölümleridir.
 */
type SectionKey = 'card' | 'graham' | 'notes' | 'tablo';

const SECTION_KEYS: readonly SectionKey[] = ['card', 'graham', 'notes', 'tablo'];

const sectionId = (scaleId: string, key: SectionKey) => `${scaleId}:${key}`;

function GrahamItemView({ item }: { item: GrahamItem }) {
  if (typeof item === 'string') return <li>{item}</li>;
  return (
    <li>
      {item.text}
      {item.sub.length > 0 && (
        <ul className="graham-sub">
          {item.sub.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function GrahamListBlock({ list }: { list: GrahamList }) {
  return (
    <div className="graham-block">
      {list.label && <p className="graham-label">{list.label}</p>}
      <ol className="graham-list">
        {list.items.map((item, i) => (
          <GrahamItemView key={i} item={item} />
        ))}
      </ol>
    </div>
  );
}

/**
 * T çubuğu: 0–120 aralığında, 50 ortalama ve 70 klinik eşik işaretli.
 * Sitenin başka yerinde tanımlı olan `.mmpi-tbar` dili kullanılır; böylece
 * kartın sayısal T değeri tek bakışta karşılaştırılabilir hâle gelir.
 * Dolgu rengi satır içi stille değil, kartın `.is-high` / `.is-low` durumu
 * üzerinden tasarım token'larından gelir.
 */
function TBar({ t }: { t: number }) {
  const pct = (value: number) => `${Math.min(100, Math.max(0, (value / 120) * 100)).toFixed(2)}%`;
  return (
    <span className="mmpi-tbar scale-dossier-tbar" role="img" aria-label={`T skoru ${Math.round(t)} / 120`}>
      <span className="mmpi-tbar-fill" style={{ width: pct(t) }} />
      <span className="mmpi-tbar-mark" style={{ left: pct(50) }} />
      <span className="mmpi-tbar-mark is-limit" style={{ left: pct(70) }} />
    </span>
  );
}

/**
 * Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987) kartı.
 * Yalnızca klinik olarak anlamlı ölçekler için üretilir: T ≥ 70 (Klinik
 * Yükseklik) ya da T ≤ 40 (Klinik Düşüklük). Bölümler: Klinik Açıklama ve
 * Analiz → Graham (1987) listeleri → Demografik ve Klinik Notlar → Koşullu
 * ek yorum → Ek Klinik Bilgiler → kaynak (yalnız kart altlığında).
 */
function ScaleDossierCard({
  profile,
  scale,
  singleHits,
  group,
}: {
  profile: MMPIProfile;
  scale: ScaleResult;
  singleHits: SingleElevationHit[];
  /** Açılır bölümlerin durumu rapor düzeyinde tek grupta tutulur. */
  group: Pick<ReturnType<typeof useDisclosureGroup>, 'isOpen' | 'toggle'>;
}) {
  const id = scale.id as ClinicalScaleId;
  const dossier = SCALE_DOSSIERS[id];
  const high = scale.tScore >= 70;
  const tMap = Object.fromEntries(profile.clinical.map(s => [s.id, s.tScore])) as Record<ScaleId, number>;
  const band = clinicalBandFor(id, profile.gender, scale.tScore);
  const { range, lists } = grahamListsFor(id, scale.tScore, high ? 'high' : 'low');
  const tab = tabloDetail(id, profile.gender);
  const grahamCount = lists.reduce((total, list) => total + list.items.length, 0);

  const conditions = [
    ...(dossier.conditions ?? [])
      .map(c => ({ when: c.when, sentence: c.sentence, active: c.match(tMap) }))
      .sort((a, b) => Number(b.active) - Number(a.active)),
    ...singleHits.filter(h => h.scale === id).map(h => ({ when: h.entry.rule, sentence: h.entry.text, active: true })),
  ];

  const notes = dossier.notes ?? [];
  const isOpen = (key: SectionKey) => group.isOpen(sectionId(id, key));
  const onToggle = (key: SectionKey) => group.toggle(sectionId(id, key));
  const bodyId = `${useId()}-dossier`;
  const cardOpen = isOpen('card');
  /** Klasik ekleme tablosu oranı (Hs .5K, Pd .4K, Pt 1K, Sc 1K, Ma .2K). */
  const kRatio = K_CORRECTION[id];

  return (
    <article
      id={`dossier-${id}`}
      className={`scale-dossier ${high ? 'is-high' : 'is-low'} ${cardOpen ? 'is-open' : ''}`}
    >
      {/* Başlık satırının tamamı bir düğmedir: kart gövdesi buradan katlanır.
          Özet bilgiler (durum, T, çubuk, ham/K+) kapalıyken de görünür kalır. */}
      <h3 className="scale-dossier-heading">
        <button
          type="button"
          className="scale-dossier-toggle"
          aria-expanded={cardOpen}
          aria-controls={bodyId}
          onClick={() => onToggle('card')}
        >
          <span className="mmpi-disc-chevron" aria-hidden="true">
            <Icon name="right" size={14} />
          </span>
          <span className="scale-dossier-id">
            <span className="scale-dossier-dot" aria-hidden="true" />
            <span className="scale-dossier-titles">
              <span className="scale-dossier-eyebrow">Kategori: Klinik Ölçek · Alt test {dossier.number}</span>
              <span className="scale-dossier-name">
                {scale.name}
                <span className="scale-dossier-short">{scale.shortName}</span>
              </span>
            </span>
          </span>
          <span className="scale-dossier-scores">
            <span className={`klinik-pill ${high ? 'is-high' : 'is-low'}`}>
              {high ? 'KLİNİK YÜKSEKLİK' : 'KLİNİK DÜŞÜKLÜK'}
            </span>
            <span className="scale-dossier-tgroup">
              <span className="score-t">{Math.round(scale.tScore)}</span>
              <span className="score-t-label">T skoru</span>
            </span>
            <TBar t={scale.tScore} />
            <span className="scale-dossier-stats">
              <span className="dossier-stat">Ham: {scale.rawScore}</span>
              {scale.kAdded !== undefined && <span className="dossier-stat">K+: {scale.kAdded}</span>}
            </span>
          </span>
        </button>
      </h3>

      <div id={bodyId} className="scale-dossier-body" hidden={!cardOpen}>
        <section className="dossier-sec">
          <h4 className="dossier-sec-title">KLİNİK AÇIKLAMA VE ANALİZ</h4>
          <p className="dossier-lead">{band ? band.text : high ? SCALE_MEANINGS[id].high : SCALE_MEANINGS[id].low}</p>
        </section>

        <DisclosureRow
          id={sectionId(id, 'graham')}
          open={isOpen('graham')}
          onToggle={() => onToggle('graham')}
          title={`${scale.shortName} (${dossier.number}) ALT TESTİNDE ${high ? 'YÜKSEK' : 'DÜŞÜK'} PUAN ALAN BİREYİN`}
          summary={
            range
              ? `Kaynakta bu düzey için verilen liste: ${range} · ${grahamCount} madde`
              : `${grahamCount} madde — kaynaktaki tam liste`
          }
          value={<span className="dossier-fold-hint">(GRAHAM 1987)</span>}
        >
          {lists.map((list, i) => (
            <GrahamListBlock key={i} list={list} />
          ))}
        </DisclosureRow>

        {notes.length > 0 && (
          <DisclosureRow
            id={sectionId(id, 'notes')}
            open={isOpen('notes')}
            onToggle={() => onToggle('notes')}
            title="Demografik ve Klinik Notlar"
            summary="Yaş, cinsiyet ve tıbbi duruma göre yorum farkları"
            value={<span className="dossier-fold-hint">{notes.length} not</span>}
          >
            {notes.map((note, i) => (
              <div key={i} className="dossier-note">
                {note.title && <p className="graham-label">{note.title}</p>}
                {note.paragraphs?.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {note.list && (
                  <ul className="dossier-note-list">
                    {note.list.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </DisclosureRow>
        )}

        {conditions.length > 0 && (
          <section className="dossier-sec">
            <h4 className="dossier-sec-title">Koşullu ek yorum</h4>
            <ul className="dossier-cond-list">
              {conditions.map((c, i) => (
                <li key={i} className={c.active ? 'is-active' : 'is-passive'}>
                  <span className="cond-flag" aria-hidden="true">
                    <Icon name={c.active ? 'checkCircle' : 'info'} size={13} />
                  </span>
                  <span className="cond-text">
                    <b className="cond-when">{c.when}</b>
                    <span className="cond-sentence">{c.sentence}</span>
                  </span>
                  <span className={`cond-chip ${c.active ? 'is-active' : ''}`}>
                    {c.active ? 'Bu profilde geçerli' : 'Koşul sağlanmıyor'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="dossier-sec">
          <h4 className="dossier-sec-title">EK KLİNİK BİLGİLER</h4>
          <p className="dossier-para">{dossier.overview}</p>
          {/* Dört ölçü tek satırda: hücreler flex ile dağılır, böylece ızgarada
              hiç boş (gri) hücre kalmaz ve K düzeltmesi de sığar. */}
          <dl className="dossier-facts">
            <div className="dossier-fact">
              <dt>Madde Sayısı</dt>
              <dd>{tab.count}</dd>
            </div>
            <div className="dossier-fact">
              <dt>Doğru (D)</dt>
              <dd>{tab.dogru.length} madde</dd>
            </div>
            <div className="dossier-fact">
              <dt>Yanlış (Y)</dt>
              <dd>{tab.yanlis.length} madde</dd>
            </div>
            <div className="dossier-fact">
              <dt>K düzeltmesi</dt>
              <dd>{tab.kEkleli ? `+${kRatio}K` : 'Uygulanmaz'}</dd>
            </div>
          </dl>
          <p className="dossier-para dossier-knote">
            {tab.kEkleli
              ? `K Eklemeli bir alt testtir. Klasik ekleme tablosuna göre ham puana ${kRatio}\u00d7K eklenir.`
              : `Bu alt teste K düzeltmesi uygulanmaz (Tablo ${tab.no}\u2019de \u201cK Eklemeli\u201d işareti yoktur).`}
          </p>
          {tab.extraNote && <p className="dossier-extra-note">{tab.extraNote}</p>}
          {/* Normlar kitabın kendi standardizasyon tablosundan (Tablo 30) okunur.
              Bazı alt test tablolarının dipnotu farklı bir değer basar (Hy kadın,
              Pt kadın, Si erkek); bu kaynak içi çelişkiler CONFLICT-028/037/040
              olarak denetlendi ve Tablo 30 esas alındı. Atıf bu yüzden tabloyu
              da anar: kitap dipnotuyla karşılaştıran uzman farkın nedenini görür. */}
          <p className="dossier-para dossier-norms">
            Erkeklerde ortalama: {tab.normMale.toFixed(2)}, kadınlarda: {tab.normFemale.toFixed(2)} (Savaşır, 1981) —
            Tablo 30
          </p>
        </section>

        <DisclosureRow
          id={sectionId(id, 'tablo')}
          open={isOpen('tablo')}
          onToggle={() => onToggle('tablo')}
          title={`Tablo ${tab.no}: ${tab.title} (Madde Sayısı: ${tab.count})`}
          summary="Puanlama yönüne göre madde numaraları — başvuru amaçlı"
          value={<span className="dossier-fold-hint">{tab.count} madde</span>}
        >
          <div className="tablo-block">
            <div className="tablo-col is-dogru">
              <p className="tablo-col-head">
                Doğru Maddeler <span>{tab.dogru.length} adet</span>
              </p>
              <p className="tablo-items">{tab.dogru.join(' · ')}</p>
            </div>
            <div className="tablo-col is-yanlis">
              <p className="tablo-col-head">
                Yanlış Maddeler <span>{tab.yanlis.length} adet</span>
              </p>
              <p className="tablo-items">{tab.yanlis.join(' · ')}</p>
            </div>
          </div>
        </DisclosureRow>

        <footer className="dossier-source">{dossierSourceLine(id)}</footer>
      </div>
    </article>
  );
}

/**
 * Klinik Ölçekler sekmesi — "Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987)".
 * T-skoru 70 ve üzeri ya da 40 ve altı olan ölçekler klinik olarak anlamlı
 * kabul edilir ve otomatik olarak vurgulanır; diğer ölçekler kart almaz.
 *
 * Açılır bölümlerin açık/kapalı durumu tek bir grupta tutulur ve üstteki
 * "Tümünü aç / Tümünü kapat" denetimiyle topluca yönetilir. Varsayılan:
 * tüm kart gövdeleri açıktır (başlık satırı kapalıyken de özeti taşır) ve
 * yalnız en belirgin ölçeğin Graham (1987) listesi açıktır; geri kalan uzun
 * kaynak listeleri kapalı gelir.
 */
export function MMPIClinicalTab({ profile }: { profile: MMPIProfile }) {
  const flagged = profile.clinical.filter(s => s.tScore >= 70 || s.tScore <= 40);
  const singleHits = detectSingleElevations(profile);

  const leadId = flagged.length > 0 ? flagged.reduce((a, b) => (b.tScore > a.tScore ? b : a)).id : null;

  const sectionIds = flagged.flatMap(s =>
    SECTION_KEYS.filter(key => key !== 'notes' || hasNotes(s.id as ClinicalScaleId)).map(key => sectionId(s.id, key)),
  );
  // Varsayılan: tüm kartlar açık (başlık zaten özettir), Graham listesi yalnız
  // en belirgin ölçekte açık gelir.
  const defaultOpen = [
    ...flagged.map(s => sectionId(s.id, 'card')),
    ...(leadId ? [sectionId(leadId, 'graham')] : []),
  ];
  const group = useDisclosureGroup(defaultOpen);

  return (
    <div role="tabpanel" className="mmpi-tab-panel mmpi-clinical-report">
      <section className="clin-report-head">
        <div className="clin-report-head-text">
          <h4 className="mmpi-section-title">Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987)</h4>
          <p className="clinical-report-note">
            T-skoru 70 ve üzeri veya 40 ve altı olan ölçekler klinik olarak anlamlı kabul edilir ve otomatik olarak
            vurgulanır. Uzun kaynak listeleri katlanabilir; yazdırırken tümü kendiliğinden açılır.
          </p>
        </div>

        {flagged.length > 0 && (
          <>
            <nav className="clin-quicknav" aria-label="Belirgin ölçekler">
              {flagged.map(s => (
                <a key={s.id} className={`clin-quicknav-chip ${s.tScore >= 70 ? 'is-high' : 'is-low'}`} href={`#dossier-${s.id}`}>
                  <span className="clin-quicknav-dot" aria-hidden="true" />
                  <b>{s.shortName}</b>
                  <span className="clin-quicknav-t">T {Math.round(s.tScore)}</span>
                  <em>{s.name}</em>
                </a>
              ))}
            </nav>
            <div className="clin-report-tools">
              <DisclosureControls ids={sectionIds} group={group} total={sectionIds.length} />
            </div>
          </>
        )}
      </section>

      {flagged.length === 0 ? (
        <div className="mmpi-box info">
          <Icon name="info" size={14} />
          <span>Bu profilde T-skoru 70 ve üzeri ya da 40 ve altı klinik ölçek bulunmuyor.</span>
        </div>
      ) : (
        flagged.map(scale => (
          <ScaleDossierCard key={scale.id} profile={profile} scale={scale} singleHits={singleHits} group={group} />
        ))
      )}
    </div>
  );
}

/** Demografik not bölümü yalnız notu olan ölçeklerde listelenir. */
function hasNotes(id: ClinicalScaleId): boolean {
  return (SCALE_DOSSIERS[id].notes?.length ?? 0) > 0;
}
