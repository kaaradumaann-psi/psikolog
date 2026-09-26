import { useState, useEffect, useMemo } from 'react';
import type { Appointment, Client, SessionType, AppointmentStatus, PaymentStatus, SoapSession } from '../../clinical/clinicalTypes';
import {
  completeAppointmentWithSession,
  getAppointments,
  getSoapSessions,
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

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function monthLabel(date: Date): string {
  return date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
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
// Pazartesi (Pzt) haftanın ilk günü kabul edilir.
function weekdayMon0(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [sessions, setSessions] = useState<SoapSession[]>(() => getSoapSessions());
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [pendingComplete, setPendingComplete] = useState<Appointment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);

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
      setSessions(getSoapSessions());
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

  // Takvim görünümü: gün başına randevu listesi (durum filtresi burada da geçerli;
  // tarih filtresi ise ay içindeki gün seçimiyle eşleşir, ayrıca kısıtlamaz).
  const calendarMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      if (statusFilter !== 'all' && appointment.status !== statusFilter) continue;
      const list = map.get(appointment.date) ?? [];
      list.push(appointment);
      map.set(appointment.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [appointments, statusFilter]);

  // Tarihe göre filtrelendiğinde takvim de aynı aya kaydırılır, aksi halde
  // kullanıcı doğru ayı manuel aramak zorunda kalır.
  useEffect(() => {
    const target = parseIsoDate(dateFilter);
    if (!target) return;
    setMonthCursor(new Date(target.getFullYear(), target.getMonth(), 1));
  }, [dateFilter]);

  function openNewModal(forClientId?: string, forDate?: string) {
    const selected = clients.find((client) => client.id === forClientId);
    setSaveError(null);
    setEditingApp(null);
    setForm({
      clientId: selected?.id ?? '',
      clientName: selected ? `${selected.firstName} ${selected.lastName}` : '',
      date: forDate || clinicToday(),
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

  // From a client file: use the existing appointment form with that client
  // preselected. A foreign/removed ID is never accepted as a client.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('yeni') !== '1') return;
    const requestedId = url.searchParams.get('danisan') ?? '';
    url.searchParams.delete('yeni');
    url.searchParams.delete('danisan');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (!requestedId || clients.some((client) => client.id === requestedId)) openNewModal(requestedId);
  }, [clients]);

  function openEditModal(a: Appointment) {
    setSaveError(null);
    setEditingApp(a);
    setForm({ ...a });
    setModalOpen(true);
  }

  const sessionByAppointment = useMemo(() => {
    const map = new Map<string, SoapSession>();
    for (const session of sessions) {
      if (session.appointmentId) map.set(session.appointmentId, session);
    }
    return map;
  }, [sessions]);

  function handleDelete(id: string) {
    const target = appointments.find((item) => item.id === id) ?? null;
    setPendingDelete(target);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!form.clientId || !clients.some((client) => client.id === form.clientId)) {
      setSaveError('Kayıtlı bir danışan seçin.');
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

    try {
      saveAppointment(appToSave);
      setModalOpen(false);
    } catch {
      setSaveError('Randevu saklanamadı. Verileri silmeyin; senkronizasyon durumunu kontrol edip yeniden deneyin.');
    }
  }

  /**
   * "Görüşmeyi tamamla": randevu tamamlanır ve danışan/psikolog/kurum bilgisi
   * otomatik dolan taslak SOAP notu oluşturulur. Kullanıcı bu bilgileri
   * yeniden girmez; not doğrudan danışanın seans sekmesinde açılır.
   */
  function confirmCompleteAppointment() {
    const appointment = pendingComplete;
    if (!appointment) return;
    try {
      completeAppointmentWithSession(appointment);
      setActionError(null);
      setEditingApp(null);
      setModalOpen(false);
      navigate(`/danisanlar/${appointment.clientId}?sekme=sessions`);
    } catch {
      setActionError('Görüşme tamamlanamadı. Verileri silmeyin; senkronizasyon durumunu kontrol edip yeniden deneyin.');
    } finally {
      setPendingComplete(null);
    }
  }

  function confirmDeleteAppointment() {
    const appointment = pendingDelete;
    if (!appointment) return;
    try {
      deleteAppointment(appointment.id);
      setActionError(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Randevu silinemedi.');
    } finally {
      setPendingDelete(null);
    }
  }

  const todayIso = clinicToday();
  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const total = daysInMonth(monthCursor);
    const leading = weekdayMon0(startOfMonth(monthCursor));
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < leading; i++) cells.push({ date: null, day: null });
    for (let day = 1; day <= total; day++) {
      cells.push({ date: isoFromDate(new Date(year, month, day)), day });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [monthCursor]);

  return (
    <div className="clinical-container">
      {/* Üst Başlık */}
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
          <button type="button" className="btn-primary" onClick={() => openNewModal(undefined, dateFilter || undefined)}>
            <Icon name="plus" size={16} />
            <span>Yeni Randevu Planla</span>
          </button>
        </div>
      </div>

      {actionError && <p className="record-lock-error" role="alert">{actionError}</p>}

      {/* Görünüm ve Filtreler */}
      <div className="calendar-view-controls">
        <div className="view-toggle-group" role="group" aria-label="Görünüm seçimi">
          <button
            type="button"
            className={`btn-secondary btn-sm ${view === 'calendar' ? 'is-active' : ''}`}
            aria-pressed={view === 'calendar'}
            onClick={() => setView('calendar')}
          >
            <Icon name="calendar" size={14} /> Takvim
          </button>
          <button
            type="button"
            className={`btn-secondary btn-sm ${view === 'list' ? 'is-active' : ''}`}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <Icon name="list" size={14} /> Liste
          </button>
        </div>

        {view === 'calendar' && (
          <div className="calendar-month-nav">
            <button type="button" className="btn-secondary btn-sm" aria-label="Önceki ay" onClick={() => setMonthCursor(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
              <Icon name="left" size={14} />
            </button>
            <strong className="calendar-month-label">{monthLabel(monthCursor)}</strong>
            <button type="button" className="btn-secondary btn-sm" aria-label="Sonraki ay" onClick={() => setMonthCursor(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <Icon name="right" size={14} />
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => { const t = new Date(); setMonthCursor(new Date(t.getFullYear(), t.getMonth(), 1)); }}>
              Bugün
            </button>
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

      {/* Takvim Görünümü */}
      {view === 'calendar' && (
        <div className="modern-table-card calendar-card">
          <div className="calendar-weekday-row" aria-hidden="true">
            {WEEKDAY_LABELS.map(label => (
              <div key={label} className="calendar-weekday-label">{label}</div>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarCells.map((cell, index) => {
              if (!cell.date) {
                return <div key={`empty-${index}`} className="calendar-day-cell is-outside" aria-hidden="true" />;
              }
              const dayAppointments = calendarMap.get(cell.date) ?? [];
              const isToday = cell.date === todayIso;
              const isSelected = dateFilter === cell.date;
              return (
                <div key={cell.date} className={`calendar-day-cell${isToday ? ' today' : ''}${isSelected ? ' is-selected' : ''}`}>
                  <div className="calendar-day-header">
                    <button
                      type="button"
                      className="calendar-day-number"
                      onClick={() => setDateFilter(isSelected ? '' : cell.date!)}
                      aria-pressed={isSelected}
                      aria-label={`${cell.date} gününü seç`}
                    >
                      {cell.day}
                    </button>
                    <button
                      type="button"
                      className="btn-icon calendar-day-add"
                      title="Bu güne randevu ekle"
                      aria-label={`${cell.date} için randevu planla`}
                      onClick={() => openNewModal(undefined, cell.date!)}
                    >
                      <Icon name="plus" size={12} />
                    </button>
                  </div>
                  <div className="calendar-day-appointments">
                    {dayAppointments.slice(0, 3).map(appointment => (
                      <button
                        key={appointment.id}
                        type="button"
                        className={`appointment-pill status-${appointment.status}`}
                        title={`${appointment.time} ${appointment.clientName} — ${appointment.sessionType}`}
                        onClick={() => openEditModal(appointment)}
                      >
                        {appointment.time} {appointment.clientName}
                      </button>
                    ))}
                    {dayAppointments.length > 3 && (
                      <span className="calendar-day-more">+{dayAppointments.length - 3} daha</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {appointments.length === 0 && (
            <div className="empty-state-card">
              <Icon name="calendar" size={30} />
              <h4>Takvim henüz boş</h4>
              <p>Görüşme saatlerini burada planlayın ve seans öncesi hazırlığı tek yerden görün.</p>
              {clients.length === 0 ? (
                <button type="button" className="btn-primary btn-sm" onClick={() => navigate('/danisanlar?yeni=1')}>Önce danışan ekle</button>
              ) : (
                <button type="button" className="btn-primary btn-sm" onClick={() => openNewModal()}>Randevu ekle</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Randevu Tablosu / Listesi */}
      {view === 'list' && (
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
                          title="Randevuyu tamamla ve seans notunu oluştur"
                          onClick={() => setPendingComplete(app)}
                        >
                          <Icon name="checkCircle" size={13} />
                          <span>Görüşmeyi tamamla</span>
                        </button>
                      )}
                      {app.status === 'completed' && sessionByAppointment.get(app.id) && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          title="Randevudan oluşturulan seans notunu aç"
                          onClick={() => navigate(`/danisanlar/${app.clientId}?sekme=sessions`)}
                        >
                          <Icon name="clipboard" size={13} />
                          <span>Seans #{sessionByAppointment.get(app.id)?.sessionNumber} notu</span>
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
                      {!sessionByAppointment.has(app.id) && (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Randevuyu sil"
                          aria-label={`${app.clientName} randevusunu sil`}
                          onClick={() => handleDelete(app.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* Modal */}
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
                {saveError && <p className="record-lock-error" role="alert">{saveError}</p>}
                <div className="form-group">
                  <label htmlFor="appointment-client">Danışan *</label>
                  <select
                    id="appointment-client"
                    value={form.clientId || ''}
                    disabled={Boolean(editingApp)}
                    onChange={e => {
                      const cl = clients.find(c => c.id === e.target.value);
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
                    <label htmlFor="appointment-date">Tarih *</label>
                    <input
                      id="appointment-date"
                      type="date"
                      value={form.date || ''}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="appointment-time">Saat *</label>
                    <input
                      id="appointment-time"
                      type="time"
                      value={form.time || '14:00'}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="appointment-type">Seans Türü</label>
                    <select
                      id="appointment-type"
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
                    <label htmlFor="appointment-location">Görüşme Yeri</label>
                    <select
                      id="appointment-location"
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
                    <label htmlFor="appointment-status">Randevu Durumu</label>
                    <select
                      id="appointment-status"
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
                    <label htmlFor="appointment-duration">Seans Süresi (Dakika)</label>
                    <input
                      id="appointment-duration"
                      type="number"
                      min={15}
                      max={600}
                      step={5}
                      value={form.durationMinutes || 50}
                      onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="appointment-fee">Ücret (TL)</label>
                    <input
                      id="appointment-fee"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={10}
                      value={form.fee ?? 0}
                      onChange={e => setForm({ ...form, fee: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="appointment-payment">Ödeme Durumu</label>
                    <select
                      id="appointment-payment"
                      value={form.paymentStatus || 'pending'}
                      onChange={e => setForm({ ...form, paymentStatus: e.target.value as PaymentStatus })}
                    >
                      <option value="pending">Ödeme bekliyor</option>
                      <option value="paid">Tahsil edildi</option>
                      <option value="waived">Ücret alınmayacak</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="appointment-notes">Randevu Notu / Hatırlatıcı</label>
                  <textarea
                    id="appointment-notes"
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

      {pendingComplete && (
        <ConfirmDialog
          tone="neutral"
          title="Görüşmeyi tamamla"
          description={`${pendingComplete.clientName} randevusu tamamlandı olarak işaretlenecek ve taslak SOAP seans notu oluşturulacak. Danışan, seans numarası, tarih/saat ve ücret bilgileri otomatik doldurulur.`}
          confirmLabel="Tamamla ve notu oluştur"
          onConfirm={confirmCompleteAppointment}
          onCancel={() => setPendingComplete(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Randevu kaydını sil"
          description={`${pendingDelete.clientName} · ${pendingDelete.date} ${pendingDelete.time} randevusu silinecek. Bu işlem geri alınamaz.`}
          confirmLabel="Randevuyu sil"
          onConfirm={confirmDeleteAppointment}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
