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
import { ClinicalDialog } from '../clinical/ClinicalDialog';
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
          <h4>{tasks.length > 0 ? 'Açık görev kalmadı' : 'Henüz görev yok'}</h4>
          <p>{tasks.length > 0 ? 'Tamamlanan görevleri görmek için tümünü gösterin.' : 'Seans sonrası takip, ölçek tekrarı veya idari işler için bir görev oluşturun.'}</p>
          {tasks.length > 0 ? (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setFilter('all')}>Tümünü göster</button>
          ) : (
            <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Görev ekle</button>
          )}
        </div>
      ) : (
        <div className="task-list">
          {visible.map((task) => (
            <article key={task.id} className={`task-card priority-${task.priority}`}>
              <div className="task-card-main">
                <span className="task-card-kicker">{task.clientName || 'Genel görev'}</span>
                <h2>{task.title}</h2>
                {task.description && <p>{task.description}</p>}
                <div className="task-card-meta">
                  <span><Icon name="calendar" size={15} /> {task.dueDate || 'Tarih belirlenmedi'}</span>
                  <span className={`task-priority priority-${task.priority}`}>{task.priority === 'high' ? 'Yüksek öncelik' : task.priority === 'low' ? 'Düşük öncelik' : 'Orta öncelik'}</span>
                </div>
              </div>
              <div className="task-card-actions">
                <button type="button" className="btn-secondary btn-sm" aria-label={`${task.title}: ${STATUS_LABEL[task.status]}. Durumu değiştir`} onClick={() => cycle(task)}>{STATUS_LABEL[task.status]} <Icon name="right" size={14} /></button>
                <button type="button" className="btn-icon" aria-label={`${task.title} görevini sil`} onClick={() => { if (window.confirm('Bu görevi silmek istiyor musunuz?')) deleteTask(task.id); }}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <ClinicalDialog titleId="task-dialog-title" onClose={() => setOpen(false)} onSubmit={onSubmit}>
            <div className="clinical-modal-head">
              <h3 id="task-dialog-title">Yeni görev</h3>
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
        </ClinicalDialog>
      )}
    </div>
  );
}
