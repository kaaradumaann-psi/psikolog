import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { getClients } from '../../clinical/clinicalStore';
import {
  deleteTask,
  getTasks,
  newId,
  saveTask,
  subscribePracticeStore,
  type PracticeTask,
  type TaskPriority,
  type TaskStatus,
} from '../../clinical/practiceStore';
import { Icon } from '../Icon';

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Yapılacak',
  in_progress: 'Sürüyor',
  done: 'Tamam',
  cancelled: 'İptal',
};

export function TasksPage() {
  const [tasks, setTasks] = useState<PracticeTask[]>(() => getTasks());
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const clients = useMemo(() => getClients(), []);
  const [form, setForm] = useState({
    title: '',
    description: '',
    clientId: '',
    dueDate: new Date().toISOString().slice(0, 10),
    priority: 'medium' as TaskPriority,
  });

  useEffect(() => subscribePracticeStore(() => setTasks(getTasks())), []);

  const visible = tasks.filter((task) => (filter === 'all' ? true : task.status === 'todo' || task.status === 'in_progress'));

  function cycle(task: PracticeTask) {
    const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length] ?? 'todo';
    saveTask({ ...task, status: task.status === 'cancelled' ? 'todo' : next, updatedAt: new Date().toISOString() });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const client = clients.find((item) => item.id === form.clientId);
    const now = new Date().toISOString();
    saveTask({
      id: newId('task'),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      clientId: client?.id,
      clientName: client ? `${client.firstName} ${client.lastName}` : undefined,
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    });
    setForm({ ...form, title: '', description: '' });
    setOpen(false);
  }

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker"><span className="clinical-kicker-dot" /><span>İş takibi</span></div>
          <h1>Görevler</h1>
          <p>Seans hazırlığı, ölçek takibi ve idari işler. Danışana bağlamak isteğe bağlıdır.</p>
        </div>
        <div className="clinical-actions">
          <button type="button" className="btn-secondary" onClick={() => setFilter(filter === 'open' ? 'all' : 'open')}>
            {filter === 'open' ? 'Tümünü göster' : 'Açıkları göster'}
          </button>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} />
            <span>Görev ekle</span>
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state-card">
          <Icon name="clipboard" size={28} />
          <h4>Açık görev yok</h4>
          <p>Seans sonrası takip, ölçek tekrarı veya idari iş için görev ekleyin.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((task) => (
            <article key={task.id} className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{task.title}</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4 }}>
                  {task.clientName || 'Danışansız'} · {task.dueDate || 'Tarihsiz'} · {task.priority === 'high' ? 'Yüksek' : task.priority === 'low' ? 'Düşük' : 'Orta'} öncelik
                </div>
                {task.description && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--soft)' }}>{task.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => cycle(task)}>{STATUS_LABEL[task.status]}</button>
                <button type="button" className="btn-icon" aria-label="Görevi sil" onClick={() => deleteTask(task.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="clinical-modal-backdrop" onClick={() => setOpen(false)}>
          <form className="clinical-modal" onClick={(event) => event.stopPropagation()} onSubmit={onSubmit}>
            <div className="clinical-modal-head">
              <h3>Yeni görev</h3>
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Kapat"><Icon name="close" size={18} /></button>
            </div>
            <div className="clinical-modal-body">
              <div className="form-group">
                <label htmlFor="task-title">Başlık</label>
                <input id="task-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={180} required />
              </div>
              <div className="form-group">
                <label htmlFor="task-client">Danışan</label>
                <select id="task-client" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
                  <option value="">Bağlama</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="task-due">Son tarih</label>
                  <input id="task-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="task-pri">Öncelik</label>
                  <select id="task-pri" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="task-desc">Not</label>
                <textarea id="task-desc" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1000} rows={3} />
              </div>
            </div>
            <div className="clinical-modal-foot">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
              <button type="submit" className="btn-primary">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
