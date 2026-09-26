import { useState } from 'react';
import { ClinicalDialog } from './ClinicalDialog';
import { Icon } from '../Icon';

export function RevisionDialog({
  titleId,
  onClose,
  onConfirm,
  lockedLabel = 'Kilitli kayıt',
}: {
  titleId: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  lockedLabel?: string;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      setError('Revizyon nedeni en az 8 karakter olmalı. Kısa bir açıklama yazın.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Neden çok uzun (maksimum 500 karakter).');
      return;
    }
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
      setError('Açıklama geçersiz karakter içeriyor.');
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <ClinicalDialog titleId={titleId} onClose={onClose}>
      <div className="clinical-modal-head">
        <h3 id={titleId}>{lockedLabel}</h3>
        <button type="button" className="btn-icon" aria-label="Pencereyi kapat" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="clinical-modal-body">
        <div className="status-banner warning-banner" style={{ margin: 0 }}>
          <Icon name="shield" size={16} />
          <span>
            Bu kayıt değiştirilemez. Kilitli kaydın kendisi düzenlenemez, yalnızca yeni bir revizyon oluşturulabilir. Revizyon zinciri korunur.
          </span>
        </div>
        <div className="form-group">
          <label htmlFor="revision-reason">Revizyon nedeni</label>
          <textarea
            id="revision-reason"
            rows={3}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Örn. seans notunda tarih düzeltmesi — danışan ifadesi değişmedi; yazım hatası düzeltildi."
            maxLength={500}
            aria-describedby={error ? 'revision-error' : undefined}
            autoFocus
          />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{reason.trim().length} / 500</span>
          {error && (
            <span id="revision-error" role="alert" style={{ color: 'var(--danger-ink)', fontSize: 12 }}>
              {error}
            </span>
          )}
        </div>
      </div>
      <div className="clinical-modal-foot">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Vazgeç
        </button>
        <button type="button" className="btn-primary" onClick={submit}>
          Revizyon oluştur
        </button>
      </div>
    </ClinicalDialog>
  );
}
