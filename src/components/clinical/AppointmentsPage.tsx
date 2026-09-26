import { useState, useEffect, useMemo } from 'react';
import type { Appointment, Client, SessionType, AppointmentStatus, PaymentStatus } from '../../clinical/clinicalTypes';
import {
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getClients,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { getSettings } from '../../clinical/practiceStore';
import { clinicToday } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { Icon } from '../Icon';
import { navigate } from '../../router';

function monthLabel(date: Date): string {
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
}
function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
// Monday = 0
function weekdayMon0(d: Date): number {
  const w = d.getDay(); // 0 Sun ..6 Sat
  return (w + 6) % 7;
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Appointment>>({
    clientId: '',
    clientName: '',
    date: clinicToday(),
    time: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    location: 'Klinik (Yüz Yüze)',
    status: 'scheduled',
    notes: '',
    fee: getSettings().defaultFee,
    paymentStatus: 'pending',
  });

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setAppointments(getAppointments());
      setClients(getClients());
    });
    return unsub;
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(a => {
        const matchDate = !dateFilter || a.date === dateFilter;
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchDate && matchStatus;
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [appointments, dateFilter, statusFilter]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (statusFilter !== 'all' && a.status !== statusFilter) continue;
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [appointments, statusFilter]);

  function openNewModal(prefillDate?: string) {
    setEditingApp(null);
    setFormError(null);
    setForm({
      clientId: '',
      clientName: '',
      date: prefillDate || clinicToday(),
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      notes: '',
      fee: getSettings().defaultFee,
      paymentStatus: 'pending',
    });
    setModalOpen(true);
  }

  function openEditModal(a: Appointment) {
    setEditingApp(a);
    setFormError(null);
    setForm({ ...a });
    setModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setFormError('Lütfen bir danışan seçiniz.');
      return;
    }
    const selectedClient = clients.find(c => c.id === form.clientId);
    const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : form.clientName || '';

    const appToSave: Appointment = {
      id: editingApp ? editingApp.id : 'app_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: form.clientId,
      clientName,
      date: form.date || clinicToday(),
      time: form.time || '14:00',
      durationMinutes: Number(form.durationMinutes) || 50,
      sessionType: (form.sessionType as SessionType) || 'Bireysel Terapi',
      location: form.location as 'Klinik (Yüz Yüze)' | 'Online (Görüntülü)' | 'Dış Görüşme' || 'Klinik (Yüz Yüze)',
      status: (form.status as AppointmentStatus) || 'scheduled',
      notes: form.notes?.trim() || '',
      fee: Number(form.fee) || 0,
      paymentStatus: (form.paymentStatus as PaymentStatus) || 'pending',
      createdAt: editingApp ? editingApp.createdAt : new Date().toISOString(),
    };

    saveAppointment(appToSave);
    setModalOpen(false);
    setFormError(null);
  }

  function completeAppointmentAndOpenFile(a: Appointment) {
    saveAppointment({ ...a, status: 'completed' });
    navigate(`/danisanlar/${a.clientId}`);
  }

  const todayIso = clinicToday();
  const cursorYear = monthCursor.getFullYear();
  const cursorMonth = monthCursor.getMonth();
  const firstDay = startOfMonth(monthCursor);
  const totalDays = daysInMonth(monthCursor);
  const leading = weekdayMon0(firstDay);
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < leading; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(cursorYear, cursorMonth, d);
    cells.push({ date: isoFromDate(dt), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  // Ensure 6 rows max 42 cells for stable height
  while (cells.length < 42) {
    if (cells.length >= 35 && cells.slice(35).every(c => c.date === null)) break;
    cells.push({ date: null, day: null });
    if (cells.length >= 42) break;
  }

  const weekLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="clinical-container">
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Planlama &amp; Takvim</span>
          </div>
          <h1>Randevu &amp; Seans Takvimi</h1>
          <p>Danışan görüşmeleri, klinik seans saatleri ve randevu takibi.</p>
        </div>
        <div className="clinical-actions">
          <button type="button" className="btn-primary" onClick={() => openNewModal()}>
            <Icon name="plus" size={16} />
            <span>Yeni Randevu Planla</span>
          </button>
        </div>
      </div>

      <div className="calendar-view-controls" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'inline-flex', gap: 6, background: 'var(--bg-soft)', border: '1px solid var(--hairline)', borderRadius: '999px', padding: 3 }}>
            <button type="button" className={`btn-secondary btn-sm ${view === 'calendar' ? 'is-active' : ''}`} aria-pressed={view === 'calendar'} onClick={() => setView('calendar')} style={view === 'calendar' ? { background: '#fff', borderColor: 'var(--hairline)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(13,13,13,0.06)' } : { background: 'transparent', borderColor: 'transparent' }}>
              <Icon name="calendar" size={14} /> Takvim
            </button>
            <button type="button" className={`btn-secondary btn-sm ${view === 'list' ? 'is-active' : ''}`} aria-pressed={view === 'list'} onClick={() => setView('list')} style={view === 'list' ? { background: '#fff', borderColor: 'var(--hairline)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(13,13,13,0.06)' } : { background: 'transparent', borderColor: 'transparent' }}>
              <Icon name="list" size={14} /> Liste
            </button>
          </div>
          {view === 'calendar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="btn-secondary btn-sm" aria-label="Önceki ay" onClick={() => setMonthCursor(new Date(cursorYear, cursorMonth - 1, 1))}><Icon name="left" size={14} /></button>
              <strong style={{ minWidth: 140, textAlign: 'center', fontSize: 14, textTransform: 'capitalize' }}>{monthLabel(monthCursor)}</strong>
              <button type="button" className="btn-secondary btn-sm" aria-label="Sonraki ay" onClick={() => setMonthCursor(new Date(cursorYear, cursorMonth + 1, 1))}><Icon name="right" size={14} /></button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setMonthCursor(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); })}>Bugün</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="date"
              className="filter-select"
              aria-label="Tarihe göre filtrele"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setDateFilter('')}
              >
                Tüm Tarihler
              </button>
            )}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Randevu Durumu Filtresi"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="scheduled">Planlandı (Bekliyor)</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
              <option value="noshow">Danışan Gelmedi</option>
            </select>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="modern-table-card" style={{ padding: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
            {weekLabels.map(l => (
              <div key={l} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', padding: '6px 0' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
            {cells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={idx} style={{ minHeight: 105, borderRadius: 10, background: 'transparent' }} aria-hidden="true" />;
              }
              const list = calendarMap.get(cell.date) ?? [];
              const isToday = cell.date === todayIso;
              const isSelected = dateFilter === cell.date;
              return (
                <div
                  key={cell.date}
                  className={`calendar-day-cell${isToday ? ' today' : ''}${isSelected ? ' is-selected' : ''}`}
                  style={{
                    minHeight: 112,
                    background: isSelected ? '#f1f7ff' : isToday ? '#fbfdff' : 'var(--bg)',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'default',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openNewModal(cell.date!)}
                      aria-label={`${cell.date} için randevu planla`}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: isToday ? 'var(--accent)' : 'var(--bg-soft)',
                        color: isToday ? '#fff' : 'var(--text)',
                        border: isToday ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none',
                      }}
                    >
                      {cell.day}
                    </button>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{list.length ? `${list.length} randevu` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', minHeight: 0, flex: 1 }}>
                    {list.slice(0, 3).map(app => (
                      <button
                        key={app.id}
                        type="button"
                        className={`appointment-pill status-${app.status}`}
                        onClick={() => openEditModal(app)}
                        title={`${app.time} ${app.clientName} — ${app.sessionType}`}
                        style={{
                          padding: '4px 6px',
                          borderRadius: 6,
                          fontSize: 11,
                          lineHeight: 1.2,
                          background: app.status === 'completed' ? 'var(--success-tint)' : app.status === 'cancelled' ? 'var(--danger-tint)' : app.status === 'noshow' ? 'var(--warning-tint)' : 'var(--primary-tint)',
                          border: app.status === 'completed' ? '1px solid var(--success-border)' : app.status === 'cancelled' ? '1px solid var(--danger-border)' : app.status === 'noshow' ? '1px solid var(--warning-border)' : '1px solid var(--primary-border)',
                          color: app.status === 'completed' ? 'var(--success)' : app.status === 'cancelled' ? 'var(--danger)' : app.status === 'noshow' ? 'var(--warning)' : 'var(--accent-ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'left',
                        }}
                      >
                        {app.time} {app.clientName}
                      </button>
                    ))}
                    {list.length > 3 && (
                      <span style={{ fontSize: 10, color: 'var(--soft)', textAlign: 'center' }}>+{list.length - 3} daha</span>
                    )}
                    {list.length === 0 && <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }} aria-hidden="true">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredAppointments.length === 0 && appointments.length === 0 && (
            <div className="empty-state-card" style={{ marginTop: 12 }}>
              <Icon name="calendar" size={28} />
              <h4>Takvim henüz boş</h4>
              <p>Görüşme saatlerini burada planlayın ve seans öncesi hazırlığı tek yerden görün.</p>
              {clients.length === 0 ? (
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/danisanlar?yeni=1')}>Önce danışan ekle</button>
              ) : (
                <button type="button" className="btn-primary btn-sm" onClick={() => openNewModal()}>Randevu ekle</button>
              )}
            </div>
          )}
          {appointments.length > 0 && filteredAppointments.length === 0 && (
            <div className="empty-state-card" style={{ marginTop: 12 }}>
              <Icon name="calendar" size={28} />
              <h4>Filtreye uygun randevu yok</h4>
              <p>Başka bir durum seçin.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setStatusFilter('all')}>Filtreleri temizle</button>
            </div>
          )}
        </div>
      ) : (
        <div className="client-table-wrap mobile-card-table">
          {filteredAppointments.length === 0 ? (
            <div className="empty-state-card">
              <Icon name="calendar" size={30} />
              <h4>{appointments.length > 0 ? 'Filtreye uygun randevu yok' : 'Takvim henüz boş'}</h4>
              <p>{appointments.length > 0 ? 'Başka bir tarih veya durum seçin.' : 'Görüşme saatlerini burada planlayın ve seans öncesi hazırlığı tek yerden görün.'}</p>
              {appointments.length > 0 ? (
                <button type="button" className="btn-secondary btn-sm" onClick={() => { setDateFilter(''); setStatusFilter('all'); }}>Filtreleri temizle</button>
              ) : clients.length === 0 ? (
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/danisanlar?yeni=1')}>Önce danışan ekle</button>
              ) : (
                <button type="button" className="btn-primary btn-sm" onClick={() => openNewModal()}>Randevu ekle</button>
              )}
            </div>
          ) : (
            <table className="client-table" data-mobile-cards>
              <thead>
                <tr>
                  <th>Tarih &amp; Saat</th>
                  <th>Danışan</th>
                  <th>Seans Türü</th>
                  <th>Görüşme Yeri</th>
                  <th>Durum</th>
                  <th>Notlar</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(app => (
                  <tr key={app.id}>
                    <td data-label="Tarih ve saat">
                      <div>
                        <strong style={{ fontSize: 13.5 }}>{app.date}</strong>
                        <div style={{ color: 'var(--soft)', fontSize: 12 }}>
                          Saat {app.time} ({app.durationMinutes} dk)
                        </div>
                      </div>
                    </td>
                    <td data-label="Danışan">
                      <div className="client-avatar-cell">
                        <div className="client-mini-avatar">
                          {app.clientName.charAt(0)}
                        </div>
                        <button type="button" className="client-name-button" onClick={() => navigate(`/danisanlar/${app.clientId}`)}>{app.clientName}</button>
                      </div>
                    </td>
                    <td data-label="Seans türü">
                      <span style={{ fontSize: 13 }}>{app.sessionType}</span>
                    </td>
                    <td data-label="Görüşme yeri">
                      <span style={{ fontSize: 12.5, color: 'var(--soft)' }}>{app.location}</span>
                    </td>
                    <td data-label="Durum">
                      <span
                        className={`badge ${
                          app.status === 'completed'
                            ? 'badge-active'
                            : app.status === 'cancelled'
                            ? 'badge-archived'
                            : app.status === 'noshow'
                            ? 'badge-risk-moderate'
                            : 'badge-followup'
                        }`}
                      >
                        {app.status === 'scheduled' && 'Planlandı'}
                        {app.status === 'completed' && 'Tamamlandı'}
                        {app.status === 'cancelled' && 'İptal'}
                        {app.status === 'noshow' && 'Gelmedi'}
                      </span>
                    </td>
                    <td data-label="Notlar">
                      <span className="appointment-note">
                        {app.notes || '—'}
                      </span>
                    </td>
                    <td data-label="İşlemler" style={{ textAlign: 'right' }}>
                      <div className="client-row-actions">
                        {app.status === 'scheduled' && (
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            title="Randevuyu tamamlandı olarak işaretle ve danışan dosyasını aç"
                            onClick={() => completeAppointmentAndOpenFile(app)}
                          >
                            <Icon name="checkCircle" size={13} />
                            <span>Görüşmeyi tamamla</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          title="Randevuyu düzenle"
                          aria-label={`${app.clientName} randevusunu düzenle`}
                          onClick={() => openEditModal(app)}
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Randevuyu sil"
                          aria-label={`${app.clientName} randevusunu sil`}
                          onClick={() => setDeleteId(app.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Randevuyu sil"
          description="Bu randevu kaydı silinecek. Geri alınamaz."
          confirmLabel="Sil"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            const id = deleteId;
            setDeleteId(null);
            if (id) deleteAppointment(id);
          }}
        />
      )}

      {modalOpen && (
        <ClinicalDialog titleId="appointment-dialog-title" onClose={() => setModalOpen(false)}>
            <div className="clinical-modal-head">
              <h3 id="appointment-dialog-title">{editingApp ? 'Randevuyu Düzenle' : 'Yeni Randevu Planla'}</h3>
              <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={() => setModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="clinical-modal-body">
                {formError && <p className="form-error" role="alert" style={{ color: 'var(--danger-ink)', background: 'var(--danger-tint)', border: '1px solid var(--danger-border)', padding: '8px 10px', borderRadius: 8, fontSize: 13, margin: 0 }}>{formError}</p>}
                <div className="form-group">
                  <label>Danışan *</label>
                  <select
                    value={form.clientId || ''}
                    onChange={e => {
                      const cl = clients.find(c => c.id === e.target.value);
                      setFormError(null);
                      setForm({
                        ...form,
                        clientId: e.target.value,
                        clientName: cl ? `${cl.firstName} ${cl.lastName}` : '',
                      });
                    }}
                    required
                  >
                    <option value="">Danışan Seçin...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.fileNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Tarih *</label>
                    <input
                      type="date"
                      value={form.date || ''}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Saat *</label>
                    <input
                      type="time"
                      value={form.time || '14:00'}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Seans Türü</label>
                    <select
                      value={form.sessionType || 'Bireysel Terapi'}
                      onChange={e => setForm({ ...form, sessionType: e.target.value as SessionType })}
                    >
                      <option value="Bireysel Terapi">Bireysel Terapi</option>
                      <option value="Çift / Aile Terapisi">Çift / Aile Terapisi</option>
                      <option value="İlk Görüşme / Anamnez">İlk Görüşme / Anamnez</option>
                      <option value="Psikolojik Değerlendirme">Psikolojik Değerlendirme</option>
                      <option value="Kriz Müdahalesi">Kriz Müdahalesi</option>
                      <option value="Online Terapi">Online Terapi</option>
                      <option value="Takip Seansı">Takip Seansı</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Görüşme Yeri</label>
                    <select
                      value={form.location || 'Klinik (Yüz Yüze)'}
                      onChange={e => setForm({ ...form, location: e.target.value as Appointment['location'] })}
                    >
                      <option value="Klinik (Yüz Yüze)">Klinik (Yüz Yüze)</option>
                      <option value="Online (Görüntülü)">Online (Görüntülü)</option>
                      <option value="Dış Görüşme">Dış Görüşme</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Randevu Durumu</label>
                    <select
                      value={form.status || 'scheduled'}
                      onChange={e => setForm({ ...form, status: e.target.value as AppointmentStatus })}
                    >
                      <option value="scheduled">Planlandı (Bekliyor)</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal Edildi</option>
                      <option value="noshow">Danışan Gelmedi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Seans Süresi (Dakika)</label>
                    <input
                      type="number"
                      min={15}
                      step={5}
                      value={form.durationMinutes || 50}
                      onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Randevu Notu / Hatırlatıcı</label>
                  <textarea
                    rows={2}
                    value={form.notes || ''}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Seans öncesi hatırlanacak konular..."
                  />
                </div>
              </div>

              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary">
                  {editingApp ? 'Randevuyu Güncelle' : 'Randevuyu Kaydet'}
                </button>
              </div>
            </form>
        </ClinicalDialog>
      )}
    </div>
  );
}
