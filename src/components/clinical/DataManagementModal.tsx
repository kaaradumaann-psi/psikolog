import { useState } from 'react';
import { clearAllClinicalData, exportClinicalBackup, importClinicalBackup } from '../../clinical/clinicalStore';
import { exportPracticeData, importPracticeData } from '../../clinical/practiceStore';
import { MAX_BACKUP_BYTES, clinicToday } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { Icon } from '../Icon';
import { ConfirmDialog } from '../ConfirmDialog';

export function DataManagementModal({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeInput, setWipeInput] = useState('');
  const [wipeError, setWipeError] = useState<string | null>(null);

  function handleDownloadBackup() {
    const backup = { ...exportClinicalBackup(), practice: exportPracticeData() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `psikolog_klinik_yedek_${clinicToday()}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    setError(null);
    setToast('Yedek indirildi. Dosyayı bu cihazın dışında da saklayın.');
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_BACKUP_BYTES) {
      setError('Yedek 8 MB sınırını aşıyor.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json') && file.type && file.type !== 'application/json') {
      setError('Yalnızca JSON yedek yüklenir.');
      return;
    }
    setPendingFile(file);
  }

  function confirmImport() {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        importClinicalBackup(json);
        importPracticeData(json.practice);
        setToast('Yedek geri yüklendi.');
        window.setTimeout(onClose, 900);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Yedek okunamadı.');
      }
    };
    reader.readAsText(file);
  }

  function handleWipe() {
    setWipeInput('');
    setWipeError(null);
    setWipeOpen(true);
  }
  function confirmWipe() {
    if (wipeInput.trim() !== 'SIL') { setWipeError('Onay için tam olarak SIL yazın.'); return; }
    clearAllClinicalData();
    setWipeOpen(false);
    setToast('Yerel klinik kayıt silindi.');
    window.setTimeout(onClose, 900);
  }

  return (
    <ClinicalDialog titleId="data-dialog-title" onClose={onClose}>
        <div className="clinical-modal-head">
          <h3 id="data-dialog-title">Yedek ve silme</h3>
          <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="clinical-modal-body">
          {toast && <p className="formulation-saved">{toast}</p>}
          {error && <p className="safety-callout">{error}</p>}
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--hairline)', padding: 14, borderRadius: 8, fontSize: 12.5, color: 'var(--soft)', lineHeight: 1.5 }}>
            Kayıtlar bu tarayıcıda durur, şifrelenmez. Ortak bilgisayarda kullanmayın. Düzenli JSON yedek alın. Yedek dosyası kimlik ve seans metni içerir; onu da kimseyle paylaşmayın.
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Yedek indir</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>Danışan, seans, ölçek, randevu, not ve formülasyon.</div>
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={handleDownloadBackup}>İndir</button>
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Yedekten yükle</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>Mevcut kayıtların yerine geçer. En fazla 8 MB.</div>
            </div>
            <label className="btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              Dosya seç
              <input type="file" accept="application/json,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Yerel kaydı sil</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>Danışan dosyaları ve bağlı kayıtlar gider. Antet kalır.</div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={handleWipe}>Sil</button>
          </div>
        </div>
        {pendingFile && (
          <ConfirmDialog title="Yedeği geri yükle" description={`${pendingFile.name} içindeki kayıtlar mevcut danışan, seans, ölçek ve raporların yerine geçecek. Devam edilsin mi?`} confirmLabel="Yükle" onCancel={() => setPendingFile(null)} onConfirm={confirmImport} />
        )}
        {wipeOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} role="dialog" aria-modal="true">
            <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 420, padding: 20, boxShadow: 'var(--shadow-lg)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>Yerel kaydı sil</h4>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--soft)', lineHeight: 1.5 }}>Tüm yerel klinik kayıt silinecek. Antet ayarı kalır. Onay için <strong>SIL</strong> yazın.</p>
              <input type="text" value={wipeInput} onChange={e => { setWipeInput(e.target.value); setWipeError(null); }} placeholder="SIL" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 14 }} autoFocus />
              {wipeError && <p style={{ color: 'var(--danger-ink)', fontSize: 12, margin: '8px 0 0' }}>{wipeError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setWipeOpen(false)}>Vazgeç</button>
                <button type="button" className="btn-primary btn-sm" onClick={confirmWipe}>Sil</button>
              </div>
            </div>
          </div>
        )}
        <div className="clinical-modal-foot">
          <button type="button" className="btn-primary" onClick={onClose}>Kapat</button>
        </div>
    </ClinicalDialog>
  );
}
