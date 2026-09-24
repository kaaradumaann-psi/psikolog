import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { FormDefinition } from '../omr/omrTypes';
import type { AuthenticatedUser } from '../auth/authTypes';
import type { ScanSet } from '../scanner/pageSequence';
import { sortedPages } from '../scanner/pageSequence';
import { canCreateRecord, createDataRecord, createRecord, getRecordDetail } from '../records/supabaseRecords';
import { buildEditStateFromRecord } from '../records/recordEdit';
import type { MMPIRecord } from '../records/supabaseRecords';
import { summarizeResults } from '../results/resultNormalizer';
import { ScannerWorkspace } from './ScannerWorkspace';
import { QuickEntry } from './QuickEntry';
import { RawScoreEntry } from './RawScoreEntry';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { useOnlineStatus } from '../workspace/useOnlineStatus';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject } from '../scoring/mmpiScoring';
import { scanToAnswers } from '../scoring/omrAnswers';
import { MMPIResultsPanel } from './results/MMPIResultsPanel';
import {
  clearDraft,
  decodeAnswers,
  deserializeScan,
  encodeAnswers,
  enqueueOutbox,
  formatDraftTime,
  isDraftNonEmpty,
  isNetworkError,
  loadDraft,
  loadOutbox,
  removeOutboxEntry,
  saveDraft,
  serializeScan,
  updateOutboxEntry,
} from '../workspace/draftStorage';
import type { CaseDraftV1, OutboxEntry } from '../workspace/draftStorage';
import { getClients } from '../clinical/clinicalStore';
import {
  EDUCATION_OPTIONS,
  FOLLOW_UP_OPTIONS,
  ITEM_COUNT,
  MARITAL_OPTIONS,
  MMPI_AGE_MAX,
  MMPI_AGE_MESSAGE,
  MMPI_AGE_MIN,
  MMPI_BLANK_MESSAGE,
  MMPI_DURATION_REFERENCE,
  MMPI_EDUCATION_MESSAGE,
  MMPI_MAX_BLANK,
  RAW_SCORE_FIELDS,
  assessDuration,
  buildCaseMeta,
  buildQuickPayload,
  buildRawPayload,
  countAnswers,
  emptyAnswers,
  emptyClientIntake,
  emptyRawScores,
  methodLabel,
  rawScoresComplete,
  recordInputFromIntake,
  todayIsoDate,
  validateIntake,
} from '../workspace/caseTypes';
import type {
  CaseStep,
  ClientIntake,
  EducationLevel,
  EntryMethod,
  FollowUpStatus,
  IntakeGender,
  ItemAnswer,
  MaritalStatus,
  RawScores,
} from '../workspace/caseTypes';

const STEPS: { id: Exclude<CaseStep, 'home'>; label: string }[] = [
  { id: 'intake', label: 'Danışan' },
  { id: 'method', label: 'Yöntem' },
  { id: 'entry', label: 'Veri' },
  { id: 'review', label: 'Kontrol' },
];

const METHOD_CARDS: { id: EntryMethod; icon: 'file' | 'sheet' | 'camera'; title: string; desc: string }[] = [
  {
    id: 'quick',
    icon: 'file',
    title: 'Hızlı veri girişi',
    desc: 'Basılı formdaki cevaplar klavyeyle girilir: 1 Doğru · 2 Yanlış · 0 Boş.',
  },
  {
    id: 'raw',
    icon: 'sheet',
    title: 'Ham puan',
    desc: 'Geçerlik ve klinik ölçekler; Hs, Pd, Pt, Sc ve Ma K düzeltmesiz girilir.',
  },
  {
    id: 'omr',
    icon: 'camera',
    title: 'OMR / Kamera',
    desc: 'Basılı optik form: mevcut okuma hattıyla dosya veya kamera ile aktarılır.',
  },
];

type CaseWorkspaceProps = {
  definition: FormDefinition;
  actor: AuthenticatedUser;
  onSaved?: () => void;
  /**
   * Oturumun bu yüklemede nasıl kurulduğu. Yeni bir girişte ('signin') persisted
   * taslak otomatik geri yüklenmez ve 'home' adımına yönlenilmez — landing üzerinde,
   * kullanıcı isterse 'Devam et/kaldığın yerden devam' ile kendisi açar. Aynı oturumda
   * F5 ('session') mevcut davranışı korur ve kaldığı yerden devam eder.
   */
  flowOrigin: 'session' | 'signin';
  /** / rotası temiz landing görünümüdür; eski taslak otomatik açılmaz. */
  landing?: boolean;
};

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR');
}

function formatDuration(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '—';
  return /dk|dakika/i.test(trimmed) ? trimmed : `${trimmed} dk`;
}

function formatClock(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function releaseScanPreviewUrls(scan: ScanSet | null): void {
  if (!scan) return;
  for (const page of Object.values(scan.pages)) {
    for (const url of [page.previewUrl, page.originalImageUrl]) {
      if (!url?.startsWith('blob:')) continue;
      try { URL.revokeObjectURL(url); } catch { /* yoksay */ }
    }
  }
}

export function CaseWorkspace({ definition, actor, onSaved, flowOrigin, landing = false }: CaseWorkspaceProps) {
  /**
   * Taslak geri yükleme (F5 dayanıklılığı): /islem doğrudan açıldığında bu
   * uzmanın kayıtlı taslağı varsa state ondan beslenir. Boş/bozuk/süresi dolmuş
   * taslak yok sayılır; uygulama yine tertemiz açılır.
   *
   * / (landing) ve yeni girişte ('signin') taslak OKUNMAZ ve otomatik geri
   * yüklenmez. Böylece SSS, gizlilik, kaynakça veya üst geri düğmesinden ana
   * sayfaya dönmek her zaman temiz başlangıç gösterir. Kullanıcı daha sonra
   * İşlem sekmesine geçip taslağı kendi isteğiyle açabilir.
   */
  const [boot] = useState(() => {
    if (landing || flowOrigin === 'signin') return null;
    const draft = loadDraft(actor.id);
    if (!draft || !isDraftNonEmpty(draft)) {
      // Kaydedilmiş başarı ekranı da korunur (F5 sonrası "kaydedildi" kaybolmaz).
      if (draft?.savedId) return draft;
      return null;
    }
    return draft;
  });

  const [step, setStep] = useState<CaseStep>(() => (boot && boot.step !== 'home' ? boot.step : 'home'));
  const [client, setClient] = useState<ClientIntake>(() => boot?.client ?? emptyClientIntake());
  const [method, setMethod] = useState<EntryMethod | null>(() => boot?.method ?? null);
  const [answers, setAnswers] = useState<ItemAnswer[]>(() =>
    boot ? (decodeAnswers(boot.answersEncoded) ?? emptyAnswers()) : emptyAnswers(),
  );
  const [currentItem, setCurrentItem] = useState(() => boot?.currentItem ?? 0);
  const [raw, setRaw] = useState<RawScores>(() => boot?.raw ?? emptyRawScores());
  const [scan, setScan] = useState<ScanSet | null>(() => (boot?.scan ? deserializeScan(boot.scan) : null));
  const [scanKey, setScanKey] = useState(0);
  const [intakeError, setIntakeError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState<MMPIRecord | null>(() =>
    boot?.savedId && boot?.savedAt ? { id: boot.savedId, createdAt: boot.savedAt } : null,
  );
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const submissionKey = useRef(boot?.submissionKey ?? crypto.randomUUID());
  /* "Kaydı Düzenle" durumu: orijinal kayıt değişmez, yeni revizyon yazılır. */
  const [revisionOf, setRevisionOf] = useState<string | null>(() =>
    typeof boot?.revisionOf === 'string' ? boot.revisionOf : null);
  const [revisionReason, setRevisionReason] = useState<string | null>(() =>
    typeof boot?.revisionReason === 'string' ? boot.revisionReason : null);
  const [revisionNote, setRevisionNote] = useState<string | null>(null);
  const [editLoadError, setEditLoadError] = useState('');
  const [restoredAt, setRestoredAt] = useState<string | null>(() => (boot && isDraftNonEmpty(boot) ? boot.updatedAt : null));
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => boot?.updatedAt ?? null);
  const [storageWarning, setStorageWarning] = useState('');
  const [confirmNew, setConfirmNew] = useState(false);
  /** "Kaydı Düzenle" oturumunu bırakma onayı. */
  const [confirmCancelEdit, setConfirmCancelEdit] = useState(false);
  const [outbox, setOutbox] = useState<OutboxEntry[]>(() => loadOutbox(actor.id));
  const [flushing, setFlushing] = useState(false);
  const [flushNote, setFlushNote] = useState('');
  const online = useOnlineStatus();
  const stepIndex = STEPS.findIndex(item => item.id === step);

  // Yeni girişte ('signin') persisted taslak state'e otomatik yüklenmez (bkz. `boot`).
  // Yine de kullanıcı landing'den "kaldığın yerden devam" diyebilsin diye salt-okunur
  // bir anlık görüntü tutulur. Kullanıcı gerçekten yeni/yarım işe başlayana kadar o
  // kalıntıya dokunulmaz; başlayınca temizlenir (bkz. autosave effect + startNew).
  // Yeni girişte persisted taslak state'e otomatik yüklenmez (bkz. `boot`). Yine de
  // kullanıcı landing'den "kaldığın yerden devam" diyebilsin diye salt-okunur bir
  // anlık görüntü tutulur. Kullanıcı gerçekten yeni/yarım işe başlayana kadar o kalıntıya
  // dokunulmaz. `liveDraftRef`, pending-resume (snapshot bekleyen) durumu belirtir: o
  // durumda beforeunload boş state yazmaz ki henüz geri yüklenmemiş çalışma ezilmesin.
  const liveDraftRef = useRef<CaseDraftV1 | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<CaseDraftV1 | null>(() => {
    if (flowOrigin !== 'signin') return null;
    const snapshot = loadDraft(actor.id);
    if (snapshot && isDraftNonEmpty(snapshot)) liveDraftRef.current = snapshot;
    return snapshot;
  });

  const omrReady = scan ? canCreateRecord(sortedPages(scan), definition) : false;
  const quickCounts = countAnswers(answers);
  const quickReady = quickCounts.entered === ITEM_COUNT;
  const rawReady = rawScoresComplete(raw);
  const rawEntered = RAW_SCORE_FIELDS.filter(field => raw[field.key] !== '').length;
  const omrPages = scan ? sortedPages(scan).length : 0;
  const entryReady = method === 'quick' ? quickReady : method === 'raw' ? rawReady : method === 'omr' ? omrReady : false;
  const blankCount =
    method === 'quick'
      ? quickCounts.blank
      : method === 'raw'
        ? typeof raw.blank === 'number'
          ? raw.blank
          : 0
        : scan
          ? summarizeResults(definition, sortedPages(scan)).blank
          : 0;
  const blankExceeded = blankCount > MMPI_MAX_BLANK;
  const hasPartialIntake =
    client.firstName.trim() !== '' ||
    client.lastName.trim() !== '' ||
    client.gender !== '' ||
    client.age > 0 ||
    client.testDuration.trim() !== '' ||
    client.occupation.trim() !== '' ||
    client.followUp !== '' ||
    client.education !== '' ||
    client.maritalStatus !== '' ||
    client.applicationReason.trim() !== '' ||
    client.clinicalContext.trim() !== '';
  const hasAnyData =
    hasPartialIntake || method !== null || quickCounts.entered > 0 || rawEntered > 0 || omrPages > 0;
  const dirty = hasAnyData && !saved;

  /* ---------------- Taslak otomatik kayıt (debounced) ---------------- */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Yeni girişte veya gerçek landing'de kullanıcı henüz bir işe başlamadıysa
      // autosave ÇALIŞMAZ: boş state yazmak korunmuş taslağı ezebilir.
      if ((flowOrigin === 'signin' || landing) && boot == null && step === 'home' && !hasAnyData) return;
      // Kullanıcı gerçekten yeni veri girdiği an salt-okunur kalıntı snapshot'ı bu
      // ekrandaki gerçek iş tarafından devralınır.
      setDraftSnapshot(null);
      liveDraftRef.current = null;
      const result = saveDraft(actor.id, {
        step,
        client,
        method,
        answersEncoded: encodeAnswers(answers),
        currentItem,
        raw,
        scan: scan ? serializeScan(scan) : null,
        submissionKey: submissionKey.current,
        savedId: saved?.id ?? null,
        savedAt: saved?.createdAt ?? null,
        revisionOf,
        revisionReason,
      });
      if (result.ok) {
        setLastSavedAt(new Date().toISOString());
        setStorageWarning('');
      } else {
        setStorageWarning(result.reason);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [actor.id, step, client, method, answers, currentItem, raw, scan, saved, flowOrigin, landing, hasAnyData, revisionOf, revisionReason]);

  /* Sekme kapanmadan önce son senkron yazım + yarım iş uyarısı. */
  const liveRef = useRef({ step, client, method, answers, currentItem, raw, scan, saved, revisionOf, revisionReason });
  liveRef.current = { step, client, method, answers, currentItem, raw, scan, saved, revisionOf, revisionReason };
  useEffect(() => () => {
    // ScannerSession deliberately retains blob URLs while the method tab is hidden so the
    // parent can restore the same pages. Once the case workspace itself disappears, no owner
    // remains; release those camera/file previews here instead of leaking them until tab close.
    releaseScanPreviewUrls(liveRef.current.scan);
  }, [actor.id]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const live = liveRef.current;
      // Pending-resume koruması: yeni girişte, kullanıcı taslağı henüz geri
      // yüklemediyse (state boş, snapshot bekliyor) boş state'i yazmak eski
      // çalışmayı ezerdi. Yalnızca gerçek devralınmış/boş-sahipli iş yazılır.
      const isPendingResume = flowOrigin === 'signin' && liveDraftRef.current != null;
      const entered = countAnswers(live.answers).entered;
      const rawCount = RAW_SCORE_FIELDS.filter(field => live.raw[field.key] !== '').length;
      const scanCount = live.scan ? sortedPages(live.scan).length : 0;
      const hasIntake =
        live.client.firstName.trim() !== '' ||
        live.client.lastName.trim() !== '' ||
        live.client.gender !== '' ||
        live.client.age > 0 ||
        live.client.testDuration.trim() !== '' ||
        live.client.occupation.trim() !== '' ||
        live.client.followUp !== '' ||
        live.client.education !== '' ||
        live.client.maritalStatus !== '' ||
        live.client.applicationReason.trim() !== '' ||
        live.client.clinicalContext.trim() !== '';
      const hasDraftData = hasIntake || live.method !== null || entered > 0 || rawCount > 0 || scanCount > 0;
      const isCleanLanding = landing && live.step === 'home' && !live.saved && !hasDraftData;
      if (!isPendingResume && !isCleanLanding) {
        try {
          saveDraft(actor.id, {
            step: live.step,
            client: live.client,
            method: live.method,
            answersEncoded: encodeAnswers(live.answers),
            currentItem: live.currentItem,
            raw: live.raw,
            scan: live.scan ? serializeScan(live.scan) : null,
            submissionKey: submissionKey.current,
            savedId: live.saved?.id ?? null,
            savedAt: live.saved?.createdAt ?? null,
            revisionOf: live.revisionOf,
            revisionReason: live.revisionReason,
          });
        } catch {
          /* kapanış anında sessiz */
        }
      }
      if (!live.saved && hasDraftData) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [actor.id, flowOrigin, landing]);

  /* ---------------- Çevrimdışı kuyruk (outbox) ---------------- */

  async function flushEntries(entries: OutboxEntry[]): Promise<void> {
    for (const entry of entries) {
      try {
        const input = recordInputFromIntake(entry.client);
        const meta = buildCaseMeta(entry.method, entry.client, {
          revisionOf: typeof entry.revisionOf === 'string' ? entry.revisionOf : undefined,
          revisionReason: typeof entry.revisionReason === 'string' ? entry.revisionReason : undefined,
        });
        let record: MMPIRecord;
        if (entry.method === 'quick') {
          const decoded = decodeAnswers(entry.answersEncoded);
          if (!decoded) throw new Error('Taslak cevaplar okunamadı.');
          record = await createDataRecord(input, actor, entry.idempotencyKey, [meta, buildQuickPayload(decoded)]);
        } else if (entry.method === 'raw') {
          if (!entry.raw) throw new Error('Ham puan taslağı okunamadı.');
          record = await createDataRecord(input, actor, entry.idempotencyKey, [meta, buildRawPayload(entry.raw)]);
        } else {
          const restored = entry.scan ? deserializeScan(entry.scan) : null;
          if (!restored) throw new Error('Tarama taslağı okunamadı.');
          record = await createRecord(input, sortedPages(restored), definition, actor, entry.idempotencyKey, [meta]);
        }
        removeOutboxEntry(actor.id, entry.idempotencyKey);
        // Kuyruktaki kayıt bu ekrandaki işlemse başarı ekranına geç.
        if (entry.idempotencyKey === submissionKey.current && !saved) {
          setSaved(record);
          onSaved?.();
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Gönderilemedi.';
        if (isNetworkError(cause)) {
          updateOutboxEntry(actor.id, entry.idempotencyKey, { attempts: entry.attempts + 1, lastError: message });
        } else {
          // Doğrulama/sunucu hatası tekrar denemekle düzelmez: kuyruktan çıkar, ekranda göster.
          removeOutboxEntry(actor.id, entry.idempotencyKey);
          if (entry.idempotencyKey === submissionKey.current) setSaveError(message);
          else setFlushNote(`Bir bekleyen kayıt gönderilemedi ve kuyruktan çıkarıldı: ${message}`);
        }
      }
    }
    setOutbox(loadOutbox(actor.id));
  }

  async function flushOutbox() {
    if (flushing) return;
    const entries = loadOutbox(actor.id);
    if (entries.length === 0) return;
    if (!online) {
      setFlushNote('Çevrimdışısınız; bağlantı gelince kayıtlar otomatik gönderilecek.');
      return;
    }
    setFlushing(true);
    setFlushNote('');
    setSaveError('');
    try {
      await flushEntries(entries);
      const remaining = loadOutbox(actor.id).length;
      if (remaining === 0) setFlushNote('Bekleyen kayıtlar gönderildi.');
      else setFlushNote(`${remaining} kayıt hâlâ bekliyor; bağlantıyı kontrol edip tekrar deneyin.`);
    } finally {
      setFlushing(false);
    }
  }

  useEffect(() => {
    const onOnline = () => {
      setFlushNote('');
      void flushOutbox();
    };
    window.addEventListener('online', onOnline);
    if (loadOutbox(actor.id).length > 0) {
      try {
        if (navigator.onLine) void flushOutbox();
      } catch {
        /* yoksay */
      }
    }
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.id]);

  /* ---------------- "Kaydı Düzenle" (?duzenle=<recordId>) ----------------
   * Kayıt sayfasından gelindiğinde: orijinal kayıt RLS ile okunur, düzenleme
   * durumu (danışan + cevaplar/ham puan + revisionOf) state'e yüklenir ve
   * URL parametresi temizlenir. Yarım bir çalışma varsa önce onay istenir;
   * F5'te parametre zaten temizlendiği için aynı işlem iki kez tetiklenmez
   * (devam eden düzenleme taslaktan revisionOf ile geri gelir). */
  /**
   * İşlenen `duzenle` parametresi (değer olarak). CaseWorkspace sekme
   * değişiminde bile MOUNT'TA KALIR (gizli), bu yüzden efekt yalnızca mount
   * anında değil, URL arama kısmı her değiştiğinde tetiklenir; aynı parametre
   * iki kez işlenmez (StrictMode çift koşumu / sekme dönüşü de kapsanır).
   */
  const editHandled = useRef<string | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  function applyRecordEdit(recordId: string) {
    setEditLoadError('');
    setEditLoading(true);
    window.history.replaceState(null, '', window.location.pathname);
    void getRecordDetail(recordId)
      .then(record => {
        const edit = buildEditStateFromRecord(record);
        if (!edit.ok) throw new Error(edit.error);
        const state = edit.state;
        releaseScanPreviewUrls(scan);
        submissionKey.current = crypto.randomUUID();
        setClient(state.client);
        setMethod(state.method);
        setAnswers(state.answers);
        setCurrentItem(0);
        setRaw(state.raw);
        setScan(null);
        setScanKey(key => key + 1);
        setSaved(null);
        setConditionsAccepted(false);
        setRevisionOf(state.revisionOf);
        setRevisionReason('Düzenleme');
        setRevisionNote(state.note);
        setRestoreDismissed(true);
        setStep('entry');
      })
      .catch(cause => {
        setEditLoadError(cause instanceof Error ? cause.message : 'Kayıt düzenleme için yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
      })
      .finally(() => setEditLoading(false));
  }

  const locationSearch = window.location.search;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('duzenle');
    if (!editId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(editId)) return;
    if (editHandled.current === editId) return;
    editHandled.current = editId;
    const clean = step === 'home' && !hasAnyData && !saved;
    if (clean) applyRecordEdit(editId);
    else setPendingEditId(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationSearch]);
  // Parametre işlenip URL'den silindikten sonra koruma sıfırlanır: aynı kayıt
  // için daha sonra tekrar "Kaydı Düzenle" tıklanırsa akış yeniden tetiklenir.
  useEffect(() => {
    if (!locationSearch.includes('duzenle')) editHandled.current = null;
  }, [locationSearch]);

  function enqueueCurrent(lastError: string) {
    if (!method) return;
    const entry: OutboxEntry = {
      idempotencyKey: submissionKey.current,
      method,
      client: { ...client },
      answersEncoded: method === 'quick' ? encodeAnswers(answers) : null,
      raw: method === 'raw' ? { ...raw } : null,
      scan: method === 'omr' && scan ? serializeScan(scan) : null,
      revisionOf,
      revisionReason,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError,
    };
    const queued = enqueueOutbox(actor.id, entry);
    setOutbox(loadOutbox(actor.id));
    if (queued) {
      setSaveError('');
      setFlushNote(
        'Bağlantı kurulamadı — kaydınız kuyruğa alındı. İnternet gelince otomatik gönderilecek; bu ekranı güvenle kapatabilirsiniz.',
      );
    } else {
      setSaveError('Bağlantı yok ve kuyruk yazılamadı. Bu ekranı kapatmayın; bağlantı gelince “Analizi başlat”a tekrar basın.');
    }
  }

  /* ---------------- Akış eylemleri ---------------- */

  /** Çalışma alanını tamamen temizler (danışan, veri, tarama, revizyon bağı). */
  function resetWork(nextStep: CaseStep) {
    setConfirmNew(false);
    setConfirmCancelEdit(false);
    clearDraft(actor.id);
    setDraftSnapshot(null);
    setClient(emptyClientIntake());
    setMethod(null);
    setAnswers(emptyAnswers());
    setCurrentItem(0);
    setRaw(emptyRawScores());
    releaseScanPreviewUrls(scan);
    setScan(null);
    setScanKey(key => key + 1);
    setIntakeError('');
    setSaveError('');
    setFlushNote('');
    setSaved(null);
    setConditionsAccepted(false);
    setRestoredAt(null);
    setRestoreDismissed(true);
    setRevisionOf(null);
    setRevisionReason(null);
    setRevisionNote(null);
    setEditLoadError('');
    submissionKey.current = crypto.randomUUID();
    setStep(nextStep);
  }

  function startNew() {
    resetWork('intake');
  }

  /**
   * "Kaydı Düzenle" oturumunu kapatır. Kullanıcı emin olsun diye onay ister:
   * orijinal kayda zaten dokunulmadı; yalnızca bu cihazdaki taslak silinir.
   */
  function discardEdit() {
    resetWork('home');
  }

  function requestNew() {
    if (draftSnapshot && isDraftNonEmpty(draftSnapshot)) {
      // Salt-okunur da olsa kullanıcının kayıtlı bir çalışması var; temiz başlamayı onaylat.
      setConfirmNew(true);
      return;
    }
    if (saved || !hasAnyData) {
      startNew();
      return;
    }
    setConfirmNew(true);
  }

  /** Landing'in birincil "Yeni MMPI işlemi" eylemi — resumable taslak varsa onay ister. */
  function requestNewEntry() {
    if (draftSnapshot && isDraftNonEmpty(draftSnapshot)) {
      setConfirmNew(true);
      return;
    }
    startNew();
  }

  /** Landing'den "Kaldığın yerden devam et" — salt-okunur kalıntıyı gerçek state'e açar. */
  function openDraftSnapshot() {
    if (!draftSnapshot) return;
    releaseScanPreviewUrls(scan);
    submissionKey.current = draftSnapshot.submissionKey;
    setClient(draftSnapshot.client);
    setMethod(draftSnapshot.method);
    setAnswers(decodeAnswers(draftSnapshot.answersEncoded) ?? emptyAnswers());
    setCurrentItem(draftSnapshot.currentItem);
    setRaw(draftSnapshot.raw);
    setScan(draftSnapshot.scan ? deserializeScan(draftSnapshot.scan) : null);
    setRevisionOf(typeof draftSnapshot.revisionOf === 'string' ? draftSnapshot.revisionOf : null);
    setRevisionReason(typeof draftSnapshot.revisionReason === 'string' ? draftSnapshot.revisionReason : null);
    // Kayıt sonrası başarı durumu da korunur: resume edilen iş zaten kaydedilmişse
    // "saved" aynen geri gelsin, "Analizi başlat" tekrar gerekmeyecektir.
    if (draftSnapshot.savedId && draftSnapshot.savedAt && draftSnapshot.step === 'review') {
      setSaved({ id: draftSnapshot.savedId, createdAt: draftSnapshot.savedAt });
    }
    setRestoredAt(draftSnapshot.updatedAt);
    setLastSavedAt(draftSnapshot.updatedAt);
    setDraftSnapshot(null);
    liveDraftRef.current = null;
    setStep(draftSnapshot.step !== 'home' ? draftSnapshot.step : 'intake');
  }

  function goBack() {
    if (step === 'intake') {
      setIntakeError('');
      setStep('home');
    } else if (step === 'method') {
      setIntakeError('');
      setStep('intake');
    } else if (step === 'entry') {
      setStep('method');
    } else if (step === 'review') {
      setStep('entry');
    }
  }

  /** Tamamlanmış adımlara geri dön; ileriye sıçrama yok (hazırlık koşulu adımın kendisidir). */
  function gotoStep(target: 'intake' | 'method' | 'entry') {
    if (target === 'intake' && (step === 'method' || step === 'entry' || step === 'review')) {
      setIntakeError('');
      setStep('intake');
    } else if (target === 'method' && (step === 'entry' || step === 'review')) {
      setStep('method');
    } else if (target === 'entry' && step === 'review' && method) {
      setStep('entry');
    }
  }

  function submitIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validateIntake(client);
    if (message) {
      setIntakeError(message);
      return;
    }
    setIntakeError('');
    // Yeni geçerli danışan: varsa eski (salt-okunur) kayıt kalıntısı artık bu işe aittir.
    if (draftSnapshot) {
      clearDraft(actor.id);
      setDraftSnapshot(null);
    }
    setStep('method');
  }

  function selectMethod(next: EntryMethod) {
    // Yöntem değişimi veri silmez: hızlı giriş, ham puan ve OMR taraması ayrı
    // state'lerde yaşar; kayıt ve hazırlık kontrolleri seçili `method`'a göre
    // dallandığı için eski bir tarama başka yöntemle asla kaydedilemez.
    if (method !== next) setMethod(next);
    if (draftSnapshot) {
      clearDraft(actor.id);
      setDraftSnapshot(null);
    }
    setStep('entry');
  }

  function onMethodListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const order: EntryMethod[] = ['quick', 'raw', 'omr'];
    const current = method ? order.indexOf(method) : -1;
    let next: EntryMethod | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = order[(current + 1 + order.length) % order.length]!;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = order[(current - 1 + order.length) % order.length]!;
    }
    if (!next) return;
    event.preventDefault();
    // Ok tuşu yalnızca seçimi değiştirir; Veri adımına tek başına geçirmez.
    // Veri silinmez (bk. selectMethod).
    if (method !== next) setMethod(next);
    document.querySelector<HTMLButtonElement>(`[data-method="${next}"]`)?.focus();
  }

  async function saveAndAnalyze() {
    if (saved || busy || !method) return;
    setSaveError('');
    setFlushNote('');
    if (blankExceeded) {
      setSaveError(MMPI_BLANK_MESSAGE);
      return;
    }
    if (!conditionsAccepted) {
      setSaveError('Devam etmek için uygulama koşullarını doğrulayın (aşağıdaki onay kutusu).');
      return;
    }
    if (actor.role !== 'PSYCHOLOG' || !actor.active) {
      setSaved({ id: 'local', createdAt: new Date().toISOString() });
      return;
    }
    if (!online) {
      enqueueCurrent('Çevrimdışı kuyruğa alındı.');
      return;
    }
    setBusy(true);
    try {
      const input = recordInputFromIntake(client);
      const meta = buildCaseMeta(method, client, {
        revisionOf: revisionOf ?? undefined,
        revisionReason: revisionReason ?? undefined,
      });
      let record: MMPIRecord;
      if (method === 'omr') {
        if (!scan || !omrReady) throw new Error('Dört sayfa onaylanmadan kayıt tamamlanamaz.');
        record = await createRecord(input, sortedPages(scan), definition, actor, submissionKey.current, [meta]);
      } else if (method === 'quick') {
        record = await createDataRecord(input, actor, submissionKey.current, [meta, buildQuickPayload(answers)]);
      } else if (method === 'raw') {
        record = await createDataRecord(input, actor, submissionKey.current, [meta, buildRawPayload(raw)]);
      } else {
        throw new Error('Veri giriş yöntemi seçilmedi.');
      }
      setSaved(record);
      removeOutboxEntry(actor.id, submissionKey.current);
      setOutbox(loadOutbox(actor.id));
      onSaved?.();
    } catch (cause) {
      if (isNetworkError(cause)) enqueueCurrent(cause instanceof Error ? cause.message : 'Ağ hatası.');
      else setSaveError(cause instanceof Error ? cause.message : 'Kayıt yazılamadı.');
    } finally {
      setBusy(false);
    }
  }

  const hasResumableDraft =
    flowOrigin === 'signin' ? (draftSnapshot != null && isDraftNonEmpty(draftSnapshot)) : (boot != null && isDraftNonEmpty(boot));

  const showRestoreBanner = restoredAt !== null && !restoreDismissed;
  const draftStatusText = !online
    ? 'Çevrimdışı — taslak bu cihazda korunuyor'
    : lastSavedAt
      ? `Taslak kaydedildi ${formatClock(lastSavedAt)}`
      : 'Taslak hazırlanıyor…';

  /* ---------------- "Kaydı Düzenle" ortak durum bantları ----------------
   * Hazırlık (kayıt yükleniyor) ve hata durumları home ile akış görünümünde
   * aynı davranır; kullanıcı hiçbir anda ekranda ne olduğunu tahmin etmek
   * zorunda kalmaz. */
  const editPreparingBanner = editLoading ? (
    <div className="ws-edit-panel ws-edit-panel-loading" role="status" aria-live="polite">
      <div className="ws-edit-panel-icon" aria-hidden="true">
        <span className="spinner-sm" />
      </div>
      <div className="ws-edit-panel-body">
        <strong className="ws-edit-panel-title">Kayıt düzenleme için hazırlanıyor…</strong>
        <p className="ws-edit-panel-desc">
          Seçtiğiniz kaydın bilgileri ve verileri forma yükleniyor. Hazır olduğunda doğrudan düzeltme
          adımına geçeceksiniz.
        </p>
      </div>
    </div>
  ) : null;

  const editErrorBanner = editLoadError ? (
    <div className="status-banner error-banner" role="alert">
      <Icon name="alert" size={16} />
      <span style={{ flex: 1 }}>{editLoadError}</span>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setEditLoadError('')}>
        Kapat
      </button>
    </div>
  ) : null;

  if (step === 'home') {
    return (
      <section className="ws-home" aria-labelledby="ws-home-title">
        <span className="section-badge badge-primary">MMPI-566 · Uzman çalışma alanı</span>
        <h1 id="ws-home-title" className="ws-home-title">
          Yeni bir MMPI <em>işlemi</em> başlatın
        </h1>
        <p className="ws-home-sub">
          Danışan bilgisi, veri girişi ve kontrol tek akışta yürür. Girdikleriniz her adımda bu cihaza
          otomatik kaydedilir; F5 ve internet kesintisinde kaybolmaz. Optik okuma mevcut OMR
          hattını kullanır; kayıt sonrası T skorları, geçerlik ve profil analizleri aynı ekranda hesaplanır.
        </p>

        {editPreparingBanner}
        {editErrorBanner}

        {flowOrigin === 'signin' && hasResumableDraft && draftSnapshot && (
          <div className="ws-restore-card" role="status">
            <div className="ws-restore-icon">
              <Icon name="refresh" size={20} />
            </div>
            <div className="ws-restore-body">
              <strong className="ws-restore-title">Devam edilebilecek çalışma bulundu</strong>
              <p className="ws-restore-desc">
                Cihazda bu hesaba ait kayıtlı bir çalışma var{' '}
                (son düzenleme <b>{formatDraftTime(draftSnapshot.updatedAt)}</b>). İsterseniz kaldığınız yerden devam
                edebilirsiniz — otomatik açılmaz.
              </p>
              <div className="ws-restore-meta">
                <span className="ws-chip">Kayıtlı çalışma</span>
                <span className="ws-muted">
                  {draftSnapshot.client.firstName ? `${draftSnapshot.client.firstName} ${draftSnapshot.client.lastName}` : 'Danışan bilgisi'}{' '}
                  · {draftSnapshot.method ? methodLabel(draftSnapshot.method) : 'Yöntem seçilmedi'}
                </span>
              </div>
            </div>
            <div className="ws-restore-actions">
              <button type="button" className="btn-primary btn-sm" onClick={openDraftSnapshot}>
                Kaldığın yerden devam et
                <Icon name="arrowRight" size={14} />
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setDraftSnapshot(null)}>
                Kapat
              </button>
            </div>
          </div>
        )}

        {showRestoreBanner && (
          <div className="ws-restore-card" role="status">
            <div className="ws-restore-icon">
              <Icon name="refresh" size={20} />
            </div>
            <div className="ws-restore-body">
              <strong className="ws-restore-title">Yarım kalan işlem bulundu</strong>
              <p className="ws-restore-desc">
                Son düzenleme <b>{formatDraftTime(restoredAt)}</b> — danışan bilgileri, cevaplar ve tarama verisi bu cihazda korunuyor.
                Kaldığınız yerden devam edebilirsiniz. F5 ve internet kesintisinde kaybolmaz.
              </p>
              <div className="ws-restore-meta">
                <span className="ws-chip">Otomatik taslak</span>
                <span className="ws-muted">{client.firstName ? `${client.firstName} ${client.lastName}` : 'Danışan bilgisi'} · {method ? methodLabel(method) : 'Yöntem seçilmedi'}</span>
              </div>
            </div>
            <div className="ws-restore-actions">
              <button type="button" className="btn-primary btn-sm" onClick={() => setStep('intake')}>
                Devam et
                <Icon name="arrowRight" size={14} />
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setRestoreDismissed(true)}>
                Kapat
              </button>
            </div>
          </div>
        )}

        {outbox.length > 0 && (
          <div className="ws-restore-card is-warning" role="status">
            <div className="ws-restore-icon is-warn">
              <Icon name="alert" size={20} />
            </div>
            <div className="ws-restore-body">
              <strong className="ws-restore-title">{outbox.length} kayıt kuyrukta bekliyor</strong>
              <p className="ws-restore-desc">Bağlantı nedeniyle gönderilemedi. İnternet geldiğinde otomatik gönderilir; bu ekranı güvenle kapatabilirsiniz.</p>
            </div>
            <div className="ws-restore-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={() => void flushOutbox()} disabled={flushing || !online}>
                {flushing ? 'Gönderiliyor…' : 'Şimdi dene'}
              </button>
            </div>
          </div>
        )}
        {flushNote && (
          <p className="ws-muted ws-restore-note" role="status">{flushNote}</p>
        )}

        <div className="ws-actions">
          {hasAnyData ? (
            <>
              <button type="button" className="btn-primary" onClick={() => setStep('intake')}>
                İşleme devam et
                <Icon name="arrowRight" size={16} />
              </button>
              <button type="button" className="btn-secondary" onClick={requestNew}>
                <Icon name="refresh" size={16} />
                Yeni işlem
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={requestNewEntry}>
              Yeni MMPI işlemi
              <Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
        <p className="ws-autosave-note" role="note">
          <Icon name="checkCircle" size={14} />
          Otomatik taslak açık: danışan, cevaplar ve tarama verisi bu cihazda saklanır.
        </p>
        <dl className="ws-facts">
          <div>
            <dt>Madde</dt>
            <dd>{ITEM_COUNT}</dd>
          </div>
          <div>
            <dt>Optik form</dt>
            <dd>4 sayfa A4</dd>
          </div>
          <div>
            <dt>Tipik süre</dt>
            <dd>60–120 dk</dd>
          </div>
          <div>
            <dt>Uygulama yaşı</dt>
            <dd>{MMPI_AGE_MIN}+</dd>
          </div>
        </dl>

        {confirmNew && (
          <ConfirmDialog
            title="Yeni işlem başlatılsın mı?"
            description="Yarım kalan danışan ve veri girişi silinecek. Kuyruktaki kayıtlar etkilenmez. Bu işlem geri alınamaz."
            confirmLabel="Evet, temiz başla"
            onConfirm={startNew}
            onCancel={() => setConfirmNew(false)}
          />
        )}

        {pendingEditId && (
          <ConfirmDialog
            tone="neutral"
            title="Yarım çalışma kapatılıp düzenleme açılsın mı?"
            description="Bu cihazda tamamlanmamış bir çalışma var. Kaydı düzenlemeye başlamak için bu yarım çalışma silinecek — kuyruktaki kayıtlar etkilenmez ve bu işlem geri alınamaz. Düzenlemeye alınan kaydın orijinali hiçbir zaman değişmez."
            confirmLabel="Evet, düzenlemeyi aç"
            busy={editLoading}
            onConfirm={() => {
              const target = pendingEditId;
              setPendingEditId(null);
              applyRecordEdit(target);
            }}
            onCancel={() => {
              setPendingEditId(null);
              window.history.replaceState(null, '', window.location.pathname);
            }}
          />
        )}
      </section>
    );
  }

  return (
    <div className="ws-flow">
      <div className="ws-flowbar" aria-label="İşlem adımları">
        <button type="button" className="btn-secondary btn-sm" onClick={goBack}>
          <Icon name="left" size={14} />
          <span>{step === 'intake' ? 'Çalışma alanı' : 'Geri'}</span>
        </button>

        <ol className="ws-stepper">
          {STEPS.map((item, index) => {
            const state = index < stepIndex ? 'is-done' : index === stepIndex ? 'is-on' : '';
            const canJump = index < stepIndex;
            return (
              <li key={item.id} className={`ws-step ${state}`} aria-current={index === stepIndex ? 'step' : undefined}>
                {canJump ? (
                  <button type="button" onClick={() => gotoStep(item.id as 'intake' | 'method' | 'entry')}>
                    {index + 1}. {item.label}
                  </button>
                ) : (
                  <span>{index + 1}. {item.label}</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="ws-flowbar-action">
          {step === 'intake' && (
            <button type="submit" form="intake-form" className="btn-primary btn-sm">
              Devam
            </button>
          )}
          {step === 'entry' && (
            <button type="button" className="btn-primary btn-sm" disabled={!entryReady} onClick={() => setStep('review')}>
              Kontrol
            </button>
          )}
          {step === 'review' && (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy || !!saved || blankExceeded || !conditionsAccepted}
              onClick={() => void saveAndAnalyze()}
            >
              {busy
                ? 'Kaydediliyor…'
                : revisionOf
                  ? online
                    ? 'Değişiklikleri kaydet'
                    : 'Değişiklikleri kuyruğa al'
                  : online
                    ? 'Analizi başlat'
                    : 'Kuyruğa al'}
            </button>
          )}
        </div>
      </div>

      <div className="ws-draftbar" role="status" aria-live="polite">
        <span className={`ws-netdot ${online ? 'is-on' : 'is-off'}`} aria-hidden="true" />
        <span>{draftStatusText}</span>
        {outbox.length > 0 && <span className="ws-chip">Kuyruk: {outbox.length}</span>}
        {dirty && <span className="ws-chip">Kaydedilmedi</span>}
        {storageWarning && <span className="ws-hint is-error">{storageWarning}</span>}
      </div>

      {/* "Kaydı Düzenle" modu: her adımda görünür — ne olduğu, sonucun ne
          olacağı ve nasıl çıkılacağı tek kartta açıkça yazılır. Bilgi eksik
          kalmasın diye kendiliğinden kapanmaz; yalnızca "Düzenlemeyi bırak"
          ile (onayla) çıkılır. */}
      {revisionOf && !saved && (
        <section className="ws-edit-panel" role="status" aria-label="Kayıt düzenleme modu">
          <div className="ws-edit-panel-icon" aria-hidden="true">
            <Icon name="edit" size={18} />
          </div>
          <div className="ws-edit-panel-body">
            <strong className="ws-edit-panel-title">Kayıt düzenleme modu</strong>
            <p className="ws-edit-panel-desc">
              Şu an <b>{`${client.firstName} ${client.lastName}`.trim() || 'Danışan'}</b> kaydının bir
              kopyası üzerinde çalışıyorsunuz. Buradaki düzeltmeler <b>orijinal kaydı silmez</b>:
              “Değişiklikleri kaydet” dediğinizde orijinalin altında saklanan{' '}
              <b>yeni bir revizyon kaydı</b> oluşur.
            </p>
            {revisionNote && <p className="ws-edit-panel-desc">{revisionNote}</p>}
            <p className="ws-edit-panel-desc ws-edit-panel-roadmap">
              Yol haritası: veride düzelt → <b>Kontrol</b>’de gözden geçir →{' '}
              <b>Değişiklikleri kaydet</b>.
            </p>
            <div className="ws-edit-panel-links">
              <a href={`/kayitlar/${revisionOf}`} className="ws-revision-link">
                Orijinal kaydı görüntüle
              </a>
              <span className="ws-edit-panel-id mono-sub">Kayıt no: {revisionOf.slice(0, 8)}…</span>
            </div>
          </div>
          <div className="ws-edit-panel-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setConfirmCancelEdit(true)}
              title="Düzenlemeyi bırak — bu cihazdaki taslak silinir, orijinal kayda dokunulmaz"
            >
              Düzenlemeyi bırak
            </button>
          </div>
        </section>
      )}

      {/* Revizyon kaydedildiyse: orijinalin değişmediğinin açık onayı + bağlantılar. */}
      {revisionOf && saved && saved.id !== 'local' && (
        <div className="status-banner success-banner ws-revision-banner" role="status">
          <Icon name="checkCircle" size={16} />
          <span style={{ flex: 1 }}>
            <strong>Değişiklikler kaydedildi.</strong> Orijinal kayıt silinmedi; düzeltmeleriniz ona
            bağlı yeni bir revizyon kaydı olarak yazıldı.{' '}
            <a href={`/kayitlar/${saved.id}`} className="ws-revision-link">
              Yeni kaydı görüntüle
            </a>
            {' · '}
            <a href={`/kayitlar/${revisionOf}`} className="ws-revision-link">
              Orijinal kaydı görüntüle
            </a>
          </span>
        </div>
      )}

      {editPreparingBanner}
      {editErrorBanner}

      {pendingEditId && (
        <ConfirmDialog
          tone="neutral"
          title="Yarım çalışma kapatılıp düzenleme açılsın mı?"
          description="Bu cihazda tamamlanmamış bir çalışma var. Kaydı düzenlemeye başlamak için bu yarım çalışma silinecek — kuyruktaki kayıtlar etkilenmez ve bu işlem geri alınamaz. Düzenlemeye alınan kaydın orijinali hiçbir zaman değişmez."
          confirmLabel="Evet, düzenlemeyi aç"
          busy={editLoading}
          onConfirm={() => {
            const target = pendingEditId;
            setPendingEditId(null);
            applyRecordEdit(target);
          }}
          onCancel={() => {
            setPendingEditId(null);
            window.history.replaceState(null, '', window.location.pathname);
          }}
        />
      )}

      {showRestoreBanner && (
        <div className="ws-restore-inline" role="status">
          <div className="ws-restore-inline-icon">
            <Icon name="refresh" size={16} />
          </div>
          <div className="ws-restore-inline-body">
            <strong>Taslak geri yüklendi</strong> <span>({formatDraftTime(restoredAt)}) — hiçbir veriniz kaybolmadı; kaldığınız adımdasınız.</span>
          </div>
          <button type="button" className="close-banner-btn" onClick={() => setRestoreDismissed(true)} aria-label="Kapat">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {!online && (
        <div className="status-banner warning-banner" role="alert">
          <Icon name="alert" size={18} />
          <span style={{ flex: 1 }}>
            Çevrimdışısınız. Girmeye devam edebilirsiniz — her şey taslağa yazılıyor. Kaydet’e basarsanız kaydınız
            kuyruğa alınır ve bağlantı gelince otomatik gönderilir.
          </span>
        </div>
      )}

      {step === 'intake' && (
        <IntakeForm
          client={client}
          error={intakeError}
          onChange={setClient}
          onSubmit={submitIntake}
        />
      )}

      {step === 'method' && (
        <section className="ws-panel" aria-labelledby="ws-method-title">
          <header className="ws-panel-head">
            <div>
              <span className="section-badge badge-primary">02 · Yöntem</span>
              <h2 id="ws-method-title" className="ws-panel-title">
                Veri giriş <em>yöntemi</em>
              </h2>
              <p className="ws-muted">
                Yöntemi her an değiştirebilirsiniz; danışan bilgisi ile girdiğiniz tüm veriler (cevaplar, ham
                puanlar, tarama) korunur. Ok tuşlarıyla seçim yapıp Enter ile ilerleyebilirsiniz.
              </p>
            </div>
          </header>
          <p className="ws-client-chip">
            <Icon name="user" size={14} />
            <span>
              <strong>
                {client.firstName} {client.lastName}
              </strong>
              {' · '}
              {client.gender} · {client.age} yaş · {formatDate(client.testDate)}
            </span>
          </p>
          <div className="ws-methods" role="radiogroup" aria-label="Veri giriş yöntemi" onKeyDown={onMethodListKeyDown}>
            {METHOD_CARDS.map(card => {
              const progress =
                card.id === 'quick'
                  ? `${quickCounts.entered}/${ITEM_COUNT} madde`
                  : card.id === 'raw'
                    ? `${rawEntered}/${RAW_SCORE_FIELDS.length} ölçek`
                    : `${omrPages}/4 sayfa`;
              const hasProgress =
                (card.id === 'quick' && quickCounts.entered > 0) ||
                (card.id === 'raw' && rawEntered > 0) ||
                (card.id === 'omr' && omrPages > 0);
              return (
                <button
                  key={card.id}
                  type="button"
                  role="radio"
                  data-method={card.id}
                  aria-checked={method === card.id}
                  className={`ws-method ${method === card.id ? 'is-selected' : ''}`}
                  onClick={() => selectMethod(card.id)}
                >
                  <span className="ws-method-icon">
                    <Icon name={card.icon} size={18} />
                  </span>
                  <strong>{card.title}</strong>
                  <span>{card.desc}</span>
                  <span className={`ws-method-progress ${hasProgress ? 'has-data' : ''}`}>{progress}</span>
                  {method === card.id && <span className="ws-method-flag">Seçili</span>}
                </button>
              );
            })}
          </div>
          <div className="ws-nav">
            <button type="button" className="btn-secondary" onClick={() => setStep('intake')}>
              Geri
            </button>
            <button type="button" className="btn-primary" disabled={!method} onClick={() => setStep('entry')}>
              Devam
            </button>
          </div>
        </section>
      )}

      {step === 'entry' && method && (
        <>
          {method === 'quick' && (
            <QuickEntry answers={answers} current={currentItem} onCurrent={setCurrentItem} onAnswers={setAnswers} />
          )}
          {method === 'raw' && <RawScoreEntry scores={raw} onChange={setRaw} />}
        </>
      )}

      {/* OMR taraması üst state'te yaşar; yöntem değişiminde de korunur.
          Tarayıcı yöntem dışındayken unmount olur, dönüldüğünde `initialScan`
          ile aynen geri gelir (aynı oturumda görseller dahil). */}
      {method === 'omr' && (
        <div className={step === 'entry' ? undefined : 'is-screen-hidden'}>
          <ScannerWorkspace
            key={scanKey}
            definition={definition}
            actor={actor}
            embedded
            initialScan={scan}
            onScanChange={setScan}
          />
        </div>
      )}

      {/* Alt nav her adımda korunur (rapor §3.4); OMR modunda uzun içerikten
          sonra "Kontrol" eylemine en kısa yoldan erişim için OMR bloğunun altındadır. */}
      {step === 'entry' && method && (
        <div className="ws-nav">
          <button type="button" className="btn-secondary" onClick={() => setStep('method')}>
            Geri
          </button>
          <button type="button" className="btn-primary" disabled={!entryReady} onClick={() => setStep('review')}>
            Kontrol
          </button>
        </div>
      )}

      {step === 'review' && method && (
        <ReviewPanel
          actor={actor}
          client={client}
          method={method}
          answers={answers}
          raw={raw}
          scan={scan}
          definition={definition}
          omrReady={omrReady}
          busy={busy}
          saved={saved}
          error={saveError}
          blankCount={blankCount}
          blankExceeded={blankExceeded}
          online={online}
          outboxCount={outbox.length}
          flushNote={flushNote}
          flushing={flushing}
          conditionsAccepted={conditionsAccepted}
          revisionOf={revisionOf}
          onConditions={setConditionsAccepted}
          onFlush={() => void flushOutbox()}
          onBack={() => setStep('entry')}
          onEditIntake={() => setStep('intake')}
          onEditMethod={() => setStep('method')}
          onSave={() => void saveAndAnalyze()}
          onNew={requestNew}
        />
      )}

      {confirmNew && (
        <ConfirmDialog
          title="Yeni işlem başlatılsın mı?"
          description="Yarım kalan danışan ve veri girişi silinecek. Kuyruktaki kayıtlar etkilenmez. Bu işlem geri alınamaz."
          confirmLabel="Evet, temiz başla"
          onConfirm={startNew}
          onCancel={() => setConfirmNew(false)}
        />
      )}

      {confirmCancelEdit && (
        <ConfirmDialog
          title="Düzenleme bırakılsın mı?"
          description="Bu cihazdaki düzenleme taslağınız silinir (kuyruktaki kayıtlar etkilenmez). Orijinal kayıt zaten hiç değişmedi; istediğiniz zaman yeniden “Kaydı Düzenle” diyebilirsiniz."
          confirmLabel="Evet, düzenlemeyi bırak"
          onConfirm={discardEdit}
          onCancel={() => setConfirmCancelEdit(false)}
        />
      )}
    </div>
  );
}

function IntakeForm({
  client,
  error,
  onChange,
  onSubmit,
}: {
  client: ClientIntake;
  error: string;
  onChange: (next: ClientIntake) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const id = useId();
  const set = <K extends keyof ClientIntake>(key: K, value: ClientIntake[K]) => onChange({ ...client, [key]: value });

  const registeredClients = useMemo(() => getClients(), []);
  const ageOutOfRange = client.age > 0 && client.age < MMPI_AGE_MIN;
  const educationInvalid = client.education === 'İlkokul';
  const durationInfo = assessDuration(client.testDuration);
  const showDurationHint = client.testDuration.trim() !== '' || durationInfo.level !== 'empty';
  const today = todayIsoDate();

  function handleSelectClient(clientId: string) {
    const chosen = registeredClients.find(c => c.id === clientId);
    if (!chosen) return;
    const mappedGender: IntakeGender = chosen.gender === 'ERKEK' ? 'Erkek' : 'Kadın';
    const mappedMarital: MaritalStatus = chosen.maritalStatus === 'Evli' ? 'Evli' : chosen.maritalStatus === 'Bosanmis' ? 'Boşanmış' : chosen.maritalStatus === 'Diger' ? 'Dul' : 'Bekar';
    const mappedEdu: EducationLevel =
      chosen.education === 'İlkokul' ? 'İlkokul' :
      chosen.education === 'Ortaokul' ? 'Ortaokul' :
      chosen.education === 'Lise' ? 'Lise' :
      (chosen.education === 'Yüksek Lisans' || chosen.education === 'Doktora') ? 'Lisansüstü' : 'Lisans';

    onChange({
      ...client,
      firstName: chosen.firstName,
      lastName: chosen.lastName,
      gender: mappedGender,
      age: chosen.age,
      occupation: chosen.occupation || client.occupation,
      education: mappedEdu,
      maritalStatus: mappedMarital,
      applicationReason: chosen.presentingComplaint || client.applicationReason,
    });
  }

  return (
    <form id="intake-form" className="ws-panel" noValidate onSubmit={onSubmit}>
      <header className="ws-panel-head">
        <div>
          <span className="section-badge badge-primary">01 · Danışan</span>
          <h2 className="ws-panel-title">
            Danışan / test <em>bilgileri</em>
          </h2>
          <p className="ws-muted">
            Yıldızlı alanlar zorunludur. MMPI {MMPI_AGE_MIN} yaş ve üzerine, en az ortaokul düzeyine uygulanır.
            Yazdıklarınız her harfte bu cihaza kaydedilir; F5 veya internet kesintisinde kaybolmaz.
          </p>
        </div>
      </header>

      <div className="ws-form">
        {registeredClients.length > 0 && (
          <div className="form-group" style={{ gridColumn: '1 / -1', background: 'var(--bg-soft)', padding: 12, borderRadius: 8, border: '1px solid var(--hairline)' }}>
            <label htmlFor={`${id}-client-select`} style={{ fontWeight: 600, color: 'var(--accent-ink)' }}>
              Kayıtlı Danışan Seçerek Otomatik Doldur
            </label>
            <select
              id={`${id}-client-select`}
              defaultValue=""
              onChange={e => {
                if (e.target.value) handleSelectClient(e.target.value);
              }}
            >
              <option value="">-- Danışan Seçiniz (veya elle doldurunuz) --</option>
              {registeredClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.fileNumber} · {c.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}, {c.age} yaş)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ws-section-label" role="group" aria-label="Danışan bilgileri">
          Danışan
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-first`}>Ad *</label>
          <input
            id={`${id}-first`}
            required
            value={client.firstName}
            onChange={e => set('firstName', e.target.value)}
            autoComplete="off"
            placeholder="Örn. Ayşe"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-last`}>Soyad *</label>
          <input
            id={`${id}-last`}
            required
            value={client.lastName}
            onChange={e => set('lastName', e.target.value)}
            autoComplete="off"
            placeholder="Örn. Yılmaz"
          />
        </div>
        <fieldset className="form-group ws-fieldset">
          <legend>Cinsiyet *</legend>
          <div className="ws-choice-row">
            {(['Erkek', 'Kadın'] as IntakeGender[]).map(option => (
              <label key={option}>
                <input
                  type="radio"
                  name={`${id}-gender`}
                  checked={client.gender === option}
                  onChange={() => set('gender', option)}
                />
                {option}
              </label>
            ))}
          </div>
          <small className="ws-hint">MMPI normları cinsiyete göre ayrışır; doğru seçim puanlamayı etkiler.</small>
        </fieldset>
        <div className="form-group">
          <label htmlFor={`${id}-age`}>Yaş *</label>
          <input
            id={`${id}-age`}
            required
            type="number"
            min={MMPI_AGE_MIN}
            max={MMPI_AGE_MAX}
            value={client.age || ''}
            onChange={e => set('age', Number(e.target.value) || 0)}
            placeholder={`${MMPI_AGE_MIN}+`}
          />
          {ageOutOfRange ? (
            <small className="ws-hint is-error">{MMPI_AGE_MESSAGE}</small>
          ) : (
            <small className="ws-hint">16 yaş altı kabul edilmez; üst sınır norm koşulu değildir.</small>
          )}
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-edu`}>Eğitim</label>
          <select
            id={`${id}-edu`}
            value={client.education}
            onChange={e => set('education', e.target.value as EducationLevel | '')}
          >
            <option value="">—</option>
            {EDUCATION_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {educationInvalid ? (
            <small className="ws-hint is-error">{MMPI_EDUCATION_MESSAGE}</small>
          ) : (
            <small className="ws-hint">Maddeleri anlayarak yanıtlamak için en az ortaokul düzeyi gerekir.</small>
          )}
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-marital`}>Medeni durum</label>
          <select
            id={`${id}-marital`}
            value={client.maritalStatus}
            onChange={e => set('maritalStatus', e.target.value as MaritalStatus | '')}
          >
            <option value="">—</option>
            {MARITAL_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group span-2">
          <label htmlFor={`${id}-job`}>Meslek</label>
          <input
            id={`${id}-job`}
            value={client.occupation}
            onChange={e => set('occupation', e.target.value)}
            autoComplete="off"
            maxLength={120}
            placeholder="Örn. Öğretmen"
          />
        </div>

        <div className="ws-section-label" role="group" aria-label="Test bilgileri">
          Test
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-date`}>Test tarihi *</label>
          <input
            id={`${id}-date`}
            required
            type="date"
            max={today}
            value={client.testDate}
            onChange={e => set('testDate', e.target.value)}
          />
          <small className="ws-hint">Testin uygulandığı gün; ileri tarih seçilemez.</small>
        </div>
        <div className="form-group">
          <label htmlFor={`${id}-duration`}>Test süresi</label>
          <div className="ws-duration">
            <input
              id={`${id}-duration`}
              type="number"
              min={1}
              max={600}
              inputMode="numeric"
              value={client.testDuration}
              onChange={e => set('testDuration', e.target.value)}
              placeholder="75"
              aria-describedby={`${id}-duration-hint`}
            />
            <span className="ws-duration-suffix">dk</span>
          </div>
          <span id={`${id}-duration-hint`}>
            {showDurationHint && durationInfo.level === 'invalid' && <small className="ws-hint is-error">{durationInfo.message}</small>}
            {showDurationHint && durationInfo.level === 'very-short' && <small className="ws-hint is-error">{durationInfo.message}</small>}
            {showDurationHint && durationInfo.level === 'short' && <small className="ws-hint is-warn">{durationInfo.message}</small>}
            {showDurationHint && durationInfo.level === 'long' && <small className="ws-hint is-warn">{durationInfo.message}</small>}
            {showDurationHint && durationInfo.level === 'ok' && <small className="ws-hint">{MMPI_DURATION_REFERENCE}</small>}
            {!showDurationHint && <small className="ws-hint">Tipik aralık 60–120 dk; kaydı engellemez, kontrolde işaretlenir.</small>}
          </span>
        </div>
        <fieldset className="form-group ws-fieldset">
          <legend>İzlem</legend>
          <div className="ws-choice-row">
            {FOLLOW_UP_OPTIONS.map(option => (
              <label key={option}>
                <input
                  type="radio"
                  name={`${id}-follow`}
                  checked={client.followUp === option}
                  onChange={() => set('followUp', option as FollowUpStatus)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-group">
          <label htmlFor={`${id}-reason`}>Başvuru nedeni</label>
          <input
            id={`${id}-reason`}
            value={client.applicationReason}
            onChange={e => set('applicationReason', e.target.value)}
            maxLength={500}
            placeholder="Örn. İşe giriş değerlendirmesi"
          />
        </div>
        <div className="form-group span-2">
          <label htmlFor={`${id}-ctx`}>Kısa öykü / klinik bağlam</label>
          <textarea
            id={`${id}-ctx`}
            value={client.clinicalContext}
            onChange={e => set('clinicalContext', e.target.value)}
            maxLength={2000}
            placeholder="Değerlendirme için gerekli kısa bağlam (isteğe bağlı)"
          />
        </div>
      </div>

      {error && (
        <div className="status-banner error-banner" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="ws-nav">
        <span />
        <button type="submit" className="btn-primary">
          Devam
        </button>
      </div>
    </form>
  );
}

function ReviewPanel({
  actor,
  client,
  method,
  answers,
  raw,
  scan,
  definition,
  omrReady,
  busy,
  saved,
  error,
  blankCount,
  blankExceeded,
  online,
  outboxCount,
  flushNote,
  flushing,
  conditionsAccepted,
  revisionOf,
  onConditions,
  onFlush,
  onBack,
  onEditIntake,
  onEditMethod,
  onSave,
  onNew,
}: {
  actor: AuthenticatedUser;
  client: ClientIntake;
  method: EntryMethod;
  answers: ItemAnswer[];
  raw: RawScores;
  scan: ScanSet | null;
  definition: FormDefinition;
  omrReady: boolean;
  busy: boolean;
  saved: MMPIRecord | null;
  error: string;
  blankCount: number;
  blankExceeded: boolean;
  online: boolean;
  outboxCount: number;
  flushNote: string;
  flushing: boolean;
  conditionsAccepted: boolean;
  /** "Kaydı Düzenle" oturumuysa orijinal kaydın id'si (revizyon olarak yazılır). */
  revisionOf: string | null;
  onConditions: (next: boolean) => void;
  onFlush: () => void;
  onBack: () => void;
  onEditIntake: () => void;
  onEditMethod: () => void;
  onSave: () => void;
  onNew: () => void;
}) {
  const counts = countAnswers(answers);
  const omrSummary = scan ? summarizeResults(definition, sortedPages(scan)) : null;
  const durationInfo = assessDuration(client.testDuration);
  const checklist = [
    { ok: true, label: `Danışan: ${client.firstName} ${client.lastName} · ${client.gender} · ${client.age} yaş` },
    {
      ok: !blankExceeded,
      label:
        method === 'quick'
          ? `Veri: ${counts.entered}/${ITEM_COUNT} madde · Boş ${counts.blank}`
          : method === 'raw'
            ? `Veri: ham puan tamam · Boş ${blankCount}`
            : omrSummary
              ? `Veri: ${omrSummary.acceptedPages}/${omrSummary.expectedPages} sayfa · Boş ${omrSummary.blank}`
              : 'Veri: tarama eksik',
    },
    { ok: conditionsAccepted, label: 'Uygulama koşulları doğrulandı' },
  ];

  const gender = (client.gender === 'Kadın' ? 'Kadın' : 'Erkek') as 'Erkek' | 'Kadın';

  const profile = useMemo(() => {
    try {
      if (client.gender !== 'Erkek' && client.gender !== 'Kadın') return null;
      if (method === 'quick') {
        if (counts.entered < ITEM_COUNT) return null;
        return buildProfileFromAnswers(answers, gender);
      }
      if (method === 'raw') {
        if (!rawScoresComplete(raw)) return null;
        return buildProfileFromRawScoresObject(raw, gender);
      }
      if (method === 'omr' && scan) {
        // Do not score incomplete/ambiguous OMR evidence as cannot-say answers. The scanner
        // keeps unresolved slots pending and the record gate requires every item to be reviewed.
        if (!omrReady) return null;
        const omrAnswers = scanToAnswers(definition, scan);
        if (omrAnswers.some(answer => answer === undefined)) return null;
        return buildProfileFromAnswers(omrAnswers, gender);
      }
      return null;
    } catch {
      return null;
    }
  }, [method, answers, raw, scan, definition, client.gender, counts.entered, gender]);

  return (
    <section className="ws-review">
      <header className="ws-panel-head">
        <div>
          <span className="section-badge badge-primary">04 · Kontrol & Hesaplama</span>
          <h2 className="ws-panel-title">
            Verileri <em>gözden geçirin</em> ve profili inceleyin
          </h2>
          <p className="ws-muted">
            {revisionOf
              ? 'Düzenleme bu ekrandan yazılır: orijinal kayıt silinmez, değişiklikler ona bağlı yeni bir revizyon kaydı olarak kaydedilir. Aşağıda Türk normlarına göre hesaplanmış T skorları ve profil grafiği anlık gösterilir; düzeltmek istediğiniz adıma tek tıkla dönün, hiçbir veri kaybolmaz.'
              : 'Kayıt veritabanına bu ekrandan yazılır. Aşağıda Türk normlarına göre hesaplanmış T skorları ve profil grafiği anlık olarak gösterilir. Bir şeyi düzeltmeniz gerekirse ilgili adıma tek tıkla dönün; hiçbir veri kaybolmaz.'}
          </p>
        </div>
        {!saved && (
          <div className="ws-review-edits">
            <button type="button" className="btn-secondary btn-sm" onClick={onEditIntake}>
              Danışanı düzenle
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={onEditMethod}>
              Yöntemi değiştir
            </button>
          </div>
        )}
      </header>

      <ol className="ws-checklist" aria-label="Kayıt öncesi kontrol listesi">
        {checklist.map((item, index) => (
          <li key={index} className={item.ok ? 'is-ok' : 'is-missing'}>
            <Icon name={item.ok ? 'checkCircle' : 'alert'} size={15} />
            <span>{item.label}</span>
          </li>
        ))}
      </ol>

      {blankExceeded && (
        <div className="status-banner error-banner" role="alert">
          <Icon name="alert" size={16} />
          <span>{MMPI_BLANK_MESSAGE} (Boş: {blankCount})</span>
        </div>
      )}

      {(durationInfo.level === 'very-short' || durationInfo.level === 'short' || durationInfo.level === 'long') && (
        <div
          className={`status-banner ${durationInfo.level === 'very-short' ? 'error-banner' : 'warning-banner'}`}
          role="alert"
        >
          <Icon name="alert" size={16} />
          <span>{durationInfo.message}</span>
        </div>
      )}

      {!online && !saved && (
        <div className="status-banner warning-banner" role="alert">
          <Icon name="alert" size={16} />
          <span style={{ flex: 1 }}>
            Çevrimdışısınız. “Analizi başlat”a basarsanız kaydınız kuyruğa alınır ve bağlantı gelince otomatik
            gönderilir.
          </span>
        </div>
      )}

      {outboxCount > 0 && !saved && (
        <div className="status-banner info-banner" role="status">
          <Icon name="refresh" size={16} />
          <span style={{ flex: 1 }}>
            {outboxCount} kayıt kuyrukta bekliyor.
            {flushNote ? ` ${flushNote}` : ''}
          </span>
          <button type="button" className="btn-secondary btn-sm" onClick={onFlush} disabled={flushing || !online}>
            {flushing ? 'Gönderiliyor…' : 'Şimdi dene'}
          </button>
        </div>
      )}
      {flushNote && outboxCount === 0 && (
        <p className="ws-muted" role="status">{flushNote}</p>
      )}

      {/* Hesaplama ve Grafik */}
      {profile ? (
        <>
          <MMPIResultsPanel
            profile={profile}
            clientName={`${client.firstName} ${client.lastName}`}
            answers={
              method === 'quick'
                ? answers
                : method === 'omr' && scan
                  ? scanToAnswers(definition, scan)
                  : undefined
            }
            /* "Yapay Zekâ Yorumu" (son sekme): taslak modunda yorum üretilir
               (recordId yok); yalnız yaş taşınır (KVKK). */
            aiContext={{ method, client: { age: client.age } }}
          />
        </>
      ) : (
        <div className="mmpi-results-placeholder">
          <Icon name="sheet" size={20} />
          <div>
            <strong>Profil hesaplanamadı</strong>
            <p className="ws-muted">Cinsiyet seçili olmalı ve veri girişi tamamlanmalıdır. Hızlı girişte 566 madde, ham puanda tüm ölçekler, OMR’de 4 sayfa gereklidir.</p>
          </div>
        </div>
      )}

      <p className="ws-conditions-note">
        Uygulama koşulları: danışan akut psikotik durumda değil, madde/sedatif etkisi altında
        değil, testi tek başına ve yönlendirme olmaksızın doldurmuştur; uygulamayı yetkin bir
        uzman yürütmüştür.
      </p>
      {!saved && (
        <label className="ws-conditions-check">
          <input type="checkbox" checked={conditionsAccepted} onChange={e => onConditions(e.target.checked)} />
          <span>Yukarıdaki uygulama koşullarının sağlandığını doğruluyorum.</span>
        </label>
      )}

      <section className="ws-session-summary" aria-label="Oturum künyesi">
        <h3 className="ws-session-title">Oturum Künyesi</h3>
        <p className="ws-muted ws-session-hint">
          Bu kaydın veritabanına yazılacak künye özeti. Veri girişinde kullandığınız yönteme göre alt
          satırda giriş istatistikleri gösterilir.
        </p>
        <dl className="ws-dl">
          <div>
            <dt>Danışan</dt>
            <dd>
              {client.firstName} {client.lastName}
            </dd>
          </div>
          <div>
            <dt>Cinsiyet</dt>
            <dd>{client.gender}</dd>
          </div>
          <div>
            <dt>Yaş</dt>
            <dd>{client.age}</dd>
          </div>
          <div>
            <dt>Test tarihi</dt>
            <dd>{formatDate(client.testDate)}</dd>
          </div>
          <div>
            <dt>Süre</dt>
            <dd>{client.testDuration.trim() ? formatDuration(client.testDuration) : '—'}</dd>
          </div>
          {client.occupation && (
            <div>
              <dt>Meslek</dt>
              <dd>{client.occupation}</dd>
            </div>
          )}
          {client.followUp && (
            <div>
              <dt>İzlem</dt>
              <dd>{client.followUp}</dd>
            </div>
          )}
          {client.education && (
            <div>
              <dt>Eğitim</dt>
              <dd>{client.education}</dd>
            </div>
          )}
          {client.maritalStatus && (
            <div>
              <dt>Medeni durum</dt>
              <dd>{client.maritalStatus}</dd>
            </div>
          )}
          <div>
            <dt>Yöntem</dt>
            <dd>{methodLabel(method)}</dd>
          </div>
          <div>
            <dt>Uzman</dt>
            <dd>
              {actor.firstName} {actor.lastName}
            </dd>
          </div>
        </dl>

        <h4 className="ws-session-subtitle">Veri İstatistikleri — {methodLabel(method)}</h4>
        {method === 'quick' && (
          <dl className="ws-dl">
            <div>
              <dt>Girilen</dt>
              <dd>
                {counts.entered} / {ITEM_COUNT}
              </dd>
            </div>
            <div>
              <dt>Doğru</dt>
              <dd>{counts.correct}</dd>
            </div>
            <div>
              <dt>Yanlış</dt>
              <dd>{counts.wrong}</dd>
            </div>
            <div>
              <dt>Boş</dt>
              <dd>{counts.blank}</dd>
            </div>
          </dl>
        )}

        {method === 'raw' && (
          <dl className="ws-dl">
            {RAW_SCORE_FIELDS.map(field => (
              <div key={field.key}>
                <dt>
                  {field.label}
                  {field.kRaw ? ' (K’sız)' : ''}
                </dt>
                <dd>{raw[field.key] === '' ? '—' : raw[field.key]}</dd>
              </div>
            ))}
          </dl>
        )}

        {method === 'omr' && omrSummary && (
          <dl className="ws-dl">
            <div>
              <dt>Sayfa</dt>
              <dd>
                {omrSummary.acceptedPages} / {omrSummary.expectedPages}
              </dd>
            </div>
            <div>
              <dt>Okunan</dt>
              <dd>
                {omrSummary.readItems} / {omrSummary.expectedItems}
              </dd>
            </div>
            <div>
              <dt>Güvenilir</dt>
              <dd>{omrSummary.reliableAnswers}</dd>
            </div>
            <div>
              <dt>İnceleme</dt>
              <dd>{omrSummary.ambiguous + omrSummary.multiple}</dd>
            </div>
            <div>
              <dt>Boş</dt>
              <dd>{omrSummary.blank}</dd>
            </div>
          </dl>
        )}
      </section>

      {error && (
        <div className="status-banner error-banner" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </div>
      )}

      {saved ? (
        <div className={`ws-ready ${saved.id === 'local' ? 'is-local' : ''}`} role="status">
          <Icon name={saved.id === 'local' ? 'info' : 'checkCircle'} size={18} />
          <div>
            <strong>
              {saved.id === 'local'
                ? 'Analiz bu oturum için hesaplandı'
                : revisionOf
                  ? 'Değişiklikler kaydedildi'
                  : 'Kayıt veritabanına yazıldı'}
            </strong>
            {saved.id === 'local' ? (
              <p>
                Profil ve tüm hesaplamalar yukarıda tamamlanmıştır. Bu hesap psikolog kayıt
                yetkisine sahip olmadığından sonuç veritabanına yazılmadı; kaydı ancak aktif
                psikolog hesabıyla oluşturabilirsiniz.
              </p>
            ) : revisionOf ? (
              <p>
                Orijinal kayıt silinmedi; düzeltmeleriniz ona bağlı <strong>yeni bir revizyon kaydı</strong>{' '}
                olarak yazıldı. Profil ve tüm hesaplamalar yukarıda tamamlanmıştır.
              </p>
            ) : (
              <p>
                Kayıt numarası <strong>{saved.id}</strong>. Profil ve tüm hesaplamalar yukarıda
                tamamlanmıştır; kayıt “Kayıtlar” ekranından her zaman yeniden açılabilir.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div className="ws-nav">
        {saved ? (
          <>
            <button
              type="button"
              className={saved.id === 'local' ? 'btn-primary' : 'btn-secondary'}
              onClick={onNew}
            >
              Yeni işlem
            </button>
            {saved.id !== 'local' && (
              <a href={`/kayitlar/${saved.id}`} className="btn-primary">
                {revisionOf ? 'Yeni kaydı görüntüle' : 'Kaydı görüntüle'}
                <Icon name="arrowRight" size={16} />
              </a>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={onBack}>
              Geri
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy || blankExceeded || !conditionsAccepted}
              onClick={onSave}
              title={!conditionsAccepted ? 'Önce uygulama koşullarını doğrulayın' : undefined}
            >
              {busy
                ? 'Kaydediliyor…'
                : revisionOf
                  ? online
                    ? 'Değişiklikleri kaydet'
                    : 'Değişiklikleri kuyruğa al'
                  : online
                    ? 'Analizi başlat'
                    : 'Kuyruğa al'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
