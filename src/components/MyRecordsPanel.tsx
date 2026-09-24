import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, listOwnRecordsPaged, deleteRecord } from '../records/supabaseRecords';
import type { Gender, RecordSummary } from '../records/supabaseRecords';
import { groupRecords, timelineRecords } from '../records/patientGrouping';
import type { PatientGroup } from '../records/patientGrouping';
import { ConfirmDialog } from './ConfirmDialog';
import { navigate } from '../router';
import { Icon } from './Icon';

const PAGE_SIZES = [25, 50, 100] as const;

export function MyRecordsPanel() {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters — query state (server-side)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Grouping
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [confirmTarget, setConfirmTarget] = useState<RecordSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce arama
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filtre değişince sayfa 0'a dön
  useEffect(() => {
    setPage(0);
  }, [search, dateFrom, dateTo, gender, ageMin, ageMax, pageSize]);

  async function fetchRecords() {
    try {
      setLoading(true);
      setError('');
      const res = await listOwnRecordsPaged({
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        gender: gender || undefined,
        ageMin: ageMin ? Number(ageMin) : undefined,
        ageMax: ageMax ? Number(ageMax) : undefined,
        page,
        pageSize,
      });
      setRecords(res.records);
      setCount(res.count);
      setHasMore(res.hasMore);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kayıtlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFrom, dateTo, gender, ageMin, ageMax, page, pageSize]);

  async function confirmDelete() {
    const record = confirmTarget;
    if (!record) return;
    setDeletingId(record.id);
    try {
      await deleteRecord(record.id);
      setConfirmTarget(null);
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt silinemedi.');
    } finally {
      setDeletingId(null);
    }
  }

  const groups: PatientGroup[] = useMemo(() => {
    if (!grouped) return [];
    return groupRecords(records);
  }, [records, grouped]);

  const hasActiveFilter = Boolean(search || dateFrom || dateTo || gender || ageMin || ageMax);

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setGender('');
    setAgeMin('');
    setAgeMax('');
  }

  function toggleGroup(key: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="dashboard-section" aria-labelledby="saved-records-title">
      <div className="section-header-row">
        <div>
          <span className="section-badge badge-primary">Arşiv</span>
          <h3 id="saved-records-title" className="section-heading">Kayıtlar</h3>
          <p className="section-subtext">
            Bu hesaptan tamamlanan MMPI uygulamaları. “Testi İncele” kaydı ayrı bir sayfada açar: T skorları, profil
            grafiği, geçerlik/kod analizleri ve cevap detayı tek raporda görüntülenir; hatalı kayıtları buradan kaldırın.
          </p>
        </div>
        <div className="section-header-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={() => void fetchRecords()} disabled={loading}>
            <Icon name="refresh" size={15} />
            <span>Yenile</span>
          </button>
          <div className="stats-pill" title={count != null ? `Toplam ${count} kayıt` : 'Toplam sayılıyor'}>
            {count != null ? count : records.length}
            {hasMore ? '+' : ''} Kayıt
            {count != null && pageSize ? ` · sayfa ${page + 1}` : ''}
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="status-banner info-banner" role="status">
          <Icon name="info" size={16} />
          <span style={{ flex: 1 }}>
            Sunucu-taraflı sayfalama aktif: bu sayfada {records.length} kayıt gösteriliyor
            {count != null ? ` (toplam ${count}, sayfa ${page + 1})` : ''}. Eski kayıtlar için sayfayı ilerletin veya
            arama/filtreyle daraltın.
          </span>
        </div>
      )}

      <div className="search-filter-box">
        <div className="search-input-wrapper">
          <Icon name="search" size={16} className="search-icon" />
          <input
            type="search"
            placeholder="Danışan adı veya soyadı ile ara (sunucu tarafı)…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            aria-label="Kayıtlarda ara"
          />
        </div>
        <div className="date-range-filter" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <label className="date-filter-field">
            <span>Başlangıç</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              aria-label="Uygulama tarihi başlangıç filtresi"
            />
          </label>
          <label className="date-filter-field">
            <span>Bitiş</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateTo(e.target.value)}
              aria-label="Uygulama tarihi bitiş filtresi"
            />
          </label>
          <label className="date-filter-field">
            <span>Cinsiyet</span>
            <select value={gender} onChange={e => setGender(e.target.value as Gender | '')} aria-label="Cinsiyet filtresi">
              <option value="">Tümü</option>
              <option value="Kadın">Kadın</option>
              <option value="Erkek">Erkek</option>
              <option value="Diğer">Diğer</option>
              <option value="Belirtmek istemiyor">Belirtmek istemiyor</option>
            </select>
          </label>
          <label className="date-filter-field" style={{ minWidth: 80 }}>
            <span>Yaş ≥</span>
            <input type="number" min={16} max={120} value={ageMin} onChange={e => setAgeMin(e.target.value)} placeholder="16" style={{ width: 70 }} aria-label="Minimum yaş filtresi" />
          </label>
          <label className="date-filter-field" style={{ minWidth: 80 }}>
            <span>Yaş ≤</span>
            <input type="number" min={16} max={120} value={ageMax} onChange={e => setAgeMax(e.target.value)} placeholder="120" style={{ width: 70 }} aria-label="Maksimum yaş filtresi" />
          </label>
          {hasActiveFilter && (
            <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
              Filtreleri temizle
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} />
            Danışana göre grupla
          </label>
          {grouped && (
            <span className="text-muted-sm" style={{ fontSize: 12 }}>
              Aynı ad–soyad yazımı birlikte gruplanır (ör. “Ayşe Yılmaz” / “ayşe yılmaz”). Aynı isimli farklı kişiler yanlış birleşebilir — kayıtlar veritabanında ayrı kalır, birleştirme yalnızca görünüm katmanıdır.
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <label className="text-muted-sm" style={{ fontSize: 12 }}>Sayfa boyutu</label>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Sayfa boyutu">
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-state-card">
          <div className="spinner" />
          <p>Kayıtlar yükleniyor, lütfen bekleyin...</p>
        </div>
      )}

      {error && !loading && (
        <div className="status-banner error-banner" role="alert">
          <Icon name="alert" size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void fetchRecords()}>
            Tekrar dene
          </button>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Icon name="file" size={32} />
          </div>
          <h4>Henüz kayıt yok</h4>
          <p>{hasActiveFilter ? 'Filtreyle eşleşen kayıt bulunamadı. Filtreleri temizlemeyi deneyin.' : 'İşlem sekmesinden yeni bir MMPI başlatın; tamamlanan uygulamalar burada listelenecek.'}</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && !grouped && (
        <div className="modern-table-card">
          <div className="table-responsive">
            <table className="modern-data-table" data-mobile-cards>
              <thead>
                <tr>
                  <th>Danışan</th>
                  <th>Cinsiyet / Yaş</th>
                  <th>Uygulama Tarihi</th>
                  <th>Kayıt Tarihi</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td data-label="">
                      <div className="table-user-cell">
                        <div className="user-initials-avatar">
                          {record.firstName.charAt(0)}{record.lastName.charAt(0)}
                        </div>
                        <div>
                          <strong className="cell-title">{record.firstName} {record.lastName}</strong>
                          <span className="cell-subtitle mono-sub">ID: {record.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Cinsiyet / Yaş">
                      <span className="text-secondary">
                        {record.gender || '—'} {record.age ? `(${record.age})` : ''}
                      </span>
                    </td>
                    <td data-label="Uygulama Tarihi">
                      <span className="date-tag">{record.applicationDate}</span>
                    </td>
                    <td data-label="Kayıt Tarihi">
                      <span className="text-muted-sm">
                        {new Date(record.createdAt).toLocaleDateString('tr-TR', {
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
                        <a href={`/kayitlar/${record.id}`} className="action-btn-primary">
                          <Icon name="eye" size={15} />
                          <span>Testi İncele</span>
                        </a>
                        <a className="action-btn-secondary" href={`/kayitlar/${record.id}/raporlar`}>Raporlar</a>
                        <button
                          type="button"
                          className="action-btn-secondary"
                          onClick={() => navigate(`/islem?duzenle=${record.id}`)}
                          title="Kaydı düzenle — form bu kaydın bir kopyasıyla dolar; düzeltmeler orijinal kaydı silmez, ona bağlı yeni bir revizyon kaydı oluşturur"
                          aria-label={`${record.firstName} ${record.lastName} kaydını düzenle (orijinal kayıt silinmez, yeni revizyon oluşur)`}
                        >
                          <Icon name="edit" size={15} />
                          <span>Düzenle</span>
                        </button>
                        <button
                          type="button"
                          className="action-btn-danger"
                          onClick={() => setConfirmTarget(record)}
                          disabled={deletingId === record.id}
                          title="Bu kaydı kalıcı sil (geri alınamaz)"
                          aria-label={`${record.firstName} ${record.lastName} kaydını sil`}
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

      {!loading && !error && grouped && groups.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map(group => {
            const expanded = expandedGroups.has(group.key);
            const tl = timelineRecords(group);
            return (
              <div key={group.key} className="modern-table-card" style={{ padding: 0, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
                  aria-expanded={expanded}
                  aria-label={`${group.displayName} grubunu ${expanded ? 'kapat' : 'aç'}`}
                >
                  <div className="user-initials-avatar" style={{ flexShrink: 0 }}>
                    {group.firstName.charAt(0)}{group.lastName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong className="cell-title" style={{ display: 'block' }}>{group.displayName}</strong>
                    <span className="text-muted-sm" style={{ fontSize: 12 }}>
                      {group.records.length} uygulama · {group.earliestDate.slice(0, 10)} – {group.latestDate.slice(0, 10)}
                    </span>
                  </div>
                  <span className="text-muted-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {expanded ? 'Gizle' : 'Zaman çizelgesi'}
                  </span>
                  <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={16} />
                </button>
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', padding: '0.5rem 1rem 0.75rem' }}>
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {tl.map((record, idx) => {
                        const prev = idx > 0 ? tl[idx - 1] : null;
                        let diffLabel = 'İlk ölçüm';
                        if (prev) {
                          const d1 = new Date(prev.applicationDate).getTime();
                          const d2 = new Date(record.applicationDate).getTime();
                          const days = Math.round((d2 - d1) / 86400000);
                          if (Number.isFinite(days) && days !== 0) diffLabel = `+${days} gün`;
                          else diffLabel = 'Aynı dönem';
                        }
                        return (
                          <li key={record.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: idx < tl.length - 1 ? '1px dashed var(--border, #e5e7eb)' : 'none' }}>
                            <span className="date-tag" style={{ flexShrink: 0 }}>{record.applicationDate}</span>
                            <span className="text-muted-sm" style={{ fontSize: 12, flexShrink: 0, minWidth: 80 }}>{diffLabel}</span>
                            <span className="text-muted-sm" style={{ fontSize: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>{record.gender || '—'}{record.age ? ` · ${record.age}` : ''}</span>
                            <span className="cell-subtitle mono-sub" style={{ marginLeft: 'auto', fontSize: 11 }}>ID {record.id.slice(0, 8)}…</span>
                            <a href={`/kayitlar/${record.id}`} className="action-btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: 12 }}>İncele</a>
                            <a href={`/kayitlar/${record.id}/raporlar`} className="action-btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: 12 }}>Raporlar</a>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="text-muted-sm" style={{ fontSize: 11, margin: '0.5rem 0 0' }}>
                      Zaman çizelgesi nötr fark gösterimidir; ölçekler arası klinik değişim yorumu içermez.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary btn-sm" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>
            ← Önceki
          </button>
          <span className="text-muted-sm" style={{ fontSize: 12 }}>
            Sayfa {page + 1}{count != null ? ` · toplam ${count} kayıt` : ''}{hasMore ? ' · daha fazla var →' : ''}
          </span>
          <button type="button" className="btn-secondary btn-sm" disabled={!hasMore || loading} onClick={() => setPage(p => p + 1)}>
            Sonraki →
          </button>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={`"${confirmTarget.firstName} ${confirmTarget.lastName}" kaydı silinsin mi?`}
          description="Test kaydı ve cevap verisi kalıcı olarak silinecek. Bu işlem geri alınamaz."
          confirmLabel="Evet, kaydı sil"
          busy={deletingId === confirmTarget.id}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deletingId) setConfirmTarget(null);
          }}
        />
      )}
    </section>
  );
}
