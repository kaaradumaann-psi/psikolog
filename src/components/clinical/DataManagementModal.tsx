import { useState } from 'react';
import { clearAllClinicalData, exportClinicalBackup, importClinicalBackup } from '../../clinical/clinicalStore';
import { exportPracticeData, importPracticeData } from '../../clinical/practiceStore';
import { MAX_BACKUP_BYTES, clinicToday } from '../../clinical/recordRules';
import { ClinicalDialog } from './ClinicalDialog';
import { ConfirmDialog } from '../ConfirmDialog';
import { cloudContext } from '../../clinical/cloud/sync';
import { Icon } from '../Icon';

const WIPE_CONFIRM_WORD = 'SIL';

export function DataManagementModal({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const cloud = Boolean(cloudContext());

  function handleDownloadBackup() {
    const backup = { ...exportClinicalBackup(), practice: exportPracticeData() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `psikolog_${cloud ? 'bulut_onbellek_kopyasi' : 'klinik_yedek'}_${clinicToday()}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
    setError(null);
    setToast(cloud
      ? 'Görünen kayıtların cihaz önbelleği indirildi; belge içerikleri ve sunucu yedeği bu dosyada yoktur.'
      : 'Yerel yedek indirildi. Dosyayı bu cihazın dışında da saklayın.');
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (cloud) {
      setError('Bulut modunda yerel JSON geri yükleme kapalıdır. Sunucu kaydı değiştirilmez.');
      return;
    }
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
    // Mevcut kayıtların yerine geçen yıkıcı bir işlem: native confirm() yerine
    // uygulamanın ConfirmDialog'u ile onaylanır (bkz. render altındaki dialog).
    setPendingRestoreFile(file);
  }

  function confirmRestore() {
    const file = pendingRestoreFile;
    setPendingRestoreFile(null);
    if (!file) return;
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
    if (cloud) {
      setError('Bulut modunda yerel silme kapalıdır. Oturumdan çıkış yalnız cihaz önbelleğini temizler.');
      return;
    }
    // Native prompt() yerine yazılı onay: mevcut dialog gövdesi içinde satır içi
    // bir doğrulama adımı açılır (aşağıdaki "Yerel kaydı sil" bölümü).
    setWipeConfirmText('');
    setWipeConfirmOpen(true);
  }

  function confirmWipe() {
    if (wipeConfirmText !== WIPE_CONFIRM_WORD) return;
    clearAllClinicalData();
    setWipeConfirmOpen(false);
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
          {toast && <p className="formulation-saved" role="status">{toast}</p>}
          {error && <p className="safety-callout" role="alert">{error}</p>}
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--hairline)', padding: 14, borderRadius: 8, fontSize: 12.5, color: 'var(--soft)', lineHeight: 1.5 }}>
            {cloud
              ? 'Sunucu klinik kayıtların asıl kaynağıdır. Bu JSON yalnız cihazdaki yansımayı içerir; özel kovadaki belge içerikleri ve sunucu yedeği değildir. Şifrelenmez, kimlik ve seans metni içerebilir. Bulut geri yüklemesi ve silme bu ekranda kapalıdır.'
              : 'Kayıtlar bu tarayıcıda durur, şifrelenmez. Ortak bilgisayarda kullanmayın. Düzenli JSON yedek alın. Yedek dosyası kimlik ve seans metni içerir; onu da kimseyle paylaşmayın.'}
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>{cloud ? 'Görünen kayıtların kopyasını indir' : 'Yerel yedek indir'}</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>{cloud ? 'Sunucu yedeği veya belge içerikleri değildir.' : 'Danışan, seans, ölçek, randevu, not ve formülasyon.'}</div>
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={handleDownloadBackup}>İndir</button>
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Yedekten yükle</strong>
              <div style={{ fontSize: 12, color: 'var(--soft)' }}>{cloud ? 'Bulut modunda kullanılamaz; mevcut sunucu verileri korunur.' : 'Mevcut yerel kayıtların yerine geçer. En fazla 8 MB.'}</div>
            </div>
            {cloud ? <span className="btn-secondary btn-sm" aria-disabled="true">Bulutta kapalı</span> : (
              <label className="btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                Dosya seç
                <input type="file" accept="application/json,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <div className="modern-table-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>Yerel kaydı sil</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>{cloud ? 'Bulut modunda kullanılamaz; çıkışta cihaz önbelleği temizlenir.' : 'Yerel danışan dosyaları ve bağlı kayıtlar gider. Antet kalır.'}</div>
              </div>
              {!wipeConfirmOpen && <button type="button" className="btn-secondary btn-sm" onClick={handleWipe} disabled={cloud}>Sil</button>}
            </div>
            {wipeConfirmOpen && (
              <div className="safety-callout" role="alertdialog" aria-label="Yerel kaydı silme onayı" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: 0 }}>
                  Bu cihazdaki tüm yerel klinik kayıt (danışan, seans, ölçek, rapor) kalıcı olarak silinecek. Bu işlem geri alınamaz.
                </p>
                <div className="form-group">
                  <label htmlFor="wipe-confirm-input">Onaylamak için <strong>{WIPE_CONFIRM_WORD}</strong> yazın</label>
                  <input
                    id="wipe-confirm-input"
                    value={wipeConfirmText}
                    onChange={(event) => setWipeConfirmText(event.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setWipeConfirmOpen(false)}>Vazgeç</button>
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={confirmWipe}
                    disabled={wipeConfirmText !== WIPE_CONFIRM_WORD}
                  >
                    Kalıcı olarak sil
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="clinical-modal-foot">
          <button type="button" className="btn-primary" onClick={onClose}>Kapat</button>
        </div>

        {pendingRestoreFile && (
          <ConfirmDialog
            title="Yedeği geri yükle"
            description="Bu yedek, bu cihazdaki mevcut danışan, seans, ölçek ve rapor kayıtlarının yerine geçer. Devam edilsin mi?"
            confirmLabel="Yedeği geri yükle"
            onConfirm={confirmRestore}
            onCancel={() => setPendingRestoreFile(null)}
          />
        )}
    </ClinicalDialog>
  );
}