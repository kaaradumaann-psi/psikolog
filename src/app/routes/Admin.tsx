export function AdminPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Yönetim</h1>
          <p>Kullanıcı ve organizasyon yönetimi — sadece ADMIN / ORG_ADMIN</p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-01 iskelet</h4>
          <p>
            Edge Function admin-users ile kullanıcı oluşturma/aktiflik/silme — MMPI pattern.
            Liste RLS ile org isolation.
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            İlk admin SQL ile bootstrap: update profiles set role='ADMIN' where email='...'
          </p>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ayarlar</h1>
          <p>Antet, logo, imza — data URL, eski raporları etkilemez</p>
        </div>
      </div>
      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-07'de aktif</h4>
          <p>psychologist_settings: letterhead jsonb ≤2MB (name,title,institution,phone,email,address,logo data URL, signature)</p>
        </div>
      </div>
    </div>
  );
}

export function AuditPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Denetim İzi</h1>
          <p>Sunucu taraflı audit_logs — trigger yazar, client atlayamaz</p>
        </div>
      </div>
      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-07'de aktif</h4>
          <p>actor, action, target_table, target_id, created_at — sadece ADMIN / ORG_ADMIN okur</p>
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
          <a href="/dashboard" className="btn btn--primary btn--sm">
            Dashboard'a Dön
          </a>
        </div>
      </main>
    </div>
  );
}
