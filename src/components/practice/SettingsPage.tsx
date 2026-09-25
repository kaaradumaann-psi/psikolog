import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { startMmpiSso } from '../../auth/sso';
import { supabaseConfig } from '../../auth/supabaseClient';
import { MMPI_ORIGIN } from '../../lib/mmpiOrigin';
import { DataManagementModal } from '../clinical/DataManagementModal';
import {
  MAX_BRAND_ASSET_BYTES,
  getSettings,
  saveSettings,
  subscribePracticeStore,
  type PracticeSettings,
} from '../../clinical/practiceStore';
import { isSafeImageUrl } from '../../clinical/recordRules';
import { navigate } from '../../router';
import { Icon } from '../Icon';
import { CloudAdminPanel } from './CloudAdminPanel';

function readAsset(file: File, onDone: (dataUrl: string) => void, onError: (message: string) => void) {
  if (!file.type.startsWith('image/')) {
    onError('Logo ve imza yalnızca görsel olabilir.');
    return;
  }
  if (file.size > MAX_BRAND_ASSET_BYTES) {
    onError('Görsel 1 MB sınırını aşıyor.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string' && isSafeImageUrl(reader.result)) onDone(reader.result);
    else onError('Görsel okunamadı.');
  };
  reader.readAsDataURL(file);
}

export function SettingsPage({ canAdmin }: { canAdmin: boolean }) {
  const [settings, setSettings] = useState<PracticeSettings>(() => getSettings());
  const [backupOpen, setBackupOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [ssoBusy, setSsoBusy] = useState(false);

  useEffect(() => subscribePracticeStore(() => setSettings(getSettings())), []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker"><span className="clinical-kicker-dot" /><span>Uygulama</span></div>
          <h1>Ayarlar</h1>
          <p>Antet, imza ve yedek. Yeni raporlar buradaki uzman adını kullanır.</p>
        </div>
        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/denetim')}>
            <Icon name="list" size={16} />
            <span>Denetim izi</span>
          </button>
          <button type="button" className="btn-secondary" onClick={() => setBackupOpen(true)}>
            <Icon name="database" size={16} />
            <span>Yedekle</span>
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="modern-table-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <div className="form-row-2">
          <label className="form-group">Uzman adı<input value={settings.evaluatorName} onChange={(event) => setSettings({ ...settings, evaluatorName: event.target.value })} maxLength={120} /></label>
          <label className="form-group">Ünvan<input value={settings.title} onChange={(event) => setSettings({ ...settings, title: event.target.value })} maxLength={120} /></label>
        </div>
        <label className="form-group">Klinik adı<input value={settings.clinicName} onChange={(event) => setSettings({ ...settings, clinicName: event.target.value })} maxLength={180} /></label>
        <div className="form-row-2">
          <label className="form-group">Telefon<input value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} maxLength={40} /></label>
          <label className="form-group">E-posta<input value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} maxLength={120} /></label>
        </div>
        <label className="form-group">Adres<input value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} maxLength={240} /></label>
        <label className="form-group">Varsayılan seans ücreti (TL)<input type="number" min={0} max={100000} value={settings.defaultFee || ''} onChange={(event) => setSettings({ ...settings, defaultFee: Math.max(0, Number(event.target.value) || 0) })} /></label>
        <label className="form-group">
          Antet metni
          <textarea value={settings.letterhead} onChange={(event) => setSettings({ ...settings, letterhead: event.target.value })} maxLength={800} rows={3} />
        </label>
        <div className="form-row-2">
          <label className="form-group">
            Logo
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              readAsset(file, (logoDataUrl) => setSettings({ ...settings, logoDataUrl }), setError);
            }} />
          </label>
          <label className="form-group">
            İmza
            <input type="file" accept="image/*" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              readAsset(file, (signatureDataUrl) => setSettings({ ...settings, signatureDataUrl }), setError);
            }} />
          </label>
        </div>
        {(settings.logoDataUrl || settings.signatureDataUrl) && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {isSafeImageUrl(settings.logoDataUrl) && <img src={settings.logoDataUrl} alt="Logo önizleme" style={{ height: 48 }} />}
            {isSafeImageUrl(settings.signatureDataUrl) && <img src={settings.signatureDataUrl} alt="İmza önizleme" style={{ height: 48 }} />}
          </div>
        )}
        {error && <p style={{ color: 'var(--danger-ink)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {saved && <span style={{ alignSelf: 'center', color: 'var(--success)' }}>Kaydedildi</span>}
          <button type="submit" className="btn-primary">Ayarları kaydet</button>
        </div>
      </form>

      <section className="modern-table-card" style={{ padding: 18, marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Bulut</h2>
        {supabaseConfig.configured ? (
          <p style={{ color: 'var(--soft)' }}>Supabase bağlı. Kurum verisi RLS ile ayrılır. Yerel dosya yine bu cihazda kalır; kimlik için danışan UUID’si buluta yazılır.</p>
        ) : (
          <p style={{ color: 'var(--soft)' }}>
            Supabase tanımlı değil — çalışma alanı çevrimdışı önceliklidir. Kurumsal kurulum için <code>.env</code> içine yalnızca anon anahtar yazılır; hizmet rolü tarayıcıya girmez. Şema <code>supabase/migrations</code> altındadır.
          </p>
        )}
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <p style={{ color: 'var(--soft)', margin: 0 }}>MMPI çalışma alanı ayrı bir uygulamadır. Parola gönderilmez; kısa ömürlü tek kullanımlık kod kullanılır.</p>
          {supabaseConfig.configured ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={ssoBusy}
              onClick={() => {
                setSsoError(null);
                setSsoBusy(true);
                void startMmpiSso().catch((reason) => {
                  setSsoBusy(false);
                  setSsoError(reason instanceof Error ? reason.message : 'MMPI oturumu başlatılamadı.');
                });
              }}
            >
              MMPI’ye git
            </button>
          ) : (
            <p style={{ color: 'var(--soft)', margin: 0 }}>MMPI’ye parolasız geçiş için bulut girişi gerekir.</p>
          )}
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>Hedef: {MMPI_ORIGIN}</p>
          {ssoError && <p style={{ color: 'var(--danger-ink)', margin: 0 }} role="alert">{ssoError}</p>}
        </div>
        {canAdmin && supabaseConfig.configured && <CloudAdminPanel />}
      </section>
      {backupOpen && <DataManagementModal onClose={() => setBackupOpen(false)} />}
    </div>
  );
}
