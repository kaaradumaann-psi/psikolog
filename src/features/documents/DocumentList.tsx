import { useEffect, useState } from 'react';
import { listDocumentsByClient, deleteDocument, getSignedUrl, uploadDocument } from './documentApi';
import type { Document } from './documentTypes';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function DocumentSection({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listDocumentsByClient(clientId);
      setDocs(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await uploadDocument(clientId, file, description || undefined);
      setDocs((prev) => [doc, ...prev]);
      setDescription('');
      showToast('Belge yüklendi (PRIVATE BUCKET)', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const url = await getSignedUrl(doc.filePath, 3600);
      window.open(url, '_blank');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id, deleteTarget.filePath);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast('Belge silindi', 'success');
      setDeleteTarget(null);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Yeni Belge (PRIVATE BUCKET, signed URL)</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <input className="input" placeholder="Açıklama (opsiyonel, max 1000)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt" onChange={handleUpload} disabled={uploading} />
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>İzin: pdf/jpg/png/webp/doc/docx/txt, max 50MB, public URL yok — sadece 1 saatlik signed URL</div>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>Henüz belge yok</h4>
          <p>PRIVATE BUCKET client-documents — org_id/client_id/fileId-name path, RLS org isolation</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {docs.map((d) => (
            <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.fileName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {d.mimeType} • {(d.sizeBytes / 1024).toFixed(1)} KB • {new Date(d.createdAt).toLocaleString('tr-TR')}
                </div>
                {d.description && <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>{d.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleDownload(d)}>İndir</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteTarget(d)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Belgeyi sil?"
        description={`${deleteTarget?.fileName} — storage + DB silinecek`}
        confirmLabel="Sil"
        variant="danger"
      />
    </div>
  );
}
