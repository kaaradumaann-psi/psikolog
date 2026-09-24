import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listTestDefinitions, createTestAdministration, createTestResult, listTestAdministrationsByClient } from './testApi';
import type { TestDefinition, TestAdministration } from './testTypes';
import { showToast } from '../../components/ui/Toast';
import { formatDateTR } from '../../lib/dateGuards';
import { isValidDateOnly } from '../../lib/dateGuards';

const adminSchema = z.object({
  testDefinitionId: z.string().min(1, 'Test seçin'),
  administrationDate: z.string().refine((v) => isValidDateOnly(v), 'Tarih geçersiz'),
  externalSource: z.string().max(32).optional().or(z.literal('')),
  externalAssessmentId: z.string().max(128).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
});

type AdminValues = z.infer<typeof adminSchema>;

const resultSchema = z.object({
  summary: z.string().max(5000).optional().or(z.literal('')),
  resultJson: z.string().refine((v) => {
    try {
      const parsed = JSON.parse(v);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }, 'Geçerli JSON obje girin'),
});

type ResultValues = z.infer<typeof resultSchema>;

export function TestAdminForm({ clientId, onSuccess }: { clientId: string; onSuccess: () => void }) {
  const [defs, setDefs] = useState<TestDefinition[]>([]);
  const { register, handleSubmit, formState } = useForm<AdminValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      testDefinitionId: '',
      administrationDate: new Date().toISOString().slice(0, 10),
      externalSource: '',
      externalAssessmentId: '',
      notes: '',
    },
  });

  useEffect(() => {
    listTestDefinitions().then(setDefs).catch(() => {});
  }, []);

  const onSubmit = async (v: AdminValues) => {
    try {
      await createTestAdministration(clientId, {
        testDefinitionId: v.testDefinitionId,
        administrationDate: v.administrationDate,
        externalSource: v.externalSource || null,
        externalAssessmentId: v.externalAssessmentId || null,
        notes: v.notes || null,
      });
      showToast('Test uygulaması kaydedildi', 'success');
      onSuccess();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
        <div className="field">
          <label className="field-label">Test Tanımı *</label>
          <select className="select" {...register('testDefinitionId')}>
            <option value="">Seçin</option>
            {defs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isSystem ? '(sistem)' : ''} [{d.source}]
              </option>
            ))}
          </select>
          {formState.errors.testDefinitionId && (
            <div className="field-error">{formState.errors.testDefinitionId.message}</div>
          )}
        </div>
        <div className="field">
          <label className="field-label">Tarih *</label>
          <input className="input" type="date" {...register('administrationDate')} required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field-label">Harici kaynak</label>
          <input className="input" {...register('externalSource')} placeholder="other" maxLength={32} />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Puanlama Beck, BAI, SCL-90-R, GAD-7 ve PHQ-9 için bu platformdadır. Başka bir envanter yalnızca özet olarak ilişkilendirilir.
          </div>
        </div>
        <div className="field">
          <label className="field-label">Harici Değerlendirme ID</label>
          <input className="input" {...register('externalAssessmentId')} placeholder="opsiyonel" maxLength={128} />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Not</label>
        <textarea className="textarea" rows={2} {...register('notes')} maxLength={5000} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="submit" className="btn btn--primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}

export function TestResultForm({
  administrationId,
  onSuccess,
}: {
  administrationId: string;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState } = useForm<ResultValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      summary: '',
      resultJson: '{"note":"Özet sonuç — ham soru içermez"}',
    },
  });

  const onSubmit = async (v: ResultValues) => {
    try {
      const parsed = JSON.parse(v.resultJson) as Record<string, unknown>;
      await createTestResult(administrationId, {
        resultData: parsed,
        summary: v.summary || null,
      });
      showToast('Test sonucu kaydedildi', 'success');
      onSuccess();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="field">
        <label className="field-label">Özet</label>
        <textarea className="textarea" rows={2} {...register('summary')} maxLength={5000} />
      </div>
      <div className="field">
        <label className="field-label">Sonuç JSON (obje) *</label>
        <textarea className="textarea" rows={6} {...register('resultJson')} style={{ fontFamily: 'monospace', fontSize: 12 }} />
        {formState.errors.resultJson && <div className="field-error">{formState.errors.resultJson.message}</div>}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          Bu alana yalnızca özet sonuç yazılır. Tanı cümlesi üretilmez.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Kaydediliyor…' : 'Sonuç Ekle'}
        </button>
      </div>
    </form>
  );
}

export function TestAdminList({
  clientId,
  refreshKey,
  onAddResult,
}: {
  clientId: string;
  refreshKey?: number;
  onAddResult?: (id: string) => void;
}) {
  const [items, setItems] = useState<TestAdministration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listTestAdministrationsByClient(clientId);
      setItems(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId, refreshKey]);

  if (loading) return <div style={{ padding: 16, color: 'var(--muted)' }}>Yükleniyor…</div>;

  if (items.length === 0) {
    return (
      <div className="empty-state-card">
        <div className="empty-state-icon">—</div>
        <h4>Henüz test uygulaması yok</h4>
        <p>Ölçek sonucu özet olarak kaydedilir — tanı üretilmez</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((ta) => (
        <div key={ta.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <b style={{ fontSize: 14 }}>{ta.definition?.name || ta.testDefinitionId.slice(0, 8)}</b>
                <span className="badge">{formatDateTR(ta.administrationDate)}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ta.status}</span>
                {ta.externalSource && <span className="badge">src:{ta.externalSource}</span>}
              </div>
              {ta.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{ta.notes.slice(0, 120)}</div>}
            </div>
            {onAddResult && (
              <button type="button" className="btn btn--soft btn--sm" onClick={() => onAddResult(ta.id)}>
                Sonuç Ekle
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
