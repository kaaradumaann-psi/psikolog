import { useEffect, useMemo, useState } from 'react';
import type { Appointment, Client, PaymentStatus, RiskLevel, SessionType, SoapSession } from '../../clinical/clinicalTypes';
import { saveSoapSession } from '../../clinical/clinicalStore';
import { getSettings } from '../../clinical/practiceStore';
import { clinicToday } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { Icon } from '../Icon';

const SESSION_TYPES: SessionType[] = [
  'Bireysel Terapi',
  'Çift / Aile Terapisi',
  'İlk Görüşme / Anamnez',
  'Psikolojik Değerlendirme',
  'Kriz Müdahalesi',
  'Online Terapi',
  'Takip Seansı',
];

const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'none', label: 'Risk Yok / Güvenli' },
  { value: 'low', label: 'Düşük Risk' },
  { value: 'moderate', label: 'Orta Risk (Yakın Takip)' },
  { value: 'high', label: 'Yüksek Risk! (Acil Protokol)' },
];

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Ödeme bekliyor' },
  { value: 'paid', label: 'Tahsil edildi' },
  { value: 'waived', label: 'Ücret alınmayacak' },
];

export type SoapSessionDraft = Partial<SoapSession>;

export function nextSessionNumber(sessions: SoapSession[]): number {
  return sessions.length ? Math.max(...sessions.map((session) => session.sessionNumber)) + 1 : 1;
}

/** Randevu bağlamından gelmişse seans numarası ve türü oradan alınır. */
export function draftFromAppointment(
  appointment: Appointment,
  sessions: SoapSession[],
  defaultFee: number,
): SoapSessionDraft {
  return {
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    sessionNumber: nextSessionNumber(sessions),
    date: appointment.date,
    startTime: appointment.time,
    durationMinutes: appointment.durationMinutes,
    sessionType: appointment.sessionType,
    riskLevel: 'none',
    riskNotes: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: appointment.notes?.trim() || '',
    homework: '',
    fee: appointment.fee ?? defaultFee,
    paymentStatus: appointment.paymentStatus ?? 'pending',
  };
}

/**
 * SOAP seans notu editörü. Dosya ekranı ve seans listesi aynı bileşeni
 * kullanır; iki kopya form farklı varsayılanlarla ayrışmasın diye tek yer.
 */
export function SoapSessionDialog({
  open,
  sessions,
  clients,
  initial,
  lockClient = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  sessions: SoapSession[];
  clients: Client[];
  initial: SoapSessionDraft | null;
  lockClient?: boolean;
  onClose: () => void;
  onSaved?: (session: SoapSession) => void;
}) {
  const [form, setForm] = useState<SoapSessionDraft>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setForm(
      initial ?? {
        clientId: lockClient ? clients[0]?.id ?? '' : '',
        clientName: lockClient ? `${clients[0]?.firstName ?? ''} ${clients[0]?.lastName ?? ''}`.trim() : '',
        sessionNumber: nextSessionNumber(sessions),
        date: clinicToday(),
        startTime: '14:00',
        durationMinutes: 50,
        sessionType: 'Bireysel Terapi',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        riskLevel: 'none',
        riskNotes: '',
        homework: '',
        fee: getSettings().defaultFee,
        paymentStatus: 'pending',
      },
    );
    // Form, diyalog açılırkenki bağlamdan kurulur; sonraki yazımlar yereldir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lockClient]);

  const clientLabel = useMemo(() => {
    const found = clients.find((client) => client.id === form.clientId);
    return found ? `${found.firstName} ${found.lastName}` : '';
  }, [clients, form.clientId]);

  if (!open) return null;

  function update<K extends keyof SoapSessionDraft>(key: K, value: SoapSessionDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!form.clientId) {
      setError('Seans hangi danışana ait? Listeden seçin.');
      return;
    }
    const subjective = form.subjective?.trim() || '';
    const objective = form.objective?.trim() || '';
    const assessment = form.assessment?.trim() || '';
    const plan = form.plan?.trim() || '';
    if (!subjective && !objective && !assessment && !plan) {
      setError('Boş seans notu kaydedilmez. En az bir SOAP alanı yazın.');
      return;
    }
    const date = form.date || clinicToday();
    if (date > clinicToday()) {
      setError('Seans tarihi gelecekte olamaz. Görüşme yapıldıktan sonra yazın.');
      return;
    }
    const riskLevel = (form.riskLevel as RiskLevel) || 'none';
    if (riskLevel !== 'none' && !form.riskNotes?.trim()) {
      setError('Risk düzeyi yükseltildiğinde ne yapıldığını risk notuna yazın.');
      return;
    }
    const sessionNumber = Number(form.sessionNumber) || 1;
    const duplicateNumber = sessions.some(
      (session) => session.clientId === form.clientId && session.sessionNumber === sessionNumber && session.id !== form.id,
    );
    if (duplicateNumber) {
      setError(`Bu danışanda #${sessionNumber} numaralı seans zaten var. Numarayı düzeltin.`);
      return;
    }

    const now = new Date().toISOString();
    const session: SoapSession = {
      id: form.id || `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      clientId: form.clientId,
      clientName: clientLabel || form.clientName || '',
      sessionNumber,
      date,
      startTime: form.startTime || '14:00',
      durationMinutes: Number(form.durationMinutes) || 50,
      sessionType: (form.sessionType as SessionType) || 'Bireysel Terapi',
      subjective,
      objective,
      assessment,
      plan,
      riskLevel,
      riskNotes: form.riskNotes?.trim() || '',
      homework: form.homework?.trim() || '',
      fee: Number(form.fee) || 0,
      paymentStatus: (form.paymentStatus as PaymentStatus) || 'pending',
      createdAt: form.createdAt || now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      saveSoapSession(session);
      setError(null);
      onSaved?.(session);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Seans notu kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClinicalDialog titleId="soap-dialog-title" onClose={onClose} wide onSubmit={onSubmit}>
      <div className="clinical-modal-head">
        <h3 id="soap-dialog-title">{form.id ? 'SOAP Seans Notunu Düzenle' : 'Yeni Seans Notu (SOAP)'}</h3>
        <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="clinical-modal-body">
        {error && (
          <p className="form-notice" role="alert">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </p>
        )}
        {lockClient ? (
          <div className="form-group">
            <span id="soap-client-static">Danışan</span>
            <input id="soap-client" value={clientLabel} readOnly aria-readonly="true" />
            <small style={{ color: 'var(--soft)' }}>Dosya içinden yazdığınız not otomatik olarak bu danışana bağlanır.</small>
          </div>
        ) : (
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="soap-client">Danışan *</label>
              <select
                id="soap-client"
                value={form.clientId || ''}
                onChange={(event) => {
                  const found = clients.find((client) => client.id === event.target.value);
                  const prior = sessions.filter((session) => session.clientId === event.target.value);
                  setForm((current) => ({
                    ...current,
                    clientId: event.target.value,
                    clientName: found ? `${found.firstName} ${found.lastName}` : '',
                    sessionNumber: current.id ? current.sessionNumber : nextSessionNumber(prior),
                  }));
                }}
                required
              >
                <option value="">Danışan Seçin…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.fileNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="soap-number">Seans No</label>
              <input
                id="soap-number"
                type="number"
                min={1}
                value={form.sessionNumber || 1}
                onChange={(event) => update('sessionNumber', Number(event.target.value))}
                required
              />
            </div>
          </div>
        )}

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="soap-type">Seans türü</label>
            <select id="soap-type" value={form.sessionType || 'Bireysel Terapi'} onChange={(event) => update('sessionType', event.target.value as SessionType)}>
              {SESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="soap-date">Tarih ve saat</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="soap-date" type="date" value={form.date || ''} max={clinicToday()} onChange={(event) => update('date', event.target.value)} required />
              <input
                id="soap-time"
                type="time"
                aria-label="Seans başlangıç saati"
                value={form.startTime || '14:00'}
                onChange={(event) => update('startTime', event.target.value)}
              />
              <input
                id="soap-duration"
                type="number"
                aria-label="Seans süresi (dakika)"
                style={{ width: 92 }}
                min={5}
                max={600}
                value={form.durationMinutes || 50}
                onChange={(event) => update('durationMinutes', Number(event.target.value))}
              />
            </div>
          </div>
        </div>

        {([
          ['S', 'subjective', 'Subjektif (Danışanın İfadeleri & Yaşantıları)', 'Danışanın haftalık aktarımları, hissettiği duygular ve getirdiği konular...'],
          ['O', 'objective', 'Objektif (Klinisyen Gözlemleri)', 'Duygulanım, göz teması, konuşma hızı, motor davranışlar, test bulguları...'],
          ['A', 'assessment', 'Analiz / Değerlendirme', 'Klinik formülasyon, otomatik düşünceler, savunmalar, risk değerlendirmesi...'],
          ['P', 'plan', 'Plan (Gelecek Seans & Müdahaleler)', 'Sonraki seans gündemi, uygulanan teknikler, sevk veya konsültasyon kararı...'],
        ] as [string, keyof SoapSessionDraft, string, string][]).map(([letter, key, title, placeholder]) => (
          <div className="form-group" key={key as string}>
            <label htmlFor={`soap-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="soap-letter" aria-hidden="true">{letter}</span>
              <span>{title}</span>
            </label>
            <textarea
              id={`soap-${key}`}
              rows={3}
              value={(form[key] as string) || ''}
              onChange={(event) => update(key as 'subjective', event.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="soap-homework">Ev ödevi</label>
            <input
              id="soap-homework"
              type="text"
              value={form.homework || ''}
              onChange={(event) => update('homework', event.target.value)}
              placeholder="Düşünce kaydı formu, nefes egzersizi..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="soap-risk">Risk düzeyi</label>
            <select id="soap-risk" value={form.riskLevel || 'none'} onChange={(event) => update('riskLevel', event.target.value as RiskLevel)}>
              {RISK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(form.riskLevel || 'none') !== 'none' && (
          <div className="form-group">
            <label htmlFor="soap-risk-notes">Risk notu (zorunlu)</label>
            <textarea
              id="soap-risk-notes"
              rows={2}
              value={form.riskNotes || ''}
              onChange={(event) => update('riskNotes', event.target.value)}
              placeholder="Görüşmede ne gözlendi, hangi güvenlik adımı atıldı, plan ne zaman yeniden değerlendirilecek?"
            />
          </div>
        )}

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="soap-fee">Ücret (TL)</label>
            <input id="soap-fee" type="number" min={0} step={10} value={form.fee ?? 0} onChange={(event) => update('fee', Number(event.target.value))} />
          </div>
          <div className="form-group">
            <label htmlFor="soap-payment">Ödeme durumu</label>
            <select id="soap-payment" value={form.paymentStatus || 'pending'} onChange={(event) => update('paymentStatus', event.target.value as PaymentStatus)}>
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="clinical-modal-foot">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Vazgeç
        </button>
        <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
          {saving ? 'Kaydediliyor…' : form.id ? 'Seans Notunu Güncelle' : 'Seans Notunu Kaydet'}
        </button>
      </div>
    </ClinicalDialog>
  );
}
