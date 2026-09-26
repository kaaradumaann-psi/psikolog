import { useState, useEffect, useMemo } from 'react';
import type { SoapSession, Client } from '../../clinical/clinicalTypes';
import {
  getSoapSessions,
  deleteSoapSession,
  getClients,
  subscribeClinicalStore,
} from '../../clinical/clinicalStore';
import { SoapSessionDialog } from './SoapSessionDialog';
import { Icon } from '../Icon';
import { useConfirmDialog } from '../useConfirmDialog';
import { SessionSummaryButton } from '../practice/SessionSummaryButton';
import { navigate } from '../../router';

export function SoapSessionsPage() {
  const [sessions, setSessions] = useState<SoapSession[]>(() => getSoapSessions());
  const [clients, setClients] = useState<Client[]>(() => getClients());
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SoapSession | null>(null);
  const { ask: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsub = subscribeClinicalStore(() => {
      setSessions(getSoapSessions());
      setClients(getClients());
    });
    return unsub;
  }, []);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return sessions
      .filter(s => {
        const haystack = [
          s.clientName,
          s.subjective,
          s.objective,
          s.assessment,
          s.plan,
          s.homework ?? '',
          s.riskNotes ?? '',
        ].join(' ').toLocaleLowerCase('tr-TR');
        const matchSearch = !q || haystack.includes(q);
        const matchClient = clientFilter === 'all' || s.clientId === clientFilter;
        const matchRisk = riskFilter === 'all' || s.riskLevel === riskFilter;
        return matchSearch && matchClient && matchRisk;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.sessionNumber - a.sessionNumber);
  }, [sessions, search, clientFilter, riskFilter]);

  function openNewModal() {
    setEditingSession(null);
    setDialogOpen(true);
  }

  function openEditModal(session: SoapSession) {
    setEditingSession(session);
    setDialogOpen(true);
  }

  function requestDelete(session: SoapSession) {
    askConfirm({
      title: 'Seans notunu sil',
      description: `${session.clientName} · #${session.sessionNumber} (${session.date}) SOAP notu bu cihazdan silinir. Geri alınamaz.`,
      confirmLabel: 'Seans notunu sil',
      run: () => deleteSoapSession(session.id),
    });
  }

  const hasFilters = Boolean(search.trim()) || clientFilter !== 'all' || riskFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setClientFilter('all');
    setRiskFilter('all');
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
          <h4>{hasFilters && sessions.length > 0 ? 'Filtreye uyan seans yok' : sessions.length > 0 ? 'Seans listesi boş' : 'Henüz seans notu yok'}</h4>
          <p>
            {hasFilters && sessions.length > 0
              ? 'Arama veya filtre bir sonuç bulamadı. Kayıtlı notlar filtrelerin arkasında duruyor.'
              : 'Görüşme bittiğinde SOAP notunu buradan yazın; boş madde kaydedilmez, eksik alan uyarı olarak görünür.'}
          </p>
          {hasFilters && sessions.length > 0 ? (
            <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
              Filtreleri temizle
            </button>
          ) : (
            <button type="button" className="btn-primary btn-sm" onClick={openNewModal}>
              Yeni Seans Notu Oluştur
            </button>
          )}
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
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    aria-label={`${s.clientName} #${s.sessionNumber} seans notunu düzenle`}
                    onClick={() => openEditModal(s)}
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ color: 'var(--danger)' }}
                    aria-label={`${s.clientName} #${s.sessionNumber} seans notunu sil`}
                    onClick={() => requestDelete(s)}
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

      <SoapSessionDialog
        open={dialogOpen}
        sessions={sessions}
        clients={clients}
        initial={editingSession}
        onClose={() => setDialogOpen(false)}
      />
      {confirmDialog}
    </div>
  );
}
