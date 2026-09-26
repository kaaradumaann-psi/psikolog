import { useEffect, useMemo, useState } from 'react';
import type { Appointment, Client, SessionType, AppointmentStatus, PaymentStatus } from '../../clinical/clinicalTypes';
import {
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
import { Icon } from '../Icon';
import { navigate } from '../../router';
import { useConfirmDialog } from '../useConfirmDialog';

const LOCATIONS = ['Klinik (Yüz Yüze)', 'Online (Görüntülü)', 'Dış Görüşme'] as const;

type AppointmentLocation = (typeof LOCATIONS)[number];

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Planlandı (Bekliyor)' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal Edildi' },
  { value: 'noshow', label: 'Danışan Gelmedi' },
];

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  noshow: 'Gelmedi',
};

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { ask: askConfirm, dialog: confirmDialog } = useConfirmDialog();

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

  function openNewModal(prefillClientId = '') {
    setEditingApp(null);
    setFormError(null);
    setSaving(false);
    const prefill = clients.find((client) => client.id === prefillClientId);
    setForm({
      clientId: prefillClientId,
      clientName: prefill ? `${prefill.firstName} ${prefill.lastName}` : '',
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
    setModalOpen(true);
  }

  // Danışan dosyasından "Randevu planla" ile gelince form seçili danışanla açılır.
  useEffect(() => {
    const clientId = new URLSearchParams(window.location.search).get('danisan');
    if (!clientId) return;
    if (!clients.some((client) => client.id === clientId)) return;
    openNewModal(clientId);
    const url = new URL(window.location.href);
    url.searchParams.delete('danisan');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    // Açılışta bir kez çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditModal(a: Appointment) {
    setEditingApp(a);
    setForm({ ...a });
    setFormError(null);
    setSaving(false);
    setModalOpen(true);
  }

  function handleDelete(app: Appointment) {
    askConfirm({
      title: 'Randevuyu sil',
      description: `${app.clientName} · ${app.date} ${app.time} randevusu takvimden silinir. Seans notu kaydı buna bağlı değildir ve kalır.`,
      confirmLabel: 'Randevuyu sil',
      run: () => deleteAppointment(app.id),
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.clientId) {
      setFormError('Randevu hangi danışana ait? Listeden seçin.');
      return;
    }
    const date = form.date || clinicToday();
    if (date > clinicToday()) {
      setFormError('Randevu tarihi geçmişte kalamaz; bugünden itibaren planlayın.');
      return;
    }
    const time = form.time || '14:00';
    // Aynı danışan için aynı güne aynı saatte ikinci randevu oluşturulmaz:
    // çift tıklama ve yanlışlıkla kaydedilen çift kayıt burada durur.
    const duplicate = appointments.some(
      (item) =>
        item.id !== form.id &&
        item.clientId === form.clientId &&
        item.date === date &&
        item.time === time &&
        item.status !== 'cancelled',
    );
    if (duplicate) {
      setFormError(`${date} ${time} için bu danışanın randevusu zaten var. Çift kayıt oluşmasın diye kaydetmedik.`);
      return;
    }

    const selectedClient = clients.find(c => c.id === form.clientId);
    const clientName = selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : form.clientName || '';

    const appToSave: Appointment = {
      id: editingApp ? editingApp.id : 'app_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: form.clientId,
      clientName,
      date,
      time,
      durationMinutes: Number(form.durationMinutes) || 50,
      sessionType: (form.sessionType as SessionType) || 'Bireysel Terapi',
      location: (form.location as AppointmentLocation) || 'Klinik (Yüz Yüze)',
      status: (form.status as AppointmentStatus) || 'scheduled',
      notes: form.notes?.trim() || '',
      fee: Number(form.fee) || 0,
      paymentStatus: (form.paymentStatus as PaymentStatus) || 'pending',
      createdAt: editingApp ? editingApp.createdAt : new Date().toISOString(),
    };

    setSaving(true);
    try {
      saveAppointment(appToSave);
      setFormError(null);
      setModalOpen(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Randevu kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Görüşme tamamlandığında randevu kapatılır ve dosya, randevunun saat ve
   * türüyle hazır bir seans notu formunda açılır. Seans otomatik yazılmaz:
   * notu uzman yazar, böylece aynı randevu iki kez not üretmez.
   */
  function completeAppointmentAndOpenFile(a: Appointment) {
    saveAppointment({ ...a, status: 'completed' });
    navigate(`/danisanlar/${a.clientId}?sekme=sessions&randevu=${encodeURIComponent(a.id)}`);
  }

  const sessionAppointments = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of getSoapSessions()) {
      map.set(`${session.clientId}|${session.date}`, (map.get(`${session.clientId}|${session.date}`) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

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
          <button type="button" className="btn-primary" onClick={() => openNewModal()}>
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

      {/* Randevu Tablosu / Listesi */}
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
                      {STATUS_LABEL[app.status]}
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
                          title="Randevuyu tamamlandı işaretleyin; dosyada seans notu formu bu randevunun bilgileriyle açılır"
                          onClick={() => completeAppointmentAndOpenFile(app)}
                        >
                          <Icon name="checkCircle" size={13} />
                          <span>{sessionAppointments.get(`${app.clientId}|${app.date}`) ? 'Tamamla' : 'Tamamla ve not yaz'}</span>
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
                        onClick={() => handleDelete(app)}
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

      {confirmDialog}

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
                {formError && (
                  <p className="form-notice" role="alert">
                    <Icon name="alert" size={16} />
                    <span>{formError}</span>
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="appointment-client">Danışan *</label>
                  <select
                    id="appointment-client"
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
                    <label htmlFor="appointment-date">Tarih *</label>
                    <input
                      id="appointment-date"
                      type="date"
                      value={form.date || ''}
                      min={clinicToday()}
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
                      onChange={e => setForm({ ...form, location: e.target.value as AppointmentLocation })}
                    >
                      {LOCATIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
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
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
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

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="appointment-fee">Ücret (TL)</label>
                    <input
                      id="appointment-fee"
                      type="number"
                      min={0}
                      step={10}
                      value={form.fee ?? 0}
                      onChange={e => setForm({ ...form, fee: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="appointment-payment">Ödeme durumu</label>
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

              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
                  {saving ? 'Kaydediliyor…' : editingApp ? 'Randevuyu Güncelle' : 'Randevuyu Kaydet'}
                </button>
              </div>
            </form>
        </ClinicalDialog>
      )}
    </div>
  );
}
