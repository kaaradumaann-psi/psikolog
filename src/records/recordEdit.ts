/**
 * "Kaydı Düzenle" — kayıtlı bir MMPI kaydından yeni bir çalışma taslağı üretir.
 *
 * Tasarım kararları (depolama bütçesi için kritik):
 *  - Orijinal kayıt DEĞİŞMEZ (DB immutability trigger'ı). Düzenleme, orijinale
 *    `revisionOf` ile bağlanan YENİ bir kayıt üretir.
 *  - OMR kaydının "optik form son hali" (4 sayfa, madde durumları, manuel
 *    düzeltmeler ve denetim izi) orijinal kayıtta kalır. Revizyon, optik
 *    payload'ın kopyasını DEĞİL, sonuç cevap dizisini (566 karakterlik
 *    hızlı giriş yükü) taşır: böylece çoklu düzenleme/düzenleme zincirleri
 *    "tüm optik kayıtlarını tutmak" gibi MB'larca büyümez (kayıt başına
 *    ~2-4 KB).
 *  - Kullanıcı taslağa döndüğünde kaldığı yerden devam eder (mevcut taslak
 *    altyapısı: F5/çevrimdışı dayanıklılığı, outbox, auto-save).
 *
 * Arayüz notu: `note` alanı TEKNİK jargon değil, kullanıcının anlayacağı kısa
 * bir "forma ne yüklendi" özetidir; "orijinal kaydı silmez / revizyon oluşur"
 * açıklaması ise çalışma alanındaki düzenleme kartında her adımda görünür.
 */
import { parseRecordPayload, emptyAnswers, emptyRawScores, ITEM_COUNT, RAW_SCORE_FIELDS } from '../workspace/caseTypes';
import type { ClientIntake, EntryMethod, ItemAnswer, RawScores, RawScoreKey } from '../workspace/caseTypes';
import { answersFromOmrPages } from '../results/recordProfile';
import type { FullRecordDetail } from './supabaseRecords';

export type RecordEditState = {
  client: ClientIntake;
  method: EntryMethod;
  answers: ItemAnswer[];
  raw: RawScores;
  revisionOf: string;
  /** Arayüzde gösterilen kısa not: forma hangi verinin ne şekilde yüklendiği. */
  note: string;
  /** OMR kaynaklıysa son optik durum özeti (denetim izi orijinalde kalır). */
  sourceMethod: EntryMethod | undefined;
};

/** Düzenleme açılamadıysa KULLANICININ anlayabileceği gerekçe döner. */
export type EditStateResult =
  | { ok: true; state: RecordEditState }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function rawScalesToRaw(rawScales: Record<RawScoreKey, number> | undefined): RawScores {
  const scores = emptyRawScores();
  if (!rawScales) return scores;
  for (const field of RAW_SCORE_FIELDS) {
    const value = rawScales[field.key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= field.max) {
      scores[field.key] = value;
    }
  }
  return scores;
}

/**
 * Kayıttan düzenlenebilir çalışma durumu üretir. Uygun değilse `ok: false` ile
 * nedenini döner (ör. cinsiyet normlara uygun değilse profil/cevap verisi
 * taşınamaz). OMR kaynaklı kayıtlar son optik durumdan (manuel düzeltmeler
 * dahil) cevap dizisiyle, `quick` yöntemine dönüştürülür; ham puan kayıtları
 * ölçekleriyle geri yüklenir.
 */
export function buildEditStateFromRecord(record: FullRecordDetail): EditStateResult {
  if (!isUuid(record.id)) {
    return { ok: false, error: 'Bu kaydın numarası geçersiz görünüyor; düzenleme açılamadı. Listeye dönüp tekrar deneyin.' };
  }
  const parsed = parseRecordPayload(record.rawOmrAnswers ?? []);
  const client = parsed.client;
  if (!client) {
    return {
      ok: false,
      error: 'Bu kaydın danışan bilgileri eksik görünüyor; düzenleme açılamadı. Eksik kayıt yalnızca “Testi İncele” ile görüntülenebilir.',
    };
  }
  if (client.gender !== 'Erkek' && client.gender !== 'Kadın') {
    return {
      ok: false,
      error: 'Bu kayıttaki cinsiyet bilgisi eksik ya da geçersiz. Cinsiyet normları olmadan yeniden hesaplama yapılamayacağı için kayıt düzenlenemez.',
    };
  }

  const sourceMethod: EntryMethod | undefined = parsed.method;
  // OMR kaynaklı kayıtlar revizyonda HAFİF bir yük taşır: sonuç cevap dizisi
  // (quick) olarak geri yüklenir; tam optik payload kopyalanmaz (MB'larca
  // büyüyen revizyon zincirleri oluşmaz). Optik formun son hali ve denetim
  // izi orijinal kayıtta kalır ve "Testi İncele"den her zaman görünür.
  const method: EntryMethod = sourceMethod === 'raw' ? 'raw' : 'quick';
  let answers = emptyAnswers();
  let raw = emptyRawScores();

  if (method === 'raw') {
    if (!parsed.rawScales) {
      return {
        ok: false,
        error: 'Bu kaydın ham puanları eksik ya da okunamıyor; düzenleme açılamadı. Yeni bir işlemle ham puanları baştan girebilirsiniz.',
      };
    }
    raw = rawScalesToRaw(parsed.rawScales);
  } else {
    if (sourceMethod === 'omr') {
      // Son optik durum: güvenilir cevaplar + ölçülmüş boşlar + manuel düzeltmeler.
      const omrAnswers = answersFromOmrPages(parsed.omrPages);
      // Henüz tam çözülememiş maddeler Boş (?) olarak taşınır; orijinal kayıttaki
      // optik detay ve denetim izi aynen korunur.
      answers = omrAnswers.map(answer => (answer === undefined ? null : answer)) as ItemAnswer[];
    } else {
      if (!parsed.quickAnswers || parsed.quickAnswers.length !== ITEM_COUNT) {
        return {
          ok: false,
          error: `Bu kaydın cevapları eksik ya da bozuk görünüyor (${ITEM_COUNT} madde bulunamadı); düzenleme açılamadı.`,
        };
      }
      answers = [...parsed.quickAnswers];
    }
    if (answers.length !== ITEM_COUNT) {
      return {
        ok: false,
        error: `Bu kaydın cevapları eksik ya da bozuk görünüyor (${ITEM_COUNT} madde bulunamadı); düzenleme açılamadı.`,
      };
    }
  }

  const resolvedCount = answers.filter(answer => answer !== null && answer !== undefined).length;
  // Kısa ve düz Türkçe: "forma ne yüklendi". Revizyon sözleşmesi (orijinal
  // silinmez) çalışma alanındaki kartta her adımda yazılıdır.
  const note = sourceMethod === 'omr'
    ? `Forma, bu kaydın optik okumasının son hali yüklendi (${resolvedCount}/${ITEM_COUNT} madde okunmuş). ` +
      'Optik görüntüler ve düzeltme geçmişi orijinal kayıtta kalır; buradaki düzeltmeler cevaplara yazılır.'
    : sourceMethod === 'raw'
      ? 'Forma, bu kaydın ham puanları yüklendi; dilediğiniz ölçekte düzeltme yapabilirsiniz.'
      : `Forma, bu kaydın ${ITEM_COUNT} cevabı yüklendi; dilediğiniz maddede düzeltme yapabilirsiniz.`;

  return {
    ok: true,
    state: {
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        gender: client.gender,
        age: client.age,
        testDate: client.testDate,
        testDuration: client.testDuration,
        occupation: client.occupation,
        followUp: client.followUp,
        education: client.education,
        maritalStatus: client.maritalStatus,
        applicationReason: client.applicationReason,
        clinicalContext: client.clinicalContext,
      },
      method,
      answers,
      raw,
      revisionOf: record.id,
      note,
      sourceMethod,
    },
  };
}
