import { useEffect, useState } from 'react';
import {
  emptyFormulation,
  emptySafety,
  safetyPlanIsEmpty,
} from '../../clinical/casework';
import type { CaseFormulation, SafetyPlan, TreatmentGoal } from '../../clinical/casework';
import {
  getFormulation,
  getSafetyPlan,
  newId,
  saveFormulation,
  saveSafetyPlan,
  subscribePracticeStore,
} from '../../clinical/practiceStore';
import '../../styles/dashboard.css';

export function FormulationPanel({ clientId, safetyNeeded }: { clientId: string; safetyNeeded: boolean }) {
  const [formulation, setFormulation] = useState<CaseFormulation>(() => getFormulation(clientId) ?? emptyFormulation(clientId));
  const [safety, setSafety] = useState<SafetyPlan>(() => getSafetyPlan(clientId) ?? emptySafety(clientId));
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setFormulation(getFormulation(clientId) ?? emptyFormulation(clientId));
      setSafety(getSafetyPlan(clientId) ?? emptySafety(clientId));
    }
    refresh();
    return subscribePracticeStore(refresh);
  }, [clientId]);

  function updateGoal(id: string, patch: Partial<TreatmentGoal>) {
    setFormulation((current) => ({
      ...current,
      goals: current.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
    }));
  }

  function saveAll() {
    saveFormulation(formulation);
    saveSafetyPlan(safety);
    setSaved('Kaydedildi');
    window.setTimeout(() => setSaved(null), 2000);
  }

  const planEmpty = safetyPlanIsEmpty(safety);

  return (
    <div className="formulation-panel">
      <div className="modern-table-card formulation-card">
        <div className="formulation-head">
          <div>
            <h3>Vaka formülasyonu</h3>
            <p>4P klinik resim. Tanı listesinin yerine geçmez; seansların nereye gittiğini tutar.</p>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={saveAll}>Kaydet</button>
        </div>
        {saved && <p className="formulation-saved">{saved}</p>}
        <label className="form-group">
          <span>Yaklaşım</span>
          <input value={formulation.modality} onChange={(event) => setFormulation({ ...formulation, modality: event.target.value })} placeholder="Örn. haftalık bireysel BDT" />
        </label>
        <div className="formulation-grid">
          <label className="form-group">
            <span>Yatkınlaştıran</span>
            <textarea rows={3} value={formulation.predisposing} onChange={(event) => setFormulation({ ...formulation, predisposing: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Tetikleyen</span>
            <textarea rows={3} value={formulation.precipitating} onChange={(event) => setFormulation({ ...formulation, precipitating: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Sürdüren</span>
            <textarea rows={3} value={formulation.perpetuating} onChange={(event) => setFormulation({ ...formulation, perpetuating: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Koruyucu</span>
            <textarea rows={3} value={formulation.protective} onChange={(event) => setFormulation({ ...formulation, protective: event.target.value })} />
          </label>
        </div>
        <label className="form-group">
          <span>Gözden geçirme tarihi</span>
          <input type="date" value={formulation.reviewDate} onChange={(event) => setFormulation({ ...formulation, reviewDate: event.target.value })} />
        </label>
        <div className="formulation-goals">
          <div className="formulation-head">
            <h4>Tedavi hedefleri</h4>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setFormulation({
                ...formulation,
                goals: [...formulation.goals, { id: newId('goal'), text: '', measure: '', status: 'active' }],
              })}
            >
              Hedef ekle
            </button>
          </div>
          {formulation.goals.length === 0 && <p className="score-empty">Hedef yok. Ölçülebilir bir cümle ve nasıl izleneceği yeterli.</p>}
          {formulation.goals.map((goal) => (
            <div key={goal.id} className="goal-row">
              <input value={goal.text} placeholder="Hedef" onChange={(event) => updateGoal(goal.id, { text: event.target.value })} />
              <input value={goal.measure} placeholder="Nasıl anlaşılır" onChange={(event) => updateGoal(goal.id, { measure: event.target.value })} />
              <select value={goal.status} onChange={(event) => updateGoal(goal.id, { status: event.target.value as TreatmentGoal['status'] })}>
                <option value="active">Sürüyor</option>
                <option value="met">Karşılandı</option>
                <option value="paused">Ara verildi</option>
              </select>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setFormulation({ ...formulation, goals: formulation.goals.filter((item) => item.id !== goal.id) })}>
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`modern-table-card formulation-card ${safetyNeeded && planEmpty ? 'safety-needed' : ''}`}>
        <div className="formulation-head">
          <div>
            <h3>Güvenlik planı</h3>
            <p>Uyarı işaretleri, baş etme, kişiler ve ortam. Ölçek maddesi pozitifse seansın başında yüz yüze değerlendirilir.</p>
          </div>
        </div>
        {safetyNeeded && planEmpty && <p className="safety-callout">Güvenlik uyarısı var, plan boş.</p>}
        <div className="formulation-grid">
          <label className="form-group">
            <span>Uyarı işaretleri</span>
            <textarea rows={3} value={safety.warningSigns} onChange={(event) => setSafety({ ...safety, warningSigns: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Kendi başına yapabilecekleri</span>
            <textarea rows={3} value={safety.coping} onChange={(event) => setSafety({ ...safety, coping: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Arayabileceği kişiler</span>
            <textarea rows={3} value={safety.people} onChange={(event) => setSafety({ ...safety, people: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Profesyonel iletişim</span>
            <textarea rows={3} value={safety.professionals} onChange={(event) => setSafety({ ...safety, professionals: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Ortamı güvenli kılma</span>
            <textarea rows={3} value={safety.environment} onChange={(event) => setSafety({ ...safety, environment: event.target.value })} />
          </label>
          <label className="form-group">
            <span>Yaşamayı sürdürme nedenleri</span>
            <textarea rows={3} value={safety.reasons} onChange={(event) => setSafety({ ...safety, reasons: event.target.value })} />
          </label>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={saveAll}>Planı kaydet</button>
      </div>
    </div>
  );
}
