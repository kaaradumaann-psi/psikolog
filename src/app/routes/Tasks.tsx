import { useEffect, useState } from 'react';
import { listTasks, createTask, updateTask, deleteTask } from '../../features/tasks/taskApi';
import type { Task } from '../../features/tasks/taskTypes';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function TasksPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', status: 'todo' as Task['status'], priority: 'medium' as Task['priority'] });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTasks();
      setItems(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { showToast('Başlık zorunlu', 'error'); return; }
    try {
      const created = await createTask({ title: form.title, description: form.description || null, dueDate: form.dueDate || null, status: form.status, priority: form.priority });
      setItems((prev) => [...prev, created].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')));
      setForm({ title: '', description: '', dueDate: '', status: 'todo', priority: 'medium' });
      setShowForm(false);
      showToast('Görev oluşturuldu', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTask(deleteId);
      setItems((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
      showToast('Görev silindi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1>Görevler</h1>
          <p>Org içi görevler — client optional, due_date, status todo/in_progress/done/cancelled, priority low/medium/high</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Kapat' : '+ Yeni Görev'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <div className="field"><label className="field-label">Başlık *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={180} /></div>
          <div className="field"><label className="field-label">Açıklama</label><textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="field"><label className="field-label">Bitiş Tarihi</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="field"><label className="field-label">Durum</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option><option value="cancelled">cancelled</option></select></div>
            <div className="field"><label className="field-label">Öncelik</label><select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="btn btn--primary btn--sm" onClick={handleCreate}>Kaydet</button></div>
        </div>
      )}

      {loading ? <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderLeft: t.priority === 'high' ? '3px solid #e53e3e' : t.priority === 'medium' ? '3px solid #d69e2e' : '3px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 14 }}>{t.title}</b><span className="badge">{t.status}</span><span className="badge">{t.priority}</span></div>
                {t.description && <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>{t.description.slice(0, 120)}</div>}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{t.dueDate ? `Bitiş: ${t.dueDate}` : 'Tarih yok'} {t.clientId ? `• client:${t.clientId.slice(0, 8)}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => updateTask(t.id, { status: t.status === 'todo' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'todo' }).then((updated) => setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x))).catch((e) => showToast((e as Error).message, 'error'))}>İlerlet</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteId(t.id)}>Sil</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="empty-state-card"><div className="empty-state-icon">—</div><h4>Henüz görev yok</h4><p>Yeni görev ekleyin — title 1-180, due_date, status, priority</p></div>}
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Görevi sil?" description="Bu işlem geri alınamaz." confirmLabel="Sil" variant="danger" />
    </div>
  );
}
