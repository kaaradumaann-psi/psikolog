import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabaseConfig } from '../../auth/supabaseClient';
import type { AuthenticatedUser } from '../../auth/authTypes';
import { cloudContext } from '../../clinical/cloud/sync';
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

export function SettingsPage({ canAdmin, user }: { canAdmin: boolean; user: AuthenticatedUser }) {
  const [settings, setSettings] = useState<PracticeSettings>(() => getSettings());
  const [backupOpen, setBackupOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribePracticeStore(() => setSettings(getSettings())), []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      saveSettings(settings);
      setError(null);
      setSaved(cloudContext() ? 'Sunucuya gönderiliyor; sonucu üstteki şeritten kontrol edin.' : 'Bu cihaza kaydedildi.');
      window.setTimeout(() => setSaved(null), 2500);
    } catch {
      setSaved(null);
      setError('Ayarlar bu cihaza veya sunucu kuyruğuna yazılamadı. Değişiklikleri koruyup yeniden deneyin.');
    }
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
        {error && <p role="alert" style={{ color: 'var(--danger-ink)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {saved && <span role="status" style={{ alignSelf: 'center', color: 'var(--soft)' }}>{saved}</span>}
          <button type="submit" className="btn-primary">Ayarları kaydet</button>
        </div>
      </form>

      <section className="modern-table-card" style={{ padding: 18, marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Bulut</h2>
        {supabaseConfig.configured ? (
          <p style={{ color: 'var(--soft)' }}>Supabase bağlı. Klinik kayıtların kaynağı sunucudur; bu cihazdaki klinik veriler yalnızca önbellek ve gönderilmeyi bekleyen kuyruktur. Sunucu durumunu üstteki şeritten izleyin.</p>
        ) : (
          <p style={{ color: 'var(--soft)' }}>
            Supabase tanımlı değil — çalışma alanı çevrimdışı önceliklidir. Kurumsal kurulum için <code>.env</code> içine yalnızca anon anahtar yazılır; hizmet rolü tarayıcıya girmez. Şema <code>supabase/migrations</code> altındadır.
          </p>
        )}
        {canAdmin && supabaseConfig.configured && <CloudAdminPanel user={user} />}
      </section>
      {backupOpen && <DataManagementModal onClose={() => setBackupOpen(false)} />}
    </div>
  );
}
