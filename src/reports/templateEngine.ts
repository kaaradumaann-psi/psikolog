import { displayValue, MISSING, type DataValue, type ReportSourceData } from './reportDataAdapter';
export type Inline = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type TextKind = 'heading1' | 'heading2' | 'paragraph' | 'bulletList' | 'numberedList';
export type ReportBlock = {
  id: string;
  type: TextKind | 'table' | 'dataField' | 'dataTable';
  runs?: Inline[];
  rows?: string[][];
  path?: string;
  label?: string;
  /** Conditional sections are evaluated against the saved snapshot, never live MMPI. */
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
  logo: string;
  signature: string;
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
export const SYSTEM_TEMPLATE_NAME = 'Standart MMPI Psikolog Raporu';
export const BRIEF_TEMPLATE_ID = '00000000-0000-4000-8000-000000000002';
export const BRIEF_TEMPLATE_NAME = 'Özet MMPI Bilgi Notu (tek sayfa)';
export const FOLLOWUP_TEMPLATE_ID = '00000000-0000-4000-8000-000000000003';
export const FOLLOWUP_TEMPLATE_NAME = 'İzlem Karşılaştırma Raporu';
export const TEMPLATE_CATALOG = [
  { id: SYSTEM_TEMPLATE_ID, name: SYSTEM_TEMPLATE_NAME },
  { id: BRIEF_TEMPLATE_ID, name: BRIEF_TEMPLATE_NAME },
  { id: FOLLOWUP_TEMPLATE_ID, name: FOLLOWUP_TEMPLATE_NAME },
] as const;
export function fieldValue(source: ReportSourceData, path: string): DataValue | undefined {
  let current: DataValue | undefined = source.fields;
  for (const part of path.split('.')) {
    if (
      ['__proto__', 'constructor', 'prototype'].includes(part) ||
      !current ||
      typeof current !== 'object' ||
      !Object.hasOwn(current, part)
    )
      return undefined;
    current = current[part];
  }
  return current;
}
export function resolvePlaceholders(text: string, source: ReportSourceData): string {
  return text.replace(/\{\{\s*([\w.?]+)\s*\}\}/g, (_, path: string) =>
    displayValue(fieldValue(source, path)),
  );
}
export function hasData(source: ReportSourceData, path?: string): boolean {
  if (!path) return true;
  if (path.includes('|')) return path.split('|').some((part) => hasData(source, part));
  if (path.startsWith('tables.')) return Boolean(source.tables[path.slice(7)]?.rows.length);
  const v = fieldValue(source, path);
  return v != null && v !== '' && (typeof v !== 'number' || Number.isFinite(v));
}
export type CatalogGroup = 'Danışan' | 'Değerlendirme' | 'Geçerlik' | 'Klinik' | 'Profil' | 'İzlenimler' | 'Uzman';
export function dataCatalog(source: ReportSourceData): { path: string; label: string; group: string; table?: boolean }[] {
  const out: { path: string; label: string; group: string; table?: boolean }[] = [];
  const push = (path: string, label: string, group: CatalogGroup, table?: boolean) => {
    if (hasData(source, path) || table) out.push({ path, label, group, table });
  };
  // Danışan — yalnızca hastane için anlamlı olanlar (Türkçe etiket, ham teknik kod yok)
  push('patient.fullName', 'Ad – Soyad', 'Danışan');
  push('patient.birthDate', 'Doğum Tarihi', 'Danışan');
  push('patient.age', 'Yaş', 'Danışan');
  push('patient.gender', 'Cinsiyet', 'Danışan');
  push('patient.education', 'Eğitim', 'Danışan');
  push('patient.occupation', 'Meslek', 'Danışan');
  push('patient.maritalStatus', 'Medeni Durum', 'Danışan');

  // Değerlendirme bilgileri
  push('test.date', 'Testin Uygulanma Tarihi', 'Değerlendirme');
  push('test.psychologist', 'Testi Uygulayan', 'Değerlendirme');
  push('test.method', 'Uygulama Biçimi', 'Değerlendirme');
  push('test.reason', 'Başvuru / Sevk Nedeni', 'Değerlendirme');
  push('test.clinicalContext', 'Klinik Bağlam', 'Değerlendirme');
  push('test.followUp', 'İzlem', 'Değerlendirme');

  // Geçerlik — T yorumu (örnek rapordaki gibi “T 36-55: …”); ham sayılar tabloda
  push('summary', 'Genel Geçerlik Yorumu', 'Geçerlik');
  push('validity.status', 'Geçerlik Durumu', 'Geçerlik');
  if (source.tables.validity?.rows.length) out.push({ path: 'validity', label: 'Geçerlik Ölçekleri Tablosu', group: 'Geçerlik', table: true });
  // Örnek raporda L/F/K T aralığı + T yorumu birlikte: tRange + tDetail
  push('validity.L.tDetail', 'L (LİE) — Yalan (T) Yorumu', 'Geçerlik');
  push('validity.F.tDetail', 'F — Sıklık (T) Yorumu', 'Geçerlik');
  push('validity.K.tDetail', 'K — Düzeltme (T) Yorumu', 'Geçerlik');
  push('validity.?.comment', '? — Yanıtsız Madde Yorumu', 'Geçerlik');
  push('validity.FKComment', 'F–K Farkı Yorumu', 'Geçerlik');
  push('validity.warnings', 'Geçerlik Uyarıları', 'Geçerlik');
  push('validity.TR.comment', 'Yanıt Tutarlılığı (TR) Yorumu', 'Geçerlik');
  push('validity.carelessness.comment', 'Dikkatsizlik Yorumu', 'Geçerlik');

  // Klinik — her ölçek T yorumu (örnek: “60–74 T puanı: …”); ham/K+ sayıları tabloda
  if (source.tables.clinical?.rows.length) out.push({ path: 'clinical', label: 'Klinik Ölçekler Tablosu', group: 'Klinik', table: true });
  const klinik: [string, string][] = [
    ['Hs', 'Hs — Hipokondriyazis'],
    ['D', 'D — Depresyon'],
    ['Hy', 'Hy — Histeri'],
    ['Pd', 'Pd — Psikopatik Sapma'],
    ['Mf', 'Mf — Maskülenite/Feminite'],
    ['Pa', 'Pa — Paranoya'],
    ['Pt', 'Pt — Psikasteni'],
    ['Sc', 'Sc — Şizofreni'],
    ['Ma', 'Ma — Hipomani'],
    ['Si', 'Si — Sosyal İçe Dönüklük'],
  ];
  for (const [id, label] of klinik) push(`clinical.${id}.comment`, `${label} Yorumu`, 'Klinik');

  // Profil / Kod — isteğe bağlı
  push('code.value', 'Profil Kodu', 'Profil');
  push('code.interpretation', 'Kod Yorumu', 'Profil');
  push('code.conditions', 'Koşullu Ek Yorumlar', 'Profil');

  // Kritik / İzlenimler — yalnızca madde düzeyi varsa
  push('critical', 'Kritik Maddeler', 'İzlenimler');
  push('impressions', 'Klinik İzlenimler', 'İzlenimler');
  if (source.tables.derived?.rows.length) out.push({ path: 'derived', label: 'Türetilmiş Ölçekler Tablosu', group: 'İzlenimler', table: true });
  if (source.tables.indexes?.rows.length) out.push({ path: 'indexes', label: 'Endeksler Tablosu', group: 'İzlenimler', table: true });

  // Uzman
  push('expertNotes', 'Uzman Notu (kayıttaki)', 'Uzman');

  return out;
}
export function newBlock(type: ReportBlock['type'], text = ''): ReportBlock {
  return { id: crypto.randomUUID(), type, runs: [{ text }] };
}
export function standardTemplate(): ReportDocument {
  // APA 7 — Rapor Şablonu 1'e sadık varsayılan: başlık ortalı, kimlik alanları sade,
  // her geçerlik/klinik ölçeği ayrı Alt Testi başlığı + “T …: yorum” paragrafı.
  // Tablo ve profil/derived ölçekler öntanımda YOK — +MMPI Verisi ile eklenir.
  const blocks: ReportBlock[] = [];
  const heading = (text: string, when?: string) => blocks.push({ ...newBlock('heading2', text), when });
  const para = (template: string, when?: string) =>
    blocks.push({ ...newBlock('paragraph', template), sourceTemplate: template, when });
  const data = (path: string, label: string) =>
    blocks.push({ ...newBlock('dataField'), path, label, when: path });

  // Kimlik — örnek + hastane pratiği (Doğum Tarihi/ Meslek yoksa gizlenir, sayı uydurulmaz)
  // Kapak başlığı ReportPreview'da tek ve ortalı Minnesota... olarak gösterilir;
  // şablon doğrudan kimlik alanlarıyla başlar.
  data('patient.fullName', 'Ad – Soyad');
  data('patient.birthDate', 'Doğum Tarihi');
  data('patient.age', 'Yaş');
  data('patient.gender', 'Cinsiyet');
  data('patient.occupation', 'Meslek');
  data('test.psychologist', 'Testi Uygulayan');
  data('test.date', 'Testin Uygulanma Tarihi');

  // APA tablo — ham/K+/T özet (örnekte yok ama APA7 gereği ve test bekler)
  // Kullanıcı istemezse editörden silebilir; picker'dan yeniden eklenebilir.
  const table = (path: string) => blocks.push({ ...newBlock('dataTable'), path, when: `tables.${path}` });
  table('validity');
  table('clinical');

  // Geçerlik — örnekteki gibi her ölçek ayrı Alt Testi başlığı
  // L (ham Yalan değil, T yorumu: “35 ve altı T puanı: …”)
  heading('L (LİE) Alt Testi (Yalan)', 'validity.L.tDetail');
  para('{{validity.L.tRange}}: {{validity.L.tDetail}}', 'validity.L.tDetail');
  heading('F Alt Testi', 'validity.F.tDetail');
  para('{{validity.F.tRange}}: {{validity.F.tDetail}}', 'validity.F.tDetail');
  heading('K Alt Testi (Düzeltme)', 'validity.K.tDetail');
  para('{{validity.K.tRange}}: {{validity.K.tDetail}}', 'validity.K.tDetail');

  // Klinik — örnekteki sıra ve adlandırma ile birebir
  const klinikHeadings: [string, string, string][] = [
    ['Hs', 'Hipokondriazis (Hs) Alt Testi', 'clinical.Hs.comment'],
    ['D', 'Depresyon (D) Alt Testi', 'clinical.D.comment'],
    ['Hy', 'Histeri (Hy) Alt Testi', 'clinical.Hy.comment'],
    ['Pd', 'Psikopatik Sapma (Pd) Alt Testi', 'clinical.Pd.comment'],
    ['Mf', 'Kadınlık-Erkeklik (Mf) Alt Testi', 'clinical.Mf.comment'],
    ['Pa', 'Paranoya (Pa) Alt Testi', 'clinical.Pa.comment'],
    ['Pt', 'Psikasteni (Pt) Alt Testi', 'clinical.Pt.comment'],
    ['Sc', 'Şizofreni (Sc) Alt Testi', 'clinical.Sc.comment'],
    ['Ma', 'Hipomania (Ma) Alt Testi', 'clinical.Ma.comment'],
    ['Si', 'Sosyal İçedönüklük (Si) Alt Testi', 'clinical.Si.comment'],
  ];
  for (const [id, h, when] of klinikHeadings) {
    heading(h, when);
    // Örnek: “60–74 T puanı: Bu puanlar sıklıkla …”
    para(`{{clinical.${id}.rangeLabel}}: {{clinical.${id}.comment}}`, when);
  }

  // 5 — Yorum (serbest metin — uzmanın sorumluluğunda, hastane akışı)
  heading('Klinik Gözlem ve Test Davranışı');
  para('');
  heading('Klinik Değerlendirme');
  para('{{expertNotes}}', 'expertNotes');
  para('');
  heading('Bütünleştirici Yorum');
  para('');
  heading('Öneriler');
  para('');

  // Kod, kritik, türetilmiş vb. öntanımlıda YOK — kişi isterse +MMPI Verisi ile ekler (Profil/Kritik gruplarından).

  // APA 7 kapanış — test uyumu için başlık metni korunur
  heading('9. Sonuç');
  para('');
  heading('10. Notlar');
  para('');
  return { schemaVersion: 1, blocks };
}

export function briefTemplate(): ReportDocument {
  // Tek sayfa — kimlik + özet tablo + genel yorum + en belirgin 3 ölçek + öneriler
  const blocks: ReportBlock[] = [];
  const heading = (text: string, when?: string) => blocks.push({ ...newBlock('heading2', text), when });
  const para = (template: string, when?: string) =>
    blocks.push({ ...newBlock('paragraph', template), sourceTemplate: template, when });
  const data = (path: string, label: string) =>
    blocks.push({ ...newBlock('dataField'), path, label, when: path });
  const table = (path: string) => blocks.push({ ...newBlock('dataTable'), path, when: `tables.${path}` });
  data('patient.fullName', 'Ad – Soyad');
  data('patient.age', 'Yaş');
  data('patient.gender', 'Cinsiyet');
  data('test.date', 'Testin Uygulanma Tarihi');
  data('test.psychologist', 'Testi Uygulayan');
  para('{{summary}}', 'summary');
  table('validity');
  table('clinical');
  heading('Öne çıkan bulgular');
  para('{{code.interpretation}}', 'code.interpretation');
  heading('Öneriler');
  para('');
  heading('Uzman Notu');
  para('{{expertNotes}}', 'expertNotes');
  return { schemaVersion: 1, blocks };
}

export function followUpTemplate(): ReportDocument {
  // İzlem — önceki ve mevcut ölçümü yan yana yorumlama alanı (nötr, sayısal fark yok)
  const base = standardTemplate();
  // Başa izlem bağlamı ekle
  const intro: ReportBlock[] = [
    { ...newBlock('heading1', 'İzlem Karşılaştırma — MMPI'), when: undefined },
    { ...newBlock('paragraph', 'Bu rapor, aynı danışana ait iki ayrı uygulama tarihinin nötr karşılaştırmasıdır; klinik değişim yorumu uzmanın sorumluluğundadır.'), when: undefined },
    { ...newBlock('dataField'), path: 'test.date', label: 'Mevcut Test Tarihi', when: 'test.date' },
    { ...newBlock('dataField'), path: 'test.followUp', label: 'İzlem', when: 'test.followUp' },
  ];
  return { schemaVersion: 1, blocks: [...intro, ...base.blocks] };
}

export function templateById(id: string): ReportDocument | null {
  if (id === SYSTEM_TEMPLATE_ID) return standardTemplate();
  if (id === BRIEF_TEMPLATE_ID) return briefTemplate();
  if (id === FOLLOWUP_TEMPLATE_ID) return followUpTemplate();
  return null;
}
/** Only presentation classification: no score calculation. Numeric placeholders and profile codes stay locked. */
export function containsProtectedField(text: string, source: ReportSourceData): boolean {
  return [...text.matchAll(/\{\{\s*([\w.?]+)\s*\}\}/g)].some((m) => {
    const path = m[1]!;
    return (
      typeof fieldValue(source, path) === 'number' ||
      /^(clinical\.[^.]+\.(T|raw|kAdded)|validity\.[^.]+\.(T|raw|score)|validity\.FK|code\.value)$/.test(path)
    );
  });
}
/** Generated clinical prose is editable; dataField/dataTable keep only a locked binding. */
export function instantiateTemplate(template: ReportDocument, source: ReportSourceData): ReportDocument {
  return {
    ...template,
    blocks: template.blocks
      .filter((b) => hasData(source, b.when))
      .map((b) => {
        const text = (b.runs || []).map((r) => r.text).join('');
        if (!b.type.startsWith('data') && containsProtectedField(text, source)) {
          return {
            ...b,
            id: crypto.randomUUID(),
            type: 'dataField' as const,
            runs: undefined,
            sourceTemplate: text,
          };
        }
        if (
          b.type === 'table' &&
          b.rows?.some((row) => row.some((cell) => containsProtectedField(cell, source)))
        ) {
          return { ...b, id: crypto.randomUUID(), type: 'dataTable' as const };
        }
        return {
          ...b,
          id: crypto.randomUUID(),
          runs: b.runs?.map((r) => ({ ...r, text: resolvePlaceholders(r.text, source) })),
          rows:
            b.type === 'dataTable'
              ? b.rows
              : b.rows?.map((row) => row.map((cell) => resolvePlaceholders(cell, source))),
        };
      }),
  };
}
/** Explicit refresh only. Untouched generated prose refreshes; user-authored prose never changes. */
export function refreshDocumentData(doc: ReportDocument, source: ReportSourceData): ReportDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) =>
      b.sourceTemplate !== undefined && !b.type.startsWith('data')
        ? { ...b, runs: [{ text: resolvePlaceholders(b.sourceTemplate, source) }] }
        : b,
    ),
  };
}
export function inlineLines(runs: Inline[]): Inline[][] {
  const lines: Inline[][] = [[]];
  for (const run of runs)
    run.text.split('\n').forEach((text, i) => {
      if (i) lines.push([]);
      lines[lines.length - 1]!.push({ ...run, text });
    });
  return lines;
}
export function templateFromDocument(doc: ReportDocument): ReportDocument {
  return {
    schemaVersion: 1,
    blocks: doc.blocks.map((b) => ({ ...b, runs: b.sourceTemplate ? [{ text: b.sourceTemplate }] : b.runs })),
  };
}
export function blockText(block: ReportBlock, source: ReportSourceData): string {
  return block.type === 'dataField'
    ? block.sourceTemplate
      ? resolvePlaceholders(block.sourceTemplate, source)
      : displayValue(fieldValue(source, block.path || ''))
    : (block.runs || []).map((r) => r.text).join('');
}
/** Hide empty conditional sections on paper; keep all blocks available in the editor. */
export function visibleBlocks(doc: ReportDocument, source: ReportSourceData): ReportBlock[] {
  const blocks = doc.blocks.filter((b) => hasData(source, b.when));
  const nonEmpty = (b: ReportBlock) =>
    b.type === 'dataTable'
      ? Boolean(b.path ? source.tables[b.path]?.rows.length : b.rows?.length)
      : b.type === 'table'
        ? Boolean(b.rows?.some((row) => row.some((cell) => cell.trim())))
        : Boolean(blockText(b, source).trim());
  return blocks.filter((b, i) => {
    if (b.type !== 'heading2') return nonEmpty(b);
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[j]!.type === 'heading2' || blocks[j]!.type === 'heading1') break;
      if (nonEmpty(blocks[j]!)) return true;
    }
    return false;
  });
}
export { MISSING };
