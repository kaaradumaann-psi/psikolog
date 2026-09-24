import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAnamnesisByClient, upsertAnamnesis } from './anamnesisApi';
import { showToast } from '../../components/ui/Toast';

const schema = z.object({
  reason: z.string().max(5000).optional().or(z.literal('')),
  currentStatus: z.string().max(5000).optional().or(z.literal('')),
  personalHistory: z.string().max(5000).optional().or(z.literal('')),
  familyHistory: z.string().max(5000).optional().or(z.literal('')),
  education: z.string().max(2000).optional().or(z.literal('')),
  profession: z.string().max(2000).optional().or(z.literal('')),
  socialLife: z.string().max(5000).optional().or(z.literal('')),
  relationships: z.string().max(5000).optional().or(z.literal('')),
  previousApplications: z.string().max(5000).optional().or(z.literal('')),
  previousAssessments: z.string().max(5000).optional().or(z.literal('')),
  expertNotes: z.string().max(5000).optional().or(z.literal('')),
});

type Values = z.infer<typeof schema>;

export function AnamnesisForm({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      currentStatus: '',
      personalHistory: '',
      familyHistory: '',
      education: '',
      profession: '',
      socialLife: '',
      relationships: '',
      previousApplications: '',
      previousAssessments: '',
      expertNotes: '',
    },
  });

  useEffect(() => {
    let cancelled = false;
    getAnamnesisByClient(clientId)
      .then((a) => {
        if (cancelled || !a) return;
        reset({
          reason: a.reason || '',
          currentStatus: a.currentStatus || '',
          personalHistory: a.personalHistory || '',
          familyHistory: a.familyHistory || '',
          education: a.education || '',
          profession: a.profession || '',
          socialLife: a.socialLife || '',
          relationships: a.relationships || '',
          previousApplications: a.previousApplications || '',
          previousAssessments: a.previousAssessments || '',
          expertNotes: a.expertNotes || '',
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, reset]);

  const onSubmit = async (v: Values) => {
    try {
      await upsertAnamnesis(clientId, {
        reason: v.reason || null,
        currentStatus: v.currentStatus || null,
        personalHistory: v.personalHistory || null,
        familyHistory: v.familyHistory || null,
        education: v.education || null,
        profession: v.profession || null,
        socialLife: v.socialLife || null,
        relationships: v.relationships || null,
        previousApplications: v.previousApplications || null,
        previousAssessments: v.previousAssessments || null,
        expertNotes: v.expertNotes || null,
      });
      showToast('Anamnez kaydedildi', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="field">
          <label className="field-label">Başvuru Nedeni</label>
          <textarea className="textarea" rows={3} {...register('reason')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Mevcut Durum</label>
          <textarea className="textarea" rows={3} {...register('currentStatus')} maxLength={5000} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="field-label">Kişisel Öykü</label>
            <textarea className="textarea" rows={4} {...register('personalHistory')} maxLength={5000} />
          </div>
          <div className="field">
            <label className="field-label">Aile Öyküsü</label>
            <textarea className="textarea" rows={4} {...register('familyHistory')} maxLength={5000} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="field-label">Eğitim</label>
            <textarea className="textarea" rows={2} {...register('education')} maxLength={2000} />
          </div>
          <div className="field">
            <label className="field-label">Meslek</label>
            <textarea className="textarea" rows={2} {...register('profession')} maxLength={2000} />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Sosyal Yaşam</label>
          <textarea className="textarea" rows={2} {...register('socialLife')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">İlişkiler</label>
          <textarea className="textarea" rows={2} {...register('relationships')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Önceki Başvurular</label>
          <textarea className="textarea" rows={2} {...register('previousApplications')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Önceki Değerlendirmeler</label>
          <textarea className="textarea" rows={2} {...register('previousAssessments')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Uzman Notları</label>
          <textarea className="textarea" rows={3} {...register('expertNotes')} maxLength={5000} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="submit" className="btn btn--primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
