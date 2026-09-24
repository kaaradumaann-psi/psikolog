import { useEffect, useState } from 'react';
import { listNotesByClient, createNote, updateNote, deleteNote } from './noteApi';
import type { Note } from './noteTypes';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function NoteSection({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listNotesByClient(clientId);
      setNotes(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  const handleCreate = async () => {
    if (!content.trim()) return;
    try {
      const note = await createNote(clientId, content);
      setNotes((prev) => [note, ...prev]);
      setContent('');
      showToast('Not eklendi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const updated = await updateNote(id, { content: editContent });
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
      showToast('Not güncellendi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const updated = await updateNote(note.id, { isPinned: !note.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteNote(deleteId);
      setNotes((prev) => prev.filter((n) => n.id !== deleteId));
      showToast('Not silindi', 'success');
      setDeleteId(null);
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Yeni Not</h3>
        <textarea className="textarea" rows={3} value={content} onChange={(e) => setContent(e.target.value)} maxLength={8000} placeholder="Not içeriği (max 8000)" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={handleCreate} disabled={!content.trim()}>Ekle</button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">—</div>
          <h4>Henüz not yok</h4>
          <p>Danışana özel hızlı notlar — pin, düzenle, sil</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} className="card" style={{ padding: '10px 12px', borderLeft: n.isPinned ? '3px solid var(--primary)' : undefined }}>
              {editingId === n.id ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <textarea className="textarea" rows={3} value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={8000} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>Vazgeç</button>
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => handleUpdate(n.id)}>Kaydet</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString('tr-TR')} {n.isPinned ? '• 📌 Sabit' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => handleTogglePin(n)}>{n.isPinned ? 'Unpin' : 'Pin'}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditingId(n.id); setEditContent(n.content); }}>Düzenle</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteId(n.id)}>Sil</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Notu sil?" description="Bu işlem geri alınamaz." confirmLabel="Sil" variant="danger" />
    </div>
  );
}
