import { useState, useEffect, useMemo } from 'react';
import type { Client, ClientStatus, MaritalStatus } from '../../clinical/clinicalTypes';
import {
  getClients,
  saveClient,
  deleteClient,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';
import { ageFromBirthDate, isValidTc, nextFileNumber, normalizeTc } from '../../clinical/recordRules';
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
    age: 0,
    gender: undefined,
    phone: '',
    email: '',
    occupation: '',
    education: '',
    maritalStatus: undefined,
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
    setEditingClient(null);
    setFormData({
      fileNumber: nextFileNumber(clients.map((client) => client.fileNumber)),
      firstName: '',
      lastName: '',
      tcNumber: '',
      birthDate: '',
      age: 0,
      gender: undefined,
      phone: '',
      email: '',
      occupation: '',
      education: '',
      maritalStatus: undefined,
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
      alert('Ad ve soyad gerekli.');
      return;
    }
    const gender = formData.gender;
    if (gender !== 'KADIN' && gender !== 'ERKEK') {
      alert('Cinsiyet seçin. Varsayılan atanmaz.');
      return;
    }
    const fileNumber = formData.fileNumber || nextFileNumber(clients.map((client) => client.fileNumber));
    if (clients.some((client) => client.fileNumber === fileNumber && client.id !== editingClient?.id)) {
      alert('Bu dosya numarası başka bir danışanda kayıtlı.');
      return;
    }
    const email = formData.email?.trim() || '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('E-posta geçersiz. Bilinmiyorsa boş bırakın.');
      return;
    }
    const tcNumber = normalizeTc(formData.tcNumber || '');
    if (!isValidTc(tcNumber)) {
      alert('Kimlik numarası 11 rakam olmalı. Bilinmiyorsa boş bırakın.');
      return;
    }
    const birthDate = formData.birthDate || '';
    const age = birthDate ? ageFromBirthDate(birthDate) : 0;
    if (birthDate && age === null) {
      alert('Doğum tarihi geçersiz veya gelecekte.');
      return;
    }

    const clientId = editingClient ? editingClient.id : 'cli_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const clientToSave: Client = {
      id: clientId,
      fileNumber,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      tcNumber,
      birthDate,
      age: age ?? 0,
      gender,
      phone: formData.phone?.trim() || '',
      email,
      occupation: formData.occupation?.trim() || '',
      education: formData.education?.trim() || '',
      maritalStatus: formData.maritalStatus || '',
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

    try {
      saveClient(clientToSave);
      setModalOpen(false);
      if (!editingClient) navigate(`/danisanlar/${clientId}`);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : 'Kayıt yazılamadı.');
    }
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
                    <span>{client.gender === 'ERKEK' ? 'Erkek' : 'Kadın'}{client.birthDate ? `, ${client.age} yaş` : ''}</span>
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
                    <label htmlFor="client-file-number">Protokol / Dosya No</label>
                    <input
                      id="client-file-number"
                      type="text"
                      value={formData.fileNumber || ''}
                      onChange={e => setFormData({ ...formData, fileNumber: e.target.value })}
                      placeholder="HK-2026-001"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-status">Danışan Durumu</label>
                    <select
                      id="client-status"
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
                    <label htmlFor="client-first-name">Adı *</label>
                    <input
                      id="client-first-name"
                      type="text"
                      value={formData.firstName || ''}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Danışanın adı"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-last-name">Soyadı *</label>
                    <input
                      id="client-last-name"
                      type="text"
                      value={formData.lastName || ''}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Danışanın soyadı"
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="client-gender">Cinsiyet *</label>
                    <select
                      id="client-gender"
                      value={formData.gender || ''}
                      onChange={e => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          gender: value === 'KADIN' || value === 'ERKEK' ? value : undefined,
                        });
                      }}
                      required
                    >
                      <option value="">Seçin</option>
                      <option value="KADIN">Kadın</option>
                      <option value="ERKEK">Erkek</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-birth-date">Doğum tarihi</label>
                    <input
                      id="client-birth-date"
                      type="date"
                      value={formData.birthDate || ''}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => {
                        const birthDate = e.target.value;
                        const computed = birthDate ? ageFromBirthDate(birthDate) : null;
                        setFormData({
                          ...formData,
                          birthDate,
                          age: computed ?? 0,
                        });
                      }}
                    />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {formData.birthDate
                        ? `Yaş doğum tarihinden: ${formData.age ?? '—'}`
                        : 'Bilinmiyorsa boş bırakın. Yaş uydurulmaz.'}
                    </span>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="client-tc">T.C. kimlik numarası</label>
                    <input
                      id="client-tc"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={11}
                      value={formData.tcNumber || ''}
                      onChange={e => setFormData({ ...formData, tcNumber: e.target.value })}
                      placeholder="11 rakam, bilinmiyorsa boş"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-education">Eğitim</label>
                    <input
                      id="client-education"
                      type="text"
                      value={formData.education || ''}
                      onChange={e => setFormData({ ...formData, education: e.target.value })}
                      placeholder="Belirtilmediyse boş bırakın"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="client-phone">Telefon</label>
                    <input
                      id="client-phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="05XX XXX XX XX"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-email">E-posta</label>
                    <input
                      id="client-email"
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ornek@mail.com"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="client-occupation">Meslek</label>
                    <input
                      id="client-occupation"
                      type="text"
                      value={formData.occupation || ''}
                      onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                      placeholder="Belirtilmediyse boş bırakın"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-marital">Medeni durum</label>
                    <select
                      id="client-marital"
                      value={formData.maritalStatus || ''}
                      onChange={e => setFormData({ ...formData, maritalStatus: e.target.value as MaritalStatus })}
                    >
                      <option value="">Belirtilmedi</option>
                      <option value="Bekar">Bekar</option>
                      <option value="Evli">Evli</option>
                      <option value="Birlikte">Birlikte yaşıyor</option>
                      <option value="Bosanmis">Boşanmış</option>
                      <option value="Diger">Diğer</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label htmlFor="client-emergency-name">Acil durumda aranacak kişi</label>
                    <input
                      id="client-emergency-name"
                      value={formData.emergencyContact?.name || ''}
                      onChange={e => setFormData({
                        ...formData,
                        emergencyContact: {
                          name: e.target.value,
                          phone: formData.emergencyContact?.phone || '',
                          relation: formData.emergencyContact?.relation || '',
                        },
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-emergency-relation">Yakınlık</label>
                    <input
                      id="client-emergency-relation"
                      value={formData.emergencyContact?.relation || ''}
                      onChange={e => setFormData({
                        ...formData,
                        emergencyContact: {
                          name: formData.emergencyContact?.name || '',
                          phone: formData.emergencyContact?.phone || '',
                          relation: e.target.value,
                        },
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="client-emergency-phone">Acil telefon</label>
                    <input
                      id="client-emergency-phone"
                      type="tel"
                      value={formData.emergencyContact?.phone || ''}
                      onChange={e => setFormData({
                        ...formData,
                        emergencyContact: {
                          name: formData.emergencyContact?.name || '',
                          relation: formData.emergencyContact?.relation || '',
                          phone: e.target.value,
                        },
                      })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="client-complaint">Başvuru nedeni ve şikayetler</label>
                  <textarea
                    id="client-complaint"
                    rows={2}
                    value={formData.presentingComplaint || ''}
                    onChange={e => setFormData({ ...formData, presentingComplaint: e.target.value })}
                    placeholder="Danışanın terapiye geliş sebebi ve ana yakınmaları"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="client-diagnosis">Tanı ve klinik odak</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      id="client-diagnosis"
                      type="text"
                      value={diagInput}
                      onChange={e => setDiagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDiagnosis();
                        }
                      }}
                      placeholder="Biliniyorsa kod veya klinik odak"
                    />
                    <button type="button" className="btn-secondary" onClick={addDiagnosis}>Ekle</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(formData.diagnoses || []).map((item, index) => (
                      <span
                        key={`${item}-${index}`}
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
                        {item}
                        <button
                          type="button"
                          style={{ cursor: 'pointer', padding: 0, background: 'none', border: 'none', color: 'inherit' }}
                          onClick={() => removeDiagnosis(index)}
                          aria-label={`${item} tanısını kaldır`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="client-medical">Tıbbi özgeçmiş</label>
                  <textarea
                    id="client-medical"
                    rows={2}
                    value={formData.medicalHistory || ''}
                    onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })}
                    placeholder="Kronik hastalık, ameliyat veya bilinen tıbbi durum"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client-psych">Psikiyatrik geçmiş</label>
                  <textarea
                    id="client-psych"
                    rows={2}
                    value={formData.psychiatricHistory || ''}
                    onChange={e => setFormData({ ...formData, psychiatricHistory: e.target.value })}
                    placeholder="Önceki terapi, yatış veya psikiyatrik izlem"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client-meds">Düzenli ilaçlar</label>
                  <textarea
                    id="client-meds"
                    rows={2}
                    value={formData.medications || ''}
                    onChange={e => setFormData({ ...formData, medications: e.target.value })}
                    placeholder="Kullanılan ilaç yoksa boş bırakın"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client-family">Aile öyküsü</label>
                  <textarea
                    id="client-family"
                    rows={2}
                    value={formData.familyHistory || ''}
                    onChange={e => setFormData({ ...formData, familyHistory: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="client-notes">Önemli notlar ve alerjiler</label>
                  <textarea
                    id="client-notes"
                    rows={2}
                    value={formData.allergiesNotes || ''}
                    onChange={e => setFormData({ ...formData, allergiesNotes: e.target.value })}
                  />
                </div>
              </div>
              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Vazgeç</button>
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
