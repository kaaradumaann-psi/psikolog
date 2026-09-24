/**
 * Puanlama motoru sürüm damgası — veri bütünlüğü için.
 *
 * Kaydedilen her işlem meta verisine bu sürüm yazılır; böylece ileride
 * puanlama motoru veya norm katmanı değişirse eski kayıtların hangi motorla
 * üretildiği anlaşılabilir. Bu modül bilinçli olarak hiçbir şey import etmez
 * (caseTypes ↔ scoring arasında döngü oluşmasın diye).
 */

/** Puanlama motorunun sürümü. Anahtar/norm/formül değişikliğinde artırılır. */
export const SCORING_ENGINE_VERSION = '2.1.0';

/**
 * T dönüşümünde kullanılan norm kaynağının kısa etiketi.
 * Ayrıntılı künye ve doğrulama durumu: Kaynakça sayfası + docs/kaynak-denetimi.md.
 */
export const NORM_SOURCE_LABEL = 'Savaşır (1981) Türk normları · K düzeltme: klasik ekleme tablosu';
