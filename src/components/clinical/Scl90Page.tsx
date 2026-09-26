import { useEffect, useMemo, useState } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  SCL90_CRITICAL_ITEM_IDS,
  SCL90_DIMENSION_NAMES,
  SCL90_INSTRUMENT_VERSION,
  SCL90_ITEM_COUNT,
  createScl90Result,
  scl90ResponsesFromSlots,
  scoreScl90,
  type Scl90DimensionKey,
} from '../../clinical/scl90';
import {
  assessmentDraftIdentity,
  emptyAssessmentDraft,
  readAssessmentDraft,
  removeAssessmentDraft,
  writeAssessmentDraft,
  type AssessmentDraftSpec,
} from '../../clinical/assessmentDraft';
import { getClients, saveScl90Test } from '../../clinical/clinicalStore';
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

const DRAFT_SPEC: AssessmentDraftSpec = {
  instrumentVersion: SCL90_INSTRUMENT_VERSION,
  itemCount: SCL90_ITEM_COUNT,
  minScore: 0,
  maxScore: 4,
};

type SavedState = { id: string; fingerprint: string; revision: number };

function newResultId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `scl90_${token}`;
}

export function Scl90Page() {
  const clients = useMemo(() => getClients(), []);
  const initialDraft = useMemo(() => readAssessmentDraft(DRAFT_SPEC, assessmentDraftIdentity(''))
    ?? emptyAssessmentDraft(DRAFT_SPEC, assessmentDraftIdentity('')), []);

  const [selectedClientId, setSelectedClientId] = useState(initialDraft.clientId ?? '');
  const [draftAdministrationId, setDraftAdministrationId] = useState(initialDraft.administrationId);
  const [manualName, setManualName] = useState(initialDraft.manualName);
  const [manualGender, setManualGender] = useState<Gender | ''>(initialDraft.manualGender);
  const [manualAge, setManualAge] = useState(initialDraft.manualAge);
  const [testDate, setTestDate] = useState(initialDraft.testDate);
  const [answers, setAnswers] = useState<Array<number | null>>(initialDraft.answers);
  const [expertNote, setExpertNote] = useState(initialDraft.expertNote);
  const [pageIndex, setPageIndex] = useState(0);
  const [lastSaved, setLastSaved] = useState<SavedState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId), [clients, selectedClientId]);
  const activeIdentity = assessmentDraftIdentity(selectedClientId);
  const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : manualName.trim();
  const clientGender = selectedClient?.gender ?? manualGender;
  const clientAge = selectedClient ? ageFromBirthDate(selectedClient.birthDate, testDate) : parseOptionalAge(manualAge);
  const dateValid = isValidClinicDate(testDate);
  const responses = useMemo(() => scl90ResponsesFromSlots(answers), [answers]);
  const scoring = useMemo(() => scoreScl90(responses), [responses]);
  const answeredCount = scoring.validation.answeredCount;
  const completionPercent = Math.round((answeredCount / SCL90_ITEM_COUNT) * 100);
  const cloud = Boolean(cloudContext());

  function persistCurrentDraft() {
    writeAssessmentDraft(DRAFT_SPEC, {
      identityKey: activeIdentity,
      administrationId: draftAdministrationId,
      clientId: selectedClientId || undefined,
      manualName,
      manualGender,
      manualAge,
      testDate,
      answers,
      expertNote,
      functionalDifficulty: null,
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(persistCurrentDraft, 250);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdentity, answers, draftAdministrationId, expertNote, manualAge, manualGender, manualName, selectedClientId, testDate]);

  function restoreDraftFor(clientId: string) {
    persistCurrentDraft();
    const identity = assessmentDraftIdentity(clientId);
    const stored = readAssessmentDraft(DRAFT_SPEC, identity);
    const draft = stored ?? emptyAssessmentDraft(DRAFT_SPEC, identity, clientId || undefined);
    setSelectedClientId(clientId);
    setDraftAdministrationId(draft.administrationId);
    setAnswers(draft.answers);
    setTestDate(draft.testDate);
    setExpertNote(draft.expertNote);
    if (!clientId) {
      setManualName(draft.manualName);
      setManualGender(draft.manualGender);
      setManualAge(draft.manualAge);
    }
    setPageIndex(0);
    setLastSaved(null);
    setSaveError(null);
    setToast(stored ? 'Bu danışanın SCL-90-R sekme taslağı geri yüklendi.' : null);
  }

  function fingerprint(): string {
    return JSON.stringify({ instrument: SCL90_INSTRUMENT_VERSION, selectedClientId, clientName, clientGender, clientAge, testDate, responses, note: expertNote.trim() });
  }

  function handleSave() {
    setSaveError(null);
    setToast(null);
    if (cloud && !selectedClient) { setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.'); return; }
    if (!clientName) { setSaveError('Danışan adı gerekli.'); return; }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') { setSaveError('Mevcut kayıt modeli için cinsiyet alanını seçin.'); return; }
    if (clientAge === null) { setSaveError('Yaş girildiyse 0–120 arası tam sayı olmalı.'); return; }
    if (!dateValid) { setSaveError('Uygulama tarihi geçerli ve gelecekte olmayan bir tarih olmalı.'); return; }
    if (scoring.status !== 'complete') { setSaveError('90 maddenin tamamı 0–4 arası tam sayı ile aktarılmalıdır. Boş yanıt 0 sayılmaz.'); return; }

    const currentFingerprint = fingerprint();
    if (lastSaved?.fingerprint === currentFingerprint) {
      setToast('Bu uygulamanın aynı sürümü daha önce kaydedildi; yinelenen kayıt oluşturulmadı.');
      return;
    }
    const revision = lastSaved ? lastSaved.revision + 1 : 1;
    const result = createScl90Result(scoring, {
      id: newResultId(), clientId: selectedClientId || undefined, name: clientName,
      gender: clientGender, age: clientAge, testDate, expertNote, revision, revisionOf: lastSaved?.id,
    });
    try {
      saveScl90Test(result);
      setLastSaved({ id: result.id, fingerprint: currentFingerprint, revision });
      removeAssessmentDraft(DRAFT_SPEC, activeIdentity, draftAdministrationId);
      setToast(lastSaved
        ? `Düzeltme yeni revizyon olarak kaydedildi (revizyon ${revision}); önceki sonuç korunuyor.`
        : cloud ? 'Tamamlanan SCL-90-R uygulaması sunucuya gönderiliyor.' : 'Tamamlanan SCL-90-R uygulaması ayrı kayıt olarak kaydedildi.');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Sonuç saklanamadı; sekme taslağı korunuyor.');
    }
  }

  function startNewAdministration() {
    removeAssessmentDraft(DRAFT_SPEC, activeIdentity, draftAdministrationId);
    const fresh = emptyAssessmentDraft(DRAFT_SPEC, activeIdentity, selectedClientId || undefined);
    setDraftAdministrationId(fresh.administrationId);
    setAnswers(fresh.answers);
    setExpertNote('');
    setTestDate(fresh.testDate);
    setPageIndex(0);
    setLastSaved(null);
    setSaveError(null);
    setToast('Yeni ve bağımsız SCL-90-R uygulaması açıldı. Önceki kayıtlar değiştirilmedi.');
  }

  const missing = scoring.validation.missingItemIds.length ? scoring.validation.missingItemIds.join(', ') : '—';
  const pageStart = pageIndex * 10;
  const currentItemIds = Array.from({ length: Math.min(10, SCL90_ITEM_COUNT - pageStart) }, (_, index) => pageStart + index + 1);

  return (
    <div className="clinical-container bdi-workspace">
      <header className="bdi-page-head btn-print-hide">
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/testler')}><Icon name="left" size={14} /> Test bataryasına dön</button>
        <div className="bdi-page-heading"><span className="bdi-version-kicker">SCL-90-R® · DAĞ TÜRKÇE ÇALIŞMASI · LİSANSLI FORM</span><h1>Belirti profili yanıt aktarımı</h1><p>Yetkili formdaki 90 sayısal yanıtı aktarın; sonuç yalnız ham boyut ortalamaları ve global indeksleri içerir.</p></div>
        <dl className="bdi-identity-strip" aria-label="Ölçek kimliği"><div><dt>Sürüm</dt><dd>{SCL90_INSTRUMENT_VERSION}</dd></div><div><dt>Model</dt><dd>90 × 0–4 · 9 ham boyut</dd></div><div><dt>Norm</dt><dd>T-puanı / eşik üretilmez</dd></div></dl>
      </header>

      <AssessmentPaperSheet assessment="scl90" respondentName={clientName} date={testDate}
        items={Array.from({ length: SCL90_ITEM_COUNT }, (_, index) => ({ id: index + 1, text: '' }))}
        options={[0, 1, 2, 3, 4].map((score) => ({ score, label: 'Puan' }))} />
      <AssessmentResultPrintHeader assessment="scl90" respondentName={clientName} date={testDate}
        instrumentVersion={SCL90_INSTRUMENT_VERSION}
        demographics={`${clientGender === 'KADIN' ? 'Kadın' : clientGender === 'ERKEK' ? 'Erkek' : '—'} · ${clientAge ?? '—'} yaş`} />

      {saveError && <p className="record-lock-error btn-print-hide" role="alert">{saveError}</p>}
      {toast && <p className="bdi-save-notice btn-print-hide" role="status">{toast}</p>}

      <section className="bdi-flow-section btn-print-hide" aria-labelledby="scl-client-title"><div className="bdi-section-number" aria-hidden="true">01</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="scl-client-title">Danışan ve uygulama bilgileri</h2><p>Kayıtlı danışan seçildiğinde kimlik alanları dosyadan bağlanır.</p></div><span>Taslak bu sekmede otomatik korunur</span></div>
        <div className="bdi-demographic-grid">
          <label className="form-group">Kayıtlı danışan<select value={selectedClientId} onChange={(event) => restoreDraftFor(event.target.value)}><option value="">{cloud ? 'Danışan dosyası seçin' : 'Manuel uygulama'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName} ({client.fileNumber})</option>)}</select></label>
          <label className="form-group">Danışan adı soyadı<input value={clientName} onChange={(event) => setManualName(event.target.value)} readOnly={Boolean(selectedClient)} required /></label>
          <label className="form-group">Kayıt modelindeki cinsiyet<select value={clientGender} onChange={(event) => setManualGender(event.target.value === 'KADIN' || event.target.value === 'ERKEK' ? event.target.value : '')} disabled={Boolean(selectedClient)} required><option value="">Seçin</option><option value="KADIN">Kadın</option><option value="ERKEK">Erkek</option></select></label>
          <label className="form-group">Uygulama tarihindeki yaş<input type="number" min={0} max={120} value={selectedClient ? (clientAge ?? '') : manualAge} onChange={(event) => setManualAge(event.target.value)} readOnly={Boolean(selectedClient)} placeholder="İsteğe bağlı" /></label>
          <label className="form-group">Uygulama tarihi<input type="date" max={clinicToday()} value={testDate} onChange={(event) => setTestDate(event.target.value)} required aria-invalid={!dateValid} /><small>{dateValid ? `${formatClinicDate(testDate)} · Europe/Istanbul` : 'Geçerli bir tarih girin.'}</small></label>
        </div>
      </div></section>

      <AssessmentLegalNotice assessment="scl90" />

      <section className="bdi-flow-section bdi-items-section btn-print-hide" aria-labelledby="scl-items-title"><div className="bdi-section-number" aria-hidden="true">02</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="scl-items-title">Sayısal yanıtları aktarın</h2><p>Yetkili formdaki her madde için 0–4 puanını girin. Kritik bayraklar risk düzeyi veya tanı değildir.</p></div><strong className="bdi-progress-count" aria-live="polite">{answeredCount} / {SCL90_ITEM_COUNT}</strong></div>
        <div className="bdi-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={SCL90_ITEM_COUNT} aria-valuenow={answeredCount} aria-label="Tamamlanan madde sayısı"><span style={{ width: `${completionPercent}%` }} /></div>
        <div className="scl-question-pagination"><h3>Maddeler ({pageStart + 1}–{Math.min(SCL90_ITEM_COUNT, pageStart + 10)} / {SCL90_ITEM_COUNT})</h3><div className="scl-page-buttons" role="group" aria-label="Madde sayfaları">{Array.from({ length: 9 }, (_, index) => <button key={index} type="button" className={`btn-secondary btn-sm ${pageIndex === index ? 'active' : ''}`} aria-label={`${index + 1}. sayfa`} aria-current={pageIndex === index ? 'page' : undefined} onClick={() => setPageIndex(index)}>{index + 1}</button>)}</div></div>
        <div className="bdi-item-list">{currentItemIds.map((itemId) => {
          const index = itemId - 1;
          const selected = answers[index];
          const isCritical = (SCL90_CRITICAL_ITEM_IDS as readonly number[]).includes(itemId);
          return <fieldset key={itemId} className={`bdi-item-row${selected !== null ? ' is-answered' : ''}${isCritical && (selected ?? 0) > 0 ? ' is-critical' : ''}`}><legend><span>Madde {itemId}</span>{isCritical && <small>Güvenlik açısından ayrıca gözden geçirilir</small>}</legend><div className="bdi-score-options">{[0, 1, 2, 3, 4].map((score) => <label key={score} className={selected === score ? 'is-selected' : ''}><input type="radio" name={`scl-item-${itemId}`} value={score} checked={selected === score} onChange={() => { setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? score : answer)); setSaveError(null); }} /><span>{score}</span><small>Puan</small></label>)}</div></fieldset>;
        })}</div>
        <div className="scl-page-stepper"><button type="button" className="btn-secondary" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))}><Icon name="left" size={16} /> Önceki 10 madde</button><button type="button" className="btn-secondary" disabled={pageIndex === 8} onClick={() => setPageIndex((value) => Math.min(8, value + 1))}>Sonraki 10 madde <Icon name="right" size={16} /></button></div>
      </div></section>

      <section className="bdi-flow-section bdi-result-section" aria-labelledby="scl-result-title"><div className="bdi-section-number btn-print-hide" aria-hidden="true">03</div><div className="bdi-section-content">
        <div className="bdi-section-head"><div><h2 id="scl-result-title">Ham sonuç özeti</h2><p>İndeksler yalnız 90 geçerli yanıt tamamlandığında üretilir; norm veya klinik eşik uygulanmaz.</p></div><span className={`bdi-completion-state ${scoring.status === 'complete' ? 'is-complete' : ''}`}>{scoring.status === 'complete' ? 'Tamamlandı' : 'Tamamlanmadı'}</span></div>
        {scoring.status === 'complete' ? <div className="bdi-result-content">
          <div className="bdi-total-score"><span>Ham Genel Semptom İndeksi</span><strong>{scoring.gsi}<small> / 4.00</small></strong><p>Norm karşılaştırması yok</p></div>
          <div className="bdi-result-facts"><div><span>PST</span><strong>{scoring.pst} / 90</strong></div><div><span>PSDI</span><strong>{scoring.psdi}</strong></div><div><span>Sürüm</span><strong>{SCL90_INSTRUMENT_VERSION}</strong></div></div>
          <div className="scl-bar-grid">{(Object.keys(scoring.dimensionScores) as Scl90DimensionKey[]).map((key) => { const score = scoring.dimensionScores[key]; const meta = SCL90_DIMENSION_NAMES[key]; return <div key={key} className="scl-bar-item"><div className="scl-bar-header"><strong>{meta.tr} ({meta.abbr})</strong><span>{score} / 4.00</span></div><div className="scl-bar-track"><div className="scl-bar-fill" style={{ width: `${(score / 4) * 100}%` }} /></div></div>; })}</div>
          {scoring.criticalItemFlags.length > 0 && <div className="bdi-critical-notice" role="alert"><Icon name="alert" size={19} /><div><strong>Kritik yanıt bayrağı oluştu</strong><p>{scoring.criticalItemFlags.join(', ')}. Bayrak toplamdan bağımsız klinik görüşme gerektirebilir; sistem risk yüzdesi, risk düzeyi veya tanı üretmez.</p></div></div>}
          <div className="assessment-result-note"><strong>Otomatik özet:</strong> GSI {scoring.gsi}, PST {scoring.pst}, PSDI {scoring.psdi}. Bunlar ham indekslerdir; Türkçe norm, T-puanı veya klinik eşik uygulanmamıştır.</div>
          {expertNote.trim() && <div className="bdi-print-expert-note"><strong>Uzman notu</strong><p>{expertNote.trim()}</p></div>}
        </div> : <div className="bdi-incomplete-result" role="status"><strong>Henüz sonuç üretilmedi</strong><p>{answeredCount} madde tamamlandı. Eksik maddeler: {missing}. Boş yanıtlar sıfır kabul edilmez.</p></div>}
        <label className="form-group bdi-expert-note btn-print-hide">Uzman notu<textarea value={expertNote} onChange={(event) => setExpertNote(event.target.value)} rows={4} maxLength={5000} placeholder="Norm iddiası veya otomatik tanı yerine kendi klinik değerlendirmenizi yazın." /></label>
        <div className="bdi-actions btn-print-hide"><button type="button" className="btn-secondary" onClick={() => printAssessmentPaper('scl90')}><Icon name="fileText" size={16} /> Yanıt aktarım çizelgesi / PDF</button><button type="button" className="btn-secondary" disabled={scoring.status !== 'complete'} onClick={() => printAssessmentResult('scl90')}><Icon name="print" size={16} /> Sonuç özeti / PDF</button><button type="button" className="btn-primary" disabled={scoring.status !== 'complete'} onClick={handleSave}><Icon name="save" size={16} /> Sonucu kaydet</button>{lastSaved && <button type="button" className="btn-secondary" onClick={startNewAdministration}>Yeni uygulama</button>}</div>
      </div></section>
    </div>
  );
}
