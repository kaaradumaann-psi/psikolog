import { useState } from 'react';
import {
  exportClinicalBackup,
  importClinicalBackup,
  resetToDemoData,
} from '../../clinical/clinicalStore';
import { Icon } from '../Icon';

export function DataManagementModal({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);

  function handleDownloadBackup() {
    const backup = exportClinicalBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `psikolog_klinik_yedek_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToast('Yedek dosyası indirildi ✓');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importClinicalBackup(json);
        setToast('Yedek başarıyla geri yüklendi ✓');
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err) {
        alert('Yedek dosyası geçersiz veya bozuk formatta: ' + String(err));
      }
    };
    reader.readAsText(file);
  }

  function handleResetDemo() {
    if (confirm('Tüm mevcut veriler sıfırlanıp varsayılan zengin klinik demo verisi yüklenecek. Emin misiniz?')) {
      resetToDemoData();
      setToast('Klinik demo verileri yüklendi ✓');
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  }

  return (
    <div className="clinical-modal-backdrop" onClick={onClose}>
      <div className="clinical-modal" onClick={e => e.stopPropagation()}>
        <div className="clinical-modal-head">
          <h3>Klinik Veri Yönetimi &amp; Yedekleme</h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="clinical-modal-body">
          {toast && (
            <div style={{ background: 'var(--success-tint)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
              {toast}
            </div>
          )}

          {/* Gizlilik ve Yerel Güvenlik Açıklaması */}
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--hairline)', padding: 14, borderRadius: 8, fontSize: 12.5, color: 'var(--soft)', lineHeight: 1.5 }}>
            <strong>Klinik Veri Güvenliği (KVKK Uyumlu):</strong> Danışan kayıtları, SOAP seans notları ve test sonuçları tarayıcınızın güvenli yerel depolama katmanında (LocalStorage) şifresiz olarak yalnızca bu cihazda barındırılır. Verilerinizi düzenli olarak JSON formatında yedeklemeniz önerilir.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Dışa Aktar */}
            <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14 }}>Tam Klinik Yedeği İndir (JSON)</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                  Tüm danışanları, seans notlarını, testleri ve randevuları tek dosyada indirir.
                </div>
              </div>
              <button type="button" className="btn-primary btn-sm" onClick={handleDownloadBackup}>
                <Icon name="download" size={14} />
                <span>Yedek İndir</span>
              </button>
            </div>

            {/* İçe Aktar */}
            <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14 }}>Yedekten Geri Yükle (JSON)</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                  Daha önce indirilmiş bir JSON yedek dosyasını sisteme yükler.
                </div>
              </div>
              <label className="btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                <Icon name="file" size={14} />
                <span>Dosya Seç</span>
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Demo Veri Yükle */}
            <div className="modern-table-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14 }}>Örnek Demo Verilerini Yükle</strong>
                <div style={{ fontSize: 12, color: 'var(--soft)' }}>
                  Sistemi incelemek için hazır vaka profilleri, SOAP seansları ve MMPI/Beck testlerini yükler.
                </div>
              </div>
              <button type="button" className="btn-secondary btn-sm" onClick={handleResetDemo}>
                <Icon name="refresh" size={14} />
                <span>Demo Yükle</span>
              </button>
            </div>
          </div>
        </div>

        <div className="clinical-modal-foot">
          <button type="button" className="btn-primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
