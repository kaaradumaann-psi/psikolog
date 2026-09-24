import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientFormValues } from './clientValidation';
import { createClient, updateClient } from './clientApi';
import type { Client } from './clientTypes';
import { showToast } from '../../components/ui/Toast';
import { draftKey, saveDraft, loadDraft, clearDraft } from '../../workspace/draftStorage';
import { useOnlineStatus } from '../../workspace/useOnlineStatus';

type Props = {
  userId: string;
  initial?: Client | null;
  onSuccess: (client: Client) => void;
  onCancel?: () => void;
};

export function ClientForm({ userId, initial, onSuccess, onCancel }: Props) {
  const online = useOnlineStatus();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial
      ? {
          fileNumber: initial.fileNumber,
          firstName: initial.firstName,
          lastName: initial.lastName,
          birthDate: initial.birthDate || '',
          phone: initial.phone || '',
          email: initial.email || '',
          profession: initial.profession || '',
          education: initial.education || '',
          status: initial.status,
        }
      : {
          fileNumber: '',
          firstName: '',
          lastName: '',
          birthDate: '',
          phone: '',
          email: '',
          profession: '',
          education: '',
          status: 'active',
        },
  });

  // Load draft for new client
  useEffect(() => {
    if (initial) return;
    const draft = loadDraft(userId);
    if (!draft) return;
    if (draft.firstName) setValue('firstName', draft.firstName);
    if (draft.lastName) setValue('lastName', draft.lastName);
    if (draft.birthDate) setValue('birthDate', draft.birthDate);
    if (draft.phone) setValue('phone', draft.phone);
    if (draft.email) setValue('email', draft.email);
    if (draft.profession) setValue('profession', draft.profession);
    if (draft.education) setValue('education', draft.education);
  }, [initial, userId, setValue]);

  // Autosave draft
  const watched = watch();
  useEffect(() => {
    if (initial) return; // don't draft edit
    const id = setTimeout(() => {
      saveDraft(userId, {
        version: 1,
        idempotencyKey: crypto.randomUUID(),
        firstName: watched.firstName || '',
        lastName: watched.lastName || '',
        birthDate: watched.birthDate || '',
        phone: watched.phone || '',
        email: watched.email || '',
        profession: watched.profession || '',
        education: watched.education || '',
        updatedAt: Date.now(),
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [watched, userId, initial]);

  const onSubmit = async (values: ClientFormValues) => {
    try {
      if (initial) {
        const updated = await updateClient(initial.id, {
          fileNumber: values.fileNumber || undefined,
          firstName: values.firstName,
          lastName: values.lastName,
          birthDate: values.birthDate || null,
          phone: values.phone || null,
          email: values.email || null,
          profession: values.profession || null,
          education: values.education || null,
          status: values.status,
        });
        showToast('Danışan güncellendi', 'success');
        onSuccess(updated);
      } else {
        const created = await createClient({
          fileNumber: values.fileNumber || undefined,
          firstName: values.firstName,
          lastName: values.lastName,
          birthDate: values.birthDate || null,
          phone: values.phone || null,
          email: values.email || null,
          profession: values.profession || null,
          education: values.education || null,
          status: values.status,
        });
        clearDraft(userId);
        showToast(`Danışan oluşturuldu — ${created.fileNumber}`, 'success');
        onSuccess(created);
      }
    } catch (e) {
      const msg = (e as Error).message;
      showToast(msg, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {!online && (
        <div
          style={{
            background: 'var(--warning-soft)',
            border: '1px solid var(--warning)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          Çevrimdışısınız — taslak kaydediliyor, bağlantı gelince otomatik gönderilecek
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Dosya No (opsiyonel, auto)</label>
          <input className="input" placeholder="F-2026-XXXX" {...register('fileNumber')} maxLength={32} />
          {errors.fileNumber && <div className="field-error">{errors.fileNumber.message}</div>}
          <div className="field-hint">Boş bırakırsanız otomatik üretilir, org içinde unique</div>
        </div>

        <div className="field">
          <label className="field-label">Durum</label>
          <select className="select" {...register('status')}>
            <option value="active">Aktif</option>
            <option value="archived">Arşiv</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Ad *</label>
          <input className="input" placeholder="Ad" {...register('firstName')} maxLength={80} required />
          {errors.firstName && <div className="field-error">{errors.firstName.message}</div>}
        </div>

        <div className="field">
          <label className="field-label">Soyad *</label>
          <input className="input" placeholder="Soyad" {...register('lastName')} maxLength={80} required />
          {errors.lastName && <div className="field-error">{errors.lastName.message}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Doğum Tarihi</label>
          <input className="input" type="date" {...register('birthDate')} />
          {errors.birthDate && <div className="field-error">{errors.birthDate.message}</div>}
          <div className="field-hint">Europe/Istanbul gün sınırı, ileri tarih olamaz</div>
        </div>

        <div className="field">
          <label className="field-label">Telefon</label>
          <input className="input" placeholder="05xx xxx xx xx" {...register('phone')} maxLength={32} />
          {errors.phone && <div className="field-error">{errors.phone.message}</div>}
        </div>
      </div>

      <div className="field">
        <label className="field-label">E-posta</label>
        <input className="input" type="email" placeholder="ornek@mail.com" {...register('email')} maxLength={254} />
        {errors.email && <div className="field-error">{errors.email.message}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Meslek</label>
          <input className="input" placeholder="Meslek" {...register('profession')} maxLength={120} />
          {errors.profession && <div className="field-error">{errors.profession.message}</div>}
        </div>

        <div className="field">
          <label className="field-label">Eğitim</label>
          <input className="input" placeholder="Eğitim" {...register('education')} maxLength={120} />
          {errors.education && <div className="field-error">{errors.education.message}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={isSubmitting}>
            Vazgeç
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Kaydediliyor…' : initial ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Taslak anahtarı: {draftKey(userId)} — 30 gün TTL, sadece gerekli JSON saklanır (KVKK)
      </div>
    </form>
  );
}
