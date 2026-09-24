import { useEffect, useState } from 'react';
import { listAssessmentsByClient, deleteAssessment } from './assessmentApi';
import type { Assessment } from './assessmentTypes';
import { formatDateTR } from '../../lib/dateGuards';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function AssessmentList({ clientId, refreshKey }: { clientId: string; refreshKey?: number }) {
  const [items, setItems] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAssessmentsByClient(clientId);
      setItems(data);
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
      await deleteAssessment(deleteId);
      showToast('Değerlendirme silindi', 'success');
      setDeleteId(null);
      load();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  if (items.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-state-icon">—</div>
        <h4>Henüz değerlendirme yok</h4>
        <p>Başvuru nedeni, yöntem, bulgular, uzman değerlendirmesi, sonuç, öneriler</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((a) => (
          <div key={a.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <b style={{ fontSize: 14 }}>{formatDateTR(a.assessmentDate)}</b>
                  {a.method && <span className="badge">{a.method.slice(0, 30)}</span>}
                </div>
                {a.reason && <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 6 }}>{a.reason.slice(0, 150)}</div>}
                {a.findings && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{a.findings.slice(0, 120)}</div>}
              </div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteId(a.id)}>
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
        title="Değerlendirmeyi sil?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        variant="danger"
      />
    </>
  );
}
