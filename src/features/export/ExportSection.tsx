import { useState } from 'react';
import { exportClientBundle, downloadJson, validateImportBundle } from './exportApi';
import { showToast } from '../../components/ui/Toast';

export function ExportSection({ clientId, fileNumber }: { clientId: string; fileNumber: string }) {
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const bundle = await exportClientBundle(clientId);
      downloadJson(`${fileNumber}-export-${new Date().toISOString().slice(0, 10)}.json`, bundle);
      showToast('Dışa aktarma başarılı (KVKK taşınabilirlik)', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImportValidate = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const json = JSON.parse(text);
      const result = validateImportBundle(json);
      if (!result.ok) throw new Error(result.error);
      showToast('İçe aktarma dosyası geçerli (v1) — otomatik oluşturma yok, manuel inceleme gerekir', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ fontSize: 14 }}>Dışa Aktar / İçe Aktar (KVKK)</h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        Danışan verilerini JSON olarak dışa aktar — sadece meta, dosya içeriği değil (PRIVATE BUCKET dosyaları ayrı indirilir). İçe aktarma sadece doğrulama yapar, otomatik oluşturma yok.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={handleExport} disabled={exporting}>{exporting ? 'Aktarılıyor…' : 'JSON Dışa Aktar'}</button>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <label className="field-label">İçe Aktarma Dosyası Doğrula (v1)</label>
        <input type="file" accept=".json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleImportValidate} disabled={!importFile}>Doğrula</button>
      </div>
    </div>
  );
}
