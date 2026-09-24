import { useEffect, useState } from 'react';
import { listSessionsByClient, deleteSession } from './sessionApi';
import type { Session } from './sessionTypes';
import { formatDateTR } from '../../lib/dateGuards';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function SessionList({ clientId, refreshKey }: { clientId: string; refreshKey?: number }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listSessionsByClient(clientId);
      setSessions(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId, refreshKey]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSession(deleteId);
      showToast('Görüşme silindi', 'success');
      setDeleteId(null);
      load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  if (sessions.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-state-icon">—</div>
        <h4>Henüz görüşme yok</h4>
        <p>İlk görüşmeyi ekleyin — tarih, tür, süre, not, gözlem, önemli noktalar, plan, takip</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 12 }}>
        {sessions.map((s) => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <b style={{ fontSize: 14 }}>{formatDateTR(s.date)}</b>
                  <span className="badge">{s.type}</span>
                  {s.duration && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.duration} dk</span>}
                </div>
                {s.notes && (
                  <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                    {s.notes.slice(0, 200)}
                    {s.notes.length > 200 ? '…' : ''}
                  </div>
                )}
                {s.keyPoints && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Önemli: {s.keyPoints.slice(0, 120)}
                  </div>
                )}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteId(s.id)}>
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Görüşmeyi sil?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        variant="danger"
      />
    </>
  );
}
