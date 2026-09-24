import { useState, useEffect, useMemo } from 'react';
import type { Appointment, Client, SessionType, AppointmentStatus, PaymentStatus } from '../../clinical/clinicalTypes';
import {
  getAppointments,
  saveAppointment,
  deleteAppointment,
  getClients,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);

  const [form, setForm] = useState<Partial<Appointment>>({
    clientId: '',
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    location: 'Klinik (Yüz Yüze)',
    status: 'scheduled',
    notes: '',
    fee: 2500,
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

  function openNewModal() {
    const firstClient = clients[0];
    setEditingApp(null);
    setForm({
      clientId: firstClient ? firstClient.id : '',
      clientName: firstClient ? `${firstClient.firstName} ${firstClient.lastName}` : '',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      notes: '',
      fee: 2500,
      paymentStatus: 'pending',
    });
    setModalOpen(true);
  }

  function openEditModal(a: Appointment) {
    setEditingApp(a);
    setForm({ ...a });
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm('Bu randevu kaydını silmek istediğinize emin misiniz?')) {
      deleteAppointment(id);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      alert('Lütfen bir danışan seçiniz.');
      return;
    }

    const selectedClient = clients.find(c => c.id === form.clientId);
    const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : form.clientName || '';

    const appToSave: Appointment = {
      id: editingApp ? editingApp.id : 'app_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: form.clientId,
      clientName,
      date: form.date || new Date().toISOString().split('T')[0]!,
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
  }

  function startSessionFromAppointment(a: Appointment) {
    saveAppointment({ ...a, status: 'completed' });
    navigate(`/danisanlar/${a.clientId}`);
  }

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
          <button type="button" className="btn-primary" onClick={openNewModal}>
            <Icon name="plus" size={16} />
            <span>Yeni Randevu Planla</span>
          </button>
        </div>
      </div>

      {/* Görünüm ve Filtreler */}
      <div className="calendar-view-controls">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            className="filter-select"
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

      {/* Randevu Tablosu / Listesi */}
      <div className="client-table-wrap">
        {filteredAppointments.length === 0 ? (
          <div className="empty-state-card" style={{ padding: 48 }}>
            <Icon name="calendar" size={36} />
            <h4>Randevu Bulunamadı</h4>
            <p>Seçilen filtrelerde kayıtlı bir randevu bulunmamaktadır.</p>
            <button type="button" className="btn-primary btn-sm" onClick={openNewModal}>
              Randevu Ekle
            </button>
          </div>
        ) : (
          <table className="client-table">
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
                  <td>
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{app.date}</strong>
                      <div style={{ color: 'var(--soft)', fontSize: 12 }}>
                        Saat {app.time} ({app.durationMinutes} dk)
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="client-avatar-cell">
                      <div className="client-mini-avatar">
                        {app.clientName.charAt(0)}
                      </div>
                      <strong style={{ fontSize: 14 }}>{app.clientName}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13 }}>{app.sessionType}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, color: 'var(--soft)' }}>{app.location}</span>
                  </td>
                  <td>
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
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--soft)', maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.notes || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {app.status === 'scheduled' && (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          title="Seansı Başlat ve SOAP Notuna Git"
                          onClick={() => startSessionFromAppointment(app)}
                        >
                          <Icon name="sparkles" size={13} />
                          <span>Seansı Başlat</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        title="Randevuyu Düzenle"
                        onClick={() => openEditModal(app)}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Randevuyu Sil"
                        onClick={() => handleDelete(app.id)}
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

      {/* Modal */}
      {modalOpen && (
        <div className="clinical-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="clinical-modal" onClick={e => e.stopPropagation()}>
            <div className="clinical-modal-head">
              <h3>{editingApp ? 'Randevuyu Düzenle' : 'Yeni Randevu Planla'}</h3>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="clinical-modal-body">
                <div className="form-group">
                  <label>Danışan *</label>
                  <select
                    value={form.clientId || ''}
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
                      <option value="MMPI / Psikolojik Değerlendirme">MMPI / Psikolojik Değerlendirme</option>
                      <option value="Kriz Müdahalesi">Kriz Müdahalesi</option>
                      <option value="Online Terapi">Online Terapi</option>
                      <option value="Takip Seansı">Takip Seansı</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Görüşme Yeri</label>
                    <select
                      value={form.location || 'Klinik (Yüz Yüze)'}
                      onChange={e => setForm({ ...form, location: e.target.value as any })}
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
          </div>
        </div>
      )}
    </div>
  );
}
