import type { MMPIProfile, ScaleResult, ValidityStatus } from './mmpiScoring';
import type { Gender, ScaleId } from './mmpiKeys';
import {
  clinicalBands,
  findBand,
  SINGLE_D,
  SINGLE_HS,
  SINGLE_HY,
  SINGLE_MF_MALE,
  SINGLE_PA,
  SINGLE_PD,
  SINGLE_PT,
  type Band,
  type SingleElevation,
} from './mmpiSource';
import {
  activeCodeConditions,
  canonicalCode,
  codeInterpretation,
  resolveCodeInterpretation,
  type CodeCondition,
  type CodeInterpretation,
  type CodeScaleKey,
} from './mmpiSourceCodes';

/**
 * Kullanıcı dostu açıklama metinleri — yorum rehberindeki alt testi tanımlarının
 * kısa özetleridir. Ayrıntılı band yorumları için mmpiSource.ts'deki
 * T puanı tabloları kullanılır. Bu metinler tanı içermez; kesin yorum
 * uygulayıcı uzmana aittir.
 */

export type ScaleMeaning = {
  /** Ölçek ne ölçüyor? (1-2 cümle) */
  measures: string;
  /** Yüksek puan neyi düşündürür? (kaynak) */
  high: string;
  /** Düşük puan neyi düşündürür? (kaynak) */
  low: string;
};

export const SCALE_MEANINGS: Record<ScaleId, ScaleMeaning> = {
  '?': {
    measures: '“Hiç Bir Şey Diyemem” skalası: boş bırakılan madde sayısını gösterir. Yaklaşık 30 madde boş bırakılmışsa geçerlilik sorgulanır, 31 ve üstünde profil büyük olasılıkla geçersizdir.',
    high: 'Profil büyük bir olasılıkla geçersizdir; birey testi tamamlamaya muktedir değildir veya isteksizdir. Mümkünse boş maddelerin doldurulması için danışan güdülenmeli, gerekirse test yinelenmelidir.',
    low: 'Birey bütün maddeleri yanıtlamaya isteklidir; birçok kişinin bu performansta olması beklenir.',
  },
  L: {
    measures: 'Yalan skalası: bireyin kendini olduğundan iyi gösterme, küçük sosyal hatalarını inkar etme eğilimini ölçer.',
    high: 'Kendindeki zayıflıkları inkar, patolojik olarak kendini iyi gösterme çabası; represif ve savunucu tutum. Puanlamada hata olasılığı da dışlanmalıdır.',
    low: 'Bağımsız, kendine güvenen, ufak sosyal hatalarını kabul etmeye hazır kimseler; ya da kendini oldukça patolojik gösterme çabası — diğer geçerlik alt testleri incelenmelidir.',
  },
  F: {
    measures: 'Sıklık skalası: uygun olmayan (seyrek) yaşantılara verilen yanıtların sayısını ölçer; psikopatolojinin miktarı ve şekline ilişkin bilgi verir.',
    high: 'İlişki kurmak istememe, sahte kötülük (simülasyon), yardım çağrısı profili ya da açık psikoz/ciddi psikopatoloji; 90 T puanını aşarsa profil dikkatli değerlendirilmelidir.',
    low: 'Birey rahatsız edici nitelikteki maddelere bilgi vermekten kaçınmış olabilir; ciddi psikopatolojiyi inkar ya da aşırı geleneksel, savunucu (“sahte iyilik”) tutum.',
  },
  K: {
    measures: 'Düzeltme skalası: psikopatolojinin fark edilme ve bilinme düzeyini, savunmacılığı ölçer; bazı klinik ölçeklere K düzeltmesi eklenmesinin temelidir.',
    high: 'Savunucu; sorunları ve zayıflıkları kabule isteksiz, içgörü eksikliği; klinisyen K ile düzeltilmemiş profilleri kullanmalıdır; prognoz kötüdür.',
    low: 'Problemleri aşırı abartma ya da uydurma, akut psikotik stres; kişisel kaynakları sınırlanmış, kötü benlik kavramına sahip bireyler; prognoz sınırlı ya da olumsuzdur.',
  },
  Hs: {
    measures: '(1) Hipokondriazis: bedensel yakınmalar ve sağlık konularıyla aşırı uğraşıyı ölçer.',
    high: 'Bedensel yakınmalarla çok fazla uğraşma; yakınmaların bedensel kaynağını sürekli araştırma; 84 üzerinde somatik delüzyonlar ve olası şizofrenik epizod başlangıcı.',
    low: 'Bedensel yakınmalar ve genel sağlık durumu ile çok az ilgilenme; uyanık, iyimser, yeterli ve yaşamda etkin kişiler.',
  },
  D: {
    measures: '(2) Depresyon: depresif duygudurum, karamsarlık, ilgi daralması ve değersizlik duygularını ölçer.',
    high: 'Depresif ve kaygılı, benlik saygısı düşük, karamsar; ilgi alanları daralmış, kendini işe yaramaz görme; 85 ve üstünde odaklanamayacak kadar keder.',
    low: 'Neşeli, meraklı, iyimser, aktif ve dışa dönük; bazen kayıtsız gibi algılanabilir.',
  },
  Hy: {
    measures: '(3) Histeri: stres altında bedenselleşen (konversif) yakınmaları, bastırma ve inkar kullanımını ölçer.',
    high: 'Bastırma ve inkarı çok fazla kullanma, çocuksu benmerkezcilik, anksiyete bağlantılı somatik yakınmalar; histeroid mekanizmalarla ikincil kazanç.',
    low: 'Kendini sürekli eleştirme; olumlu kişilerarası ilişkileri inkar eğilimi.',
  },
  Pd: {
    measures: '(4) Psikopatik Sapma: sosyal uyumsuzluk, otoriteyle çatışma, impulsivite ve yüzeysel duygusal ilişkileri ölçer.',
    high: 'Öfkeli, impulsif, duygusal açıdan yüzeysel, yordanamaz davranışlar; antisosyal tutum ve otoriteye karşı olma; 80 ve üstünde klinik olarak psikopatik birey.',
    low: 'Durağan, pasif ve atılgan olmayan; sosyal geleneklere uymada bağımlı, hatta katı bireyler.',
  },
  Mf: {
    measures: '(5) Kadınlık-Erkeklik: cinsiyete özgü geleneksel ilgi ve rol kalıplarından uzaklaşmayı ölçer; yorum cinsiyete göre değişir.',
    high: 'Erkeklerde: hayalperest, içedönük, eğitim ve sanat yönelimli; çok yüksek puanlar pasiflik/kadınsı özellikler. Kadınlarda: güçlü, yarışmacı, yönlendirici, geleneksel erkek rolüne özgü ilgi ve işler.',
    low: 'Erkeklerde: erkeksi ilgilerde daralma, maskülen görünmek için kompülsif uğraş. Kadınlarda: pasif, çekingen; nevrotik üçlü yükselmesiyle ilişkili olabilir.',
  },
  Pa: {
    measures: '(6) Paranoaya: kuşkuculuk, alınganlık, güvensizlik ve yansıtma eğilimini ölçer.',
    high: 'Diğerlerini suçlama ve hostilite; katı, inatçı, aşırı duyarlı; 80 ve üstünde referans fikirleri, perseküsyon/grandiyöz delüzyonlar ve bozuk gerçeklik değerlendirmesi.',
    low: 'Geleneksel, güvenilir, kişiler arası ilişkilerde duyarsız, ilkel ve saf; ya da aşırı şüphesi nedeniyle maddeleri atlayan bireyler.',
  },
  Pt: {
    measures: '(7) Psikasteni: anksiyete, gerginlik, obsesif düşünce, ruminasyon ve kendinden şüpheyi ölçer.',
    high: 'Ajite ruminasyonlar, obsesyonlar, kompulsiyonlar ya da fobiler; anksiyete ve gerginlik günlük yaşamı sürdüremeyecek kadar yoğun olabilir.',
    low: 'Rahat, gerginliği olmayan, kendine güvenli ve üretici; kaygı düzeyi çok düşük.',
  },
  Sc: {
    measures: '(8) Şizofreni: yabancılaşma, sıra dışı düşünce ve algı yaşantılarını, sosyal çekilmeyi ölçer.',
    high: 'Yabancılaşma, dezorganize düşünce, iletişim güçlüğü; 75 ve üstünde gerçek şizoid düşünce süreci; 100 ve üstünde akut psikotik reaksiyon ya da kimlik krizi.',
    low: 'Pratik ve geleneksel; konservatif, uyumlu ve sorumlu ancak hayal gücü sınırlı ve katı.',
  },
  Ma: {
    measures: '(9) Hipomani: enerji, aktivite, fikir uçuşması ve dürtüsellik düzeyini ölçer.',
    high: 'Enerjik, konuşkan, eylemi düşünceye tercih eden; 85 ve üstünde ajitasyon ya da manik dönem, hiperaktivite ve grandiyözite.',
    low: 'Düşük enerji düzeyi, güdü azlığı, hatta apati; özellikle 2 yükselmemişse depresyon düşünülmelidir.',
  },
  Si: {
    measures: '(0) Sosyal İçedönüklük: sosyal ilişkilerden kaçınma, utangaçlık ve içedönüklüğü ölçer.',
    high: 'Sosyal açıdan beceriksiz; sosyal ilişkilerde anksiyete yaşama ve ilişki kurmaktan kaçınma; çekingen ve utangaç.',
    low: 'İyimser, manipülatif, yüzeysel; yalnız kalamayan, sosyal kabul ve onay gereksinimi çok fazla bireyler.',
  },
};

export type PatternHit = {
  id: string;
  name: string;
  rule: string;
  detail: string;
  hit: boolean;
  /** Kaynak sayfası/şekil numarası (DECISION-029/A ile eklenen örüntülerde zorunlu). */
  source?: string;
  /** Kaynağın **birebir** cümlesi (DECISION-030/A): eşiğin nereden geldiği arayüzde okunur. */
  quote?: string;
  /** Kaynağın örüntüye ilişkin çekincesi/direktifi (birebir; yorum eklenmez). */
  caveat?: string;
  /**
   * `true` → kaynakta **nicel eşik yok**; desen otomatik değerlendirilmez ve arayüzde
   * “elle değerlendirilir” olarak listelenir (DECISION-028: sayı uydurulmaz).
   */
  manual?: boolean;
  /** Kaynağın sayısal olmayan ayağı (ör. “F'teki yükselme”) → elle doğrulanacak kısım. */
  manualNote?: string;
};

/**
 * BÖLÜM 6'nın (s.159-169) **genel yorum direktifleri** — kaynak cümleleri birebirdir.
 * Desen eşiklerinden bağımsızdır; arayüzde “Yorum Çekinceleri” olarak basılır
 * (CONFLICT-042 → CHANGE-015).
 */
export type PatternCaveat = {
  text: string;
  source: string;
};

export const MMPI_PATTERN_CAVEATS: PatternCaveat[] = [
  {
    text: 'MMPI profilini yorumlamadan önce testi veren kişi, değerlendirme için gönderilen bireyin bazı özelliklerini dikkate almalıdır. Hiçbir zaman körlemesine bir değerlendirme yapılmamalıdır. İlk aşamada test verilecek bireyin demografik özellikleri belirlenmelidir: Yaş, cinsiyet, eğitim, medenî durum, meslek.',
    source: 's.159 · Bölüm 6 girişi',
  },
  {
    text: 'Genel olarak MMPI yorumları, zekâ düzeyleri 80’in üzerinde olan yetişkinlere yöneliktir. Eğitim düzeyi olarak ortaokul kabul edilmektedir.',
    source: 's.159',
  },
  {
    text: 'MMPI alt testlerinin bazıları yaştan etkilenmektedir. Örneğin, Hs ve D alt testlerde yaşın ilerlemesi ile yükselme olduğu saptanmıştır.',
    source: 's.159',
  },
  {
    text: 'MMPI profilini değerlendirmede bu alanda eğitim almamış bir kişinin kod tipini belirlemesi oldukça zordur. Ancak klinik testlerde belirgin yükselmenin olduğu durumlarda kolaylıkla görülebilir. Yükselmenin hepsi 70 T puanına yakın ya da bunun üstündedir. Bunun yanı sıra ikili ve üçlü kodları belirlemede, hastadan alınan bilgi ve testi veren kişinin deneyimi önemlidir.',
    source: 's.159-160 · Kod tipini belirleme',
  },
  {
    text: 'Sadece bu tür yükselmelerle testi alan kişiye nevrotik ya da psikotik tanısının konulması doğru değildir. Bu nedenle profile ilk bakıldığında psikotik ya da nevrotik profil olduğuna karar verildikten sonra ayrıntılı değerlendirme yapılmalıdır.',
    source: 's.166 · Şekil 29',
  },
  {
    text: 'Bu profil tipiyle bağlantılı bir kod tipi verilemez. Borderline kişilik bozukluğu olan hastalar bu tür bir profil verebilirler.',
    source: 's.167 · Şekil 30',
  },
  {
    text: 'T puanlarının en düşük olduğu alt testlere bakmak gerekmektedir.',
    source: 's.168 · Şekil 31 (Batık Profil)',
  },
  {
    text: 'Eğer klinik testler 60-64 T puanı arasında ise MMPI’dan geliştirilen diğer testler bireyi değerlendirmede daha yararlı olabilir (Butcher 1984).',
    source: 's.169',
  },
];

/**
 * yorum rehberinde tanımlanan klasik profil konfigürasyonları. Eşikler ve
 * yorumlar kaynak rapora dayanır; tanı değil, yol gösterici göstergedir.
 */
export function detectKPlus(profile: MMPIProfile): boolean {
  const t = (id: ScaleId): number => profile.scales.find(s => s.id === id)?.tScore ?? 50;
  const L = t('L');
  const F = t('F');
  const K = t('K');
  const clinicalUnder70 = profile.clinical.every(s => s.tScore < 70);
  const clinicalCountUnder60 = profile.clinical.filter(s => s.tScore <= 60).length;
  return clinicalUnder70 && clinicalCountUnder60 >= 6 && K > F && L > F && (K - F) >= 5;
}

export function detectPatterns(profile: MMPIProfile): PatternHit[] {
  const t = (id: ScaleId): number => profile.scales.find(s => s.id === id)?.tScore ?? 50;
  const Hs = t('Hs');
  const D = t('D');
  const Hy = t('Hy');
  const Pd = t('Pd');
  const Mf = t('Mf');
  const Pa = t('Pa');
  const Pt = t('Pt');
  const Sc = t('Sc');
  const Ma = t('Ma');
  const F = t('F');

  /**
   * DECISION-030/A — BÖLÜM 6 örüntülerinde kullanılan iki küme, kaynağın kendi
   * bölme cümlesinden alınmıştır: “Mf alt testinden çizilen dikey bir çizgi MMPI'ı
   * nevrotik (profilin sol tarafı) ve psikotik (profilin sağ tarafı) olarak ikiye
   * böler” (s.165). Mf hattın kendisidir → hiçbir tarafa sayılmaz.
   */
  const neuroticScales: ScaleId[] = ['Hs', 'D', 'Hy', 'Pd'];
  const psychoticScales: ScaleId[] = ['Pa', 'Pt', 'Sc', 'Ma', 'Si'];
  const clinicalT = profile.clinical.map(s => s.tScore);

  const hits: PatternHit[] = [];

  // SOURCE-FK-003 (Mark & Seeman 1963, s.57 · Şekil 16) — K+ Profili
  hits.push({
    id: 'k-plus',
    name: 'K+ Profili (Mark & Seeman 1963) — Şekil 16',
    rule: 'K > F ∧ L > F ∧ K − F ≥ 5 T ∧ klinik T < 70 ∧ en az 6 klinik T ≤ 60',
    detail: 'Bazen bir profilde tek anlamlı yükselme K alt testinde gözlenir. Bu profilde hiçbir klinik test 70 T puanının üstünde değildir. Bu kişiler utangaç, kaygılı ve ketlenmişlerdir. Ayrıca sorunlarının psikolojik olabileceği konusunda dirençlidirler. Yakın kişiler arası ilişkilerden kaçınırlar ve pasif direnç gösterirler. Kişilik özellikleri şizoid yapıdadır.',
    quote: 'Bazen bir profilde tek anlamlı yükselme K alt testinde gözlenir. Bu profilde hiçbir klinik test 70 T puanının üstünde değildir. (6 ya da daha çok klinik test 60 T puanı ya da altındadır.) K+ profilinde K ve L alt testleri F\'den yüksektir ve K alt testi, F alt testinin en az 5 T puanı üstündedir. Mark ve Seeman (1963) bu tür profilleri K+ profili olarak adlandırmaktadır.',
    source: 's.57 · Şekil 16',
    hit: detectKPlus(profile),
  });

  hits.push({
    id: 'conversion-v',
    name: 'Konversiyon Vadisi / Dönüşüm V (1-3-2)',
    rule: 'Hs ≥ 70 T ∧ Hy ≥ 70 T ∧ ikisinin en düşüğü D’den en az 10 T yüksek',
    detail: '13/31 kodunun klasik görünümü: psikolojik sorunlar somatik yakınmalara dönüştürülür, psikolojik etkenler kabul edilmez; semptomlar ikincil kazanç sağlar (sorumluluk almama ve görevden kaçma). D’nin vadi oluşturması tipiktir.',
    quote: 'Test Hs ve Hy, D alt testinden 10 ya da daha fazla T puanı yüksektir ve Hs ve Hy en az 70 T puanındadır. Bu klasik konversiyon V’de diğer alt testler de yükselir, ancak bu Hs ve Hy kadar değildir.',
    source: 's.160 · Şekil 23',
    manualNote: 'Diğer alt testlerdeki yükselme kaynakta “ancak bu Hs ve Hy kadar değildir” diye nitel olarak veriliyor; bu ayak profilden otomatik değerlendirilmez.',
    // DECISION-030/A (CONFLICT-041 #1): eski eşik 65/5 idi — BÖLÜM 5 konversiyon
    // vadisini nicel tanımlamadığı için koda sabit sayı girmişti; kitabın tek sayısal
    // tanımı s.160’tadır ve **70 T / 10 T** der.
    hit: Hs >= 70 && Hy >= 70 && Math.min(Hs, Hy) - D >= 10,
  });
  hits.push({
    id: 'cry-for-help',
    name: 'Yardım Çağrısı Profili',
    rule: 'F ≥ 70 ve 2 ile 7 testleri 6, 8 ve 9 testlerinden yüksek',
    detail: 'F yükselmesinin nedenlerinden biri: yardım çağrısı profili; 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.',
    source: 's.36 · F yükselme nedenleri (4. madde)',
    quote: 'Yardım çağrısı profili. 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.',
    manualNote: 'Kaynak bu maddeye sayısal bir eşik vermez; “F ≥ 70” eşiği kod tarafındadır. Liste kitabın “80 ve üstü T puanı” başlığı altındadır (s.36-37, SOURCE-VALIDITY-F-005) — DECISION-032 (B) kararı uyarınca F ≥ 70 T otomatik eşiği korunmuş, 80 T bandı kaynak bağlamı olarak taşınmıştır (CONFLICT-043 FIXED).',
    // DECISION-032 (B) ONAYLANDI (2026-09-22): F ≥ 70 T otomatik eşiği korundu;
    // kaynak s.36'daki 80 T ve üzeri bant bilgisi eşik değil bağlamdır (manualNote).
    hit: F >= 70 && D > Pa && D > Sc && D > Ma && Pt > Pa && Pt > Sc && Pt > Ma,
  });
  hits.push({
    id: 'psychotic-v',
    name: 'Paranoid Vadi / Psikotik V (6-8 yükselmesi)',
    rule: 'Pa ≥ 80 T ∧ Sc ≥ 80 T ∧ Pt ≥ 70 T ∧ Pa ve Sc, Pt’den yüksek',
    detail: '6 ve 8, 7’den yüksek olduğunda bu psikotik vadiyi oluşturur; ciddi psikopatoloji vardır ve paranoid tip şizofrenik bozukluklar düşünülebilir. 86/68 kodunda “Paranoid vadi” ya da “Psikotik V” olarak adlandırılır.',
    quote: 'Pa ve Sc alt testleri 80 T puanında, Pt alt ölçeği ise 70 T puanındadır. Bu profil örüntüsüne ilişkin ayrıntılı bilgi Sc alt testinin yorumlanmasında verilmiştir.',
    source: 's.161 · Şekil 24',
    manualNote: 'Kaynak Pt’yi “70 T puanındadır” diye düzey olarak veriyor (eşik değil); vadi şekli bundan ayrı sayı içermediği için korundu. Ayrıntı için Sc alt testi yorumuna bakınız (s.161 atfı).',
    // DECISION-030/A (CONFLICT-041 #2): eski eşik Pa/Sc ≥ 70 idi; kitap s.161’de
    // 80 T der → 70-79 T bandındaki profiller **yanlış pozitif** üretiyordu.
    hit: Pa >= 80 && Sc >= 80 && Pt >= 70 && Math.min(Pa, Sc) > Pt,
  });
  hits.push({
    id: 'depressive-27',
    name: 'Depresif Kod (2-7 / 7-2)',
    rule: 'Pt ≥ 70 ve D ≥ 60',
    detail: '27/72 kodunun görünümü: pasif, bağımlı, yüksek standartlar koyarak stres yaşayan; stres arttığında yapışırcasına bağımlı hale gelen bireyler. 278/728 kodunda intihar olasılığı dikkatle değerlendirilmelidir.',
    source: 's.87 · 27/72 + s.89 · 278/728 (CODE)',
    quote: 'Bu kodda, özellikle alt testlerden K ve Hs, 50 T puanının altında olduğunda ve/veya Ma alt testi yükseldiğinde intihar olasılığı dikkatle değerlendirilmelidir.',
    manualNote: 'Kaynağın intihar riski koşulu K ve Hs < 50 T ve/veya Ma yükselmesidir (s.89); desenin “Pt ≥ 70 ∧ D ≥ 60” eşiği kod tarafındadır (kaynak bu desene sayı vermez). 27 kodunun 85 T koşulu kod katmanında CODE_CONDITIONS içinde değerlendirilir.',
    hit: Pt >= 70 && D >= 60,
  });
  hits.push({
    id: '49',
    name: '4-9 / 9-4 Modeli',
    rule: 'Pd ≥ 70 ve Ma ≥ 70',
    detail: '49/94 kodu: kendi isteklerini ön plana çıkarma, sınırlar, kurallar ve düzenlemelere kızma; benmerkezci, narsisistik, kısa vadeli hedef odaklı. 20 yaş üstünde örüntü daha kalıcıdır; psikoterapi prognozu genellikle çok kötüdür.',
    source: 's.118-119 · 49/94 Kodu (CODE)',
    quote: 'Hem yetişkinler, hem de ergenler için, bu kod kendi isteklerini ön plana çıkarma ve sınırlar, kurallar ve düzenlemelere kızma ile bağlantılıdır.',
    // Batch 24: kart metni CODES['49'] gövdesiyle aynı kaynağa dayanır (SOURCE-CODE-PD-014,
    // gövde MATCH). Kaynağın sayısal koşulları (K > 50 T, üçüncü yükselen test 2/5/7/0 > 70 T,
    // Si < 50 T) CHANGE-014'te CODE_CONDITIONS['49'] olarak bağlandı; “Pd ≥ 70 ∧ Ma ≥ 70”
    // eşiği kod tarafındadır ve kitabın genel yükselme tanımıyla uyumludur (s.160: “Yükselmenin
    // hepsi 70 T puanına yakın ya da bunun üstündedir”).
    hit: Pd >= 70 && Ma >= 70,
  });
  hits.push({
    id: '89',
    name: '8-9 / 9-8 Modeli',
    rule: 'Sc ≥ 70 ve Ma ≥ 70',
    detail: '89/98 kodu: ergenlerde ve yetişkinlerde ciddi psikopatoloji; gerginlik, ajitasyon, uykusuzluk, fikir uçuşmaları. Kod daha da yükselirse delüzyon ve halüsinasyonlarla psikotik tablo ortaya çıkar.',
    source: 's.147-148 · 89/98 Kodu (CODE)',
    // Batch 24: SOURCE-SC-006 gövdeyi MATCH doğruladı; kayıt kısaltmalı (“…”) alıntı
    // içerdiği için UI'a birebir `quote` taşınmadı (birebir okuma ayrı tur). “Sc ≥ 70 ∧
    // Ma ≥ 70” eşiği kod tarafındadır; yaş (27'den küçük) ve üçüncü yükselen test
    // (4/7/6) koşulları CODE_CONDITIONS['89'] içindedir (CHANGE-014).
    hit: Sc >= 70 && Ma >= 70,
  });
  hits.push({
    id: 'neurotic-triad',
    name: 'Nörotik Üçlü (1-2-3)',
    rule: 'Hs, D ve Hy birlikte ≥ 65',
    detail: 'Mf düşüklüğüyle ilişkili klasik nevrotik bölge: bedensel yakınmalar, depresif duygudurum ve histerik savunmaların birlikte yükseldiği tablo.',
    hit: Hs >= 65 && D >= 65 && Hy >= 65,
  });
  // DECISION-029/A — kaynağın "Nevrotik üçlü içindeki üç alt testin ilişkileri
  // çerçevesinde en sık karşılaşılan konfigürasyonlar" (s.103-106) listesi. Eşikler
  // ve sıralama koşulları kitap metnindeki sayısal değerlerdir (300-340 dpi görsel
  // doğrulaması: docs/mmpi-audit/SOURCE_FACTS.md, CONFLICT-033 tablosu).
  const triadHigh = Hs > 70 && D > 70 && Hy > 70;
  hits.push({
    id: 'neurotic-step',
    name: 'Basamak Orantısı (asamalı) — Şekil 18',
    rule: 'Hs > 70 T ∧ D > 70 T ∧ Hy > 70 T ∧ Hs > D > Hy',
    detail:
      'Üç alt test de 70 T puanın üzerindedir ve temel örüntü 1 alt testi en yukarıda olmak üzere 2 ve 3 ' +
      'sırasıyla daha altta yer alacak şekildedir. Bu bireyler en küçük işlev bozukluklarına bile aşırı duyarlık ' +
      'gösteren, somatik bilgileri belirgin kişilerdir; kısa süreli psikolojik tedavilerde prognoz iyi değildir. ' +
      'Kaynak bu konfigürasyona 35 yaşın üzerinde ve kendilerini "tepeyi aşmış" olarak gören erkek hastalarda ' +
      'sıklıkla rastlandığını not eder (yaş koşulu profilden değerlendirilemez).',
    source: 's.103-104 · Şekil 18',
    hit: triadHigh && Hs > D && D > Hy,
  });
  hits.push({
    id: 'neurotic-hat',
    name: 'Şapka — Şekil 19',
    rule: 'Hs < 70 T ∧ D > 70 T ∧ Hy > 70 T ∧ D, Hs ve Hy’den yüksek',
    detail:
      'Alt test Hs 70 T puanının altındayken alt test 2 ve 3, 70 T puanının üzerindeyse bu hastalar emosyonel ' +
      'olarak aşırı kontrol gösterirler ve kendilerini sıkıştırılmış gibi hissettiklerini söylerler. Genellikle ' +
      'yorgun, gergin, kendilerine ilişkin şüphelerle doludurlar ve bu nedenle iş yapmazlar; bağımlı ve immatür ' +
      'olarak tanımlanırlar. Tedavi motivasyonları düşüktür. Ayırt edici özelliği alt test 2’nin 1 ve 3’ten ' +
      'daha fazla yükselmiş olmasıdır.',
    source: 's.105 · Şekil 19',
    hit: Hs < 70 && D > 70 && Hy > 70 && D > Hs && D > Hy,
  });
  hits.push({
    id: 'neurotic-rising',
    name: 'Yükselen Eğilim — Şekil 20',
    rule: 'Hs > 70 T ∧ D > 70 T ∧ Hy > 70 T ∧ Hs < D < Hy',
    detail:
      'Her üç alt test de 70 T puanının üzerindedir ve her bir alt test bir öncekinden daha yüksektir. Kaynak ' +
      'bu örüntüyü yaşam boyu süregelen hastalık geçmişi, frijidite ve evlilik sorunları olan kadınlarda; ' +
      'erkeklerde kronik anksiyete ile gastrit/ülser tablosunda sık görülen bir seyir olarak tanımlar.',
    source: 's.106 · Şekil 20',
    hit: triadHigh && Hs < D && D < Hy,
  });
  // ─────────────────────────────────────────────────────────────────────────
  // DECISION-030/A (CHANGE-015) — BÖLÜM 6 “MMPI’ı Yorumlama Yaklaşımı”nın profil
  // örüntüleri #4-#10 (s.163-169, Şekil 26-32). Eşikler **yalnızca** kutu
  // metnindeki sayılardır (150 dpi tam sayfa görsel okuma; kanıt:
  // docs/mmpi-audit/SOURCE_FACTS.md → SOURCE-B6-001, karşılaştırma aracı
  // scripts/mmpi-audit/cmp-b6-batch22.ts). Kaynağın sayı vermediği ayaklar
  // `manualNote`/`manual` olarak bırakıldı — DECISION-028 gereği sayı üretilmedi.
  // ─────────────────────────────────────────────────────────────────────────
  hits.push({
    id: 'kus-kanadi',
    name: '“Kuş Kanadı” Profili — Şekil 26',
    rule: 'Hs ≥ 70 T ∧ D ≥ 70 T ∧ Hy ≥ 70 T ∧ Pd ≥ 70 T (+ kadınlarda Mf = 50 T)',
    quote: 'Hs, D, Hy ve Pd testleri 70 T puanına yükselmiş ve kadınlarda Mf alt testi 50 T puanındadır.',
    detail: 'Bu yükselme kuş kanadına benzediği için profil bu adı almaktadır. Kaynak örüntüyü nevrotik bölgedeki dört alt testin (1-2-3-4) birlikte yükselmesi olarak çizer.',
    manualNote: '“Psikotik testlerde de yükselme vardır” koşulu kaynakta sayısız verildiği için profilden otomatik değerlendirilmez.',
    source: 's.163 · Şekil 26',
    // Kadınlarda Mf = 50 T: kaynak tam sayı bir düzey veriyor, kodun T puanları
    // kesirli olabildiği için eşik tam-sayı okuma düzeninde (yuvarlama) karşılanır.
    hit: Hs >= 70 && D >= 70 && Hy >= 70 && Pd >= 70
      && (profile.gender !== 'Kadın' || Math.round(Mf) === 50),
  });
  hits.push({
    id: 'pasif-agresif-v',
    name: 'Pasif-Agresif V (Kadınlarda) — Şekil 27',
    rule: 'Kadın profil ∧ Pd ≥ 70 T ∧ Pa ≥ 70 T ∧ Mf < 50 T',
    quote: '4 ve 6 70 T puanında ya da üstünde, Mf alt testi 50 T puanının altındadır. Diğer alt testler 70 T puanında olsa bile bu pasif-agresif kişilik bozukluğudur.',
    detail: 'Kaynak örüntüyü “(Kadınlarda)” başlığıyla veriyor → cinsiyet koşulu kuralın parçasıdır; diğer alt testlerin yüksekliği örüntüyü bozmaz.',
    source: 's.164 · Şekil 27',
    hit: profile.gender === 'Kadın' && Pd >= 70 && Pa >= 70 && Mf < 50,
  });
  const psychoticAllHigh = psychoticScales.every(s => t(s) > 70);
  const neuroticAllLow = neuroticScales.every(s => t(s) < 70);
  hits.push({
    id: 'pozitif-egim',
    name: 'Psikotik Yükselme (pozitif eğim) — Şekil 28',
    rule: 'Pa, Pt, Sc, Ma, Si > 70 T ∧ Hs, D, Hy, Pd < 70 T',
    quote: 'Pozitif eğim, psikotik testlerin 70 T puanının üstünde olması, nevrotik testlerin 70 T puanının altında kalmasıdır.',
    detail: 'Mf alt testinden çizilen dikey bir çizgi MMPI’ı nevrotik (profilin sol tarafı) ve psikotik (profilin sağ tarafı) olarak ikiye böler.',
    caveat: 'Sadece bu tür yükselmelerle testi alan kişiye nevrotik ya da psikotik tanısının konulması doğru değildir.',
    source: 's.165 · Şekil 28',
    hit: psychoticAllHigh && neuroticAllLow,
  });
  hits.push({
    id: 'negatif-egim',
    name: 'Nevrotik Yükselme (negatif eğim) — Şekil 29',
    rule: 'Kaynakta nicel eşik yok: nevrotik bölümün yükselmesi + psikotik testlerde “belirgin düşüklük”',
    quote: 'Negatif eğim, ise profilin sol ya da nevrotik bölümünün yükselmesi ve psikotik testlerde belirgin düşüklük olmasıdır. Bu nevrotik bir uyumu göstermektedir.',
    detail: 'Pozitif eğimin tersi yöndür. Kaynak “belirgin düşüklük” dışında sayı vermediği için bu örüntü profil üzerinden otomatik olarak vur duruma getirilmez (DECISION-028).',
    caveat: 'Sadece bu tür yükselmelerle testi alan kişiye nevrotik ya da psikotik tanısının konulması doğru değildir.',
    manualNote: 'Nevrotik bölümün yükselmesi ve psikotik testlerdeki düşüklük elle karşılaştırılmalıdır; arayüz bu örüntüde otomatik karar vermez.',
    source: 's.166 · Şekil 29',
    manual: true,
    hit: false,
  });
  hits.push({
    id: 'yuzen-profil',
    name: '“Yüzen” Profil — Şekil 30',
    rule: 'Hs → Ma arasındaki bütün klinik ölçekler > 70 T',
    quote: 'Bu profilde Hs’den, Ma’ya kadar olan bütün değerler 70 T puanının üstündedir ve buna F alt testindeki yükselme eşlik eder. Bu profil borderline kişilik bozukluğu olan kişilere özgüdür.',
    detail: 'Kodun “çoklu yükselme” göstergesinden farklıdır: burada Hs’den Ma’ya kadar tüm ölçeklerin 70 T üstü olması aranır (Si dışarıda).',
    caveat: 'Bu profil tipiyle bağlantılı bir kod tipi verilemez.',
    manualNote: 'F alt testindeki yükselme kaynakta sayısal olarak tanımlanmadı → F ayağı ayrıca elle incelenmelidir.',
    source: 's.167 · Şekil 30',
    hit: [Hs, D, Hy, Pd, Mf, Pa, Pt, Sc, Ma].every(v => v > 70),
  });
  hits.push({
    id: 'batik-profil',
    name: 'Batık Profil — Şekil 31',
    rule: 'Bütün klinik ölçekler 45-54 T arasında',
    quote: 'Profilin 45-54 T puanı arasında yer alması: Yorum yapmak zordur. Tek başına bu tür bir yükselmenin anlamı yoktur.',
    detail: 'Şekil alt yazısı “Batik” olarak basılmıştır; metin “Batık” der (s.168).',
    caveat: 'T puanlarının en düşük olduğu alt testlere bakmak gerekmektedir.',
    source: 's.168 · Şekil 31',
    hit: clinicalT.every(v => v >= 45 && v <= 54),
  });
  hits.push({
    id: 'sinir-profil',
    name: 'Sınır Profil — Şekil 32',
    rule: 'Bütün klinik ölçekler 60-70 T arasında (kaynak ayrıca klinik T puanlarını 54 T üstü olarak not eder)',
    quote: 'T puanı 60-70 arasındadır. Geçerlik testlerinde bir yükselme vardır, ancak bu tam bir yükselme değildir. Klinik alt testlerdeki T puanları 54 T puanının üstündedir.',
    detail: 'Bu aradaki yükselmeler semptom belirtmez, daha çok kişilik özelliklerini gösterir…',
    manualNote: 'Geçerlik testlerindeki “tam olmayan yükselme” kaynakta sayı vermiyor → bu ayak elle doğrulanmalıdır.',
    source: 's.169 · Şekil 32',
    hit: clinicalT.every(v => v >= 60 && v <= 70),
  });
  hits.push({
    id: 'multi-high',
    name: 'Çoklu Yükselme',
    rule: '3 veya daha fazla klinik ölçek T ≥ 65',
    detail: 'Birden çok klinik alanın birlikte yükseldiği tablo; tek ölçek yorumu yerine profilin bütününün ve kod analizlerinin birlikte değerlendirilmesini gerektirir.',
    hit: profile.clinical.filter(s => s.tScore >= 65).length >= 3,
  });
  return hits;
}

/** İki noktalı profil kodu için kaynak yorumu (yoksa undefined). */
export function codePointInterpretation(code: string | undefined) {
  return codeInterpretation(code);
}

/** İki noktalı kod için kısa başlık; bilinmiyorsa undefined. */
export function codePointName(code: string | undefined): string | undefined {
  const entry = codeInterpretation(code);
  if (!entry) return undefined;
  const prefix = entry.diagnosis && entry.diagnosis.length > 0 ? `Olası tanı: ${entry.diagnosis[0]}` : 'Yorum mevcut';
  return `Kod ${entry.code} — ${prefix}`;
}

/** Profil üzerinden değerlendirilen kod yorumu (koşullu ek yorumlarla). */
export type ProfileCodeInterpretation = {
  entry: CodeInterpretation;
  /** Profilin T puanlarıyla DEVREYE GİREN koşullu ek yorumlar. */
  activeConditions: CodeCondition[];
  /** Kaynağın sık kullandığı "üçüncü yükselen alt test" bilgisi. */
  third?: CodeScaleKey;
};

/**
 * Kod yorumunu profil bağlamıyla çözer: blok-yerel gövde öncelikli, eşleşme yoksa
 * `undefined` (CONFLICT-030: kırpma kaldırıldı). Profil T puanları koşullu
 * yorumları devreye sokar; yaş gibi profil dışı veriler `manual` olarak işaretlidir.
 */
export function codeInterpretationForProfile(
  code: string | undefined,
  profile: MMPIProfile,
): ProfileCodeInterpretation | undefined {
  const entry = resolveCodeInterpretation(code);
  if (!entry) return undefined;

  const scaleT = (id: string): number | undefined => profile.scales.find(s => s.id === id)?.tScore;
  const used = (code ?? '').replace(/\D/g, '').split('');
  const idByDigit: Record<string, CodeScaleKey> = {
    '1': 'Hs', '2': 'D', '3': 'Hy', '4': 'Pd', '5': 'Mf', '6': 'Pa', '7': 'Pt', '8': 'Sc', '9': 'Ma', '0': 'Si',
  };
  const excluded = used.map(d => idByDigit[d]).filter(Boolean);
  const third = profile.clinical
    .filter(s => !excluded.includes(s.id as CodeScaleKey))
    .sort((a, b) => b.tScore - a.tScore)[0];

  return {
    entry,
    third: third?.id as CodeScaleKey | undefined,
    activeConditions: activeCodeConditions(entry, {
      t: scaleT,
      gender: profile.gender,
      third: third?.id as CodeScaleKey | undefined,
    }),
  };
}

/** Klinik ölçeğin T puanı için kaynak bandı. */
export function clinicalBandFor(id: ScaleId, gender: Gender, tScore: number): Band | undefined {
  const bands = clinicalBands(id, gender);
  if (bands.length === 0) return undefined;
  return findBand(bands, Math.round(tScore));
}

export type SingleElevationHit = { scale: ScaleId; entry: SingleElevation };

/**
 * yorum rehberindeki “Sadece X alt testinin yükselmesi” yorumları.
 * Ortak ölçüt: ilgili klinik ölçek T ≥ 70 ve diğer klinik ölçeklerden hiçbiri
 * T ≥ 70 değil (Pd için kaynak ayrıca ≥ 10 T farkı koşulunu koyar).
 */
export function detectSingleElevations(profile: MMPIProfile): SingleElevationHit[] {
  const t = (id: ScaleId): number => profile.clinical.find(s => s.id === id)?.tScore ?? 50;
  const others = (id: ScaleId): number => Math.max(...profile.clinical.filter(s => s.id !== id).map(s => s.tScore));
  const hits: SingleElevationHit[] = [];

  const single = (id: ScaleId): boolean => t(id) >= 70 && others(id) < 70;

  if (single('Hs')) hits.push({ scale: 'Hs', entry: SINGLE_HS });
  if (single('D')) hits.push({ scale: 'D', entry: SINGLE_D });
  if (single('Hy')) hits.push({ scale: 'Hy', entry: SINGLE_HY });
  // Kaynak: Pd diğer testlerden en az 10 T puanı yukarıda.
  if (t('Pd') >= 70 && t('Pd') - others('Pd') >= 10) hits.push({ scale: 'Pd', entry: SINGLE_PD });
  if (profile.gender === 'Erkek' && single('Mf')) hits.push({ scale: 'Mf', entry: SINGLE_MF_MALE });
  if (single('Pa')) hits.push({ scale: 'Pa', entry: SINGLE_PA });
  if (single('Pt')) hits.push({ scale: 'Pt', entry: SINGLE_PT });
  return hits;
}

/** Kod analizinde gösterilecek üçüncü yükselen ölçek bilgisi. */
export function thirdHighestClinical(profile: MMPIProfile, exclude: readonly string[]): ScaleResult | undefined {
  return [...profile.clinical]
    .filter(s => !exclude.includes(s.id))
    .sort((a, b) => b.tScore - a.tScore)[0];
}

/** Kod kanonikleştirmesini dışa açar ("21" → "12"). */
export { canonicalCode };

/** T skoruna göre tablo/grafik rengi (site paleti: mürekkep, uyarı, tehlike). */
export function tColor(t: number): string {
  if (t >= 70) return '#d2453a';
  if (t >= 56) return '#b4770b';
  return '#0d0d0d';
}

/** T skoruna göre seviye etiketi (kısa). */
export function tLevelShort(s: ScaleResult): string {
  if (s.tScore >= 70) return 'Klinik';
  if (s.tScore >= 56) return 'Orta Yüksek';
  if (s.tScore <= 35) return 'Düşük';
  return 'Normal';
}

/** GEÇERLİ / ŞÜPHELİ / GEÇERSİZ durumunun ekran etiketi ve ton sınıfı. */
export function validityStatusDisplay(status: ValidityStatus): { label: string; className: string } {
  if (status === 'GECERSIZ') return { label: 'Geçersiz Profil', className: 'is-invalid' };
  if (status === 'SUPHELI') return { label: 'Şüpheli Profil', className: 'is-suspect' };
  return { label: 'Geçerli Profil', className: 'is-valid' };
}
