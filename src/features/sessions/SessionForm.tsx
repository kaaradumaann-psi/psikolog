import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SESSION_TYPES } from './sessionTypes';
import { createSession } from './sessionApi';
import { showToast } from '../../components/ui/Toast';
import { isValidDateOnly, isFutureDateIstanbul } from '../../lib/dateGuards';

const schema = z.object({
  date: z
    .string()
    .refine((v) => isValidDateOnly(v), 'Tarih geçersiz')
    .refine((v) => !isFutureDateIstanbul(v), 'İleri tarih olamaz'),
  type: z.string().min(1, 'Tür zorunlu').max(80),
  duration: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => {
      if (!v) return true;
      const n = Number(v);
      return Number.isInteger(n) && n >= 5 && n <= 600;
    }, 'Süre 5-600 dk'),
  notes: z.string().max(8000).optional().or(z.literal('')),
  observation: z.string().max(8000).optional().or(z.literal('')),
  keyPoints: z.string().max(5000).optional().or(z.literal('')),
  plan: z.string().max(5000).optional().or(z.literal('')),
  followUp: z.string().max(5000).optional().or(z.literal('')),
});

type Values = z.infer<typeof schema>;

export function SessionForm({ clientId, onSuccess }: { clientId: string; onSuccess: () => void }) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: 'Takip',
      duration: '',
      notes: '',
      observation: '',
      keyPoints: '',
      plan: '',
      followUp: '',
    },
  });

  const onSubmit = async (v: Values) => {
    try {
      await createSession(clientId, {
        date: v.date,
        type: v.type,
        duration: v.duration ? Number(v.duration) : null,
        notes: v.notes || null,
        observation: v.observation || null,
        keyPoints: v.keyPoints || null,
        plan: v.plan || null,
        followUp: v.followUp || null,
      });
      showToast('Görüşme kaydedildi', 'success');
      onSuccess();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12 }}>
        <div className="field">
          <label className="field-label">Tarih *</label>
          <input className="input" type="date" {...register('date')} required />
        </div>
        <div className="field">
          <label className="field-label">Tür *</label>
          <select className="select" {...register('type')}>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Süre (dk)</label>
          <input className="input" type="number" placeholder="50" {...register('duration')} min={5} max={600} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Not</label>
        <textarea className="textarea" rows={3} {...register('notes')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Gözlem</label>
        <textarea className="textarea" rows={2} {...register('observation')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Önemli Noktalar</label>
        <textarea className="textarea" rows={2} {...register('keyPoints')} maxLength={5000} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Plan</label>
          <textarea className="textarea" rows={2} {...register('plan')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Takip</label>
          <textarea className="textarea" rows={2} {...register('followUp')} maxLength={5000} />
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
