import { useState } from 'react';
import { saveSettings } from './reportsApi';
import type { Letterhead } from './templateEngine';
import { safeReportImage } from './ReportPreview';
export function ReportSettings({
  userId,
  initial,
  onSaved,
}: {
  userId: string;
  initial: Letterhead;
  onSaved: (h: Letterhead) => void;
}) {
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function image(file: File | undefined, field: 'logo' | 'signature') {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 600000) {
      setMessage('PNG, JPEG veya WebP; en fazla 600 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (safeReportImage(url)) setValue((v) => ({ ...v, [field]: url }));
    };
    reader.readAsDataURL(file);
  }
  return (
    <details className="report-settings">
      <summary>
        Antet ve imza ayarları (isteğe bağlı)
        <span
          className="report-settings-antet-help"
          title="Antet, raporun en üstünde kurum bilgisi olarak görünür"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <circle cx="8" cy="8" r="6.25" />
            <path d="M8 7.2v4" />
            <circle cx="8" cy="5.1" r="0.9" fill="currentColor" stroke="none" />
          </svg>
          Antet nedir?
        </span>
      </summary>
      <div className="report-settings-explain">
        <strong>Antet</strong> = raporun en üstünde basılan <em>resmî başlık</em> bölümü: kurum logosu, kurum adı, uzman
        adı-ünvanı ve iletişim. Zorunlu değil — boş bırakırsanız rapor <strong>antetsiz</strong> yazdırılır. Buradaki
        bilgiler yalnızca <strong>yeni oluşturulan psikolog raporlarına</strong> eklenir; daha önce oluşturulmuş
        raporların anteti kendiliğinden değişmez (isterseniz editörde “Kayıtlı anteti bu rapora uygula” ile
        ekleyebilirsiniz). İmza/kaşe görseli de yalnızca raporun sonuna eklenir.
      </div>
      <p style={{ fontSize: 13, color: 'var(--soft)', margin: '0 0 10px' }}>
        Yeni raporlara eklenir. Eski raporların anteti kendiliğinden değişmez.
      </p>
      <div className="report-settings-grid">
        {(['name', 'title', 'institution', 'phone', 'email', 'address'] as const).map((k, i) => (
          <label key={k}>
            {['Ad Soyad', 'Unvan', 'Kurum', 'Telefon', 'E-posta', 'Adres'][i]}
            <input
              value={value[k]}
              maxLength={400}
              onChange={(e) => setValue({ ...value, [k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        {(['logo', 'signature'] as const).map((k) => (
          <label key={k} className="report-settings-upload">
            <strong>{k === 'logo' ? 'Logo (antette, üstte)' : 'İmza / Kaşe (rapor sonu)'}</strong>
            <span style={{ fontSize: 12, color: 'var(--soft)', lineHeight: 1.5 }}>
              {k === 'logo'
                ? 'PNG/JPEG/WebP, ≤600 KB. Öneri: şeffaf zeminli kare logo, en az 300×300 px.'
                : 'PNG/JPEG/WebP, ≤600 KB. El yazısı imza veya kaşe görseli.'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => void image(e.target.files?.[0], k)}
            />
            {safeReportImage(value[k]) && (
              <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <img width="80" style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'white', padding: 4 }} src={value[k]} alt={k} />
                <button type="button" className="btn-secondary" onClick={() => setValue({ ...value, [k]: '' })}>
                  Kaldır
                </button>
              </span>
            )}
          </label>
        ))}
      </div>
      <div className="report-settings-actions">
        <button
          disabled={busy}
          className="btn-primary"
          onClick={async () => {
            setBusy(true);
            try {
              await saveSettings(userId, value);
              onSaved(value);
              setMessage('Antet kaydedildi.');
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Kaydedilemedi.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Ayarları Kaydet
        </button>
        {message && (
          <span role="status" style={{ fontSize: 13, color: message.includes('Kaydedildi') ? 'var(--success)' : 'var(--soft)' }}>
            {message}
          </span>
        )}
      </div>
    </details>
  );
}
