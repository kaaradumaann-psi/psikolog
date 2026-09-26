import { useEffect, useMemo, useState } from 'react';
import type { Gender } from '../../clinical/clinicalTypes';
import {
  BDI_CRITICAL_ITEM_ID,
  BDI_INSTRUMENT_VERSION,
  BDI_ITEM_COUNT,
  BDI_MAX_TOTAL,
  BDI_TURKISH_SCREENING_THRESHOLD,
  createBeckDepressionResult,
  responsesFromAnswerSlots,
  scoreBeckDepression,
} from '../../clinical/beckDepression';
import { bdiDraftIdentity, emptyBdiDraft, readBdiDraft, removeBdiDraft, writeBdiDraft } from '../../clinical/bdiDraft';
import { getClients, saveBeckDepressionTest } from '../../clinical/clinicalStore';
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

function newAdministrationId(): string {
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `bdi_${token}`;
}

type SavedState = {
  id: string;
  fingerprint: string;
  revision: number;
};

export function BeckDepressionPage() {
  const clients = useMemo(() => getClients(), []);
  const initialDraft = useMemo(() => readBdiDraft(bdiDraftIdentity('')) ?? emptyBdiDraft(bdiDraftIdentity('')), []);

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

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId],
  );
  const activeDraftIdentity = bdiDraftIdentity(selectedClientId);
  const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : manualName.trim();
  const clientGender = selectedClient?.gender ?? manualGender;
  const clientAge = selectedClient
    ? ageFromBirthDate(selectedClient.birthDate, testDate)
    : parseOptionalAge(manualAge);
  const dateValid = isValidClinicDate(testDate);
  const responses = useMemo(() => responsesFromAnswerSlots(answers), [answers]);
  const scoring = useMemo(() => scoreBeckDepression(responses), [responses]);
  const answeredCount = scoring.validation.answeredCount;
  const completionPercent = Math.round((answeredCount / BDI_ITEM_COUNT) * 100);
  const cloud = Boolean(cloudContext());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeBdiDraft({
        identityKey: activeDraftIdentity,
        administrationId: draftAdministrationId,
        clientId: selectedClientId || undefined,
        manualName,
        manualGender,
        manualAge,
        testDate,
        answers,
        expertNote,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeDraftIdentity, answers, draftAdministrationId, expertNote, manualAge, manualGender, manualName, selectedClientId, testDate]);

  function restoreDraftFor(clientId: string) {
    // Flush the current entity/administration before switching; the debounce must
    // never let rapid client changes drop or move a manual/client draft.
    writeBdiDraft({
      identityKey: activeDraftIdentity,
      administrationId: draftAdministrationId,
      clientId: selectedClientId || undefined,
      manualName,
      manualGender,
      manualAge,
      testDate,
      answers,
      expertNote,
    });
    const identity = bdiDraftIdentity(clientId);
    const storedDraft = readBdiDraft(identity);
    const draft = storedDraft ?? emptyBdiDraft(identity, clientId || undefined);
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
    setToast(storedDraft ? 'Bu danışan ve uygulama kimliğine ait sekme taslağı geri yüklendi.' : null);
  }

  function handleOptionSelect(questionIndex: number, score: number) {
    setAnswers((current) => current.map((answer, index) => index === questionIndex ? score : answer));
    setSaveError(null);
  }

  function formFingerprint(): string {
    return JSON.stringify({
      instrument: BDI_INSTRUMENT_VERSION,
      selectedClientId,
      clientName,
      clientGender,
      clientAge,
      testDate,
      responses,
      expertNote: expertNote.trim(),
    });
  }

  function handleSave() {
    setSaveError(null);
    setToast(null);
    if (cloud && !selectedClient) {
      setSaveError('Bulutta kaydetmek için kayıtlı danışan dosyası seçin.');
      return;
    }
    if (!clientName) { setSaveError('Danışan adı gerekli.'); return; }
    if (clientGender !== 'KADIN' && clientGender !== 'ERKEK') { setSaveError('Mevcut kayıt modeli için cinsiyet alanını seçin.'); return; }
    if (clientAge === null) { setSaveError('Yaş girildiyse 0–120 arası tam sayı olmalı; kayıtlı danışanda doğum tarihi kontrol edilmelidir.'); return; }
    if (!dateValid) { setSaveError('Uygulama tarihi gerçek bir tarih olmalı ve İstanbul tarihine göre gelecekte olmamalıdır.'); return; }
    if (scoring.status !== 'complete') { setSaveError('21 maddenin tamamı geçerli bir puanla işaretlenmelidir. Boş madde 0 sayılmaz.'); return; }

    const fingerprint = formFingerprint();
    if (lastSaved?.fingerprint === fingerprint) {
      setToast('Bu uygulamanın aynı sürümü daha önce kaydedildi; yinelenen kayıt oluşturulmadı.');
      return;
    }

    const revision = lastSaved ? lastSaved.revision + 1 : 1;
    const result = createBeckDepressionResult(scoring, {
      id: newAdministrationId(),
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
      saveBeckDepressionTest(result);
      setLastSaved({ id: result.id, fingerprint, revision });
      removeBdiDraft(activeDraftIdentity, draftAdministrationId);
      setToast(lastSaved
        ? `Düzeltme yeni revizyon olarak kaydedildi (revizyon ${revision}); önceki sonuç korunuyor.`
        : cloud
          ? 'Tamamlanan uygulama sunucuya gönderiliyor; durumu üstteki şeritten kontrol edin.'
          : 'Tamamlanan uygulama bu cihaza ayrı bir kayıt olarak kaydedildi.');
    } catch {
      setSaveError('Sonuç saklanamadı. Yanıtlar silinmedi; sekme taslağı korunuyor.');
    }
  }

  function startNewAdministration() {
    removeBdiDraft(activeDraftIdentity, draftAdministrationId);
    const freshDraft = emptyBdiDraft(activeDraftIdentity, selectedClientId || undefined);
    setDraftAdministrationId(freshDraft.administrationId);
    setAnswers(freshDraft.answers);
    setExpertNote('');
    setTestDate(freshDraft.testDate);
    setLastSaved(null);
    setSaveError(null);
    setToast('Yeni ve bağımsız uygulama açıldı. Önceki kayıtlar değiştirilmedi.');
  }

  const missingLabel = scoring.validation.missingItemIds.length
    ? scoring.validation.missingItemIds.join(', ')
    : '—';

  return (
    <div className="clinical-container bdi-workspace">
      <header className="bdi-page-head btn-print-hide">
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/testler')}>
          <Icon name="left" size={14} /> Test bataryasına dön
        </button>
        <div className="bdi-page-heading">
          <span className="bdi-version-kicker">BDI · HİSLİ TÜRKÇE FORMU · BDI-II DEĞİLDİR</span>
          <h1>Depresyon değerlendirme uygulaması</h1>
          <p>21 maddelik resmî formdaki yanıtları aynı çalışma akışında aktarın, doğrulayın, puanlayın ve kaydedin.</p>
        </div>
        <dl className="bdi-identity-strip" aria-label="Ölçek kimliği">
          <div><dt>Sürüm</dt><dd>{BDI_INSTRUMENT_VERSION}</dd></div>
          <div><dt>Model</dt><dd>21 × 0–3 · yalnız toplam puan</dd></div>
          <div><dt>Kullanım</dt><dd>Resmî form yanında puanlama</dd></div>
        </dl>
      </header>

      <AssessmentPaperSheet
        assessment="bdi"
        respondentName={clientName}
        date={testDate}
        items={Array.from({ length: BDI_ITEM_COUNT }, (_, index) => ({ id: index + 1, text: '' }))}
        options={[0, 1, 2, 3].map((score) => ({ score, label: 'Puan' }))}
      />
      <AssessmentResultPrintHeader
        assessment="bdi"
        respondentName={clientName}
        date={testDate}
        instrumentVersion={BDI_INSTRUMENT_VERSION}
        demographics={`${clientGender === 'KADIN' ? 'Kadın' : clientGender === 'ERKEK' ? 'Erkek' : '—'} · ${clientAge ?? '—'} yaş`}
      />

      {saveError && <p className="record-lock-error btn-print-hide" role="alert">{saveError}</p>}
      {toast && <p className="bdi-save-notice btn-print-hide" role="status">{toast}</p>}

      <section className="bdi-flow-section btn-print-hide" aria-labelledby="bdi-client-title">
        <div className="bdi-section-number" aria-hidden="true">01</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head">
            <div><h2 id="bdi-client-title">Danışan ve uygulama bilgileri</h2><p>Kayıtlı danışan seçildiğinde kimlik alanları dosyadan gelir ve bu uygulamada değiştirilemez.</p></div>
            <span>Taslak bu sekmede otomatik korunur</span>
          </div>
          <div className="bdi-demographic-grid">
            <label className="form-group">Kayıtlı danışan
              <select value={selectedClientId} onChange={(event) => restoreDraftFor(event.target.value)}>
                <option value="">{cloud ? 'Danışan dosyası seçin' : 'Manuel uygulama'}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName} ({client.fileNumber})</option>)}
              </select>
            </label>
            <label className="form-group">Danışan adı soyadı
              <input value={clientName} onChange={(event) => setManualName(event.target.value)} readOnly={Boolean(selectedClient)} aria-readonly={Boolean(selectedClient)} required />
            </label>
            <label className="form-group">Kayıt modelindeki cinsiyet
              <select value={clientGender} onChange={(event) => setManualGender(event.target.value === 'KADIN' || event.target.value === 'ERKEK' ? event.target.value : '')} disabled={Boolean(selectedClient)} required>
                <option value="">Seçin</option><option value="KADIN">Kadın</option><option value="ERKEK">Erkek</option>
              </select>
            </label>
            <label className="form-group">Uygulama tarihindeki yaş
              <input type="number" min={0} max={120} value={selectedClient ? (clientAge ?? '') : manualAge} onChange={(event) => setManualAge(event.target.value)} readOnly={Boolean(selectedClient)} aria-readonly={Boolean(selectedClient)} placeholder="İsteğe bağlı" />
              {selectedClient && <small>Doğum tarihinden uygulama tarihine göre hesaplandı.</small>}
            </label>
            <label className="form-group">Uygulama tarihi
              <input type="date" max={clinicToday()} value={testDate} onChange={(event) => setTestDate(event.target.value)} required aria-invalid={!dateValid} />
              <small>{dateValid ? `${formatClinicDate(testDate)} · Europe/Istanbul klinik tarihi` : 'Geçerli ve gelecekte olmayan bir tarih girin.'}</small>
            </label>
          </div>
          <p className="bdi-model-limitation">Cinsiyet alanı mevcut danışan veri modelindeki iki seçenekle sınırlıdır; puanlama bu alana veya yaşa göre değişmez.</p>
        </div>
      </section>

      <AssessmentLegalNotice assessment="bdi" />

      <section className="bdi-flow-section bdi-items-section btn-print-hide" aria-labelledby="bdi-items-title">
        <div className="bdi-section-number" aria-hidden="true">02</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head">
            <div>
              <h2 id="bdi-items-title">Madde yanıtlarını aktarın</h2>
              <p>Bu depo yetkili Türkçe madde metnini içermediğinden resmî formdaki her madde için yalnız 0–3 puanını girin. Her satır tek bir yanıttır.</p>
            </div>
            <strong className="bdi-progress-count" aria-live="polite">{answeredCount} / {BDI_ITEM_COUNT}</strong>
          </div>
          <div className="bdi-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={BDI_ITEM_COUNT} aria-valuenow={answeredCount} aria-label="Tamamlanan madde sayısı">
            <span style={{ width: `${completionPercent}%` }} />
          </div>

          <div className="bdi-item-list">
            {Array.from({ length: BDI_ITEM_COUNT }, (_, questionIndex) => {
              const itemId = questionIndex + 1;
              const selected = answers[questionIndex];
              return (
                <fieldset key={itemId} className={`bdi-item-row${selected !== null ? ' is-answered' : ''}${itemId === BDI_CRITICAL_ITEM_ID && (selected ?? 0) > 0 ? ' is-critical' : ''}`}>
                  <legend>
                    <span>Madde {itemId}</span>
                    {itemId === BDI_CRITICAL_ITEM_ID && <small>Güvenlik açısından ayrıca gözden geçirilir</small>}
                  </legend>
                  <div className="bdi-score-options">
                    {[0, 1, 2, 3].map((score) => (
                      <label key={score} className={selected === score ? 'is-selected' : ''}>
                        <input type="radio" name={`bdi-item-${itemId}`} value={score} checked={selected === score} onChange={() => handleOptionSelect(questionIndex, score)} />
                        <span>{score}</span>
                        <small>Puan</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bdi-flow-section bdi-result-section" aria-labelledby="bdi-result-title">
        <div className="bdi-section-number btn-print-hide" aria-hidden="true">03</div>
        <div className="bdi-section-content">
          <div className="bdi-section-head">
            <div>
              <h2 id="bdi-result-title">Sonuç özeti</h2>
              <p>Toplam puan yalnız 21 geçerli yanıt tamamlandığında üretilir.</p>
            </div>
            <span className={`bdi-completion-state ${scoring.status === 'complete' ? 'is-complete' : ''}`}>
              {scoring.status === 'complete' ? 'Tamamlandı' : 'Tamamlanmadı'}
            </span>
          </div>

          {scoring.status === 'complete' ? (
            <div className="bdi-result-content">
              <div className="bdi-total-score">
                <span>BDI toplam puanı</span>
                <strong>{scoring.totalScore}<small> / {BDI_MAX_TOTAL}</small></strong>
                <p>{scoring.scoreBand}</p>
              </div>
              <div className="bdi-result-facts">
                <div><span>Ölçek/sürüm</span><strong>{BDI_INSTRUMENT_VERSION}</strong></div>
                <div><span>Türkçe tarama referansı</span><strong>{BDI_TURKISH_SCREENING_THRESHOLD} puan · tanısal eşik değildir</strong></div>
                <div><span>Uygulama</span><strong>{formatClinicDate(testDate)}</strong></div>
              </div>

              {scoring.criticalItemEndorsed && (
                <div className="bdi-critical-notice" role="alert">
                  <Icon name="alert" size={19} />
                  <div><strong>Kritik madde işaretlendi</strong><p>Madde 9 yanıtı toplam puandan bağımsız klinik değerlendirme gerektirebilir. Sistem risk yüzdesi, risk düzeyi veya tanı üretmez; kurumun güvenlik protokolünü uygulayın.</p></div>
                </div>
              )}

              <div className="bdi-response-summary" aria-label="Madde puanı özeti">
                {scoring.responses.map((response) => <span key={response.itemId}><b>{response.itemId}</b>{response.score}</span>)}
              </div>

              <div className="assessment-result-note">
                <strong>Otomatik özet:</strong> BDI toplam puanı {scoring.totalScore}/{BDI_MAX_TOTAL}. {scoring.scoreBand}. Sonuç semptom düzeyine ilişkin bir ölçek puanıdır; tek başına depresyon tanısı değildir.
              </div>
              {expertNote.trim() && <div className="bdi-print-expert-note"><strong>Uzman notu</strong><p>{expertNote.trim()}</p></div>}
            </div>
          ) : (
            <div className="bdi-incomplete-result" role="status">
              <strong>Henüz klinik sonuç üretilmedi</strong>
              <p>{answeredCount} madde tamamlandı. Eksik maddeler: {missingLabel}. Boş yanıtlar sıfır kabul edilmez.</p>
            </div>
          )}

          <label className="form-group bdi-expert-note btn-print-hide">Uzman notu
            <textarea value={expertNote} onChange={(event) => setExpertNote(event.target.value)} rows={4} maxLength={5000} placeholder="Otomatik tanı yerine, yalnız kendi klinik değerlendirmenizi yazın." />
          </label>

          <div className="bdi-actions btn-print-hide">
            <button type="button" className="btn-secondary" onClick={() => printAssessmentPaper('bdi')}>
              <Icon name="fileText" size={16} /> Boş aktarım çizelgesi / PDF
            </button>
            <button type="button" className="btn-secondary" disabled={scoring.status !== 'complete'} onClick={() => printAssessmentResult('bdi')}>
              <Icon name="print" size={16} /> Sonuç özeti / PDF
            </button>
            <button type="button" className="btn-primary" disabled={scoring.status !== 'complete'} onClick={handleSave}>
              <Icon name="save" size={16} /> Sonucu kaydet
            </button>
            {lastSaved && <button type="button" className="btn-secondary" onClick={startNewAdministration}>Yeni uygulama</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
