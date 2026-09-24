import type { RecordSummary } from './supabaseRecords';

/**
 * Danışan anahtarı normalizasyonu — grouping için deterministik, göç gerektirmeyen.
 * Mevcut `client_first_name` / `client_last_name` alanlarından üretilir.
 *
 * Kurallar:
 * - trim + çoklu whitespace → tek boşluk
 * - Unicode NFC normalize
 * - Türkçe locale ile case normalize (İ→i, I→ı doğru eşleşir)
 *
 * Örnek: "  Ayşe  " + " YILMAZ " → "ayşe|yılmaz"
 * Not: Yalnızca isim eşleşmesi yanlış birleştirme riski taşır; UI buna dair uyarı gösterir.
 */
export function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .toLocaleLowerCase('tr-TR');
}

export function patientKey(firstName: string, lastName: string): string {
  return `${normalizeToken(firstName)}|${normalizeToken(lastName)}`;
}

export function patientDisplayName(firstName: string, lastName: string): string {
  const f = firstName.trim().replace(/\s+/g, ' ');
  const l = lastName.trim().replace(/\s+/g, ' ');
  return `${f} ${l}`.trim();
}

export type PatientGroup = {
  key: string;
  displayName: string;
  firstName: string;
  lastName: string;
  records: RecordSummary[];
  /** En yeni kayıt tarihi (ISO). Grupları tarihe göre sıralamak için. */
  latestDate: string;
  /** En eski kayıt tarihi */
  earliestDate: string;
};

/**
 * Kayıtları danışan anahtarına göre gruplar; her grupta kayıtlar
 * `createdAt` azalan (yeniden eskiye) sıralanır. Dönen grup listesi
 * `latestDate` azalan (en yeni danışan önce) sıralıdır.
 */
export function groupRecords(records: RecordSummary[]): PatientGroup[] {
  const map = new Map<string, PatientGroup>();
  for (const r of records) {
    const key = patientKey(r.firstName, r.lastName);
    const existing = map.get(key);
    if (existing) {
      existing.records.push(r);
    } else {
      map.set(key, {
        key,
        displayName: patientDisplayName(r.firstName, r.lastName),
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        records: [r],
        latestDate: r.createdAt,
        earliestDate: r.createdAt,
      });
    }
  }
  const groups = [...map.values()].map(g => {
    g.records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    // latest/earliest'i sıralı kayıtlardan yeniden hesapla
    if (g.records.length > 0) {
      g.latestDate = g.records[0]!.createdAt;
      g.earliestDate = g.records[g.records.length - 1]!.createdAt;
    }
    return g;
  });
  groups.sort((a, b) => (a.latestDate < b.latestDate ? 1 : a.latestDate > b.latestDate ? -1 : 0));
  return groups;
}

/**
 * Timeline için kronolojik (eskiden yeniye) sıralı kayıtlar.
 */
export function timelineRecords(group: PatientGroup): RecordSummary[] {
  return [...group.records].sort((a, b) => (a.applicationDate < b.applicationDate ? -1 : a.applicationDate > b.applicationDate ? 1 : a.createdAt < b.createdAt ? -1 : 1));
}

/**
 * Gelecekte manuel birleştirme için mimari kancası: iki farklı anahtarı
 * tek bir mantıksal danışana eşlemek istenirse, bu map kullanılır.
 * Şu an uygulanmaz; yalnızca tip ve saklama sözleşmesi tanımlanır.
 */
export type ManualMergeMap = Record<string, string>; // aliasKey -> canonicalKey
