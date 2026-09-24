import { useState } from 'react';
import { useClients } from './useClients';
import { ClientCard } from './ClientCard';
import type { ClientStatus } from './clientTypes';
import { navigate } from '../../app/router';

export function ClientList() {
  const [searchInput, setSearchInput] = useState('');
  const { query, result, loading, error, updateQuery, nextPage, prevPage } = useClients({
    status: 'active',
    page: 0,
    pageSize: 20,
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ search: searchInput, page: 0 });
  };

  return (
    <div>
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Ara: ad, soyad, dosya no"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          maxLength={80}
        />
        <select
          className="select"
          value={query.status ?? 'active'}
          onChange={(e) => updateQuery({ status: e.target.value as ClientStatus | '', page: 0 })}
          style={{ width: 140 }}
        >
          <option value="">Tümü</option>
          <option value="active">Aktif</option>
          <option value="archived">Arşiv</option>
        </select>
        <button type="submit" className="btn btn--primary btn--sm">
          Ara
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/clients/new')}>
          + Yeni
        </button>
      </form>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Yükleniyor…</div>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {result.count !== null ? `${result.count} danışan` : `${result.data.length} danışan`} • Sayfa{' '}
              {result.page + 1} • {result.pageSize} / sayfa • hasMore: {String(result.hasMore)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={prevPage}
                disabled={(query.page ?? 0) === 0}
              >
                ← Önceki
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={nextPage} disabled={!result.hasMore}>
                Sonraki →
              </button>
            </div>
          </div>

          {result.data.length === 0 ? (
            <div className="card">
              <div className="empty-state-card">
                <div className="empty-state-icon">—</div>
                <h4>Danışan bulunamadı</h4>
                <p>
                  {query.search
                    ? `"${query.search}" için sonuç yok`
                    : 'Henüz danışan yok — yeni danışan oluşturun'}
                </p>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/clients/new')}>
                  + Yeni Danışan
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {result.data.map((c) => (
                <ClientCard key={c.id} client={c} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
