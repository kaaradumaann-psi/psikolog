/** Read/format boundary only. Never scores answers or supplies new clinical interpretations. */
import type { FullRecordDetail } from '../records/supabaseRecords';
import type { MMPIProfile } from '../scoring/mmpiScoring';
import {
  clinicalBandFor,
  codeInterpretationForProfile,
  validityStatusDisplay,
} from '../scoring/mmpiInterpretation';
import { SCORING_ENGINE_VERSION } from '../scoring/version';
import type { ParsedRecordPayload } from '../workspace/caseTypes';

export type DataValue = string | number | null | { [key: string]: DataValue };
export type SourceTable = { label: string; columns: string[]; rows: string[][] };
export type ReportSourceData = {
  fields: Record<string, DataValue>;
  tables: Record<string, SourceTable>;
  source_data_version: string;
};
export const MISSING = 'Veri mevcut değil';
export function displayValue(value: unknown): string {
  if (value == null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) return MISSING;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : MISSING;
}
/** Non-security fingerprint: change detection, NOT a signature of clinical correctness. */
export function snapshotHash(value: unknown): string {
  let hash = 2166136261;
  for (const c of JSON.stringify(value)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
function formatTrDateOnly(iso?: string | null): string | null {
  if (!iso) return null;
  // Beklenen giriş: YYYY-MM-DD; DD/MM/YYYY üret
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // Zaten DD/MM/YYYY ise olduğu gibi bırak
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso.trim())) return iso.trim();
  return iso;
}
export function reportDataAdapter(
  record: FullRecordDetail,
  parsed: ParsedRecordPayload,
  profile: MMPIProfile | null,
): ReportSourceData {
  const c = parsed.client;
  // Doğum tarihi kayıt modelinde ayrı alan olarak yok; yaş ve test tarihinden
  // yaklaşık yıl hesaplanamaz (gün/ay uydurulamaz). Bu yüzden alan null bırakılır;
  // editörde ihtiyaç olursa psikolog kendisi doldurur — sayı uydurulmaz.
  const fields: Record<string, DataValue> = {
    patient: {
      fullName: `${c?.firstName || record.firstName} ${c?.lastName || record.lastName}`.trim(),
      birthDate: null,
      age: c?.age ?? record.age ?? null,
      gender: c?.gender ?? record.gender ?? null,
      occupation: c?.occupation || record.occupation || null,
      education: c?.education || record.education || null,
      maritalStatus: parsed.maritalStatus || null,
    },
    test: {
      date: formatTrDateOnly(c?.testDate || record.applicationDate) || c?.testDate || record.applicationDate,
      psychologist: record.psychologistName || null,
      method: parsed.method ? (parsed.method === 'quick' ? 'Klinik Görüşme Eşliğinde' : parsed.method === 'raw' ? 'Ham Puan Değerlendirmesi' : 'Optik Form (OMR)') : null,
      duration: parsed.testDuration || null,
      reason: parsed.applicationReason || record.requestedBy || null,
      followUp: parsed.followUp || null,
      clinicalContext: parsed.clinicalContext || null,
      scoringVersion: parsed.scoringVersion || SCORING_ENGINE_VERSION,
      normSource: parsed.normSource || null,
    },
    expertNotes: record.expertNotes || null,
  };
  const tables: Record<string, SourceTable> = {};
  if (profile) {
    const v = profile.validityAnalysis;
    fields.summary = v.interpretation;
    fields.validity = {
      status: validityStatusDisplay(v.status).label,
      interpretation: v.interpretation,
      FK: v.fMinusK,
      FKComment: v.fkAnalysis.interpretation,
      warnings: v.warnings.join('\n') || null,
    };
    for (const f of v.findings)
      (fields.validity as Record<string, DataValue>)[f.id] = {
        raw: f.raw,
        T: f.t,
        band: f.band,
        comment: f.comment,
        tDetail: f.tDetail || null,
        tRange: f.tRange || null,
        rawRange: f.rawRange || null,
      };
    tables.validity = {
      label: 'Geçerlik ölçekleri',
      columns: ['Ölçek', 'Ham', 'T', 'Düzey'],
      rows: v.findings.map((f) => [f.id, displayValue(f.raw), displayValue(f.t), f.band]),
    };
    fields.clinical = {};
    tables.clinical = {
      label: 'Klinik ölçekler',
      columns: ['Ölçek', 'Ham', 'K+', 'T', 'Düzey'],
      rows: profile.clinical.map((s) => {
        const band = clinicalBandFor(s.id, profile.gender, s.tScore);
        (fields.clinical as Record<string, DataValue>)[s.id] = {
          name: s.fullName,
          raw: s.rawScore,
          kAdded: s.kAdded ?? null,
          T: s.tScore,
          band: band?.label || null,
          rangeLabel: band?.rangeLabel || null,
          comment: band?.text || null,
        };
        return [
          s.id,
          displayValue(s.rawScore),
          displayValue(s.kAdded),
          displayValue(s.tScore),
          displayValue(band?.label),
        ];
      }),
    };
    const code = codeInterpretationForProfile(profile.profileCode, profile);
    fields.code = {
      value: profile.profileCode || null,
      interpretation: code?.entry.text || null,
      conditions:
        code?.activeConditions
          .map((x) => x.quote + (x.manual ? ' (yaş/süre bilgisi gerekir, elle değerlendirilmelidir)' : ''))
          .join('\n') || null,
    };
    const item = profile.itemLevel;
    if (item) {
      (fields.validity as Record<string, DataValue>).TR = {
        score: item.trIndex.score,
        comment: item.trIndex.interpretation,
      };
      (fields.validity as Record<string, DataValue>).carelessness = {
        score: item.carelessness.score,
        comment: item.carelessness.interpretation,
      };
      fields.critical =
        item.criticalItems.map((x) => `${x.id} · ${x.label} (${x.response === 1 ? 'D' : 'Y'})`).join('\n') ||
        null;
      fields.impressions = item.impressions.map((x) => `${x.title}: ${x.text}`).join('\n') || null;
      if (item.derivedScales.length)
        tables.derived = {
          label: 'Türetilmiş ölçekler',
          columns: ['Ölçek', 'Ham', 'T', 'Düzey', 'Yorum'],
          rows: item.derivedScales.map((x) => [
            x.scaleName,
            displayValue(x.rawScore),
            displayValue(x.tScore),
            x.levelLabel,
            x.interpretation,
          ]),
        };
      if (item.derivedIndexes.length)
        tables.indexes = {
          label: 'Endeksler',
          columns: ['Endeks', 'Değer', 'Düzey', 'Yorum'],
          rows: item.derivedIndexes.map((x) => [
            x.scaleName,
            displayValue(x.value),
            x.levelLabel,
            x.interpretation,
          ]),
        };
    }
  }
  // JSON roundtrip detaches snapshots and normalizes non-finite numbers to null.
  const snapshot = JSON.parse(JSON.stringify({ fields, tables })) as Pick<
    ReportSourceData,
    'fields' | 'tables'
  >;
  return { ...snapshot, source_data_version: `${SCORING_ENGINE_VERSION}:${snapshotHash(snapshot)}` };
}
