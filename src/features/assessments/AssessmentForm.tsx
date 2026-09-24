import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAssessment } from './assessmentApi';
import { showToast } from '../../components/ui/Toast';
import { isValidDateOnly, isFutureDateIstanbul } from '../../lib/dateGuards';

const schema = z.object({
  reason: z.string().max(5000).optional().or(z.literal('')),
  assessmentDate: z
    .string()
    .refine((v) => isValidDateOnly(v), 'Tarih geçersiz')
    .refine((v) => !isFutureDateIstanbul(v), 'İleri tarih olamaz'),
  method: z.string().max(2000).optional().or(z.literal('')),
  interview: z.string().max(8000).optional().or(z.literal('')),
  observation: z.string().max(8000).optional().or(z.literal('')),
  findings: z.string().max(8000).optional().or(z.literal('')),
  expertEvaluation: z.string().max(8000).optional().or(z.literal('')),
  result: z.string().max(8000).optional().or(z.literal('')),
  recommendations: z.string().max(8000).optional().or(z.literal('')),
});

type Values = z.infer<typeof schema>;

export function AssessmentForm({ clientId, onSuccess }: { clientId: string; onSuccess: () => void }) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: '',
      assessmentDate: new Date().toISOString().slice(0, 10),
      method: '',
      interview: '',
      observation: '',
      findings: '',
      expertEvaluation: '',
      result: '',
      recommendations: '',
    },
  });

  const onSubmit = async (v: Values) => {
    try {
      await createAssessment(clientId, {
        reason: v.reason || null,
        assessmentDate: v.assessmentDate,
        method: v.method || null,
        interview: v.interview || null,
        observation: v.observation || null,
        findings: v.findings || null,
        expertEvaluation: v.expertEvaluation || null,
        result: v.result || null,
        recommendations: v.recommendations || null,
      });
      showToast('Değerlendirme kaydedildi', 'success');
      onSuccess();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
        <div className="field">
          <label className="field-label">Başvuru Nedeni</label>
          <input className="input" {...register('reason')} maxLength={5000} />
        </div>
        <div className="field">
          <label className="field-label">Tarih *</label>
          <input className="input" type="date" {...register('assessmentDate')} required />
        </div>
      </div>
      <div className="field">
        <label className="field-label">Yöntem</label>
        <input className="input" {...register('method')} maxLength={2000} placeholder="Görüşme, gözlem, testler" />
      </div>
      <div className="field">
        <label className="field-label">Görüşme</label>
        <textarea className="textarea" rows={2} {...register('interview')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Gözlem</label>
        <textarea className="textarea" rows={2} {...register('observation')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Bulgular</label>
        <textarea className="textarea" rows={3} {...register('findings')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Uzman Değerlendirmesi</label>
        <textarea className="textarea" rows={3} {...register('expertEvaluation')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Sonuç</label>
        <textarea className="textarea" rows={2} {...register('result')} maxLength={8000} />
      </div>
      <div className="field">
        <label className="field-label">Öneriler</label>
        <textarea className="textarea" rows={2} {...register('recommendations')} maxLength={8000} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="submit" className="btn btn--primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
