import { useEffect, useMemo, useState } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  GAD7_INSTRUMENT_VERSION,
  GAD7_ITEM_COUNT,
  GAD7_MAX_TOTAL,
  GAD7_TURKISH_SCREENING_THRESHOLD,
  PHQ9_CRITICAL_ITEM_ID,
  PHQ9_INSTRUMENT_VERSION,
  PHQ9_ITEM_COUNT,
  PHQ9_MAX_TOTAL,
  createRapidScreeningResult,
  rapidResponsesFromSlots,
  scoreGad7,
  scorePhq9,
  type RapidScreeningType,
} from '../../clinical/rapidScreening';
import {
  assessmentDraftIdentity,
  emptyAssessmentDraft,
  readAssessmentDraft,
  removeAssessmentDraft,
  writeAssessmentDraft,
  type AssessmentDraft,
  type AssessmentDraftSpec,
} from '../../clinical/assessmentDraft';
import { getClients } from '../../clinical/clinicalStore';
import { saveScreening } from '../../clinical/practiceStore';
import { ageFromBirthDate, clinicToday, formatClinicDate, isValidClinicDate } from '../../clinical/recordRules';
import { cloudContext } from '../../clinical/cloud/sync';
import { parseOptionalAge } from '../../clinical/scaleIntake';
import { Icon } from '../Icon';
import { navigate } from '../../router';
import {
  AssessmentLegalNotice,
  AssessmentPaperSheet,
  AssessmentResultPrintHeader,
  printAssessmentPaper,
  printAssessmentResult,
} from './AssessmentPrint';

const DRAFT_SPECS: Record<RapidScreeningType, AssessmentDraftSpec> = {
  gad7: { instrumentVersion: GAD7_INSTRUMENT_VERSION, itemCount: GAD7_ITEM_COUNT, minScore: 0, maxScore: 3 },
  phq9: { instrumentVersion: PHQ9_INSTRUMENT_VERSION, itemCount: PHQ9_ITEM_COUNT, minScore: 0, maxScore: 3 },
};

type SavedState = { id: string; fingerprint: string; revision: number };

function newResultId(type: RapidScreeningType): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `${type}_${token}`;
}

export function RapidScreeningPage() {
  const clients = useMemo(() => getClients(), []);
  const initialDraft = useMemo(() => readAssessmentDraft(DRAFT_SPECS.gad7, assessmentDraftIdentity(''))
    ?? emptyAssessmentDraft(DRAFT_SPECS.gad7, assessmentDraftIdentity('')), []);
  const [activeTool, setActiveTool] = useState<RapidScreeningType>('gad7');
  const [selectedClientId, setSelectedClientId] = useState(initialDraft.clientId ?? '');
  const [draftAdministrationId, setDraftAdministrationId] = useState(initialDraft.administrationId);
  const [manualName, setManualName] = useState(initialDraft.manualName);
  const [manualGender, setManualGender] = useState<Gender | ''>(initialDraft.manualGender);
  const [manualAge, setManualAge] = useState(initialDraft.manualAge);
  const [testDate, setTestDate] = useState(initialDraft.testDate);
  const [answers, setAnswers] = useState<Array<number | null>>(initialDraft.answers);
  const [expertNote, setExpertNote] = useState(initialDraft.expertNote);
  const [functionalDifficulty, setFunctionalDifficulty] = useState<number | null>(initialDraft.functionalDifficulty);
  const [savedStates, setSavedStates] = useState<Record<string, SavedState>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const spec = DRAFT_SPECS[activeTool];
  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId), [clients, selectedClientId]);
  const activeIdentity = assessmentDraftIdentity(selectedClientId);
  const savedKey = `${activeTool}:${activeIdentity}`;
  const lastSaved = savedStates[savedKey] ?? null;
  const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : manualName.trim();
  const clientGender = selectedClient?.gender ?? manualGender;
  const clientAge = selectedClient ? ageFromBirthDate(selectedClient.birthDate, testDate) : parseOptionalAge(manualAge);
  const dateValid = isValidClinicDate(testDate);
  const responses = useMemo(() => rapidResponsesFromSlots(answers), [answers]);
  const scoring = useMemo(() => activeTool === 'gad7' ? scoreGad7(responses) : scorePhq9(responses), [activeTool, responses]);
  const itemCount = activeTool === 'gad7' ? GAD7_ITEM_COUNT : PHQ9_ITEM_COUNT;
  const maximumScore = activeTool === 'gad7' ? GAD7_MAX_TOTAL : PHQ9_MAX_TOTAL;
  const instrumentVersion = activeTool === 'gad7' ? GAD7_INSTRUMENT_VERSION : PHQ9_INSTRUMENT_VERSION;
  const answeredCount = scoring.validation.answeredCount;
  const completionPercent = Math.round((answeredCount / itemCount) * 100);
  const cloud = Boolean(cloudContext());

  function persistCurrentDraft() {
    writeAssessmentDraft(spec, {
      identityKey: activeIdentity,
      administrationId: draftAdministrationId,
      clientId: selectedClientId || undefined,
      manualName,
      manualGender,
      manualAge,
      testDate,
      answers,
      expertNote,
      functionalDifficulty,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(persistCurrentDraft, 250);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, activeTool, answers, draftAdministrationId, expertNote, functionalDifficulty, manualAge, manualGender, manualName, selectedClientId, testDate]);

  function applyDraft(draft: AssessmentDraft, clientId: string) {
    setSelectedClientId(clientId);
    setDraftAdministrationId(draft.administrationId);
    setAnswers(draft.answers);
    setTestDate(draft.testDate);
    setExpertNote(draft.expertNote);
    setFunctionalDifficulty(draft.functionalDifficulty);
    if (!clientId) {
      setManualName(draft.manualName);
      setManualGender(draft.manualGender);
      setManualAge(draft.manualAge);
    }
  }

  function loadDraft(tool: RapidScreeningType, clientId: string): AssessmentDraft {
    const nextSpec = DRAFT_SPECS[tool];
    const identity = assessmentDraftIdentity(clientId);
    return readAssessmentDraft(nextSpec, identity) ?? emptyAssessmentDraft(nextSpec, identity, clientId || undefined);
  }

  function switchTool(tool: RapidScreeningType) {
    if (tool === activeTool) return;
    persistCurrentDraft();
    const stored = readAssessmentDraft(DRAFT_SPECS[tool], assessmentDraftIdentity(selectedClientId));
    const draft = stored ?? emptyAssessmentDraft(DRAFT_SPECS[tool], assessmentDraftIdentity(selectedClientId), selectedClientId || undefined);
    setActiveTool(tool);
    applyDraft(draft, selectedClientId);
    setSaveError(null);
    setToast(stored ? `${tool.toUpperCase()} sekme taslağı geri yüklendi.` : null);
  }

  function switchClient(clientId: string) {
    persistCurrentDraft();
    const stored = readAssessmentDraft(spec, assessmentDraftIdentity(clientId));
    const draft = stored ?? loadDraft(activeTool, clientId);
    applyDraft(draft, clientId);
    setSaveError(null);
    setToast(stored ? 'Bu danışanın tarama taslağı geri yüklendi.' : null);
  }

  function fingerprint(): string {
    return JSON.stringify({ instrument: instrumentVersion, selectedClientId, clientName, clientGender, clientAge, testDate, responses, functionalDifficulty: activeTool === 'phq9' ? functionalDifficulty : null, note: expertNote.trim() });
  }

  function handleSave() {
    setSaveError(null);
    setToast(null);
    if (cloud && !selectedClient) { setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.'); return; }
    if (!clientName) { setSaveError('Danışan adı gerekli.'); return; }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') { setSaveError('Mevcut kayıt modeli için cinsiyet alanını seçin.'); return; }
    if (clientAge === null) { setSaveError('Yaş girildiyse 0–120 arası tam sayı olmalı.'); return; }
    if (!dateValid) { setSaveError('Uygulama tarihi geçerli ve gelecekte olmayan bir tarih olmalı.'); return; }
    if (scoring.status !== 'complete') { setSaveError(`${itemCount} maddenin tamamı 0–3 arası tam sayı ile aktarılmalıdır. Boş yanıt 0 sayılmaz.`); return; }

    const currentFingerprint = fingerprint();
    if (lastSaved?.fingerprint === currentFingerprint) {
      setToast('Bu uygulamanın aynı sürümü daha önce kaydedildi; yinelenen kayıt oluşturulmadı.');
      return;
    }
    const revision = lastSaved ? lastSaved.revision + 1 : 1;
    const result = createRapidScreeningResult(scoring, {
      id: newResultId(activeTool), clientId: selectedClientId || undefined, name: clientName,
      gender: clientGender, age: clientAge, testDate, expertNote,
      functionalDifficulty: activeTool === 'phq9' ? functionalDifficulty ?? undefined : undefined,
      revision, revisionOf: lastSaved?.id,
    });
    try {
      saveScreening(result);
      setSavedStates((current) => ({ ...current, [savedKey]: { id: result.id, fingerprint: currentFingerprint, revision } }));
      removeAssessmentDraft(spec, activeIdentity, draftAdministrationId);
      setToast(lastSaved
        ? `Düzeltme yeni revizyon olarak kaydedildi (revizyon ${revision}); önceki sonuç korunuyor.`
        : cloud ? `Tamamlanan ${activeTool.toUpperCase()} uygulaması sunucuya gönderiliyor.` : `Tamamlanan ${activeTool.toUpperCase()} uygulaması ayrı kayıt olarak kaydedildi.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Sonuç saklanamadı; sekme taslağı korunuyor.');
    }
  }

  function startNewAdministration() {
    removeAssessmentDraft(spec, activeIdentity, draftAdministrationId);
    const fresh = emptyAssessmentDraft(spec, activeIdentity, selectedClientId || undefined);
    applyDraft(fresh, selectedClientId);
    setSavedStates((current) => { const next = { ...current }; delete next[savedKey]; return next; });
    setSaveError(null);
    setToast(`Yeni ve bağımsız ${activeTool.toUpperCase()} uygulaması açıldı. Önceki kayıtlar değiştirilmedi.`);
  }

  const missing = scoring.validation.missingItemIds.length ? scoring.validation.missingItemIds.join(', ') : '—';

  return (
    <div className="clinical-container bdi-workspace">
      <header className="bdi-page-head btn-print-hide">
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/testler')}><Icon name="left" size={14} /> Test bataryasına dön</button>
        <div className="bdi-page-heading"><span className="bdi-version-kicker">GAD-7 · PHQ-9 · SON 2 HAFTA</span><h1>Kısa tarama puanı aktarımı</h1><p>Doğrulanmış Türkçe formdaki sayısal yanıtları araca özgü puanlama ile kaydedin. Sonuçlar tanı veya tedavi kararı değildir.</p></div>
        <dl className="bdi-identity-strip" aria-label="Aktif ölçek kimliği"><div><dt>Araç</dt><dd>{activeTool.toUpperCase()}</dd></div><div><dt>Sürüm</dt><dd>{instrumentVersion}</dd></div><div><dt>Model</dt><dd>{itemCount} × 0–3 · toplam puan</dd></div></dl>
      </header>

      <AssessmentPaperSheet assessment={activeTool} respondentName={clientName} date={testDate}
        items={Array.from({ length: itemCount }, (_, index) => ({ id: index + 1, text: '' }))}
        options={[0, 1, 2, 3].map((score) => ({ score, label: 'Puan' }))} />
      <AssessmentResultPrintHeader assessment={activeTool} respondentName={clientName} date={testDate}
        instrumentVersion={instrumentVersion}
        demographics={`${clientGender === 'KADIN' ? 'Kadın' : clientGender === 'ERKEK' ? 'Erkek' : '—'} · ${clientAge ?? '—'} yaş`} />

      {saveError && <p className="record-lock-error btn-print-hide" role="alert">{saveError}</p>}
      {toast && <p className="bdi-save-notice btn-print-hide" role="status">{toast}</p>}

      <div className="clinical-tabs btn-print-hide" role="tablist" aria-label="Tarama aracı">
        <button type="button" role="tab" aria-selected={activeTool === 'gad7'} className={`clinical-tab-btn ${activeTool === 'gad7' ? 'active' : ''}`} onClick={() => switchTool('gad7')}><span>GAD-7 · 7 madde</span></button>
        <button type="button" role="tab" aria-selected={activeTool === 'phq9'} className={`clinical-tab-btn ${activeTool === 'phq9' ? 'active' : ''}`} onClick={() => switchTool('phq9')}><span>PHQ-9 · 9 madde</span></button>
      </div>

      <section className="bdi-flow-section btn-print-hide" aria-labelledby="rapid-client-title"><div className="bdi-section-number" aria-hidden="true">01</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="rapid-client-title">Danışan ve uygulama bilgileri</h2><p>Her araç ve danışan için ayrı uygulama taslağı korunur.</p></div><span>Taslak bu sekmede otomatik korunur</span></div>
        <div className="bdi-demographic-grid">
          <label className="form-group">Kayıtlı danışan<select value={selectedClientId} onChange={(event) => switchClient(event.target.value)}><option value="">{cloud ? 'Danışan dosyası seçin' : 'Manuel uygulama'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName} ({client.fileNumber})</option>)}</select></label>
          <label className="form-group">Danışan adı soyadı<input value={clientName} onChange={(event) => setManualName(event.target.value)} readOnly={Boolean(selectedClient)} required /></label>
          <label className="form-group">Kayıt modelindeki cinsiyet<select value={clientGender} onChange={(event) => setManualGender(event.target.value === 'KADIN' || event.target.value === 'ERKEK' ? event.target.value : '')} disabled={Boolean(selectedClient)} required><option value="">Seçin</option><option value="KADIN">Kadın</option><option value="ERKEK">Erkek</option></select></label>
          <label className="form-group">Uygulama tarihindeki yaş<input type="number" min={0} max={120} value={selectedClient ? (clientAge ?? '') : manualAge} onChange={(event) => setManualAge(event.target.value)} readOnly={Boolean(selectedClient)} placeholder="İsteğe bağlı" /></label>
          <label className="form-group">Uygulama tarihi<input type="date" max={clinicToday()} value={testDate} onChange={(event) => setTestDate(event.target.value)} required aria-invalid={!dateValid} /><small>{dateValid ? `${formatClinicDate(testDate)} · Europe/Istanbul` : 'Geçerli bir tarih girin.'}</small></label>
        </div>
      </div></section>

      <AssessmentLegalNotice assessment={activeTool} />

      <section className="bdi-flow-section bdi-items-section btn-print-hide" aria-labelledby="rapid-items-title"><div className="bdi-section-number" aria-hidden="true">02</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="rapid-items-title">{activeTool.toUpperCase()} sayısal yanıtlarını aktarın</h2><p>Doğrulanmış Türkçe formdaki her madde için 0–3 kodunu girin. Metin eşliği doğrulanana kadar madde ifadeleri burada yayımlanmaz.</p></div><strong className="bdi-progress-count" aria-live="polite">{answeredCount} / {itemCount}</strong></div>
        <div className="bdi-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={itemCount} aria-valuenow={answeredCount} aria-label="Tamamlanan madde sayısı"><span style={{ width: `${completionPercent}%` }} /></div>
        <div className="bdi-item-list">{Array.from({ length: itemCount }, (_, index) => {
          const itemId = index + 1;
          const selected = answers[index];
          const critical = activeTool === 'phq9' && itemId === PHQ9_CRITICAL_ITEM_ID;
          return <fieldset key={itemId} className={`bdi-item-row${selected !== null ? ' is-answered' : ''}${critical && (selected ?? 0) > 0 ? ' is-critical' : ''}`}><legend><span>Madde {itemId}</span>{critical && <small>Toplam puandan bağımsız değerlendirilir</small>}</legend><div className="bdi-score-options">{[0, 1, 2, 3].map((score) => <label key={score} className={selected === score ? 'is-selected' : ''}><input type="radio" name={`${activeTool}-item-${itemId}`} value={score} checked={selected === score} onChange={() => { setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? score : answer)); setSaveError(null); }} /><span>{score}</span><small>Kod</small></label>)}</div></fieldset>;
        })}</div>
        {activeTool === 'phq9' && <label className="form-group" style={{ marginTop: 16 }}>Puanlanmayan işlevsellik sorusunun kodu (isteğe bağlı)<select value={functionalDifficulty ?? ''} onChange={(event) => setFunctionalDifficulty(event.target.value === '' ? null : Number(event.target.value))}><option value="">Aktarılmadı</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select><small>Resmî formdaki işlevsellik yanıtını 0–3 olarak aktarır; PHQ-9 toplamına eklenmez.</small></label>}
      </div></section>

      <section className="bdi-flow-section bdi-result-section" aria-labelledby="rapid-result-title"><div className="bdi-section-number btn-print-hide" aria-hidden="true">03</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="rapid-result-title">Sonuç özeti</h2><p>Toplam puan yalnız bütün maddeler tamamlandığında üretilir.</p></div><span className={`bdi-completion-state ${scoring.status === 'complete' ? 'is-complete' : ''}`}>{scoring.status === 'complete' ? 'Tamamlandı' : 'Tamamlanmadı'}</span></div>
        {scoring.status === 'complete' ? <div className="bdi-result-content">
          <div className="bdi-total-score"><span>{activeTool.toUpperCase()} toplam puanı</span><strong>{scoring.totalScore}<small> / {maximumScore}</small></strong><p>{scoring.scoreBand}</p></div>
          <div className="bdi-result-facts"><div><span>Ölçek/sürüm</span><strong>{instrumentVersion}</strong></div>{scoring.type === 'gad7' ? <div><span>Türkçe klinik örneklem referansı</span><strong>{GAD7_TURKISH_SCREENING_THRESHOLD} puan · tanı değil</strong></div> : <div><span>Türkçe tanısal eşik</span><strong>Doğrulanmadı / uygulanmadı</strong></div>}<div><span>Uygulama</span><strong>{formatClinicDate(testDate)}</strong></div></div>
          {scoring.type === 'phq9' && scoring.criticalItemEndorsed && <div className="bdi-critical-notice" role="alert"><Icon name="alert" size={19} /><div><strong>Madde 9 işaretlendi</strong><p>Aktarılan kod {scoring.criticalItemScore}. Bu yanıt toplam puandan bağımsız klinik görüşme gerektirebilir. Sistem risk yüzdesi, risk düzeyi veya tanı üretmez.</p></div></div>}
          <div className="bdi-response-summary" aria-label="Madde puanı özeti">{scoring.responses.map((response) => <span key={response.itemId}><b>{response.itemId}</b>{response.score}</span>)}</div>
          <div className="assessment-result-note"><strong>Otomatik özet:</strong> {activeTool.toUpperCase()} toplam puanı {scoring.totalScore}/{maximumScore}. {scoring.scoreBand}. Sonuç tek başına tanı veya tedavi kararı değildir.</div>
          {expertNote.trim() && <div className="bdi-print-expert-note"><strong>Uzman notu</strong><p>{expertNote.trim()}</p></div>}
        </div> : <div className="bdi-incomplete-result" role="status"><strong>Henüz sonuç üretilmedi</strong><p>{answeredCount} madde tamamlandı. Eksik maddeler: {missing}. Boş yanıtlar sıfır kabul edilmez.</p></div>}
        <label className="form-group bdi-expert-note btn-print-hide">Uzman notu<textarea value={expertNote} onChange={(event) => setExpertNote(event.target.value)} rows={4} maxLength={5000} placeholder="Otomatik tanı yerine kendi klinik değerlendirmenizi yazın." /></label>
        <div className="bdi-actions btn-print-hide"><button type="button" className="btn-secondary" onClick={() => printAssessmentPaper(activeTool)}><Icon name="fileText" size={16} /> Yanıt aktarım çizelgesi / PDF</button><button type="button" className="btn-secondary" disabled={scoring.status !== 'complete'} onClick={() => printAssessmentResult(activeTool)}><Icon name="print" size={16} /> Sonuç özeti / PDF</button><button type="button" className="btn-primary" disabled={scoring.status !== 'complete'} onClick={handleSave}><Icon name="save" size={16} /> Sonucu kaydet</button>{lastSaved && <button type="button" className="btn-secondary" onClick={startNewAdministration}>Yeni uygulama</button>}</div>
      </div></section>
    </div>
  );
}
