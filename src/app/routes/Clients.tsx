import { navigate } from '../router';

export function ClientsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Danışanlar</h1>
          <p>Danışan dosyanızı yönetin — arama, filtre, sayfalama</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/clients/new')}>
          + Yeni Danışan
        </button>
      </div>

      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-02'de aktif</h4>
          <p>Danışan CRUD, file_number auto, search/filter/pagination (hasMore+count), status active/archived</p>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/clients/new')}>
            Yeni Danışan Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientNewPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Yeni Danışan</h1>
          <p>Danışan dosyası oluştur — KVKK minimizasyon</p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-02'de aktif</h4>
          <p>file_number org içinde unique auto, first_name/last_name 1-80, birth_date, phone/email optional, profession/education, status</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Draft + outbox + TTL 30g + idempotency_key ile çift kayıt engeli
          </p>
        </div>
      </div>
    </div>
  );
}

export function ClientFilePage({ id, tab }: { id: string; tab?: string }) {
  const tabs = [
    'genel',
    'anamnez',
    'görüşmeler',
    'değerlendirmeler',
    'testler',
    'raporlar',
    'belgeler',
    'notlar',
    'geçmiş',
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Danışan Dosyası</h1>
          <p>ID: {id} — {tab || 'genel'}</p>
        </div>
      </div>

      <div className="client-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`client-tab ${(!tab && t === 'genel') || tab === t ? 'active' : ''}`}
            onClick={() => navigate(`/clients/${id}?tab=${t}`)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>PHASE-02+ aktif</h4>
          <p>
            Genel/Anamnez/Görüşmeler/Değerlendirmeler/Testler/Raporlar/Belgeler/Notlar/Geçmiş sekmeleri
            — PHASE-03'te anamnez+görüşme, PHASE-04'te değerlendirme+test, PHASE-05'te rapor
          </p>
        </div>
      </div>
    </div>
  );
}
