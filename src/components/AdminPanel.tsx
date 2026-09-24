import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  createPsychologist,
  listPsychologists,
  setPsychologistActive,
  deletePsychologist,
} from '../auth/adminApi';
import {
  ALL_RECORDS_LIMIT,
  listAllRecords,
  deleteRecord,
} from '../records/supabaseRecords';
import type { RecordSummary } from '../records/supabaseRecords';
import { displayName } from '../auth/userDisplay';
import type { AuthenticatedUser } from '../auth/authTypes';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';

type AdminTab = 'records' | 'users' | 'new-user';

const TAB_ORDER: AdminTab[] = ['records', 'users', 'new-user'];

export function AdminPanel({ admin }: { admin: AuthenticatedUser }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('records');

  // Psikologlar state
  const [users, setUsers] = useState<AuthenticatedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [usersFailed, setUsersFailed] = useState(false);

  // Tüm Test Kayıtları state
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordsFailed, setRecordsFailed] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordDateFrom, setRecordDateFrom] = useState('');
  const [recordDateTo, setRecordDateTo] = useState('');
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [confirmRecord, setConfirmRecord] = useState<RecordSummary | null>(null);

  // Yeni psikolog form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<AuthenticatedUser | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function refreshUsers() {
    try {
      setLoadingUsers(true);
      setUsersFailed(false);
      setUsers(await listPsychologists());
    } catch (cause) {
      setUsersFailed(true);
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Psikolog listesi alınamadı.',
      });
    } finally {
      setLoadingUsers(false);
    }
  }

  async function refreshRecords() {
    try {
      setLoadingRecords(true);
      setRecordsFailed(false);
      const data = await listAllRecords();
      setRecords(data);
    } catch (cause) {
      setRecordsFailed(true);
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Test kayıtları alınamadı.',
      });
    } finally {
      setLoadingRecords(false);
    }
  }

  useEffect(() => {
    void refreshUsers();
    void refreshRecords();
  }, []);

  function onSubnavKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = TAB_ORDER.indexOf(activeTab);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % TAB_ORDER.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_ORDER.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setActiveTab(TAB_ORDER[next]!);
  }

  async function addPsychologist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage({ kind: 'error', text: 'Geçerli bir e-posta adresi girin.' });
      return;
    }
    if (password.length < 10) {
      setMessage({ kind: 'error', text: 'Başlangıç şifresi en az 10 karakter olmalı.' });
      return;
    }
    if (password !== passwordAgain) {
      setMessage({ kind: 'error', text: 'Girdiğiniz şifreler birbiriyle eşleşmiyor.' });
      return;
    }
    setBusy(true);
    try {
      const created = await createPsychologist({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        password,
      });
      setUsers(previous => [...previous, created]);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setPasswordAgain('');
      setMessage({
        kind: 'success',
        text: `${displayName(created)} hesabı oluşturuldu ve aktif edildi. Giriş bilgilerini güvenli bir kanaldan paylaşın.`,
      });
      setActiveTab('users');
    } catch (cause) {
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Kullanıcı oluşturulamadı.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: AuthenticatedUser) {
    setBusyUser(user.id);
    setMessage(null);
    try {
      const updated = await setPsychologistActive(user.id, !user.active);
      setUsers(previous => previous.map(c => (c.id === updated.id ? updated : c)));
      setMessage({
        kind: 'success',
        text: `${displayName(user)} hesabı ${updated.active ? 'aktif edildi; uzman giriş yapabilir.' : 'pasifleştirildi; uzman giriş yapamaz, kayıtları korunur.'}`,
      });
    } catch (cause) {
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Hesap durumu güncellenemedi.',
      });
    } finally {
      setBusyUser(null);
    }
  }

  async function confirmDeletePsychologist() {
    const user = confirmUser;
    if (!user) return;
    const name = displayName(user);
    setDeletingUserId(user.id);
    setMessage(null);
    try {
      await deletePsychologist(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setRecords(prev => prev.filter(r => r.createdBy !== user.id));
      setConfirmUser(null);
      setMessage({ kind: 'success', text: `"${name}" hesabı ve ilişkili kayıtları silindi.` });
    } catch (cause) {
      setMessage({
        kind: 'error',
        text: cause instanceof Error ? cause.message : 'Kullanıcı silinemedi.',
      });
    } finally {
      setDeletingUserId(null);
    }
  }

  async function confirmDeleteRecord() {
    const record = confirmRecord;
    if (!record) return;
    setDeletingRecordId(record.id);
    try {
      await deleteRecord(record.id);
      setRecords(prev => prev.filter(r => r.id !== record.id));
      setConfirmRecord(null);
      setMessage({ kind: 'success', text: `"${record.firstName} ${record.lastName}" kaydı silindi. Bu işlem geri alınamaz.` });
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Test kaydı silinemedi.',
      });
    } finally {
      setDeletingRecordId(null);
    }
  }

  const activeCount = users.filter(u => u.active).length;
  const passiveCount = users.length - activeCount;
  const passwordHint =
    password.length === 0
      ? 'En az 10 karakter; uzman ilk girişte değiştirmeli.'
      : password.length < 10
        ? `${10 - password.length} karakter daha gerekli.`
        : 'Uzunluk yeterli. Tahmin edilmesi zor bir şifre seçin.';

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const filteredRecords = records.filter(r => {
    // Tarih filtresi: uygulama tarihi (YYYY-MM-DD) aralık içinde olmalı.
    if (recordDateFrom && r.applicationDate < recordDateFrom) return false;
    if (recordDateTo && r.applicationDate > recordDateTo) return false;
    const q = recordSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.psychologistName && r.psychologistName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-console-wrapper">
      <header className="admin-header-hero">
        <div className="hero-text-side">
          <div className="badge-chip badge-primary">
            <Icon name="shield" size={14} /> Yönetim
          </div>
          <h1>Yönetim</h1>
          <p>
            Uzman hesapları ve tüm test kayıtları tek ekranda. Yeni psikolog ekleyin, erişimi aktif/pasif ile
            yönetin, kayıtları inceleyin. Yıkıcı işlemler her zaman onay ister.
          </p>
          <ol className="admin-guide-steps" aria-label="Yönetim akışı">
            <li><strong>1.</strong> Psikolog ekle</li>
            <li><strong>2.</strong> Testler burada listelenir</li>
            <li><strong>3.</strong> Detayı incele, gerektiğinde sil</li>
          </ol>
        </div>
        <div className="hero-account-badge">
          <div className="admin-avatar-ring">
            <Icon name="shield" size={18} />
          </div>
          <div>
            <strong>{admin.firstName} {admin.lastName}</strong>
            <span className="mono-sub">{admin.email} (Yönetici)</span>
          </div>
        </div>
      </header>

      <div className="admin-metrics-grid">
        <div className="metric-box">
          <div className="metric-icon-wrap bg-blue-tint">
            <Icon name="file" size={22} />
          </div>
          <div>
            <span className="metric-label">Toplam Test Kaydı</span>
            <strong className="metric-value">
              {records.length}
              {records.length >= ALL_RECORDS_LIMIT ? '+' : ''}
            </strong>
            <small className="ws-hint">Tüm uzmanların uygulamaları</small>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap bg-purple-tint">
            <Icon name="users" size={22} />
          </div>
          <div>
            <span className="metric-label">Kayıtlı Psikolog</span>
            <strong className="metric-value">{users.length}</strong>
            <small className="ws-hint">{passiveCount > 0 ? `${passiveCount} pasif hesap` : 'Tüm hesaplar aktif'}</small>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-wrap bg-green-tint">
            <Icon name="checkCircle" size={22} />
          </div>
          <div>
            <span className="metric-label">Aktif Uzman</span>
            <strong className="metric-value">{activeCount}</strong>
            <small className="ws-hint">Şu an giriş yapabilen</small>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`status-banner ${message.kind === 'error' ? 'error-banner' : 'success-banner'}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          <Icon name={message.kind === 'error' ? 'alert' : 'checkCircle'} size={18} />
          <span style={{ flex: 1 }}>{message.text}</span>
          <button type="button" className="close-banner-btn" onClick={() => setMessage(null)} aria-label="Kapat">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      <div className="admin-subnav-tabs" role="tablist" aria-label="Yönetim bölümleri" onKeyDown={onSubnavKeyDown}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'records'}
          tabIndex={activeTab === 'records' ? 0 : -1}
          className={`subnav-tab ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <Icon name="file" size={16} />
          <span>Testler ({records.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'users'}
          tabIndex={activeTab === 'users' ? 0 : -1}
          className={`subnav-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Icon name="users" size={16} />
          <span>Psikologlar ({users.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'new-user'}
          tabIndex={activeTab === 'new-user' ? 0 : -1}
          className={`subnav-tab ${activeTab === 'new-user' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-user')}
        >
          <span style={{ fontWeight: 800, fontSize: 16 }} aria-hidden="true">+</span>
          <span>Yeni Psikolog</span>
        </button>
      </div>

      {activeTab === 'records' && (
        <section className="dashboard-section card-elevated" aria-label="Tüm Test Kayıtları" role="tabpanel">
          <div className="section-header-row">
            <div>
              <span className="section-badge badge-primary">Kayıtlar</span>
              <h3 className="section-heading">Tüm test uygulamaları</h3>
              <p className="section-subtext">
                Uzmanların tamamladığı MMPI uygulamaları. “Testi İncele” kaydı ayrı bir sayfada açar; hatalı/çift
                kayıtları buradan kaldırın. Silme geri alınamaz.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => void refreshRecords()}
              disabled={loadingRecords}
            >
              <Icon name="refresh" size={15} />
              <span>Yenile</span>
            </button>
          </div>

          {!loadingRecords && !recordsFailed && records.length >= ALL_RECORDS_LIMIT && (
            <div className="status-banner info-banner" role="status">
              <Icon name="info" size={16} />
              <span style={{ flex: 1 }}>
                Liste en yeni {ALL_RECORDS_LIMIT} kaydı gösteriyor. Daha eski kayıtlar bu ekranda listelenmez ve
                arama alanı yalnızca yüklenen {ALL_RECORDS_LIMIT} kayıt içinde çalışır; denetim gerektiren daha eski
                bir kayda erişmek için veritabanından sorgu gerekir.
              </span>
            </div>
          )}

          <div className="search-filter-box">
            <div className="search-input-wrapper">
              <Icon name="search" size={16} className="search-icon" />
              <input
                type="search"
                placeholder="Danışan adı, uygulayan psikolog veya kayıt no ile filtreleyin..."
                value={recordSearch}
                onChange={e => setRecordSearch(e.target.value)}
                aria-label="Test kayıtlarında ara"
              />
            </div>
            <div className="date-range-filter">
              <label className="date-filter-field">
                <span>Başlangıç</span>
                <input
                  type="date"
                  value={recordDateFrom}
                  max={recordDateTo || undefined}
                  onChange={e => setRecordDateFrom(e.target.value)}
                  aria-label="Uygulama tarihi başlangıç filtresi"
                />
              </label>
              <label className="date-filter-field">
                <span>Bitiş</span>
                <input
                  type="date"
                  value={recordDateTo}
                  min={recordDateFrom || undefined}
                  onChange={e => setRecordDateTo(e.target.value)}
                  aria-label="Uygulama tarihi bitiş filtresi"
                />
              </label>
              {(recordDateFrom || recordDateTo) && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setRecordDateFrom('');
                    setRecordDateTo('');
                  }}
                >
                  Tarihi temizle
                </button>
              )}
            </div>
          </div>

          {loadingRecords && (
            <div className="loading-state-card">
              <div className="spinner" />
              <p>Test kayıtları yükleniyor...</p>
            </div>
          )}

          {!loadingRecords && recordsFailed && records.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <Icon name="alert" size={32} />
              </div>
              <h4>Kayıtlar alınamadı</h4>
              <p>Bağlantıyı kontrol edip yeniden deneyin. Uzmanların taslakları kendi cihazlarında korunur.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => void refreshRecords()}>
                Tekrar dene
              </button>
            </div>
          )}

          {!loadingRecords && !recordsFailed && records.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <Icon name="file" size={32} />
              </div>
              <h4>Henüz test kaydı yok</h4>
              <p>Psikologlar İşlem akışını tamamladığında kayıtlar burada listelenecek. Önce psikolog hesabı ekleyin.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setActiveTab('new-user')}>
                Psikolog ekle
              </button>
            </div>
          )}

          {!loadingRecords && records.length > 0 && filteredRecords.length === 0 && (
            <div className="empty-state-card">
              <p>Aramanızla eşleşen kayıt bulunamadı. Farklı bir isim ya da kayıt no deneyin.</p>
            </div>
          )}

          {!loadingRecords && filteredRecords.length > 0 && (
            <div className="modern-table-card">
              <div className="table-responsive">
                <table className="modern-data-table" data-mobile-cards>
                  <thead>
                    <tr>
                      <th>Danışan</th>
                      <th>Cinsiyet / Yaş</th>
                      <th>Uygulayan Psikolog</th>
                      <th>Uygulama Tarihi</th>
                      <th>Kayıt Tarihi</th>
                      <th style={{ textAlign: 'right' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => (
                      <tr key={rec.id}>
                        <td data-label="">
                          <div className="table-user-cell">
                            <div className="user-initials-avatar">
                              {rec.firstName.charAt(0)}{rec.lastName.charAt(0)}
                            </div>
                            <div>
                              <strong className="cell-title">{rec.firstName} {rec.lastName}</strong>
                              <span className="cell-subtitle mono-sub">ID: {rec.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Cinsiyet / Yaş">
                          <span className="text-secondary">
                            {rec.gender || '—'} {rec.age ? `(${rec.age})` : ''}
                          </span>
                        </td>
                        <td data-label="Uygulayan Psikolog">
                          {rec.psychologistName ? (
                            <div className="badge-psychologist">
                              <Icon name="user" size={13} />
                              <span>{rec.psychologistName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-sm">Psikolog</span>
                          )}
                        </td>
                        <td data-label="Uygulama Tarihi">
                          <span className="date-tag">{rec.applicationDate}</span>
                        </td>
                        <td data-label="Kayıt Tarihi">
                          <span className="text-muted-sm">
                            {new Date(rec.createdAt).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td data-label="İşlemler">
                          <div className="table-row-actions">
                            <a
                              href={`/kayitlar/${rec.id}`}
                              className="action-btn-primary"
                            >
                              <Icon name="eye" size={15} />
                              <span>Testi İncele</span>
                            </a>
                        <a className="action-btn-secondary" href={`/kayitlar/${rec.id}/raporlar`}>Raporlar</a>
                            <button
                              type="button"
                              className="action-btn-danger"
                              onClick={() => setConfirmRecord(rec)}
                              disabled={deletingRecordId === rec.id}
                              title="Test kaydını sil (geri alınamaz)"
                              aria-label={`${rec.firstName} ${rec.lastName} kaydını sil`}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="dashboard-section card-elevated" aria-label="Psikolog Hesapları" role="tabpanel">
          <div className="section-header-row">
            <div>
              <span className="section-badge badge-primary">Ekip</span>
              <h3 className="section-heading">Psikolog kadrosu</h3>
              <p className="section-subtext">
                Pasifleştirme erişimi kapatır ama kayıtları korur (geri alınabilir). Silme hesabı ve tüm
                kayıtlarını kalıcı olarak kaldırır.
              </p>
            </div>
            <div className="section-header-actions">
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setActiveTab('new-user')}
              >
                <span>+ Psikolog Ekle</span>
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => void refreshUsers()}
                disabled={loadingUsers}
              >
                <Icon name="refresh" size={15} />
                <span>Yenile</span>
              </button>
            </div>
          </div>

          <div className="search-filter-box">
            <div className="search-input-wrapper">
              <Icon name="search" size={16} className="search-icon" />
              <input
                type="search"
                placeholder="Psikolog adı, soyadı veya e-posta adresi ile ara..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                aria-label="Psikologlarda ara"
              />
            </div>
          </div>

          {loadingUsers && (
            <div className="loading-state-card">
              <div className="spinner" />
              <p>Psikolog hesapları yükleniyor...</p>
            </div>
          )}

          {!loadingUsers && usersFailed && users.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <Icon name="alert" size={32} />
              </div>
              <h4>Hesaplar alınamadı</h4>
              <p>Bağlantıyı kontrol edip yeniden deneyin.</p>
              <button type="button" className="btn-secondary btn-sm" onClick={() => void refreshUsers()}>
                Tekrar dene
              </button>
            </div>
          )}

          {!loadingUsers && !usersFailed && users.length === 0 && (
            <div className="empty-state-card">
              <div className="empty-state-icon">
                <Icon name="users" size={32} />
              </div>
              <h4>Henüz psikolog hesabı yok</h4>
              <p>Sistemi kullanacak ilk uzmanı ekleyin; giriş bilgileri e-posta ile eşleşir.</p>
              <button type="button" className="btn-primary btn-sm" onClick={() => setActiveTab('new-user')}>
                İlk psikoloğu ekle
              </button>
            </div>
          )}

          {!loadingUsers && users.length > 0 && filteredUsers.length === 0 && (
            <div className="empty-state-card">
              <p>Aramanızla eşleşen psikolog bulunamadı.</p>
            </div>
          )}

          {!loadingUsers && filteredUsers.length > 0 && (
            <div className="modern-table-card">
              <div className="table-responsive">
                <table className="modern-data-table" data-mobile-cards>
                  <thead>
                    <tr>
                      <th>Psikolog</th>
                      <th>E-posta</th>
                      <th>Yetki</th>
                      <th>Durum</th>
                      <th style={{ textAlign: 'right' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={u.active ? '' : 'row-muted'}>
                        <td data-label="">
                          <div className="table-user-cell">
                            <div className={`user-initials-avatar ${!u.active ? 'avatar-inactive' : ''}`}>
                              {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                            </div>
                            <div>
                              <strong className="cell-title">{displayName(u)}</strong>
                              <span className="cell-subtitle">Klinik Psikolog</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="E-posta">
                          <span className="mono-sub">{u.email}</span>
                        </td>
                        <td data-label="Yetki">
                          <span className="badge-chip badge-default">Psikolog</span>
                        </td>
                        <td data-label="Durum">
                          <span className={`status-pill ${u.active ? 'pill-active' : 'pill-inactive'}`}>
                            {u.active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td data-label="İşlemler">
                          <div className="table-row-actions">
                            <button
                              type="button"
                              className={`btn-toggle-status ${u.active ? 'is-active' : ''}`}
                              disabled={busyUser === u.id}
                              onClick={() => void toggleActive(u)}
                              title={u.active ? 'Erişimi kapat (kayıtlar korunur)' : 'Erişimi aç'}
                            >
                              {busyUser === u.id ? 'İşleniyor...' : u.active ? 'Pasifleştir' : 'Aktifleştir'}
                            </button>
                            <button
                              type="button"
                              className="action-btn-danger"
                              onClick={() => setConfirmUser(u)}
                              disabled={deletingUserId === u.id}
                              title="Psikoloğu ve tüm kayıtlarını kalıcı sil"
                              aria-label={`${displayName(u)} hesabını sil`}
                            >
                              <Icon name="trash" size={15} />
                              <span>{deletingUserId === u.id ? 'Siliniyor...' : 'Sil'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'new-user' && (
        <section className="dashboard-section card-elevated" aria-label="Yeni Psikolog Kaydı" role="tabpanel">
          <div className="section-header-row">
            <div>
              <span className="section-badge badge-primary">Yeni Uzman</span>
              <h3 className="section-heading">Psikolog hesabı oluştur</h3>
              <p className="section-subtext">
                Hesap anında aktif olur. Başlangıç şifresini güvenli bir kanaldan iletin ve ilk girişte
                değiştirilmesini isteyin.
              </p>
            </div>
          </div>

          <form className="admin-creation-form" onSubmit={addPsychologist}>
            <div className="form-grid-2col">
              <div className="form-group">
                <label htmlFor="admin-new-first">Ad *</label>
                <input
                  id="admin-new-first"
                  required
                  placeholder="Örn. Selin"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-new-last">Soyad *</label>
                <input
                  id="admin-new-last"
                  required
                  placeholder="Örn. Demir"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-new-email">E-posta (giriş adı) *</label>
              <input
                id="admin-new-email"
                required
                type="email"
                placeholder="psikolog@kurum.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="off"
              />
              <small className="ws-hint">Aynı e-posta ile ikinci hesap açılamaz; yazımı kontrol edin.</small>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label htmlFor="admin-new-pass">Başlangıç şifresi *</label>
                <div className="ws-password-wrap">
                  <input
                    id="admin-new-pass"
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={10}
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setShowPassword(show => !show)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                <small className="ws-hint">{passwordHint}</small>
              </div>

              <div className="form-group">
                <label htmlFor="admin-new-pass2">Şifre tekrarı *</label>
                <input
                  id="admin-new-pass2"
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={10}
                  placeholder="••••••••••"
                  value={passwordAgain}
                  onChange={e => setPasswordAgain(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-actions-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('users')}
              >
                Vazgeç
              </button>
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <div className="spinner-inline" />
                    <span>Hesap Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} />
                    <span>Psikolog Hesabını Kaydet</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {confirmUser && (
        <ConfirmDialog
          title={`"${displayName(confirmUser)}" silinsin mi?`}
          description="Hesap ve bu psikoloğun oluşturduğu tüm test kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin değilseniz önce Pasifleştirin."
          confirmLabel="Evet, kalıcı sil"
          busy={deletingUserId === confirmUser.id}
          onConfirm={() => void confirmDeletePsychologist()}
          onCancel={() => {
            if (!deletingUserId) setConfirmUser(null);
          }}
        />
      )}

      {confirmRecord && (
        <ConfirmDialog
          title={`"${confirmRecord.firstName} ${confirmRecord.lastName}" kaydı silinsin mi?`}
          description="Test kaydı ve optik cevap verisi kalıcı olarak silinecek. Bu işlem geri alınamaz."
          confirmLabel="Evet, kaydı sil"
          busy={deletingRecordId === confirmRecord.id}
          onConfirm={() => void confirmDeleteRecord()}
          onCancel={() => {
            if (!deletingRecordId) setConfirmRecord(null);
          }}
        />
      )}

    </div>
  );
}
