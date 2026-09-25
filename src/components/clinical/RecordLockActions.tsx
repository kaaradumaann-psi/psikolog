import { useState } from 'react';
import { Icon } from '../Icon';
import { ConfirmDialog } from '../ConfirmDialog';
import { ClinicalDialog } from './ClinicalDialog';

export type ClinicalRecordStatus = 'draft' | 'signed' | 'locked';

const STATUS_LABEL: Record<ClinicalRecordStatus, string> = {
  draft: 'Taslak',
  signed: 'İmzalı',
  locked: 'Kilitli',
};

export function RecordStatusBadge({ status, revision }: { status?: ClinicalRecordStatus; revision?: number }) {
  const value: ClinicalRecordStatus = status ?? 'draft';
  return (
    <span className={`badge record-status record-status-${value}`} title={revision && revision > 1 ? `Sürüm ${revision}` : undefined}>
      {STATUS_LABEL[value]}
      {revision && revision > 1 ? ` · rev ${revision}` : ''}
    </span>
  );
}

/**
 * PHASE-07 / P0-5 — Taslak → İmzalı → Kilitli akışı.
 * Kilitli kayıtta yalnızca "Yeni Revizyon" sunulur; düzenleme/silme UI'dan kapatılır
 * (asıl koruma DB trigger'ındadır).
 */
export function RecordLockActions({
  status,
  onSign,
  onLock,
  onRevise,
}: {
  status?: ClinicalRecordStatus;
  onSign: () => void;
  onLock: () => void;
  onRevise: (reason: string) => void;
}) {
  const value: ClinicalRecordStatus = status ?? 'draft';
  const [dialog, setDialog] = useState<'sign' | 'lock' | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(action: () => void) {
    try {
      action();
      setError(null);
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
      setDialog(null);
    }
  }

  return (
    <>
      <div className="record-lock-actions">
        {value !== 'locked' && (
          <button type="button" className="btn-secondary btn-sm" onClick={() => setDialog('sign')}>
            <Icon name="checkCircle" size={13} />
            <span>İmzala</span>
          </button>
        )}
        {value !== 'locked' && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setDialog('lock')}>
            <Icon name="shield" size={13} />
            <span>İmzala ve Kilitle</span>
          </button>
        )}
        {value === 'locked' && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setReason('');
              setError(null);
              setRevisionOpen(true);
            }}
          >
            <Icon name="refresh" size={13} />
            <span>Yeni Revizyon</span>
          </button>
        )}
      </div>
      {error && <p className="record-lock-error" role="alert">{error}</p>}

      {dialog === 'sign' && (
        <ConfirmDialog
          tone="neutral"
          title="Kaydı imzala"
          description="Kayıt imzalanacak (taslak → imzalı). Kilitlenene kadar düzeltilebilir; işlem denetim kaydına yazılır."
          confirmLabel="İmzala"
          onConfirm={() => run(onSign)}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog === 'lock' && (
        <ConfirmDialog
          title="İmzala ve kilitle"
          description="Kayıt imzalanıp kilitlenecek. Kilitli kayıtlar değiştirilemez ve silinemez; düzeltmeler yalnızca yeni revizyonla yapılır."
          confirmLabel="İmzala ve kilitle"
          onConfirm={() => run(onLock)}
          onCancel={() => setDialog(null)}
        />
      )}

      {revisionOpen && (
        <ClinicalDialog titleId="revision-dialog-title" onClose={() => setRevisionOpen(false)}>
          <h3 id="revision-dialog-title" style={{ marginTop: 0 }}>Yeni revizyon</h3>
          <p style={{ marginTop: 0, color: 'var(--muted, #555)', fontSize: 13 }}>
            Kilitli kaydın içeriği korunur. Girilen nedenle yeni bir taslak sürüm açılır; eski sürüm arşivde kalır.
          </p>
          <div className="form-group">
            <label htmlFor="revision-reason">Revizyon nedeni *</label>
            <textarea
              id="revision-reason"
              rows={3}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="Örn: Seans notunda tarih düzeltmesi (danışan talebi)"
            />
          </div>
          <div className="clinical-modal-foot">
            <button type="button" className="btn-secondary" onClick={() => setRevisionOpen(false)}>
              Vazgeç
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const trimmed = reason.trim();
                if (trimmed.length < 3) {
                  setError('Revizyon nedeni en az 3 karakter olmalıdır.');
                  return;
                }
                run(() => onRevise(trimmed));
                setRevisionOpen(false);
              }}
            >
              Revizyonu oluştur
            </button>
          </div>
        </ClinicalDialog>
      )}
    </>
  );
}
