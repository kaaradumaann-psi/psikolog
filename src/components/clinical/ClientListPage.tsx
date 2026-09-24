import { useState, useEffect, useMemo } from 'react';
import type { Client, ClientStatus, Gender, MaritalStatus } from '../../clinical/clinicalTypes';
import {
  getClients,
  saveClient,
  deleteClient,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';
import { navigate } from '../../router';

export function ClientListPage() {
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    fileNumber: '',
    firstName: '',
    lastName: '',
    tcNumber: '',
    birthDate: '',
    age: 30,
    gender: 'KADIN',
    phone: '',
    email: '',
    occupation: '',
    education: 'Lisans',
    maritalStatus: 'Bekar',
    emergencyContact: { name: '', phone: '', relation: '' },
    presentingComplaint: '',
    medicalHistory: '',
    psychiatricHistory: '',
    medications: '',
    familyHistory: '',
    allergiesNotes: '',
    diagnoses: [],
    status: 'active',
  });
  const [diagInput, setDiagInput] = useState('');

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setClients(getClients());
    });
    return unsub;
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      const matchSearch =
        !q ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.fileNumber.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.tcNumber && c.tcNumber.includes(q)) ||
        c.diagnoses.some(d => d.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      followup: clients.filter(c => c.status === 'followup').length,
      completed: clients.filter(c => c.status === 'completed').length,
    };
  }, [clients]);

  function openNewModal() {
    const nextNum = 'HK-' + new Date().getFullYear() + '-' + String(clients.length + 1).padStart(3, '0');
    setEditingClient(null);
    setFormData({
      fileNumber: nextNum,
      firstName: '',
      lastName: '',
      tcNumber: '',
      birthDate: '1995-01-01',
      age: 31,
      gender: 'KADIN',
      phone: '',
      email: '',
      occupation: '',
      education: 'Lisans',
      maritalStatus: 'Bekar',
      emergencyContact: { name: '', phone: '', relation: '' },
      presentingComplaint: '',
      medicalHistory: '',
      psychiatricHistory: '',
      medications: '',
      familyHistory: '',
      allergiesNotes: '',
      diagnoses: [],
      status: 'active',
    });
    setDiagInput('');
    setModalOpen(true);
  }

  function openEditModal(c: Client, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingClient(c);
    setFormData({ ...c });
    setDiagInput('');
    setModalOpen(true);
  }

  function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`${name} isimli danışan kaydını ve tüm klinik dosyasını silmek istediğinize emin misiniz?`)) {
      deleteClient(id);
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      alert('Lütfen danışanın adını ve soyadını giriniz.');
      return;
    }

    const clientToSave: Client = {
      id: editingClient ? editingClient.id : 'cli_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      fileNumber: formData.fileNumber || 'HK-' + Date.now().toString().slice(-4),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      tcNumber: formData.tcNumber?.trim() || '',
      birthDate: formData.birthDate || '1990-01-01',
      age: Number(formData.age) || 30,
      gender: (formData.gender as Gender) || 'KADIN',
      phone: formData.phone?.trim() || '',
      email: formData.email?.trim() || '',
      occupation: formData.occupation?.trim() || '',
      education: formData.education?.trim() || 'Lisans',
      maritalStatus: (formData.maritalStatus as MaritalStatus) || 'Bekar',
      emergencyContact: formData.emergencyContact || { name: '', phone: '', relation: '' },
      presentingComplaint: formData.presentingComplaint?.trim() || '',
      medicalHistory: formData.medicalHistory?.trim() || '',
      psychiatricHistory: formData.psychiatricHistory?.trim() || '',
      medications: formData.medications?.trim() || '',
      familyHistory: formData.familyHistory?.trim() || '',
      allergiesNotes: formData.allergiesNotes?.trim() || '',
      diagnoses: formData.diagnoses || [],
      status: (formData.status as ClientStatus) || 'active',
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveClient(clientToSave);
    setModalOpen(false);
  }

  function addDiagnosis() {
    if (!diagInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      diagnoses: [...(prev.diagnoses || []), diagInput.trim()],
    }));
    setDiagInput('');
  }

  function removeDiagnosis(index: number) {
    setFormData(prev => ({
      ...prev,
      diagnoses: (prev.diagnoses || []).filter((_, i) => i !== index),
    }));
  }

  return (
    <div className="clinical-container">
      {/* Başlık ve Butonlar */}
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Vaka &amp; Danışan Yönetimi</span>
          </div>
          <h1>Danışan Dosyaları</h1>
          <p>Kayıtlı tüm danışanların anamnez kayıtları, SOAP seans geçmişi ve uygulanan test bataryaları.</p>
        </div>
        <div className="clinical-actions">
          <button type="button" className="btn-primary" onClick={openNewModal}>
            <Icon name="plus" size={16} />
            <span>Yeni Danışan Kaydı</span>
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="stats-grid-4">
        <div className="metric-card">
          <div className="metric-card-head">
            <span>Toplam Danışan</span>
            <div className="metric-icon icon-accent">
              <Icon name="users" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{stats.total}</div>
          <span className="metric-card-sub">Kayıtlı klinik vaka arşivi</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Aktif Terapi Süreci</span>
            <div className="metric-icon icon-success">
              <Icon name="activity" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{stats.active}</div>
          <span className="metric-card-sub">Düzenli seans alan danışan</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Takip &amp; Kontrol</span>
            <div className="metric-icon icon-warning">
              <Icon name="pulse" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{stats.followup}</div>
          <span className="metric-card-sub">Aralıklı izlemdeki vakalar</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-head">
            <span>Tamamlanan Süreç</span>
            <div className="metric-icon">
              <Icon name="checkCircle" size={18} />
            </div>
          </div>
          <div className="metric-card-value">{stats.completed}</div>
          <span className="metric-card-sub">Hedefe ulaşıp sonlanan terapiler</span>
        </div>
      </div>

      {/* Arama & Filtreleme Çubuğu */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Danışan adı, dosya no, telefon, TC veya tanı ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label="Danışan Durumu Filtresi"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif Danışanlar</option>
          <option value="followup">Takipteki Danışanlar</option>
          <option value="completed">Tamamlananlar</option>
          <option value="archived">Arşivlenmiş</option>
        </select>
      </div>

      {/* Danışan Tablosu */}
      <div className="client-table-wrap">
        {filteredClients.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 12 }}>
              <Icon name="users" size={36} />
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: 16 }}>Danışan Bulunamadı</h4>
            <p style={{ color: 'var(--soft)', fontSize: 13, margin: 0 }}>
              {search ? 'Arama kriterinize uygun bir danışan kaydı yok.' : 'Henüz kayıtlı bir danışan bulunmamaktadır.'}
            </p>
          </div>
        ) : (
          <table className="client-table">
            <thead>
              <tr>
                <th>Protokol No</th>
                <th>Danışan</th>
                <th>Cinsiyet / Yaş</th>
                <th>İletişim</th>
                <th>Tanı / Odak</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => (
                <tr
                  key={client.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/danisanlar/${client.id}`)}
                >
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--soft)' }}>
                    {client.fileNumber}
                  </td>
                  <td>
                    <div className="client-avatar-cell">
                      <div className="client-mini-avatar">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </div>
                      <div className="client-name-group">
                        <strong>{client.firstName} {client.lastName}</strong>
                        <span>{client.occupation || 'Meslek belirtilmedi'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span>{client.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}, {client.age} Yaş</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>
                      <div>{client.phone || '—'}</div>
                      <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>{client.email || ''}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 260 }}>
                      {client.diagnoses && client.diagnoses.length > 0 ? (
                        client.diagnoses.map((d, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 11,
                              background: 'var(--bg-soft)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid var(--hairline)',
                            }}
                          >
                            {d}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${client.status}`}>
                      {client.status === 'active' && 'Aktif'}
                      {client.status === 'followup' && 'Takipte'}
                      {client.status === 'completed' && 'Tamamlandı'}
                      {client.status === 'archived' && 'Arşiv'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        title="Klinik Dosyayı Aç"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/danisanlar/${client.id}`);
                        }}
                      >
                        <Icon name="fileText" size={14} />
                        <span>Dosya</span>
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        title="Danışan Bilgilerini Düzenle"
                        onClick={e => openEditModal(client, e)}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Danışanı Sil"
                        onClick={e => handleDelete(client.id, `${client.firstName} ${client.lastName}`, e)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Danışan Ekleme / Düzenleme Modalı */}
      {modalOpen && (
        <div className="clinical-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="clinical-modal" onClick={e => e.stopPropagation()}>
            <div className="clinical-modal-head">
              <h3>{editingClient ? 'Danışan Bilgilerini Düzenle' : 'Yeni Danışan Kaydı'}</h3>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="clinical-modal-body">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Protokol / Dosya No</label>
                    <input
                      type="text"
                      value={formData.fileNumber || ''}
                      onChange={e => setFormData({ ...formData, fileNumber: e.target.value })}
                      placeholder="HK-2026-001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Danışan Durumu</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={e => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                    >
                      <option value="active">Aktif Terapi</option>
                      <option value="followup">İzlem / Takip</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="archived">Arşiv</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Adı *</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Danışanın adı"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Soyadı *</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Danışanın soyadı"
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Cinsiyet *</label>
                    <select
                      value={formData.gender || 'KADIN'}
                      onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                    >
                      <option value="KADIN">Kadın</option>
                      <option value="ERKEK">Erkek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Yaş</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={formData.age || ''}
                      onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Telefon</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                  <div className="form-group">
                    <label>E-posta</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ornek@mail.com"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Meslek</label>
                    <input
                      type="text"
                      value={formData.occupation || ''}
                      onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                      placeholder="Mühendis, Öğretmen, Öğrenci..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Medeni Durum</label>
                    <select
                      value={formData.maritalStatus || 'Bekar'}
                      onChange={e => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}
                    >
                      <option value="Bekar">Bekar</option>
                      <option value="Evli">Evli</option>
                      <option value="Birlikte">Birlikte Yaşıyor</option>
                      <option value="Bosanmis">Boşanmış</option>
                      <option value="Diger">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Başvuru Nedeni &amp; Şikayetleri</label>
                  <textarea
                    rows={2}
                    value={formData.presentingComplaint || ''}
                    onChange={e => setFormData({ ...formData, presentingComplaint: e.target.value })}
                    placeholder="Danışanın terapiye geliş sebebi ve ana semptomları..."
                  />
                </div>

                <div className="form-group">
                  <label>Tanı &amp; Klinik Ön Tanılar</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={diagInput}
                      onChange={e => setDiagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDiagnosis();
                        }
                      }}
                      placeholder="Örn: F41.1 Yaygın Anksiyete Bozukluğu"
                    />
                    <button type="button" className="btn-secondary" onClick={addDiagnosis}>
                      Ekle
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(formData.diagnoses || []).map((d, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12,
                          background: 'var(--primary-tint)',
                          color: 'var(--accent-ink)',
                          border: '1px solid var(--primary-border)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {d}
                        <button
                          type="button"
                          style={{ cursor: 'pointer', padding: 0, background: 'none', border: 'none', color: 'inherit' }}
                          onClick={() => removeDiagnosis(i)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Tıbbi / Psikiyatrik Geçmiş &amp; İlaçlar</label>
                  <textarea
                    rows={2}
                    value={formData.psychiatricHistory || ''}
                    onChange={e => setFormData({ ...formData, psychiatricHistory: e.target.value })}
                    placeholder="Daha önceki tedavi öyküleri, düzenli kullanılan ilaçlar..."
                  />
                </div>
              </div>

              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary">
                  {editingClient ? 'Değişiklikleri Kaydet' : 'Danışanı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
