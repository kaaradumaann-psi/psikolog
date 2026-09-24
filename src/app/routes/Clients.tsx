import { useEffect, useState } from 'react';
import { navigate } from '../router';
import { ClientList } from '../../features/clients/ClientList';
import { ClientForm } from '../../features/clients/ClientForm';
import { getClient, archiveClient, activateClient, deleteClient } from '../../features/clients/clientApi';
import type { Client } from '../../features/clients/clientTypes';
import { CLIENT_STATUS_LABEL } from '../../features/clients/clientTypes';
import { formatDateTR } from '../../lib/dateGuards';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';
import type { AuthenticatedUser } from '../../auth/authTypes';

export function ClientsPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Danışanlar</h1>
          <p>Danışan dosyanızı yönetin — arama, filtre, sayfalama (hasMore+count visible)</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/clients/new')}>
          + Yeni Danışan
        </button>
      </div>

      <ClientList />
    </div>
  );
}

export function ClientNewPage({ user }: { user: AuthenticatedUser }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="kicker">
            <span className="kicker-dot" /> Yeni Danışan
          </div>
          <h1>Yeni Danışan Oluştur</h1>
          <p>KVKK minimizasyon — sadece gerekli alanlar, file_number org içinde unique auto</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>
          ← Listeye Dön
        </button>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <ClientForm
          userId={user.id}
          onSuccess={(c) => navigate(`/clients/${c.id}`, { replace: true })}
          onCancel={() => navigate('/clients')}
        />
      </div>
    </div>
  );
}

export function ClientFilePage({ id, tab, user }: { id: string; tab?: string; user: AuthenticatedUser }) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeTab = tab || 'genel';
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
  ] as const;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getClient(id)
      .then((c) => {
        if (!cancelled) setClient(c);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleArchive = async () => {
    if (!client) return;
    try {
      const updated =
        client.status === 'active' ? await archiveClient(client.id) : await activateClient(client.id);
      setClient(updated);
      showToast(updated.status === 'archived' ? 'Arşivlendi' : 'Aktifleştirildi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await deleteClient(client.id);
      showToast('Danışan silindi', 'success');
      navigate('/clients', { replace: true });
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        Yükleniyor…
      </div>
    );
  }

  if (error || !client) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Danışan Bulunamadı</h1>
            <p>{error || 'ID geçersiz'}</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>
            ← Listeye Dön
          </button>
        </div>
        <div className="card">
          <div className="empty-state-card">
            <div className="empty-state-icon">!</div>
            <h4>Danışan bulunamadı</h4>
            <p>IDOR koruması: bu danışan sizin organizasyonunuzda değil veya silinmiş olabilir</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>ID: {id}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <div className="kicker">
              <span className="kicker-dot" /> {client.fileNumber}
            </div>
            <span className={`badge badge--${client.status === 'active' ? 'success' : 'default'}`}>
              {CLIENT_STATUS_LABEL[client.status]}
            </span>
          </div>
          <h1>
            {client.firstName} {client.lastName}
          </h1>
          <p>
            {client.birthDate ? formatDateTR(client.birthDate) + ' • ' : ''}
            {client.profession || ''} {client.profession && client.education ? ' • ' : ''}
            {client.education || ''} • Oluşturulma {new Date(client.createdAt).toLocaleDateString('tr-TR')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients')}>
            ← Liste
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Vazgeç' : 'Düzenle'}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmArchive(true)}>
            {client.status === 'active' ? 'Arşivle' : 'Aktifleştir'}
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(true)}>
            Sil
          </button>
        </div>
      </div>

      <div className="client-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`client-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => navigate(`/clients/${id}?tab=${t}`)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {editing ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <ClientForm
            userId={user.id}
            initial={client}
            onSuccess={(c) => {
              setClient(c);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {activeTab === 'genel' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12, letterSpacing: '-0.01em' }}>Genel Bilgiler</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>Dosya No</span>
                  <b>{client.fileNumber}</b>
                  <span style={{ color: 'var(--muted)' }}>Ad Soyad</span>
                  <b>
                    {client.firstName} {client.lastName}
                  </b>
                  <span style={{ color: 'var(--muted)' }}>Doğum</span>
                  <span>{client.birthDate ? formatDateTR(client.birthDate) : '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Telefon</span>
                  <span>{client.phone || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>E-posta</span>
                  <span>{client.email || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Meslek</span>
                  <span>{client.profession || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Eğitim</span>
                  <span>{client.education || '—'}</span>
                  <span style={{ color: 'var(--muted)' }}>Durum</span>
                  <span>{CLIENT_STATUS_LABEL[client.status]}</span>
                  <span style={{ color: 'var(--muted)' }}>Oluşturan</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{client.createdBy.slice(0, 8)}…</span>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Sonraki Adımlar (PHASE-03+)</h3>
                <p style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6 }}>
                  Anamnez, görüşmeler, değerlendirmeler, testler, raporlar, belgeler, notlar, geçmiş sekmeleri
                  PHASE-03'ten itibaren aktif olacak. Şu an genel bilgiler + arşiv/sil çalışıyor.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--soft btn--sm"
                    onClick={() => navigate(`/clients/${id}?tab=anamnez`)}
                  >
                    Anamnez (PHASE-03)
                  </button>
                  <button
                    type="button"
                    className="btn btn--soft btn--sm"
                    onClick={() => navigate(`/clients/${id}?tab=görüşmeler`)}
                  >
                    Görüşme Ekle (PHASE-03)
                  </button>
                  <button
                    type="button"
                    className="btn btn--soft btn--sm"
                    onClick={() => navigate(`/clients/${id}?tab=raporlar`)}
                  >
                    Rapor (PHASE-05)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'genel' && (
            <div className="card">
              <div className="empty-state-card">
                <div className="empty-state-icon">—</div>
                <h4>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} — PHASE-03+</h4>
                <p>
                  Bu sekme PHASE-03 (anamnez/görüşmeler), PHASE-04 (değerlendirme/test), PHASE-05 (rapor),
                  PHASE-06 (belge) fazlarında aktif olacak.
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                  Mevcut danışan: {client.firstName} {client.lastName} ({client.fileNumber})
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={handleArchive}
        title={client.status === 'active' ? 'Arşivle?' : 'Aktifleştir?'}
        description={
          client.status === 'active'
            ? 'Danışan arşive taşınacak, listede arşiv filtresiyle görünecek.'
            : 'Danışan aktif hale getirilecek.'
        }
        confirmLabel={client.status === 'active' ? 'Arşivle' : 'Aktifleştir'}
        variant="primary"
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Danışanı sil?"
        description="Bu işlem geri alınamaz. Danışana bağlı anamnez/görüşme/değerlendirme/rapor/belge de silinebilir (cascade). Audit log kalır."
        confirmLabel="Sil"
        variant="danger"
      />
    </div>
  );
}
