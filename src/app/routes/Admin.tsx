import { useEffect, useState } from 'react';
import { adminListProfiles, adminUpdateProfile, adminListOrganizations, adminCreateOrganization, type AdminProfile, type AdminOrg } from '../../features/admin/adminApi';
import { getPsychologistSettings, upsertPsychologistSettings } from '../../features/settings/settingsApi';
import { listAuditLogs } from '../../features/audit/auditApi';
import type { AuditLog } from '../../features/audit/auditApi';
import type { Letterhead } from '../../features/reports/templateEngine';
import { EMPTY_LETTERHEAD } from '../../features/reports/templateEngine';
import { showToast } from '../../components/ui/Toast';

export function AdminPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState('');
  const [editing, setEditing] = useState<AdminProfile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([adminListProfiles(), adminListOrganizations()]);
      setProfiles(p);
      setOrgs(o);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    try {
      const org = await adminCreateOrganization(newOrgName.trim());
      setOrgs((prev) => [org, ...prev]);
      setNewOrgName('');
      showToast('Organizasyon oluşturuldu', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleUpdateProfile = async () => {
    if (!editing) return;
    try {
      const updated = await adminUpdateProfile({
        id: editing.id,
        role: editing.role,
        active: editing.active,
        organizationId: editing.organization_id,
      });
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
      showToast('Profil güncellendi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1>Yönetim</h1>
          <p>Kullanıcı ve organizasyon yönetimi — sadece ADMIN (RPC security definer)</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Organizasyonlar ({orgs.length})</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="input" placeholder="Yeni organizasyon adı" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} maxLength={180} style={{ maxWidth: 320 }} />
          <button type="button" className="btn btn--primary btn--sm" onClick={handleCreateOrg}>Oluştur</button>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {orgs.map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>
              <b>{o.name}</b>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{o.id.slice(0, 8)}… • {new Date(o.created_at).toLocaleDateString('tr-TR')}</span>
            </div>
          ))}
          {orgs.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Organizasyon yok</div>}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Kullanıcılar ({profiles.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 8px' }}>Ad Soyad</th>
                <th style={{ padding: '6px 8px' }}>E-posta</th>
                <th style={{ padding: '6px 8px' }}>Rol</th>
                <th style={{ padding: '6px 8px' }}>Aktif</th>
                <th style={{ padding: '6px 8px' }}>Org</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 8px' }}>{p.first_name} {p.last_name}</td>
                  <td style={{ padding: '6px 8px', fontSize: 12, color: 'var(--muted)' }}>{p.email || '—'}</td>
                  <td style={{ padding: '6px 8px' }}><span className="badge">{p.role}</span></td>
                  <td style={{ padding: '6px 8px' }}>{p.active ? '✓' : '✗'}</td>
                  <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{p.organization_id?.slice(0, 8) || '—'}</td>
                  <td style={{ padding: '6px 8px' }}><button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(p)}>Düzenle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="card">
          <h4 style={{ fontSize: 13, marginBottom: 12 }}>Düzenle: {editing.first_name} {editing.last_name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="field-label">Rol</label>
              <select className="select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as AdminProfile['role'] })}>
                <option value="PSYCHOLOG">PSYCHOLOG</option>
                <option value="ORG_ADMIN">ORG_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Aktif</label>
              <select className="select" value={editing.active ? 'true' : 'false'} onChange={(e) => setEditing({ ...editing, active: e.target.value === 'true' })}>
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Organizasyon</label>
              <select className="select" value={editing.organization_id || ''} onChange={(e) => setEditing({ ...editing, organization_id: e.target.value || null })}>
                <option value="">— Yok —</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>Vazgeç</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={handleUpdateProfile}>Kaydet</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [letterhead, setLetterhead] = useState<Letterhead>(EMPTY_LETTERHEAD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPsychologistSettings().then((lh) => { setLetterhead(lh); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await upsertPsychologistSettings(letterhead);
      setLetterhead(saved);
      showToast('Ayarlar kaydedildi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileToDataUrl = (file: File, setter: (url: string) => void) => {
    if (file.size > 1024 * 1024) { showToast('Dosya çok büyük (max 1MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setter(result);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ayarlar</h1>
          <p>Antet, logo, imza — data URL ≤1MB, eski raporları etkilemez (snapshot)</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label className="field-label">Ad Soyad</label><input className="input" value={letterhead.name} onChange={(e) => setLetterhead({ ...letterhead, name: e.target.value })} maxLength={120} /></div>
          <div className="field"><label className="field-label">Unvan</label><input className="input" value={letterhead.title} onChange={(e) => setLetterhead({ ...letterhead, title: e.target.value })} maxLength={120} placeholder="Uzman Klinik Psikolog" /></div>
        </div>
        <div className="field"><label className="field-label">Kurum</label><input className="input" value={letterhead.institution} onChange={(e) => setLetterhead({ ...letterhead, institution: e.target.value })} maxLength={180} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label className="field-label">Telefon</label><input className="input" value={letterhead.phone} onChange={(e) => setLetterhead({ ...letterhead, phone: e.target.value })} maxLength={32} /></div>
          <div className="field"><label className="field-label">E-posta</label><input className="input" value={letterhead.email} onChange={(e) => setLetterhead({ ...letterhead, email: e.target.value })} maxLength={120} /></div>
        </div>
        <div className="field"><label className="field-label">Adres</label><textarea className="textarea" rows={2} value={letterhead.address} onChange={(e) => setLetterhead({ ...letterhead, address: e.target.value })} maxLength={300} /></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="field-label">Logo (data URL ≤1MB)</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileToDataUrl(f, (url) => setLetterhead((lh) => ({ ...lh, logo: url }))); }} />
            {letterhead.logo && <img src={letterhead.logo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', marginTop: 8, border: '1px solid var(--border)', borderRadius: 8 }} />}
            {letterhead.logo && <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 4 }} onClick={() => setLetterhead({ ...letterhead, logo: '' })}>Temizle</button>}
          </div>
          <div className="field">
            <label className="field-label">İmza (data URL ≤1MB)</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileToDataUrl(f, (url) => setLetterhead((lh) => ({ ...lh, signature: url }))); }} />
            {letterhead.signature && <img src={letterhead.signature} alt="İmza" style={{ width: 120, height: 60, objectFit: 'contain', marginTop: 8, border: '1px solid var(--border)', borderRadius: 8 }} />}
            {letterhead.signature && <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 4 }} onClick={() => setLetterhead({ ...letterhead, signature: '' })}>Temizle</button>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </div>
    </div>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAuditLogs(100).then(setLogs).catch((e) => showToast((e as Error).message, 'error')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Denetim İzi</h1>
          <p>Sunucu taraflı audit_logs — trigger yazar, client atlayamaz, sadece ADMIN/ORG_ADMIN okur</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gap: 6 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{new Date(l.createdAt).toLocaleString('tr-TR')}</span>
              <span className="badge">{l.action}</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{l.targetTable}:{l.targetId?.slice(0, 8) || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>actor:{l.actor?.slice(0, 8) || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>org:{l.organizationId?.slice(0, 8) || '—'}</span>
            </div>
          ))}
          {logs.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Log yok</div>}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="auth-page">
      <main className="auth-shell">
        <div className="empty-state-card">
          <div className="empty-state-icon">!</div>
          <h4>Sayfa Bulunamadı</h4>
          <p>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
          <a href="/dashboard" className="btn btn--primary btn--sm">Dashboard'a Dön</a>
        </div>
      </main>
    </div>
  );
}
