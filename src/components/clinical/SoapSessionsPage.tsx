import { useState, useEffect, useMemo } from 'react';
import type { SoapSession, Client, RiskLevel, SessionType, PaymentStatus } from '../../clinical/clinicalTypes';
import {
  getSoapSessions,
  saveSoapSession,
  deleteSoapSession,
  getClients,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { getSettings } from '../../clinical/practiceStore';
import { clinicToday } from '../../clinical/recordRules';
import { Icon } from '../Icon';
import { SessionSummaryButton } from '../practice/SessionSummaryButton';
import { navigate } from '../../router';

export function SoapSessionsPage() {
  const [sessions, setSessions] = useState<SoapSession[]>(() => getSoapSessions());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SoapSession | null>(null);

  const [form, setForm] = useState<Partial<SoapSession>>({
    clientId: '',
    clientName: '',
    sessionNumber: 1,
    date: clinicToday(),
    startTime: '14:00',
    durationMinutes: 50,
    sessionType: 'Bireysel Terapi',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    riskLevel: 'none',
    riskNotes: '',
    homework: '',
    fee: getSettings().defaultFee,
    paymentStatus: 'pending',
  });

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setSessions(getSoapSessions());
      setClients(getClients());
    });
    return unsub;
  }, []);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .filter(s => {
        const matchSearch =
          !q ||
          s.clientName.toLowerCase().includes(q) ||
          s.subjective.toLowerCase().includes(q) ||
          s.assessment.toLowerCase().includes(q) ||
          s.plan.toLowerCase().includes(q);

        const matchClient = clientFilter === 'all' || s.clientId === clientFilter;
        const matchRisk = riskFilter === 'all' || s.riskLevel === riskFilter;

        return matchSearch && matchClient && matchRisk;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, search, clientFilter, riskFilter]);

  function openNewModal() {
    setEditingSession(null);
    setForm({
      clientId: '',
      clientName: '',
      sessionNumber: 1,
      date: clinicToday(),
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      riskLevel: 'none',
      riskNotes: '',
      homework: '',
      fee: getSettings().defaultFee,
      paymentStatus: 'pending',
    });
    setModalOpen(true);
  }

  function openEditModal(s: SoapSession) {
    setEditingSession(s);
    setForm({ ...s });
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm('Bu seans notunu silmek istediğinize emin misiniz?')) {
      deleteSoapSession(id);
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

    const sessionToSave: SoapSession = {
      id: editingSession ? editingSession.id : 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      clientId: form.clientId,
      clientName,
      sessionNumber: Number(form.sessionNumber) || 1,
      date: form.date || clinicToday(),
      startTime: form.startTime || '14:00',
      durationMinutes: Number(form.durationMinutes) || 50,
      sessionType: (form.sessionType as SessionType) || 'Bireysel Terapi',
      subjective: form.subjective?.trim() || '',
      objective: form.objective?.trim() || '',
      assessment: form.assessment?.trim() || '',
      plan: form.plan?.trim() || '',
      riskLevel: (form.riskLevel as RiskLevel) || 'none',
      riskNotes: form.riskNotes?.trim() || '',
      homework: form.homework?.trim() || '',
      fee: Number(form.fee) || 0,
      paymentStatus: (form.paymentStatus as PaymentStatus) || 'paid',
      createdAt: editingSession ? editingSession.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveSoapSession(sessionToSave);
    setModalOpen(false);
  }

  return (
    <div className="clinical-container">
      {/* Üst Başlık */}
      <div className="clinical-header">
        <div className="clinical-title-wrap">
          <div className="clinical-kicker">
            <span className="clinical-kicker-dot" />
            <span>Klinik Süreç &amp; Terapi Kayıtları</span>
          </div>
          <h1>Seans Notları (SOAP)</h1>
          <p>Klinik psikoloji standartlarında Subjektif, Objektif, Analiz ve Plan (SOAP) formatında seans kayıtları.</p>
        </div>
        <div className="clinical-actions">
          <SessionSummaryButton sessions={filteredSessions} />
          <button type="button" className="btn-primary" onClick={openNewModal}>
            <Icon name="plus" size={16} />
            <span>Yeni Seans Notu Yaz</span>
          </button>
        </div>
      </div>

      {/* Arama & Filtreleme */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Seans içeriği, danışan adı veya vaka notlarında ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          aria-label="Danışan Filtresi"
        >
          <option value="all">Tüm Danışanlar</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName} ({c.fileNumber})
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value)}
          aria-label="Risk Düzeyi Filtresi"
        >
          <option value="all">Tüm Risk Seviyeleri</option>
          <option value="none">Risk Yok</option>
          <option value="low">Düşük Risk</option>
          <option value="moderate">Orta Risk</option>
          <option value="high">Yüksek Risk!</option>
        </select>
      </div>

      {/* Seans Kartları Listesi */}
      {filteredSessions.length === 0 ? (
        <div className="empty-state-card">
          <Icon name="clipboard" size={36} />
          <h4>Kayıtlı Seans Bulunamadı</h4>
          <p>Filtre kriterinize uygun veya kaydedilmiş bir SOAP seans notu bulunmamaktadır.</p>
          <button type="button" className="btn-primary btn-sm" onClick={openNewModal}>
            Yeni Seans Notu Oluştur
          </button>
        </div>
      ) : (
        <div className="soap-grid">
          {filteredSessions.map(s => (
            <div key={s.id} className="soap-card">
              <div className="soap-card-header">
                <div className="soap-title-wrap">
                  <div className="soap-num-pill">#{s.sessionNumber}</div>
                  <div>
                    <strong style={{ fontSize: 16 }}>{s.clientName}</strong>
                    <div className="soap-date-text">
                      {s.sessionType} · {s.date} (Saat {s.startTime}, {s.durationMinutes} dk)
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-risk-${s.riskLevel}`}>
                    Risk: {s.riskLevel === 'none' ? 'Yok' : s.riskLevel === 'low' ? 'Düşük' : s.riskLevel === 'moderate' ? 'Orta' : 'Yüksek!'}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    title="Danışanın Dosyasını Aç"
                    onClick={() => navigate(`/danisanlar/${s.clientId}`)}
                  >
                    <Icon name="user" size={14} />
                    <span>Dosya</span>
                  </button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => openEditModal(s)}>
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleDelete(s.id)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>

              <div className="soap-sections-grid">
                <div className="soap-box">
                  <div className="soap-box-label">
                    <span className="soap-letter">S</span>
                    <span>Subjektif (Danışan İfadeleri)</span>
                  </div>
                  <div className="soap-box-content">{s.subjective || '—'}</div>
                </div>

                <div className="soap-box">
                  <div className="soap-box-label">
                    <span className="soap-letter">O</span>
                    <span>Objektif (Klinisyen Gözlemi)</span>
                  </div>
                  <div className="soap-box-content">{s.objective || '—'}</div>
                </div>

                <div className="soap-box">
                  <div className="soap-box-label">
                    <span className="soap-letter">A</span>
                    <span>Analiz &amp; Formülasyon</span>
                  </div>
                  <div className="soap-box-content">{s.assessment || '—'}</div>
                </div>

                <div className="soap-box">
                  <div className="soap-box-label">
                    <span className="soap-letter">P</span>
                    <span>Plan &amp; Müdahaleler</span>
                  </div>
                  <div className="soap-box-content">
                    {s.plan || '—'}
                    {s.homework && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--hairline)', fontSize: 12, color: 'var(--accent-ink)' }}>
                        <strong>Ev Ödevi:</strong> {s.homework}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="clinical-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="clinical-modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div className="clinical-modal-head">
              <h3>{editingSession ? 'Seans Notunu Düzenle' : 'Yeni SOAP Seans Notu'}</h3>
              <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="clinical-modal-body">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Danışan *</label>
                    <select
                      value={form.clientId || ''}
                      onChange={e => {
                        const cl = clients.find(c => c.id === e.target.value);
                        const prior = sessions.filter((session) => session.clientId === e.target.value);
                        const nextNumber = prior.length ? Math.max(...prior.map((session) => session.sessionNumber)) + 1 : 1;
                        setForm({
                          ...form,
                          clientId: e.target.value,
                          clientName: cl ? `${cl.firstName} ${cl.lastName}` : '',
                          sessionNumber: editingSession ? form.sessionNumber : nextNumber,
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
                  <div className="form-group">
                    <label>Seans No</label>
                    <input
                      type="number"
                      min={1}
                      value={form.sessionNumber || 1}
                      onChange={e => setForm({ ...form, sessionNumber: Number(e.target.value) })}
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
                    <label>Tarih &amp; Saat</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="date"
                        value={form.date || ''}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        required
                      />
                      <input
                        type="time"
                        value={form.startTime || '14:00'}
                        onChange={e => setForm({ ...form, startTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>S</span>
                    <span>Subjektif (Danışanın İfadeleri &amp; Yaşantıları)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.subjective || ''}
                    onChange={e => setForm({ ...form, subjective: e.target.value })}
                    placeholder="Danışanın haftalık aktarımları, hissettiği duygular ve getirdiği konular..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>O</span>
                    <span>Objektif (Klinisyen Gözlemleri &amp; Beden Dili)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.objective || ''}
                    onChange={e => setForm({ ...form, objective: e.target.value })}
                    placeholder="Duygulanım, göz teması, konuşma hızı, motor davranışlar..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>A</span>
                    <span>Analiz / Değerlendirme (Klinik Hipotezler &amp; Dinamikler)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.assessment || ''}
                    onChange={e => setForm({ ...form, assessment: e.target.value })}
                    placeholder="Klinik formülasyon, savunma mekanizmaları, inançlar..."
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="soap-letter" style={{ width: 16, height: 16, background: '#0d0d0d', color: '#fff', borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>P</span>
                    <span>Plan (Gelecek Seans &amp; Ev Ödevi)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.plan || ''}
                    onChange={e => setForm({ ...form, plan: e.target.value })}
                    placeholder="Sonraki seans gündemi ve hedeflenen müdahaleler..."
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Ev Ödevi</label>
                    <input
                      type="text"
                      value={form.homework || ''}
                      onChange={e => setForm({ ...form, homework: e.target.value })}
                      placeholder="Verilen egzersiz veya okuma..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Risk Düzeyi</label>
                    <select
                      value={form.riskLevel || 'none'}
                      onChange={e => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}
                    >
                      <option value="none">Risk Yok / Güvenli</option>
                      <option value="low">Düşük Risk</option>
                      <option value="moderate">Orta Risk</option>
                      <option value="high">Yüksek Risk! (Güvenlik Protokolü)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="clinical-modal-foot">
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary">
                  {editingSession ? 'Seans Notunu Güncelle' : 'Seans Notunu Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
