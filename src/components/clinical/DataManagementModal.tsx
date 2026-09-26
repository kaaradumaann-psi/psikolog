import { useState } from 'react';
import { planClinicalClear, planClinicalImport, exportClinicalBackup } from '../../clinical/clinicalStore';
import { notifyPracticeStore, planPracticeClear, planPracticeImport, exportPracticeData, recordAudit } from '../../clinical/practiceStore';
import { notifyClinicalStore } from '../../clinical/clinicalStore';
import { commitScopedWrites } from '../../clinical/storageScope';
import { MAX_BACKUP_BYTES, clinicToday } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { Icon } from '../Icon';

export function DataManagementModal({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ run: () => void; label: string } | null>(null);
  const [wipeWord, setWipeWord] = useState('');

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

  function readFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return null;
    if (file.size > MAX_BACKUP_BYTES) {
      setError('Yedek 8 MB sınırını aşıyor.');
      return null;
    }
    if (!file.name.toLowerCase().endsWith('.json') && file.type && file.type !== 'application/json') {
      setError('Yalnızca JSON yedek yüklenir.');
      return null;
    }
    return file;
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = readFile(event);
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      let plan: ReturnType<typeof planClinicalImport> = [];
      try {
        const json = JSON.parse(String(reader.result));
        // Doğrulama ve serileştirme yazmadan önce yapılır: bozuk yedek
        // mevcut kayıtlara dokunmadan reddedilir.
        plan = [...planClinicalImport(json), ...planPracticeImport(json.practice)];
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Yedek okunamadı.');
        return;
      }
      setPending({
        label: 'Yedeği yükle',
        run: () => {
          // Tek yazım: kota hatasında kayıtların bir kısmı değişmiş kalmaz.
          commitScopedWrites(plan);
          notifyPracticeStore();
          notifyClinicalStore();
          setToast('Yedek geri yüklendi. Kayıtlar bu cihaza yazıldı.');
          window.setTimeout(onClose, 900);
        },
      });
    };
    reader.onerror = () => setError('Dosya okunamadı. Yedeği yeniden seçin.');
    reader.readAsText(file);
  }

  function requestWipe() {
    if (wipeWord !== 'SIL') {
      setError('Onay için SIL yazın. Bu işlem geri alınamaz.');
      return;
    }
    setPending({
      label: 'Tüm kayıtları sil',
      run: () => {
        commitScopedWrites([...planClinicalClear(), ...planPracticeClear()]);
        notifyPracticeStore();
        notifyClinicalStore();
        recordAudit({ action: 'delete', entity: 'backup', entityId: 'clinical', summary: 'Yerel klinik kayıt silindi' });
        setToast('Yerel klinik kayıt silindi.');
        window.setTimeout(onClose, 900);
      },
    });
  }

  return (
    <>
    <ClinicalDialog titleId="data-dialog-title" onClose={onClose}>
        <div className="clinical-modal-head">
          <h3 id="data-dialog-title">Yedek ve silme</h3>
          <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="clinical-modal-body">
          {toast && <p className="formulation-saved">{toast}</p>}
          {error && (
            <p className="form-notice" role="alert">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </p>
          )}
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
              <div className="form-group" style={{ marginTop: 10 }}>
                <label htmlFor="wipe-confirm" style={{ fontSize: 12 }}>
                  Onay için <strong>SIL</strong> yazın
                </label>
                <input
                  id="wipe-confirm"
                  value={wipeWord}
                  onChange={(event) => {
                    setWipeWord(event.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="off"
                  maxLength={8}
                />
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm" disabled={wipeWord !== 'SIL'} onClick={requestWipe}>Sil</button>
          </div>
        </div>
        <div className="clinical-modal-foot">
          <button type="button" className="btn-primary" onClick={onClose}>Kapat</button>
        </div>
    </ClinicalDialog>
    {pending && (
      <ConfirmDialog
        title="Bu işlem geri alınamaz"
        description={pending.label === 'Yedeği yükle'
          ? 'Yedekteki kayıtlar, bu cihazdaki mevcut danışan, seans, ölçek, rapor, not ve görev kayıtlarının yerine geçer.'
          : 'Bu cihazdaki tüm klinik kayıtlar silinir. Önce yedek almadıysanız veriler kaybolur.'}
        confirmLabel={pending.label}
        onConfirm={() => {
          try {
            pending.run();
            setPending(null);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'İşlem tamamlanamadı.');
            setPending(null);
          }
        }}
        onCancel={() => setPending(null)}
      />
    )}
    </>
  );
}