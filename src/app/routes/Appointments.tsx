import { useEffect, useState } from 'react';
import { listAppointments, createAppointment, updateAppointment, deleteAppointment } from '../../features/appointments/appointmentApi';
import type { Appointment } from '../../features/appointments/appointmentTypes';
import { showToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Modal';

export function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', startAt: '', endAt: '', location: '', status: 'scheduled' as Appointment['status'] });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAppointments();
      setItems(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.startAt || !form.endAt) { showToast('Başlık ve tarih zorunlu', 'error'); return; }
    try {
      const created = await createAppointment({
        title: form.title,
        description: form.description || null,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        location: form.location || null,
        status: form.status,
      });
      setItems((prev) => [...prev, created].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
      setForm({ title: '', description: '', startAt: '', endAt: '', location: '', status: 'scheduled' });
      setShowForm(false);
      showToast('Randevu oluşturuldu', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointment(deleteId);
      setItems((prev) => prev.filter((a) => a.id !== deleteId));
      setDeleteId(null);
      showToast('Randevu silindi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div>
          <h1>Randevular</h1>
          <p>Org içi randevular — client optional, start/end validation, status scheduled/completed/cancelled/no_show</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Kapat' : '+ Yeni Randevu'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <div className="field"><label className="field-label">Başlık *</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={180} /></div>
          <div className="field"><label className="field-label">Açıklama</label><textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label className="field-label">Başlangıç *</label><input className="input" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></div>
            <div className="field"><label className="field-label">Bitiş *</label><input className="input" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label className="field-label">Konum</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} placeholder="Online / Ofis" /></div>
            <div className="field"><label className="field-label">Durum</label><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Appointment['status'] })}><option value="scheduled">scheduled</option><option value="completed">completed</option><option value="cancelled">cancelled</option><option value="no_show">no_show</option></select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="btn btn--primary btn--sm" onClick={handleCreate}>Kaydet</button></div>
        </div>
      )}

      {loading ? <div className="card" style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((a) => (
            <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 14 }}>{a.title}</b><span className="badge">{a.status}</span>{a.location && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.location}</span>}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{new Date(a.startAt).toLocaleString('tr-TR')} → {new Date(a.endAt).toLocaleString('tr-TR')}</div>
                {a.description && <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>{a.description.slice(0, 120)}</div>}
                {a.clientId && <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>client:{a.clientId.slice(0, 8)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => updateAppointment(a.id, { status: a.status === 'scheduled' ? 'completed' : 'scheduled' }).then((updated) => setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x))).catch((e) => showToast((e as Error).message, 'error'))}>{a.status === 'scheduled' ? 'Tamamla' : 'Planla'}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleteId(a.id)}>Sil</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="empty-state-card"><div className="empty-state-icon">—</div><h4>Henüz randevu yok</h4><p>Yeni randevu ekleyin — title 1-180, start/end, location, status</p></div>}
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Randevuyu sil?" description="Bu işlem geri alınamaz." confirmLabel="Sil" variant="danger" />
    </div>
  );
}
