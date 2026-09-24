import { ReportsSummary } from '../reports/ReportsPage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EXPERT_NOTES_MAX, getRecordDetail, updateExpertNotes } from '../records/supabaseRecords';
import type { FullRecordDetail } from '../records/supabaseRecords';
import { methodLabel, parseRecordPayload } from '../workspace/caseTypes';
import { answersFromRecordPayload, profileFromRecord } from '../results/recordProfile';
import { validityStatusDisplay } from '../scoring/mmpiInterpretation';
import { MMPIResultsPanel } from './results/MMPIResultsPanel';
import { MMPIPrintReport } from './results/MMPIPrintReport';
import type { AuthenticatedUser } from '../auth/authTypes';
import { navigate } from '../router';
import { Icon } from './Icon';

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/* ------------------------------------------------------------------ */
/* PDF dosya adı: MMPI_Klinik_Raporu_<Danisan>_<gg-AA-yyyy>             */
/* ------------------------------------------------------------------ */

const TR_ASCII: Record<string, string> = {
  ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', I: 'I', i: 'i', İ: 'I', ö: 'o', Ö: 'O',
  ş: 's', Ş: 'S', ü: 'u', Ü: 'U', â: 'a', Â: 'A', î: 'i', Î: 'I', û: 'u', Û: 'U',
};

/** Danışan adını dosya adı için güvenli ASCII parçasına çevirir. */
function nameSlug(name: string): string {
  const transliterated = name
    .split('')
    .map(ch => TR_ASCII[ch] ?? ch)
    .join('');
  const words = transliterated
    .split(/[^A-Za-z0-9]+/)
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));
  return words.length > 0 ? words.join('_') : 'Danisan';
}

/** ISO (yyyy-AA-gg) ya da gg.AA.yyyy tarihini gg-AA-yyyy biçimine çevirir. */
function fileDate(value: string | null | undefined): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const dotted = /^(\d{1,2})[.](\d{1,2})[.](\d{4})$/.exec((value ?? '').trim());
  if (dotted) return `${dotted[1]!.padStart(2, '0')}-${dotted[2]!.padStart(2, '0')}-${dotted[3]}`;
  const parsed = new Date(value ?? '');
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${parsed.getUTCFullYear()}`;
  }
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${now.getUTCFullYear()}`;
}

/**
 * Revizyon kökeni şeridi. Kapatılabilir; kapatma durumu ÇAĞIRAN tarafta tutulur
 * ve kalıcı depolamaya yazılmaz, böylece sayfa yenilendiğinde (F5) ya da başka
 * bir kayıt açıldığında izlenebilirlik bilgisi kendiliğinden geri gelir.
 * Kapatma düğmesi kâğıda basılmaz (`no-print`); şeridin kendisi basılır.
 */
export function RevisionNotice({
  revisionOf,
  revisionReason,
  onDismiss,
}: {
  revisionOf: string;
  revisionReason?: string | null;
  onDismiss: () => void;
}) {
  return (
    <div className="status-banner info-banner" role="status">
      <Icon name="refresh" size={16} />
      <span style={{ flex: 1 }}>
        Bu kayıt <strong>{revisionOf.slice(0, 8)}…</strong> kaydının düzenlenmiş (revizyon) halidir.
        {revisionReason ? ` Neden: ${revisionReason}.` : ''}{' '}
        <a href={`/kayitlar/${revisionOf}`} className="ws-revision-link">
          Orijinal kaydı görüntüle
        </a>
      </span>
      <button
        type="button"
        className="close-banner-btn no-print"
        aria-label="Revizyon bilgisini gizle (sayfa yenilenince geri gelir)"
        title="Sayfa yenilenince (F5) tekrar görünür"
        onClick={onDismiss}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/**
 * Test kaydı detay sayfası — açılır pencere değil, tam sayfa.
 * `/kayitlar/:id` rotasıyla açılır; Supabase RLS erişimi zorlar
 * (yönetici tüm kayıtları, psikolog yalnız kendi kayıtlarını görür).
 *
 * Ekran: kısa özet şeridi + sekmeli çalışma görünümü (progressive disclosure).
 * Baskı/PDF: yalnızca gerekli MMPI verisini taşıyan profesyonel rapor
 * (`MMPIPrintReport`); yazdırma dosya adı document.title üzerinden
 * `MMPI_Klinik_Raporu_<Danisan>_<gg-AA-yyyy>` olarak önerilir.
 */
export function RecordDetailPage({
  recordId,
  viewer,
  onBack,
}: {
  recordId: string;
  viewer?: AuthenticatedUser | null;
  onBack: () => void;
}) {
  const [record, setRecord] = useState<FullRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Uzman notu: kayıt sonrası klinik değerlendirme; rapora aktarılır.
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaved, setNotesSaved] = useState('');
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesMessage, setNotesMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  /* Revizyon şeridi kapatılabilir. Kapatma durumu YALNIZ bellekte tutulur
     (localStorage/sessionStorage'a yazılmaz); böylece sayfa yenilendiğinde (F5)
     veya başka bir kayıt açıldığında izlenebilirlik bilgisi kendiliğinden geri
     gelir ve revizyon kökeni kalıcı olarak gizlenemez. */
  const [revisionHidden, setRevisionHidden] = useState(false);
  /* Uzman notu bölümü AÇILIR-KAPANIR ve KAPALI başlar (kullanıcı isterse elle
     açar). Yapay zekâ yorumu not eklendiğinde metin kaybolmasın diye bölüm
     kendiliğinden açılır ve görünür kaydırılır. */
  const notesDetailsRef = useRef<HTMLDetailsElement | null>(null);

  function openNotesSection() {
    const details = notesDetailsRef.current;
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  useEffect(() => {
    setRevisionHidden(false);
  }, [recordId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getRecordDetail(recordId)
      .then(detail => {
        if (active) {
          setRecord(detail);
          setNotesDraft(detail.expertNotes);
          setNotesSaved(detail.expertNotes);
          setNotesMessage(null);
        }
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Test kaydı yüklenemedi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [recordId]);

  const parsed = useMemo(() => (record ? parseRecordPayload(record.rawOmrAnswers ?? []) : null), [record]);
  const client = parsed?.client;
  const omrPages = parsed?.omrPages ?? [];
  const profile = useMemo(
    () => (record && parsed ? profileFromRecord(record, parsed) : null),
    [record, parsed],
  );
  const answers = useMemo(() => (parsed ? answersFromRecordPayload(parsed) : null), [parsed]);

  const fullName = `${client?.firstName ?? record?.firstName ?? ''} ${client?.lastName ?? record?.lastName ?? ''}`.trim();
  const testDate = client?.testDate ?? record?.applicationDate ?? '';

  // Yazdır/PDF kaydedilirken tarayıcının önerdiği dosya adı rapor adıyla eşleşsin.
  useEffect(() => {
    if (loading || error || !record) return;
    const previous = document.title;
    document.title = `MMPI_Klinik_Raporu_${nameSlug(fullName || 'Danisan')}_${fileDate(testDate)}`;
    return () => {
      document.title = previous;
    };
  }, [loading, error, record, fullName, testDate]);

  if (loading) {
    return (
      <div className="record-page">
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Test kaydı açılıyor...</p>
        </div>
      </div>
    );
  }

  if (error || !record || !parsed) {
    return (
      <div className="record-page">
        <div className="record-page-topbar no-print">
          <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
            <Icon name="left" size={15} />
            <span>Listeye dön</span>
          </button>
        </div>
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Icon name="alert" size={32} />
          </div>
          <h4>Kayıt açılamadı</h4>
          <p>{error || 'Bu kayıt bulunamadı ya da erişim yetkiniz yok.'}</p>
          <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
            Listeye dön
          </button>
        </div>
      </div>
    );
  }

  async function saveNotes() {
    if (notesBusy || !record) return;
    setNotesBusy(true);
    setNotesMessage(null);
    try {
      const updatedAt = await updateExpertNotes(record.id, notesDraft);
      const normalized = notesDraft.replace(/\r\n/g, '\n').trim();
      setNotesSaved(normalized);
      setNotesDraft(normalized);
      setRecord(prev => (prev ? { ...prev, expertNotes: normalized, notesUpdatedAt: updatedAt } : prev));
      setNotesMessage({ kind: 'success', text: 'Uzman notu kaydedildi; yazdırma raporuna eklenecek.' });
    } catch (cause) {
      setNotesMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'Uzman notu kaydedilemedi.' });
    } finally {
      setNotesBusy(false);
    }
  }

  /* "Kaydı Düzenle": yalnız aktif psikolog ve yalnız kendi kaydı (klinik kayıt
     oluşturma yetkisi RLS'te PSYCHOLOG+active'e aittir; Admin düzenleyemez). */
  const canEditRecord =
    viewer != null &&
    viewer.active === true &&
    viewer.role === 'PSYCHOLOG' &&
    typeof record?.createdBy === 'string' &&
    viewer.id === record.createdBy;

  const notesDirty = notesDraft.trim() !== notesSaved.trim();
  // Not yetkisi RLS ile aynıdır: Admin görünür tüm kayıtlara, aktif psikolog
  // yalnızca kendi kaydına yazabilir. Klinik alanlar veritabanı trigger'ı ile
  // değişmez; burada yalnızca expert_notes alanı düzenlenebilir.
  const canWriteNotes =
    viewer != null &&
    viewer.active === true &&
    (viewer.role === 'ADMIN' ||
      (viewer.role === 'PSYCHOLOG' && typeof record?.createdBy === 'string' && viewer.id === record.createdBy));

  const printMeta = {
    fullName,
    testDate: dash(testDate),
    reportDate: new Date().toLocaleDateString('tr-TR'),
    psychologist: record.psychologistName ?? '',
    gender: client?.gender ?? record.gender ?? '',
    age: dash(client?.age ?? record.age),
    occupation: client?.occupation ?? record.occupation ?? '',
    education: client?.education ?? record.education ?? '',
    method: parsed.method ? methodLabel(parsed.method) : '',
    duration: parsed.testDuration ?? '',
    reason: parsed.applicationReason || record.requestedBy || '',
    followUp: parsed.followUp ?? '',
    marital: parsed.maritalStatus ?? '',
    expertNotes: notesSaved,
    notesUpdatedAt: record.notesUpdatedAt ?? '',
    scoringVersion: parsed.scoringVersion,
    revisionOf: parsed.revisionOf,
    revisionReason: parsed.revisionReason,
  };

  return (
    <div className="record-page">
      <div className="screen-only">
        <div className="record-page-topbar no-print">
          <button type="button" className="btn-secondary btn-sm" onClick={onBack}>
            <Icon name="left" size={15} />
            <span>Listeye dön</span>
          </button>
          <div className="record-page-actions">
            {canEditRecord && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => navigate(`/islem?duzenle=${record.id}`)}
                title="Kaydı düzenle: form, bu kaydın bir kopyasıyla dolar. Düzeltmeleriniz orijinal kaydı silmez; ona bağlı yeni bir revizyon kaydı oluşturur."
              >
                <Icon name="edit" size={15} />
                <span>Kaydı Düzenle</span>
              </button>
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={() => window.print()}>
              <Icon name="sheet" size={15} />
              <span>Yazdır / PDF</span>
            </button>
          </div>
        </div>

        <header className="record-page-header">
          <div className="record-page-id">
            <h1 className="record-page-name">{fullName || 'Danışan'}</h1>
            <p className="record-page-sub">
              {dash(testDate)}
              {parsed.method ? ` · ${methodLabel(parsed.method)}` : ''}
              {parsed.testDuration ? ` · ${parsed.testDuration}` : ''}
              {record.psychologistName ? ` · ${record.psychologistName}` : ''}
              <span className="record-page-id-chip mono-sub" title="Kayıt ID">
                #{record.id.slice(0, 8)}
              </span>
            </p>
          </div>
          {profile && (
            <div className="record-page-status">
              <span className={`mmpi-validity-pill ${validityStatusDisplay(profile.validityAnalysis.status).className}`}>
                <Icon
                  name={profile.validityAnalysis.status === 'GECERLI' ? 'checkCircle' : profile.validityAnalysis.status === 'SUPHELI' ? 'info' : 'alert'}
                  size={14}
                />
                <span>{validityStatusDisplay(profile.validityAnalysis.status).label}</span>
              </span>
              {profile.profileCode && <span className="mmpi-chip mmpi-chip-code">Kod: {profile.profileCode}</span>}
              <span className="mmpi-chip">{profile.gender} normları</span>
            </div>
          )}
        </header>

        {/* Revizyon zinciri: bu kayıt bir başka kaydın "Düzenle" sonucuysa. */}
        {parsed.revisionOf && !revisionHidden && (
          <RevisionNotice
            revisionOf={parsed.revisionOf}
            revisionReason={parsed.revisionReason}
            onDismiss={() => setRevisionHidden(true)}
          />
        )}

        {/* Optik formun son hali (OMR kayıtlarında): batch, kaynak ve manuel düzeltme özeti.
            Piksel verisi sunucuda tutulmaz; madde sonuçları + manuel düzeltmeler +
            denetim izi bu kayıtta kalır. */}
        {parsed.method === 'omr' && omrPages.length === 4 && (() => {
          const batchId = omrPages[0]?.batchId;
          const reviewedCount = omrPages.reduce(
            (total, page) => total + Object.keys(page.manualReviews ?? {}).length,
            0,
          );
          const historyCount = omrPages.reduce((total, page) => total + (page.reviewHistory?.length ?? 0), 0);
          return (
            <div className="status-banner info-banner no-print" role="status">
              <Icon name="scan" size={16} />
              <span style={{ flex: 1 }}>
                Optik set <code className="mono-sub">{batchId ?? '—'}</code> · 4/4 sayfa · {reviewedCount} manuel
                düzeltme · {historyCount} denetim olayı — optik detaylar bu kayıtta korunur.
              </span>
            </div>
          );
        })()}

        <details className="client-info-details">
          <summary>
            <Icon name="user" size={15} />
            Danışan ve Uygulama Bilgileri
          </summary>
          <div className="client-details-grid">
            <div className="detail-item">
              <span className="detail-label">Ad Soyad</span>
              <span className="detail-val">{dash(fullName)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Cinsiyet</span>
              <span className="detail-val">{dash(client?.gender ?? record.gender)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Yaş</span>
              <span className="detail-val">{dash(client?.age ?? record.age)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Test tarihi</span>
              <span className="detail-val">{dash(testDate)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Süre</span>
              <span className="detail-val">{dash(parsed.testDuration)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Meslek</span>
              <span className="detail-val">{dash(client?.occupation ?? record.occupation)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Eğitim</span>
              <span className="detail-val">{dash(client?.education ?? record.education)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Medeni durum</span>
              <span className="detail-val">{dash(parsed.maritalStatus)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">İzlem</span>
              <span className="detail-val">{dash(parsed.followUp)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Başvuru nedeni</span>
              <span className="detail-val">{dash(parsed.applicationReason || record.requestedBy)}</span>
            </div>
            {parsed.method && (
              <div className="detail-item">
                <span className="detail-label">Yöntem</span>
                <span className="detail-val">{methodLabel(parsed.method)}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Uzman</span>
              <span className="detail-val highlight">{dash(record.psychologistName)}</span>
            </div>
            {parsed.scoringVersion && (
              <div className="detail-item">
                <span className="detail-label">Puanlama motoru</span>
                <span className="detail-val">v{parsed.scoringVersion}</span>
              </div>
            )}
          </div>
          {parsed.clinicalContext && <p className="ws-muted record-page-context">{parsed.clinicalContext}</p>}
        </details>

        {/* Uzman değerlendirme notu — AÇILIR-KAPANIR bölüm ve KAPALI başlar;
            kullanıcı isterse elle açar. Not, Yazdır / PDF raporunda her zaman
            "Uzman Değerlendirme Notu" bölümü olarak basılır (bu kısaltma
            yalnızca ekran içindir). */}
        <details className="client-info-details expert-notes-details" ref={notesDetailsRef}>
          <summary>
            <Icon name="sheet" size={15} />
            Uzman Değerlendirme Notu
            <span
              className={`expert-notes-status ${
                notesDirty ? 'is-dirty' : notesSaved.trim() ? 'is-saved' : ''
              }`}
            >
              {notesDirty
                ? 'Kaydedilmedi'
                : notesSaved.trim()
                  ? 'Kayıtlı'
                  : canWriteNotes
                    ? 'Boş'
                    : 'Not yok'}
            </span>
          </summary>
          <div className="expert-notes-body">
            <p className="ws-muted expert-notes-hint">
              Kayıt sonrası klinik değerlendirmenizi buraya yazın; not bu kayda kalıcı olarak eklenir ve
              Yazdır / PDF raporunda “Uzman Değerlendirme Notu” bölümü olarak yer alır. Tanısal kesin ifadelerden
              kaçının; not yalnızca bu kaydı görebilen hesaplarca okunabilir.
            </p>
            {canWriteNotes ? (
              <textarea
                className="expert-notes-input"
                value={notesDraft}
                onChange={event => setNotesDraft(event.target.value)}
                rows={5}
                maxLength={EXPERT_NOTES_MAX}
                placeholder="Örn. Profil bulguları klinik görüşmeyle tutarlı; izlem önerildi..."
                aria-label="Uzman değerlendirme notu"
              />
            ) : record.expertNotes ? (
              <p className="expert-notes-readonly ws-muted">{record.expertNotes}</p>
            ) : (
              <p className="expert-notes-readonly ws-muted">Bu kayıt için uzman değerlendirme notu yok.</p>
            )}
            <div className="expert-notes-footer">
              <span className="ws-muted expert-notes-count">
                {notesDraft.length} / {EXPERT_NOTES_MAX}
                {record.notesUpdatedAt
                  ? ` · Son kayıt: ${new Date(record.notesUpdatedAt).toLocaleString('tr-TR', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}`
                  : ''}
              </span>
              {canWriteNotes && (
                <div className="expert-notes-actions">
                  {notesMessage && (
                    <span
                      className={notesMessage.kind === 'error' ? 'expert-notes-msg is-error' : 'expert-notes-msg is-ok'}
                      role="status"
                    >
                      {notesMessage.text}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => void saveNotes()}
                    disabled={notesBusy || !notesDirty}
                  >
                    {notesBusy ? 'Kaydediliyor…' : 'Notu Kaydet'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </details>

        <ReportsSummary recordId={recordId} />

        {profile ? (
          <MMPIResultsPanel
            embedded
            reportsContent={<ReportsSummary recordId={recordId} />}
            profile={profile}
            answers={answers ?? undefined}
            /* "Yapay Zekâ Yorumu" (son sekme): kayıt modunda kayıt sahipliği
               sunucuda yeniden doğrulanır; yalnız yaş taşınır (KVKK). */
            aiContext={{
              method: parsed.method ?? 'quick',
              client: client && typeof client.age === 'number' ? { age: client.age } : null,
              recordId: record.id,
              onInsertIntoNotes: canWriteNotes
                ? text => {
                    setNotesDraft(previous => {
                      const separator = previous.trim() ? '\n\n' : '';
                      const next = `${previous}${separator}${text}`;
                      return next.length > EXPERT_NOTES_MAX ? next.slice(0, EXPERT_NOTES_MAX) : next;
                    });
                    // Not metni kaybolmasın diye kapalı bölüm açılır ve kaydırılır.
                    openNotesSection();
                  }
                : undefined,
            }}
          />
        ) : (
          <div className="mmpi-results-placeholder">
            <Icon name="info" size={20} />
            <div>
              <strong>Profil hesaplanamadı</strong>
              <p className="ws-muted">
                Bu kaydın verisi skorlamaya uygun değil (cinsiyet normlara uygun seçilmemiş olabilir ya da cevap/ham
                puan verisi eksik). Aşağıda ham verileri görebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Ham veri bölümü: profil varken optik cevaplar “Soru Yanıtları”
            sekmesinde zaten görünür; profilsiz kayıtlarda ham veri gösterilir. */}
      </div>

      {/* Profilsüz kayıtlarda ham veri hem ekranda hem baskıda görünür. */}
      {!profile && parsed.quickAnswers && (
        <section className="report-section" aria-label="Hızlı giriş cevapları">
          <h3 className="report-section-title">
            <Icon name="sheet" size={16} /> Hızlı giriş cevapları
          </h3>
          <div className="answers-bubble-grid">
            {parsed.quickAnswers.map((choice, index) => (
              <div
                key={index}
                className={`answer-bubble-cell ${
                  choice === 'D' ? 'choice-true' : choice === 'Y' ? 'choice-false' : 'choice-blank'
                }`}
              >
                <span className="item-num">{index + 1}</span>
                <span className="item-ans">{choice || 'Boş'}</span>
              </div>
            ))}
          </div>
        </section>
        )}

        {!profile && parsed.rawScales && (
        <section className="report-section" aria-label="Ham puanlar">
          <h3 className="report-section-title">
            <Icon name="pulse" size={16} /> Ham puanlar
          </h3>
          <div className="client-details-grid">
            {Object.entries(parsed.rawScales).map(([key, value]) => (
              <div className="detail-item" key={key}>
                <span className="detail-label">{key}</span>
                <span className="detail-val">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>
        )}

      {!profile && omrPages.length > 0 && <OmrPagesFallback pages={omrPages} />}

      {profile && <div className="print-only">{<MMPIPrintReport profile={profile} meta={printMeta} />}</div>}
    </div>
  );
}

function OmrPagesFallback({ pages }: { pages: ReturnType<typeof parseRecordPayload>['omrPages'] }) {
  const [activePageNum, setActivePageNum] = useState<number>(pages[0]?.pageNumber ?? 1);
  const activePage = pages.find(page => page.pageNumber === activePageNum);
  return (
    <section className="report-section" aria-label="Optik cevaplar">
      <div className="answers-nav-row">
        <h3 className="report-section-title">
          <Icon name="scan" size={16} /> Optik cevaplar
        </h3>
        <div className="page-switcher-pills">
          {pages.map(page => (
            <button
              key={page.pageNumber}
              type="button"
              className={`pill-btn ${page.pageNumber === activePageNum ? 'active' : ''}`}
              onClick={() => setActivePageNum(page.pageNumber)}
            >
              {page.pageNumber}. sayfa
            </button>
          ))}
        </div>
      </div>
      {activePage ? (
        <div className="answers-bubble-grid">
          {activePage.items?.map(item => {
            const review = activePage.manualReviews?.[item.itemId];
            const effectiveChoice = review ? review.choiceId : item.choiceId;
            return (
              <div
                key={item.itemId}
                className={`answer-bubble-cell ${
                  effectiveChoice === 'D' ? 'choice-true' : effectiveChoice === 'Y' ? 'choice-false' : 'choice-blank'
                } ${review ? 'is-reviewed' : ''}`}
              >
                <span className="item-num">{item.itemNumber}</span>
                <span className="item-ans">{effectiveChoice || 'Boş'}</span>
                {review && <span className="manual-indicator" title="Manuel">✎</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="no-data-text">Ham optik veri yok.</p>
      )}
    </section>
  );
}
