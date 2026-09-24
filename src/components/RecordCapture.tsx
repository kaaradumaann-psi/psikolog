import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { FormDefinition } from '../omr/omrTypes';
import type { AuthenticatedUser } from '../auth/authTypes';
import { canCreateRecord, createRecord } from '../records/supabaseRecords';
import type { Gender, MMPIRecord } from '../records/supabaseRecords';
import type { ScanSet } from '../scanner/pageSequence';
import { sortedPages } from '../scanner/pageSequence';
import { Icon } from './Icon';
import { todayIsoDate } from '../workspace/caseTypes';

const today = todayIsoDate;

type RecordCaptureProps = {
  definition: FormDefinition;
  scan: ScanSet;
  actor: AuthenticatedUser;
  onSaved?: () => void;
};

export function RecordCapture({ definition, scan, actor, onSaved }: RecordCaptureProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [applicationDate, setApplicationDate] = useState(today);
  const [requestedBy, setRequestedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<MMPIRecord | null>(null);
  const saving = useRef(false);
  const submissionKey = useRef(crypto.randomUUID());
  const pages = sortedPages(scan);
  const ready = actor.role === 'PSYCHOLOG' && actor.active && canCreateRecord(pages, definition);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !ready) return;
    if (!gender) {
      setError('Lütfen danışanın cinsiyetini seçiniz.');
      return;
    }
    setError('');
    saving.current = true;
    setBusy(true);
    try {
      const record = await createRecord(
        {
          client: {
            firstName,
            lastName,
            gender,
            age: Number(age),
            occupation,
            education,
            applicationDate,
            requestedBy,
          },
        },
        pages,
        definition,
        actor,
        submissionKey.current,
      );
      setSaved(record);
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kayıt işlemi gerçekleştirilemedi.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (actor.role !== 'PSYCHOLOG') return null;

  if (!ready) {
    return (
      <section className="record-panel-locked" aria-labelledby="record-title">
        <div className="locked-icon-wrap">
          <Icon name="scan" size={24} />
        </div>
        <div className="locked-content">
          <span className="section-badge badge-warning">Adım 2: Danışan Kaydı</span>
          <h3 id="record-title">Test Kaydı İçin 4 Sayfayı Tamamlayın</h3>
          <p>
            Danışan bilgileri formu, form setinin 4 sayfası başarıyla okunduktan sonra aktifleşir.
            Şu ana kadar {pages.length} / {definition.totalPages} sayfa onaylandı.
          </p>
        </div>
      </section>
    );
  }

  if (saved) {
    return (
      <section className="record-panel-success" aria-labelledby="record-success-title">
        <div className="success-icon-wrap">
          <Icon name="checkCircle" size={32} />
        </div>
        <div className="success-content">
          <span className="section-badge badge-success">İşlem Başarılı</span>
          <h3 id="record-success-title">Test ve Danışan Kaydı Tamamlandı</h3>
          <p>
            Test cevapları ve danışan bilgileri güvenle kaydedildi.
            <br />
            Kayıt Referans Kodu: <strong className="record-ref-code">{saved.id}</strong>
          </p>
          <p className="success-hint">
            Aşağıdaki "Kayıtlarım" bölümünden bu teste ait tüm cevapları inceleyebilirsiniz. Yeni bir danışan için "Yeni set / sıfırla" butonuyla yeni tarama başlatabilirsiniz.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section card-elevated" aria-labelledby="record-title">
      <div className="section-header-row">
        <div>
          <span className="section-badge badge-primary">Adım 2: Danışan Bilgileri</span>
          <h3 id="record-title" className="section-heading">Danışan Bilgilerini Kaydet</h3>
          <p className="section-subtext">
            Tüm sayfalar eksiksiz okundu. Danışan profilini girerek testi arşive kaydedebilirsiniz.
          </p>
        </div>
        <span className="stats-pill ready-pill">
          <Icon name="check" size={14} /> 4 / 4 Sayfa Hazır
        </span>
      </div>

      <form className="client-data-form" onSubmit={submit}>
        <div className="form-grid-3col">
          <div className="form-group">
            <label>Danışan Adı *</label>
            <input
              required
              placeholder="Örn. Ayşe"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Danışan Soyadı *</label>
            <input
              required
              placeholder="Örn. Yılmaz"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Cinsiyet *</label>
            <select required value={gender} onChange={e => setGender(e.target.value as Gender | '')}>
              <option value="">Seçiniz</option>
              <option value="Kadın">Kadın</option>
              <option value="Erkek">Erkek</option>
              <option value="Belirtmek istemiyor">Belirtmek istemiyor</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Yaş *</label>
            <input
              required
              type="number"
              min="16"
              max="120"
              placeholder="Örn. 28"
              value={age}
              onChange={e => setAge(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="form-group">
            <label>Meslek *</label>
            <input
              required
              placeholder="Örn. Mühendis, Öğrenci..."
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Eğitim Durumu *</label>
            <input
              required
              placeholder="Örn. Lisans, Lise..."
              value={education}
              onChange={e => setEducation(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Uygulama Tarihi *</label>
            <input
              required
              type="date"
              max={today()}
              value={applicationDate}
              onChange={e => setApplicationDate(e.target.value)}
            />
          </div>

          <div className="form-group form-col-span-2">
            <label>İstekte Bulunan Kurum / Uzman *</label>
            <input
              required
              placeholder="Örn. Psikiyatri Kliniği, Dr. Ahmet..."
              value={requestedBy}
              onChange={e => setRequestedBy(e.target.value)}
              maxLength={500}
              autoComplete="off"
            />
          </div>
        </div>

        {error && (
          <div className="status-banner error-banner" role="alert">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-actions-bar">
          <p className="form-audit-note">
            Kaydı tamamlayan uzman: <strong>{actor.firstName} {actor.lastName}</strong>
          </p>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <div className="spinner-inline" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                <span>Testi ve Bilgileri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
