import { navigate } from '../router';
import type { AuthenticatedUser } from '../../auth/authTypes';

type Props = {
  user: AuthenticatedUser;
};

export function DashboardPage({ user }: Props) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="kicker">
            <span className="kicker-dot" /> Dashboard
          </div>
          <h1>Hoş geldin, {user.firstName}</h1>
          <p>Danışan dosyanızı yönetin — anamnez, görüşme, değerlendirme, test, rapor, PDF</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => navigate('/clients/new')}
        >
          + Yeni Danışan
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Danışanlar</div>
          <div className="stat-value">—</div>
          <div className="stat-desc">Yakında: aktif danışan sayısı, son eklenenler</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Görüşmeler</div>
          <div className="stat-value">—</div>
          <div className="stat-desc">Bu hafta planlanan görüşmeler</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Raporlar</div>
          <div className="stat-value">—</div>
          <div className="stat-desc">Taslak ve tamamlanan raporlar</div>
        </div>
      </div>

      <div style={{ marginTop: 24 }} className="card">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>MVP Akışı</h3>
        <p style={{ color: 'var(--soft)', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>
          Login → Dashboard → Yeni Danışan → Danışan Dosyası → Anamnez → Görüşme → Değerlendirme →
          Test Sonucu → Rapor → Önizleme → PDF → Arşiv
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/clients')}>
            Danışanlara Git
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients/new')}>
            Yeni Danışan Oluştur
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
          PHASE-01 iskelet — PHASE-02'de danışan CRUD aktif olacak
        </div>
      </div>
    </div>
  );
}
