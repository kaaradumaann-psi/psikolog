// Template engine — block model, safe placeholders, conditional

export type Inline = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type TextKind = 'heading1' | 'heading2' | 'paragraph' | 'bulletList' | 'numberedList';

export type ReportBlock = {
  id: string;
  type: TextKind | 'table' | 'dataField' | 'dataTable';
  runs?: Inline[];
  rows?: string[][];
  path?: string;
  label?: string;
  when?: string;
  sourceTemplate?: string;
};

export type Letterhead = {
  name: string;
  title: string;
  institution: string;
  phone: string;
  email: string;
  address: string;
  logo: string; // data URL
  signature: string; // data URL
};

export const EMPTY_LETTERHEAD: Letterhead = {
  name: '',
  title: '',
  institution: '',
  phone: '',
  email: '',
  address: '',
  logo: '',
  signature: '',
};

export type ReportDocument = { schemaVersion: 1; blocks: ReportBlock[]; letterhead?: Letterhead };

export const SYSTEM_TEMPLATE_ID = '00000000-0000-4000-8000-000000000001';
export const SYSTEM_TEMPLATE_NAME = 'Standart Psikolojik Değerlendirme Raporu';

export type DataValue = Record<string, unknown> | string | number | boolean | null | undefined;
export type ReportSourceData = {
  fields: Record<string, DataValue>;
  tables: Record<string, { headers: string[]; rows: string[][] }>;
};

export const MISSING = '—';

export function displayValue(value: DataValue | undefined): string {
  if (value == null || value === '') return MISSING;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : MISSING;
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (typeof value === 'object') return JSON.stringify(value);
  return MISSING;
}

export function fieldValue(source: ReportSourceData, path: string): DataValue | undefined {
  let current: DataValue | undefined = source.fields as unknown as DataValue;
  for (const part of path.split('.')) {
    if (['__proto__', 'constructor', 'prototype'].includes(part)) return undefined;
    if (!current || typeof current !== 'object' || !Object.hasOwn(current as Record<string, unknown>, part)) return undefined;
    current = (current as Record<string, unknown>)[part] as DataValue;
  }
  return current;
}

export function resolvePlaceholders(text: string, source: ReportSourceData): string {
  return text.replace(/\{\{\s*([\w.?]+)\s*\}\}/g, (_, path: string) => displayValue(fieldValue(source, path)));
}

export function hasData(source: ReportSourceData, path?: string): boolean {
  if (!path) return true;
  if (path.includes('|')) return path.split('|').some((part) => hasData(source, part));
  if (path.startsWith('tables.')) return Boolean(source.tables[path.slice(7)]?.rows.length);
  const v = fieldValue(source, path);
  return v != null && v !== '' && (typeof v !== 'number' || Number.isFinite(v));
}

export function dataCatalog(source: ReportSourceData): { path: string; label: string; group: string; table?: boolean }[] {
  const out: { path: string; label: string; group: string; table?: boolean }[] = [];
  const push = (path: string, label: string, group: string, table?: boolean) => {
    if (hasData(source, path) || table) out.push({ path, label, group, table });
  };

  push('patient.fullName', 'Ad Soyad', 'Danışan');
  push('patient.birthDate', 'Doğum Tarihi', 'Danışan');
  push('patient.age', 'Yaş', 'Danışan');
  push('patient.gender', 'Cinsiyet', 'Danışan');
  push('patient.education', 'Eğitim', 'Danışan');
  push('patient.occupation', 'Meslek', 'Danışan');
  push('patient.fileNumber', 'Dosya No', 'Danışan');

  push('test.date', 'Değerlendirme Tarihi', 'Değerlendirme');
  push('test.psychologist', 'Değerlendiren', 'Değerlendirme');
  push('test.method', 'Yöntem', 'Değerlendirme');
  push('assessment.reason', 'Başvuru Nedeni', 'Değerlendirme');
  push('assessment.findings', 'Bulgular', 'Değerlendirme');
  push('assessment.result', 'Sonuç', 'Değerlendirme');
  push('assessment.recommendations', 'Öneriler', 'Değerlendirme');

  push('anamnesis.reason', 'Başvuru Nedeni (Anamnez)', 'Anamnez');
  push('anamnesis.currentStatus', 'Mevcut Durum', 'Anamnez');

  push('tables.sessions', 'Görüşmeler', 'Görüşmeler', true);
  push('tables.tests', 'Testler', 'Testler', true);

  push('expert.name', 'Uzman Adı', 'Uzman');
  push('expert.title', 'Unvan', 'Uzman');
  push('expert.institution', 'Kurum', 'Uzman');

  return out;
}

export function evaluateWhen(when: string | undefined, source: ReportSourceData): boolean {
  if (!when) return true;
  // Simple safe evaluation: only hasData check, no JS eval
  // when format: "patient.fullName" or "tables.sessions" or "patient.age|patient.gender"
  return hasData(source, when);
}

export function createEmptyBlock(type: ReportBlock['type']): ReportBlock {
  return {
    id: crypto.randomUUID(),
    type,
    runs: type === 'table' || type === 'dataField' || type === 'dataTable' ? undefined : [{ text: '' }],
    rows: type === 'table' ? [['']] : undefined,
  };
}
