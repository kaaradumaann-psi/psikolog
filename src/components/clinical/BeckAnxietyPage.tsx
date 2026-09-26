import { useEffect, useMemo, useState } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  BAI_INSTRUMENT_VERSION,
  BAI_ITEM_COUNT,
  BAI_MAX_TOTAL,
  beckAnxietyResponsesFromSlots,
  createBeckAnxietyResult,
  scoreBeckAnxiety,
} from '../../clinical/beckAnxiety';
import {
  assessmentDraftIdentity,
  emptyAssessmentDraft,
  readAssessmentDraft,
  removeAssessmentDraft,
  writeAssessmentDraft,
  type AssessmentDraftSpec,
} from '../../clinical/assessmentDraft';
import { getClients, saveBeckAnxietyTest } from '../../clinical/clinicalStore';
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
  instrumentVersion: BAI_INSTRUMENT_VERSION,
  itemCount: BAI_ITEM_COUNT,
  minScore: 0,
  maxScore: 3,
};

type SavedState = { id: string; fingerprint: string; revision: number };

function newResultId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `bai_${token}`;
}

export function BeckAnxietyPage() {
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
  const [lastSaved, setLastSaved] = useState<SavedState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId), [clients, selectedClientId]);
  const activeIdentity = assessmentDraftIdentity(selectedClientId);
  const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : manualName.trim();
  const clientGender = selectedClient?.gender ?? manualGender;
  const clientAge = selectedClient ? ageFromBirthDate(selectedClient.birthDate, testDate) : parseOptionalAge(manualAge);
  const dateValid = isValidClinicDate(testDate);
  const responses = useMemo(() => beckAnxietyResponsesFromSlots(answers), [answers]);
  const scoring = useMemo(() => scoreBeckAnxiety(responses), [responses]);
  const answeredCount = scoring.validation.answeredCount;
  const completionPercent = Math.round((answeredCount / BAI_ITEM_COUNT) * 100);
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
    setLastSaved(null);
    setSaveError(null);
    setToast(stored ? 'Bu danışanın BAI sekme taslağı geri yüklendi.' : null);
  }

  function fingerprint(): string {
    return JSON.stringify({ instrument: BAI_INSTRUMENT_VERSION, selectedClientId, clientName, clientGender, clientAge, testDate, responses, note: expertNote.trim() });
  }

  function handleSave() {
    setSaveError(null);
    setToast(null);
    if (cloud && !selectedClient) { setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.'); return; }
    if (!clientName) { setSaveError('Danışan adı gerekli.'); return; }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') { setSaveError('Mevcut kayıt modeli için cinsiyet alanını seçin.'); return; }
    if (clientAge === null) { setSaveError('Yaş girildiyse 0–120 arası tam sayı olmalı.'); return; }
    if (!dateValid) { setSaveError('Uygulama tarihi geçerli ve gelecekte olmayan bir tarih olmalı.'); return; }
    if (scoring.status !== 'complete') { setSaveError('21 maddenin tamamı 0–3 arası tam sayı ile aktarılmalıdır. Boş yanıt 0 sayılmaz.'); return; }

    const currentFingerprint = fingerprint();
    if (lastSaved?.fingerprint === currentFingerprint) {
      setToast('Bu uygulamanın aynı sürümü daha önce kaydedildi; yinelenen kayıt oluşturulmadı.');
      return;
    }
    const revision = lastSaved ? lastSaved.revision + 1 : 1;
    const result = createBeckAnxietyResult(scoring, {
      id: newResultId(),
      clientId: selectedClientId || undefined,
      name: clientName,
      gender: clientGender,
      age: clientAge,
      testDate,
      expertNote,
      revision,
      revisionOf: lastSaved?.id,
    });
    try {
      saveBeckAnxietyTest(result);
      setLastSaved({ id: result.id, fingerprint: currentFingerprint, revision });
      removeAssessmentDraft(DRAFT_SPEC, activeIdentity, draftAdministrationId);
      setToast(lastSaved
        ? `Düzeltme yeni revizyon olarak kaydedildi (revizyon ${revision}); önceki sonuç korunuyor.`
        : cloud ? 'Tamamlanan BAI uygulaması sunucuya gönderiliyor.' : 'Tamamlanan BAI uygulaması ayrı kayıt olarak kaydedildi.');
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
    setLastSaved(null);
    setSaveError(null);
    setToast('Yeni ve bağımsız BAI uygulaması açıldı. Önceki kayıtlar değiştirilmedi.');
  }

  const missing = scoring.validation.missingItemIds.length ? scoring.validation.missingItemIds.join(', ') : '—';

  return (
    <div className="clinical-container bdi-workspace">
      <header className="bdi-page-head btn-print-hide">
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/testler')}><Icon name="left" size={14} /> Test bataryasına dön</button>
        <div className="bdi-page-heading">
          <span className="bdi-version-kicker">BAI · ULUSOY TÜRKÇE UYARLAMASI · LİSANSLI FORM</span>
          <h1>Anksiyete belirti puanı aktarımı</h1>
          <p>Yetkili BAI formundaki 21 sayısal yanıtı aktarın; uygulama korunan madde veya yanıt metnini yayımlamaz.</p>
        </div>
        <dl className="bdi-identity-strip" aria-label="Ölçek kimliği">
          <div><dt>Sürüm</dt><dd>{BAI_INSTRUMENT_VERSION}</dd></div>
          <div><dt>Model</dt><dd>21 × 0–3 · yalnız toplam puan</dd></div>
          <div><dt>Norm</dt><dd>El kitabı bantları · tanı değil</dd></div>
        </dl>
      </header>

      <AssessmentPaperSheet assessment="bai" respondentName={clientName} date={testDate}
        items={Array.from({ length: BAI_ITEM_COUNT }, (_, index) => ({ id: index + 1, text: '' }))}
        options={[0, 1, 2, 3].map((score) => ({ score, label: 'Puan' }))} />
      <AssessmentResultPrintHeader assessment="bai" respondentName={clientName} date={testDate}
        instrumentVersion={BAI_INSTRUMENT_VERSION}
        demographics={`${clientGender === 'KADIN' ? 'Kadın' : clientGender === 'ERKEK' ? 'Erkek' : '—'} · ${clientAge ?? '—'} yaş`} />

      {saveError && <p className="record-lock-error btn-print-hide" role="alert">{saveError}</p>}
      {toast && <p className="bdi-save-notice btn-print-hide" role="status">{toast}</p>}

      <section className="bdi-flow-section btn-print-hide" aria-labelledby="bai-client-title">
        <div className="bdi-section-number" aria-hidden="true">01</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head"><div><h2 id="bai-client-title">Danışan ve uygulama bilgileri</h2><p>Kayıtlı danışan seçildiğinde kimlik alanları dosyadan bağlanır.</p></div><span>Taslak bu sekmede otomatik korunur</span></div>
          <div className="bdi-demographic-grid">
            <label className="form-group">Kayıtlı danışan<select value={selectedClientId} onChange={(event) => restoreDraftFor(event.target.value)}><option value="">{cloud ? 'Danışan dosyası seçin' : 'Manuel uygulama'}</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName} ({client.fileNumber})</option>)}</select></label>
            <label className="form-group">Danışan adı soyadı<input value={clientName} onChange={(event) => setManualName(event.target.value)} readOnly={Boolean(selectedClient)} required /></label>
            <label className="form-group">Kayıt modelindeki cinsiyet<select value={clientGender} onChange={(event) => setManualGender(event.target.value === 'KADIN' || event.target.value === 'ERKEK' ? event.target.value : '')} disabled={Boolean(selectedClient)} required><option value="">Seçin</option><option value="KADIN">Kadın</option><option value="ERKEK">Erkek</option></select></label>
            <label className="form-group">Uygulama tarihindeki yaş<input type="number" min={0} max={120} value={selectedClient ? (clientAge ?? '') : manualAge} onChange={(event) => setManualAge(event.target.value)} readOnly={Boolean(selectedClient)} placeholder="İsteğe bağlı" /></label>
            <label className="form-group">Uygulama tarihi<input type="date" max={clinicToday()} value={testDate} onChange={(event) => setTestDate(event.target.value)} required aria-invalid={!dateValid} /><small>{dateValid ? `${formatClinicDate(testDate)} · Europe/Istanbul` : 'Geçerli bir tarih girin.'}</small></label>
          </div>
        </div>
      </section>

      <AssessmentLegalNotice assessment="bai" />

      <section className="bdi-flow-section bdi-items-section btn-print-hide" aria-labelledby="bai-items-title">
        <div className="bdi-section-number" aria-hidden="true">02</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head"><div><h2 id="bai-items-title">Sayısal yanıtları aktarın</h2><p>Yetkili formdaki her madde için yalnız 0–3 puanını girin. Alt ölçek üretilmez.</p></div><strong className="bdi-progress-count" aria-live="polite">{answeredCount} / {BAI_ITEM_COUNT}</strong></div>
          <div className="bdi-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={BAI_ITEM_COUNT} aria-valuenow={answeredCount} aria-label="Tamamlanan madde sayısı"><span style={{ width: `${completionPercent}%` }} /></div>
          <div className="bdi-item-list">
            {Array.from({ length: BAI_ITEM_COUNT }, (_, index) => {
              const itemId = index + 1;
              const selected = answers[index];
              return <fieldset key={itemId} className={`bdi-item-row${selected !== null ? ' is-answered' : ''}`}><legend><span>Madde {itemId}</span></legend><div className="bdi-score-options">{[0, 1, 2, 3].map((score) => <label key={score} className={selected === score ? 'is-selected' : ''}><input type="radio" name={`bai-item-${itemId}`} value={score} checked={selected === score} onChange={() => { setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? score : answer)); setSaveError(null); }} /><span>{score}</span><small>Puan</small></label>)}</div></fieldset>;
            })}
          </div>
        </div>
      </section>

      <section className="bdi-flow-section bdi-result-section" aria-labelledby="bai-result-title">
        <div className="bdi-section-number btn-print-hide" aria-hidden="true">03</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head"><div><h2 id="bai-result-title">Sonuç özeti</h2><p>Toplam puan yalnız 21 geçerli yanıt tamamlandığında üretilir.</p></div><span className={`bdi-completion-state ${scoring.status === 'complete' ? 'is-complete' : ''}`}>{scoring.status === 'complete' ? 'Tamamlandı' : 'Tamamlanmadı'}</span></div>
          {scoring.status === 'complete' ? <div className="bdi-result-content">
            <div className="bdi-total-score"><span>BAI toplam puanı</span><strong>{scoring.totalScore}<small> / {BAI_MAX_TOTAL}</small></strong><p>{scoring.scoreBand}</p></div>
            <div className="bdi-result-facts"><div><span>Ölçek/sürüm</span><strong>{BAI_INSTRUMENT_VERSION}</strong></div><div><span>Yorum sınırı</span><strong>Türkçe tanı eşiği değildir</strong></div><div><span>Uygulama</span><strong>{formatClinicDate(testDate)}</strong></div></div>
            <div className="bdi-response-summary" aria-label="Madde puanı özeti">{scoring.responses.map((response) => <span key={response.itemId}><b>{response.itemId}</b>{response.score}</span>)}</div>
            <div className="assessment-result-note"><strong>Otomatik özet:</strong> BAI toplam puanı {scoring.totalScore}/{BAI_MAX_TOTAL}. {scoring.scoreBand}. Bu ölçüm tek başına tanı veya tedavi kararı değildir.</div>
            {expertNote.trim() && <div className="bdi-print-expert-note"><strong>Uzman notu</strong><p>{expertNote.trim()}</p></div>}
          </div> : <div className="bdi-incomplete-result" role="status"><strong>Henüz sonuç üretilmedi</strong><p>{answeredCount} madde tamamlandı. Eksik maddeler: {missing}. Boş yanıtlar sıfır kabul edilmez.</p></div>}
          <label className="form-group bdi-expert-note btn-print-hide">Uzman notu<textarea value={expertNote} onChange={(event) => setExpertNote(event.target.value)} rows={4} maxLength={5000} placeholder="Otomatik tanı yerine kendi klinik değerlendirmenizi yazın." /></label>
          <div className="bdi-actions btn-print-hide"><button type="button" className="btn-secondary" onClick={() => printAssessmentPaper('bai')}><Icon name="fileText" size={16} /> Yanıt aktarım çizelgesi / PDF</button><button type="button" className="btn-secondary" disabled={scoring.status !== 'complete'} onClick={() => printAssessmentResult('bai')}><Icon name="print" size={16} /> Sonuç özeti / PDF</button><button type="button" className="btn-primary" disabled={scoring.status !== 'complete'} onClick={handleSave}><Icon name="save" size={16} /> Sonucu kaydet</button>{lastSaved && <button type="button" className="btn-secondary" onClick={startNewAdministration}>Yeni uygulama</button>}</div>
        </div>
      </section>
    </div>
  );
}
