import { navigate } from '../router';
import type { AuthenticatedUser } from '../../auth/authTypes';

type Props = { user: AuthenticatedUser };

export function DashboardPage({ user }: Props) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="kicker"><span className="kicker-dot" /> Dashboard</div>
          <h1>Hoş geldin, {user.firstName}</h1>
          <p>Danışan dosyanızı yönetin — anamnez, görüşme, değerlendirme, test, rapor, PDF, belge (PRIVATE), not, randevu, görev</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/clients/new')}>+ Yeni Danışan</button>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card"><div className="stat-label">Danışanlar</div><div className="stat-value">—</div><div className="stat-desc">Aktif danışanlar, arama, filtre, sayfalama</div></div>
        <div className="stat-card"><div className="stat-label">Randevular</div><div className="stat-value">—</div><div className="stat-desc">Org içi randevular, client optional</div></div>
        <div className="stat-card"><div className="stat-label">Görevler</div><div className="stat-value">—</div><div className="stat-desc">Görevler, öncelik, durum</div></div>
        <div className="stat-card"><div className="stat-label">Raporlar</div><div className="stat-value">—</div><div className="stat-desc">Block model, autosave, versioning, PDF</div></div>
        <div className="stat-card"><div className="stat-label">Belgeler</div><div className="stat-value">PRIVATE</div><div className="stat-desc">client-documents bucket, signed URL 1h</div></div>
        <div className="stat-card"><div className="stat-label">Güvenlik</div><div className="stat-value">RLS</div><div className="stat-desc">IDOR testleri, audit_logs, KVKK minimizasyon</div></div>
      </div>

      <div style={{ marginTop: 24 }} className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>MVP Akışı — PHASE-07 DONE</h3>
        <p style={{ color: 'var(--soft)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
          Login → Dashboard → Yeni Danışan → Danışan Dosyası → Anamnez → Görüşme → Değerlendirme → Test Sonucu → Rapor → Önizleme → PDF → Belgeler (PRIVATE BUCKET signed URL) → Notlar → Geçmiş (audit) → Randevular → Görevler → Ayarlar (antet/logo/imza data URL) → Yönetim (ADMIN RPC security definer) → Denetim İzi
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/clients')}>Danışanlara Git</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients/new')}>Yeni Danışan</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/appointments')}>Randevular</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/tasks')}>Görevler</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/settings')}>Ayarlar</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/admin')}>Yönetim</button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>PHASE-06 belgeler PRIVATE BUCKET + notlar + geçmiş DONE, PHASE-07 randevu/görev/ayarlar/yönetim/audit DONE, PHASE-08 güvenlik/responsive/test audit NEXT</div>
      </div>
    </div>
  );
}
