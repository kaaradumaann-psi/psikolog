/**
 * yorum rehberine birebir dayanan yorum katmanı.
 *
 * Bu dosyadaki tüm kesme noktaları, aralıklar ve yorum metinleri depodaki
 * `klinik yorum rehberi` raporundan alınmıştır (MMPI alt test yorum rehberi).
 * Puanlama algoritması, Türk normları ve K düzeltmesi `mmpiKeys.ts` ve
 * `mmpiScoring.ts` içindedir; bu dosya yalnızca *değerlere göre sonuç*
 * (band → yorum) eşlemesini taşır.
 *
 * Kısaltmalar: Hs(1) Hipokondriazis, D(2) Depresyon, Hy(3) Histeri,
 * Pd(4) Psikopatik Sapma, Mf(5) Kadınlık-Erkeklik, Pa(6) Paranoaya,
 * Pt(7) Psikasteni, Sc(8) Şizofreni, Ma(9) Hipomani, Si(0) Sosyal İçedönüklük.
 */

import type { Gender, ScaleId } from './mmpiKeys';

export type Tone = 'ok' | 'watch' | 'alert';

export type Band = {
  /** Kapalı alt sınır (T veya ham puan). */
  min: number;
  /** Kapalı üst sınır. */
  max: number;
  /** Kaynaktaki aralık etiketi, ör. "T 75-84" veya "Ham 8-15". */
  rangeLabel: string;
  /** Kaynaktaki düzey adı (Düşük / Normal / Orta / Belirgin / ...). */
  label: string;
  /** Kaynaktan sadık yorum metni. */
  text: string;
  tone: Tone;
};

/** Aralık etiketinde kullanmak için sonsuz üst sınır. */
const INF = Number.POSITIVE_INFINITY;

/** Listede t değerini kapsayan ilk bandı döndürür. */
export function findBand(bands: readonly Band[], value: number): Band {
  return bands.find(b => value >= b.min && value <= b.max) ?? bands[bands.length - 1]!;
}

/* ------------------------------------------------------------------ */
/* Geçerlik ölçekleri — ham puan tabloları (klinik yorum rehberi s.48-52)        */
/* ------------------------------------------------------------------ */

/** (?) “Hiç Bir Şey Diyemem” skalası — boş madde sayısı. */
export const CANNOT_SAY_RAW_BANDS: Band[] = [
  {
    min: 0, max: 0, rangeLabel: 'Ham 0', label: 'Düşük', tone: 'ok',
    text: 'Bu bireyler bütün maddeleri yanıtlamaya isteklidirler. Birçok kişinin bu performansta olması beklenir.',
  },
  {
    min: 1, max: 5, rangeLabel: 'Ham 1-5', label: 'Normal', tone: 'ok',
    text: 'Bu bireyler özellikle kendileri için önemli olan konulardaki soruları boş bırakmışlardır. Bunların içeriği göz önüne alınmalıdır.',
  },
  {
    min: 6, max: 30, rangeLabel: 'Ham 6-30', label: 'Orta', tone: 'watch',
    text: 'Bu bireyler çok sayıdaki maddeyi boş bırakmışlardır. Boş bıraktıkları maddelere yeniden bakmaları istenir. Aksi taktirde profilde yüksek nokta çiftlerinde yanlışlıklar ortaya çıkabilir. Yaklaşık 30 madde boş bırakılmışsa geçerliliği sorgulanır.',
  },
  {
    min: 31, max: INF, rangeLabel: 'Ham 31 ve üstü', label: 'Belirgin', tone: 'alert',
    text: 'Bu profil büyük bir olasılıkla geçersizdir. Birey MMPI’ı tamamlamaya muktedir değildir veya isteksizdir. Kendilerine ilişkin önemli bilgi vermemeye çalışıyor olabilirler. Obsesyonel tarzda karamsarlık nedeniyle yanıt verememiş olabilirler. Veya sadece bu maddeleri yanıtlama konusunda isteksizdir. Eğer mümkünse klinisyen, danışana testteki boş maddeleri doldurması için güdülemelidir.',
  },
];

/** L skalası (Yalan) — ham puan tablosu. */
export const L_RAW_BANDS: Band[] = [
  {
    min: 0, max: 2, rangeLabel: 'Ham 0-2', label: 'Düşük', tone: 'watch',
    text: 'Bütün maddelerin doğru yanıtı verilmiş olabilir. Diğer geçerlilik skalaları değerlendirilmelidir. Bu bireyler kendileri hakkında aşırı bir patolojik tablo çizmeye çalışıyor olabilir. Çok küçük sosyal hatalarını bile kabul etmeye istekli olan, bağımsız ve özgüvenli normal kişiler de bu kategoride yer alabilir.',
  },
  {
    min: 3, max: 5, rangeLabel: 'Ham 3-5', label: 'Normal', tone: 'ok',
    text: 'Bu bireyler küçük sosyal hataları kabul etme ve reddetme dengesi açısından başarılıdırlar. İdeal benlik imajı yordamaya çalışan kişiler bu grupta yer alır.',
  },
  {
    min: 6, max: 7, rangeLabel: 'Ham 6-7', label: 'Orta', tone: 'watch',
    text: 'Diğer geçerlilik skalaları değerlendirilmelidir. Normalden daha rahat kişiler veya inkar mekanizmasını çare olarak kullananlar bu grupta yer alır.',
  },
  {
    min: 8, max: 15, rangeLabel: 'Ham 8-15', label: 'Belirgin', tone: 'alert',
    text: 'Puanlamada bir hata olabilir; yanlış cevaplarının yerine doğru cevaplar sayılmış olabilir. Bu ranjda puan alanlar: çok fazla benlik kontrolü olan ve kendi davranışlarına içgörü eksikliği olan, dini veya ahlaksal eğitim alan, çok yaygın insan hatalarını inkar eden, personel seçiminde ideal izlenim vermek için çaba gösteren eğitimsiz kişiler ve inkar mekanizmasını çok kullananlar (sıklıkla histerik ve hipokondriyak durumlarda karşılaşılır) ile yorumun ne olarak kullanılacağını bilmeyen diğer azınlık grupları bu kategoride yer alır.',
  },
];

/** K puanı (Psikopatolojiden Şüphelenmesi ve Bilinmesi) — ham puan tablosu. */
export const K_RAW_BANDS: Band[] = [
  {
    min: 0, max: 4, rangeLabel: 'Ham 0-4', label: 'Düşük (Belirgin)', tone: 'alert',
    text: 'Bu türe girenler ya problemlerini aşırı olarak abartmakta, aşırı duygusal problemi var izlenimi yaratmakta ya da uydurmaktadırlar. Akut psikotik stres yaşıyor olabilirler. Hastaneye yatırılmaları gereklidir. Psikolojik yaklaşım için prognez son derece olumsuzdur.',
  },
  {
    min: 5, max: 9, rangeLabel: 'Ham 5-9', label: 'Düşük', tone: 'watch',
    text: 'Aşırı stres nedeniyle kişisel kaynakları sınırlanmış bireylerdir. Bu bireyler kötü benlik kavramına, aşırı şekilde benlik doyumsuzluğuna, ancak bunları değiştirmek için gereken hüner veya teknik yetersizliklerine sahiptirler. Ayrıca bu kategoride aşırı derecede açık ve mazoşistik eğilimleri olanlar da yer alır. Alt sosyo-ekonomik sınıftaki bireylerde bir yükselme orta düzeydeki bir bozukluğu yansıtırken, üst sosyo-ekonomik düzeydeki bireylerde düşük ego gücünü ve ciddi stres durumlarına işaret eder. Psikolojik yaklaşımda prognez sınırlıdır.',
  },
  {
    min: 10, max: 15, rangeLabel: 'Ham 10-15', label: 'Normal', tone: 'ok',
    text: 'Benliğini açma ile saklama arasında uygun dengeye sahip kişilerdir. Psikolojik yaklaşıma açıktırlar. Üst sınıftaki kişilerde orta düzeyde kişisel stres düşünülebilir. Psikolojik yaklaşımda prognez iyidir.',
  },
  {
    min: 16, max: 20, rangeLabel: 'Ham 16-20', label: 'Orta', tone: 'watch',
    text: 'Bu bireyler savunmacı ve psikolojik strese kabule isteksizdirler. Özellikle alt sınıf bireylerde bu savunmalar inkar ve histerik savunmalarla karakterize edilir. Klinisyen, K puanı ile düzeltilmiş skalalarda K puanının skala değerini aşırı yükseltmesi nedeni ile K ile düzeltilmemiş profilleri kullanmalıdır. Prognez sınırlıdır.',
  },
  {
    min: 21, max: INF, rangeLabel: 'Ham 21 ve üstü', label: 'Belirgin', tone: 'alert',
    text: 'Bu bireyler problemlerini ve zayıflıklarını kabule isteksiz, kontrollü kişilerdir. İç görü eksikliği vardır. Aşırı derecede savunmacıdırlar. Yetersizlikler profile yansımıyor olabilir; ancak son derece yetersiz kişilerdir. Klinisyen, bireyin psikopatolojisini inkar edenleri araştırmalıdır ve K ile düzeltilmemiş profilleri kullanmalıdır. Prognez çok kötüdür.',
  },
];

/** F skalası — ham puan tablosu. */
export const F_RAW_BANDS: Band[] = [
  {
    min: 0, max: 2, rangeLabel: 'Ham 0-2', label: 'Düşük', tone: 'watch',
    text: 'Bu bireyler dikkatli bir tarzda, sosyal olarak kabul edilmeyip veya rahatsız edici nitelikteki skala sorularına bilgi vermekten kaçınmışlardır. Ciddi psikopatolojilerini inkar etmeye çalışıyor olabilirler. Veya aşırı geleneksel, iddialı olmayan normal kişilerdir.',
  },
  {
    min: 3, max: 7, rangeLabel: 'Ham 3-7', label: 'Normal', tone: 'ok',
    text: 'Bu bireyler tipik sayıda uygun olmayan yaşantıya ilişkin bilgi vermişlerdir.',
  },
  {
    min: 8, max: 15, rangeLabel: 'Ham 8-15', label: 'Orta', tone: 'watch',
    text: 'Bu bireyler tipik kişilerden daha fazla sayıda uygun olmayan yaşantıya sahiptirler. Yükselme, psikopatolojinin miktarına ve şekline ilişkin bilgi verir ve bireyin psikopatolojisine nasıl uyum sağladığını gösterir. Psikotik hastalar çoğunlukla bu ranjın ortalarında yer alırlar.',
  },
  {
    min: 16, max: 22, rangeLabel: 'Ham 16-22', label: 'Belirgin', tone: 'alert',
    text: 'Profil geçersiz olabilir; diğer geçerlilik skalalarına bakılmalıdır. Bu yüzden bireyin psikopatolojisinin miktarı ve şekline ilişkin bilgi verir. Bu hastalar yaşlarına ve gördükleri tedavi türüne göre davranış bozukluğu veya psikotik tanısı almışlardır. Ergenler (suçlu olarak etiketlenmemiş olanlar) bozuk davranışlarını dürüstçe işaretlemiş olabilirler.',
  },
  {
    min: 23, max: INF, rangeLabel: 'Ham 23 ve üstü', label: 'Aşırı Belirgin', tone: 'alert',
    text: 'Profil geçersizdir. Diğer geçerlilik skalaları gözden geçirilmelidir. Bu bireylerin dezorganize ve psikotik olma olasılığı fazladır. Görüşme tanı koydurucudur. Kimlik krizine girmiş ergenler bu ranjda yer alabilir.',
  },
];

/* ------------------------------------------------------------------ */
/* Geçerlik ölçekleri — T puanı aralıkları (klinik yorum rehberi s.1-3)          */
/* ------------------------------------------------------------------ */

export const L_T_BANDS: Band[] = [
  {
    min: 69, max: INF, rangeLabel: 'T ≥ 69', label: 'Çok Yüksek', tone: 'alert',
    text: 'Puanlamada hata yapılmış olabilir; “Yanlış” yerine doğru cevaplar sayılmıştır. İki farklı değerlendirme: (1) Sosyal açıdan kabul gören yanıtlar vererek kendini kontrol eden, etkili biri olduğu izlenimi bırakmaya çalışan kişiler. (2) Güvenilmez, pasif, uzak duran, kaygılı, içe kapanık kişiler; diğerleriyle ilişki kurmaları zordur, duruma özgü tepkileri yavaştır; bu yükselmeye sık sık MMPI’ın nevrotik testlerindeki yükselme eşlik eder. Az sayıdaki kişide “patolojik yalan söylemeyi” gösterir; bu klinik görünüm psikopat ya da manik hastalara özgüdür.',
  },
  {
    min: 64, max: 68, rangeLabel: 'T 64-68', label: 'Yüksek', tone: 'alert',
    text: 'Maddeleri gelişigüzel doldurma sonucu ortaya çıkabilir; diğer geçerlik testleri incelenmelidir. Kişinin kendindeki zayıflıkları inkar ettiğini gösterir; birey patolojik olarak kendini iyi göstermeye çalışmaktadır, represif (bastırılmış) ve savunucudur. Bu puanlar dini ve ahlaki inanç ve eğilimleri nedeniyle kendine aşırı kontrol koyan bireylerde görülebilir. Ufak hatalarını bile inkar etmeye eğilimli olanlar, eğitimsiz olup kendini çok iyi göstermeye çalışanlar, inkar mekanizmasını sıklıkla kullanan histerik ve hipokondriaklar ve azınlık grupları bu kategoriye girebilirler.',
  },
  {
    min: 56, max: 63, rangeLabel: 'T 56-63', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bireyin iyi görünme çabası içinde olduğu düşünülmelidir. Bunlarda sosyal açıdan kabul gören yanıtlar verme eğilimi vardır. Birey aşırı geleneksel ve sosyal açıdan uyumludur.',
  },
  {
    min: 36, max: 55, rangeLabel: 'T 36-55', label: 'Normal', tone: 'ok',
    text: 'Bu aralığa ilişkin özgün bir durum tanımlanmamıştır.',
  },
  {
    min: 0, max: 35, rangeLabel: 'T ≤ 35', label: 'Düşük', tone: 'watch',
    text: 'Tüm maddeler doğrudur denebilir. Bağımsız, kendine güvenen, ufak sosyal hatalarını kabul etmeye hazır kimselerdir. Diğer geçerli alt testlerinin incelenmesi gerekir. İki farklı değerlendirme olabilir: Birey ya kendini oldukça patolojik göstermeye çalışıyordur ya da bağımsız, kendine güvenen, eksikliklerinden açıkça bahseden, sosyal kurallara önem vermeyen normal bir insan olabilir.',
  },
];

export const F_T_BANDS: Band[] = [
  {
    min: 80, max: INF, rangeLabel: 'T ≥ 80', label: 'Çok Yüksek', tone: 'alert',
    text: 'F alt testi 90 T puanını aşarsa bu profil dikkatli değerlendirilmelidir. Yükselme nedenleri: (1) İlişki kurmak istememe; hepsi doğru ya da hepsi yanlış yanıt biçimi. (2) Görme ya da okuma güçlüğü nedeniyle anlamada sorun ya da psikotik konfüzyon. (3) Sahte kötülük: hastanın kendini kötü göstermede kazançları varsa (mahkumiyet, malulen emeklilik gibi nedenlerle simülasyon yapma). (4) Yardım çağrısı profili: 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir. (5) Eğer 1 ve 4 alt testleri dışlanırsa açık psikoz ya da ciddi psikopatoloji vardır; 6 ve 8 testleri yükselmiştir, düşünce bozukluğuna veya ilişkili klinik semptomlara bakınız.',
  },
  {
    min: 70, max: 79, rangeLabel: 'T 70-79', label: 'Yüksek', tone: 'alert',
    text: 'Bireyin ego işlevselliğinde bozulma olduğunu, ilişki kurmak istemediğini ya da yanlış anlaşıldığını düşünmesinin göstergesidir. (1) Bu aralık psikozdaki hastaları ya da ciddi nevrotik bozukluğu olan kişileri göstermektedir. (2) Bireyin alışılmadık ve geleneksel olmayan düşünce biçimi vardır. (3) Antisosyal ve asi kişilerdir. (4) F alt testinin bu aralıktaki yükselmesine nevrotik ve psikotik testlerdeki yükselme de eşlik ediyorsa birey borderline bir durumdadır.',
  },
  {
    min: 55, max: 69, rangeLabel: 'T 55-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'Birey bu aralığın üst sınırlarında ise negativist, değişken, huysuz ve huzursuzdur. Çeşitli tanı grupları bu aralığa girebilir: akut nevrozlar ve kişilik bozuklukları; durumsal stresi olan bireyler; savunucu psikotikler.',
  },
  {
    min: 45, max: 54, rangeLabel: 'T 45-54', label: 'Normal', tone: 'watch',
    text: 'Birey sadece belirgin maddelere yanıt vermiştir. (1) İlgi alanı daralmıştır. (2) Bireyin psikopatolojiyi, duygusal gerginliği gizlemek istediğini ve direncini gösterir (sahte iyilik); bu hipotezi L ve K alt testlerindeki yükselme de desteklemektedir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T ≤ 44', label: 'Düşük', tone: 'watch',
    text: 'Bireyin savunucu olduğunun göstergesidir. Birey herhangi bir psikopatoloji, gerginlik ya da stresi olmadığı görünümünü vermek istemektedir (“sahte iyilik”).',
  },
];

export const K_T_BANDS: Band[] = [
  {
    min: 72, max: INF, rangeLabel: 'T ≥ 72', label: 'Çok Yüksek', tone: 'alert',
    text: 'Savunucu bireylerdir. Kendilerinde psikolojik sorunlar olduğunu kabul etmezler. Esnek değillerdir. Tedaviye yanıt kötüdür.',
  },
  {
    min: 61, max: 71, rangeLabel: 'T 61-71', label: 'Yüksek', tone: 'watch',
    text: 'Bu kişiler kendilerinde ve çevrelerinde olan bozuklukları en aza indirgeme ve görmezden gelme eğilimindedir. Savunmalar artmıştır, içgörü azdır. Histerik savunmaları olan nevrotikler için uygundur. Genelde hipokondriyaklar ve histerikler dışında kalan nevrotikler değerlendirmede savunmalarını göstermezler; savunmalar abartıldığında bu düzeyde bir yükselme elde edilir.',
  },
  {
    min: 46, max: 60, rangeLabel: 'T 46-60', label: 'Normal', tone: 'ok',
    text: 'Bu düzeydeki puanlar dengeli bireyleri göstermektedir. Bu yükselme bireyin ego gücünün iyi olduğuna, olumlu kendilik değerine ve uyuma işaret etmektedir. Bunların psikolojik müdahaleyi istemek için yeterli kişisel kaynakları vardır. Yüksek sosyo-ekonomik düzeyden gelen hastalara psikolojik tedavi yarar sağlayabilir. Klinik testler yüksek olsa bile böyle bir K alt test puanı bireyde uygun bir başa çıkma becerisi olduğunu gösterir.',
  },
  {
    min: 0, max: 45, rangeLabel: 'T ≤ 45', label: 'Düşük', tone: 'watch',
    text: 'Düşük sosyo-ekonomik düzeyden gelen bireylerde gözlenebilir; bu hastalar sınırlı kişisel kaynakları ile açıkça ortaya koydukları ciddi sıkıntılar yaşamaktadırlar. Zayıf kendilik değerleri vardır ve kendilerinden hiç memnun değillerdir; ancak durumlarını değiştirecek gerekli kişiler arası beceri ve niteliklerden yoksundurlar. Alt sosyo-ekonomik düzeyden hastalarda bu yükselme orta düzeyde bir hastalığı yansıtırken, yüksek sosyo-ekonomik düzeye sahip hastalarda düşük ego gücünü ve daha ciddi sıkıntıyı yansıtır. Ergenlerdeki düşük K puanı sıklıkla kimliklerini araştırmalarından dolayı olabilir; benzer durum içgörü yönelimli terapiye devam eden bireylerde de görülür. Orta ve üst düzeydeki hastalarda rahatsızlık akuttur, ego gücü düşmüştür, savunmalar uygunsuzdur. Genellikle kendini teşhir etme eğiliminde olan, yardım almak isteğiyle sorunlarını abartan kişilerdir. Hastaneye yatmayı gerektiren akut psikotik sıkıntı yaşayan bireyler olabilirler.',
  },
];

/* ------------------------------------------------------------------ */
/* Klinik ölçekler — T puanı aralıkları (klinik yorum rehberi s.3-47)            */
/* ------------------------------------------------------------------ */

export const HS_T_BANDS: Band[] = [
  {
    min: 85, max: INF, rangeLabel: 'T > 84', label: 'Çok Yüksek', tone: 'alert',
    text: 'Yakınmaları bütün organ sistemlerine yayılmış olan kişilerde görülür. Ağrı, yorgunluk ve güçsüzlük sıklıkla vardır. Somatik ilgiler somatik delüzyonlara dönüşmüş demektir. Bu belki de şizofrenik bir epizodun başlangıcıdır.',
  },
  {
    min: 75, max: 84, rangeLabel: 'T 75-84', label: 'Yüksek', tone: 'alert',
    text: 'Bedensel yakınmalar ile çok fazla uğraşan bireylerde ortaya çıkmaktadır. Genel olarak iş yapma istekleri azalmıştır, yakınmalarının bedensel kaynağını sürekli bir biçimde araştırırlar. Sıklıkla benmerkezcil ve narsisistiklerdir, sürekli şikayet eder ve sızlanırlar. Yakınmalarını diğerlerine kabul ettirme eğilimleri çok fazladır, bu nedenle aşırı talep edici bir tutum içindedirler. Çevrelerindekileri rahatsız ederek öfkelerini ortaya çıkarırlar. Tipik olarak inatçı, kötümser, genel olarak da yaşamda mutsuz, tutkusuzdurlar ve güdülenmemişlerdir.',
  },
  {
    min: 60, max: 74, rangeLabel: 'T 60-74', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bu puanlar sıklıkla bu kişilerin hem şimdiki hem de geçmiş yaşantıda fiziksel bozukluk gösterdiğine işaret etmektedir ve bu yükselmeye sıklıkla D alt testindeki yükselme işaret eder. Sağlığa bu ilgi basit olarak yapıcı bir ilgi olabilir ya da sağlığa aşırı duyarlılığı temsil eder. Böyle kişiler kötümser olmaya ve yaşamlarını sıkıcı hale getirmeye eğilimlidirler. Bedensel hastalığı olan bireylerde 65 T puanının üstünde bir yükselme, bu bireylerin yaşadıkları güçlüklere aşırı tepki verdiklerini ve kabul edilmez dürtülerini somatizasyon ile ifade ettiklerini göstermektedir.',
  },
  {
    min: 50, max: 59, rangeLabel: 'T 50-59', label: 'Normal', tone: 'ok',
    text: 'Bu kişilerin beden konuları ile aşırı ilgilenmediği ve günlük yaşam aktivitelerini yerine getirdiği söylenebilir. Bu kişiler sıklıkla yetenekli, sorumluluk sahibi, vicdanlı, dikkatli ve yargılamaları iyi olan kişilerdir. Spesifik tıbbi hastalığı olan bireyler bu alanda yer almaktadır.',
  },
  {
    min: 0, max: 49, rangeLabel: 'T 21-49', label: 'Düşük', tone: 'ok',
    text: 'Bu durum hastalığın hiç konu olmadığı ailelerde yetişen bireylerde ya da şimdiye kadar hiç ağrı, acı ya da hastalık geçirmediği ile övünen kişilerde görülebilir. Ayrıca bu kişiler, hastalıklarını manipülatif yolla kullanan hipokondriyak aile üyeleriyle yakından ilişkili olabilir; ancak burada normal acı ve ağrılar da inkar edilir. Bedensel yakınmaları ve genel sağlık durumları ile çok az ilgilenen kişilerdir. Genellikle uyanık, iyimser, yeterli ve yaşamda etkin olan kişilerdir.',
  },
];

export const D_T_BANDS: Band[] = [
  {
    min: 85, max: INF, rangeLabel: 'T ≥ 85', label: 'Çok Yüksek', tone: 'alert',
    text: 'Bir şeye odaklanamayacak ya da açık bir biçimde düşünemeyecek kadar kederli olan bireyleri gösterir.',
  },
  {
    min: 79, max: 84, rangeLabel: 'T ≥ 79', label: 'Yüksek', tone: 'alert',
    text: 'Birey depresif ve kaygılıdır, benlik saygısı düşüktür. Genel olarak yaşama bakışı karamsardır. Tipik olarak ilgi alanları daralmış, morali bozuktur ve kendisini işe yaramaz olarak görür. Duyarlılıkları kendi depresyonlarına ve fonksiyon düzeylerine yönelmiştir; aynı zamanda kendilerini soyutlama ile içe çekilme görülür. Bu negatif yüklemeler kendilerinden hoşnut olmama sonucunu doğurur; bu da değişme isteği ile birlikte iyi bir prognoz sağlar. Yüksek puanlar sıklıkla somatik belirtiler ve yakınmalarla bir arada bulunur. D alt testinde yükselme, kişinin o sıradaki işlev düzeyiyle ilgili rahatsızlığı ya da hoşnutsuzluğu hakkında bilgi verebilir; bu subjektif gerginlik anksiyete belirtisi olabileceği gibi gerçek bir depresif durum da olabilir (yükselen puanlar her zaman depresyon olarak tanımlanamaz, kişinin o anda çevresinden gelen rahatsızlıklarını da yansıtabilir).',
  },
  {
    min: 70, max: 78, rangeLabel: 'T 70-78', label: 'Yüksek', tone: 'alert',
    text: 'Ciddi ve kendine güvenli olmayan bireyleri gösterir. Eğer o anda durumsal baskılar yoksa ve özellikle L de yükselmiş ise bu bireyler tipik olarak iyi-kötü ya da doğru-yanlış biçiminde düşünürler. Klinik olarak belirgin depresyonu olan bireyi gösterir; bu bireyler en küçük bir şey karşısında bile endişe duyma eğilimi içindedirler. Psikiyatrik hastalar bu ranjda yer alırlar. Bu alanda bireyin yaşadığı huzursuzluk onun iyileşme için motive olduğunun göstergesidir. Hastada depresyonun göstergeleri yoksa ve diğer alt testler yükselmemişse hastanın intihar eğilimi açısından değerlendirilmesi gerekmektedir.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bu bireylerde orta düzeyde depresyon, endişe ve karamsarlık göstergesi vardır. Bu duygu durum hali durumsal bir krize bağlı olabileceği gibi kalıcı ve geri dönüşü olmayan bir durum da olabilir.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Bu, bireyin yaşamında iyimserlik ve karamsarlık dengesini kurduğunun göstergesidir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 28-44', label: 'Düşük', tone: 'ok',
    text: 'Olasılıkla neşeli, meraklı, iyimser, aktif ve dışa dönüktürler (bakınız Si alt testinin düşüklüğü). Bu durum bazen bu bireylerin kayıtsız gibi algılanmalarına neden olur; bu da diğerlerinde hostilite ortaya çıkarır.',
  },
];

export const HY_T_BANDS: Band[] = [
  {
    min: 85, max: INF, rangeLabel: 'T ≥ 85', label: 'Çok Yüksek', tone: 'alert',
    text: 'Aşırı immatür, benmerkezci ve bağımlı kişilerdir. Bastırma savunma mekanizmasını kullanmaları şaşırtıcıdır; bu, içgörü eksikliği olduğunun göstergesidir. Semptomlar gerçek organik patolojiye uymamaktadır. Genellikle kroniktir ve ciddi rijidite vardır.',
  },
  {
    min: 76, max: 84, rangeLabel: 'T 76-84', label: 'Yüksek', tone: 'alert',
    text: 'Bu bireyler uzun süredir devam eden gerginliğe bağlı konversif semptomlar geliştirmişlerdir. Semptomlar başağrısı, sırt ağrısı, göğüs ağrısı, güçsüzlük, baş dönmesi ve baygınlıktır. Uzun süredir devam eden güven duymama, immatürite ve organize olmuş bedensel yakınmaları vardır.',
  },
  {
    min: 70, max: 75, rangeLabel: 'T 70-75', label: 'Yüksek', tone: 'alert',
    text: 'Birey bastırma ve inkarı çok fazla kullanan, çok fazla itaat eden (uyan), saf ve çocuksu biçimde benmerkezci, anksiyete ile bağlantılı somatik yakınmaları olan ya da bunların hepsine sahip bir kişidir. Histeroid mekanizmaları kullanır ve bunlarla ikincil kazanç elde eder. Kişi çok fazla sevgi, kabul ve destek isteyebilir; çok aktif (yüzeysel olsa da) sosyal yaşamı vardır, ancak davranışları konusunda içgörüsü oldukça azdır. Bazılarının teşhirci ve seksüel ya da saldırganlık düzeyinde dışa vuran davranışları olabilir; inkar ve bastırmayı aşırı bir biçimde kullanırlar. Sevmeye ve sevilmeye olan güçlü gereksinime bağlı olarak bağlanma gerektiren durumlarda verdikleri ilk tepki genellikle coşkulu olacaktır; ancak hemen ya da daha sonra kendilerinden istenenler konusunda kızgın ve kinci olurlar ve genellikle pasif biçimde dirençlidirler, sızlanıp yakınırlar ve kendilerini bu durumdan uzaklaştıracak somatik şikayetleri olur.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'İki farklı örüntü vardır: (1) Eğer Hs’nin yükselmesi Hy ile aynı düzeyde ise ve D alt testi 1 ve 3 alt testlerinden 10 T puanı düşükse histerik kişiye işaret etmektedir; stres sırasında somatizasyona sığınma görülebilir. (2) Eğer Hy alt testi Hs alt testinden 10 T puanı yüksekse histerik özellikler belirgindir; bu bireyler kendilerine odaklanmıştır, kendilerini olduğundan farklı ve mükemmel kişiler olarak görmek isterler; kişilerarası ilişkilerde içgörü azlığı vardır.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Bu alana özgü bir tanımlama yoktur.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 22-44', label: 'Düşük', tone: 'watch',
    text: 'Kendilerini sürekli eleştirirler. Olumlu kişilerarası ilişkileri inkar etme eğilimi vardır. Si alt testinde yükselme bireyin diğer insanlardan kaçma eğiliminde olduğunu göstermektedir.',
  },
];

export const PD_T_BANDS: Band[] = [
  {
    min: 80, max: INF, rangeLabel: 'T ≥ 80', label: 'Çok Yüksek', tone: 'alert',
    text: '70-79 T puanında verilen özelliklere ek olarak bu yükselme klinik tanı olarak psikopatik bir bireyi göstermektedir. Antisosyal davranışlar, otorite figürleri ile çatışma vardır. Diğerleriyle kendi gereksinimlerini nasıl karşılayabileceklerine bakarak ilişki kurar.',
  },
  {
    min: 70, max: 79, rangeLabel: 'T 70-79', label: 'Yüksek', tone: 'alert',
    text: 'Bu alt testte yüksek puan alan bireyler öfkeli, impulsif, duygusal açıdan yüzeysel, yordanamaz davranışları olan kişiler olarak tanımlanmaktadır. Bu tür kişiler sosyal uyumsuzluk, otoriteye ve diğerlerine karşı olma davranışları gösterirler. Yükselme antisosyal tutum ve davranış eğilimlerine işaret eder; ancak bu her zaman açık davranış biçiminde ifade edileceği anlamına gelmez. Antisosyal davranışlar açıkça gösteriliyorsa özellikle 9 alt testi ile birlikte yükselme görülür. Yüksek puan verenlerin kendilerine ilişkin mükemmeliyetçi ve narsisistik kavramları vardır ve bu kişisel standartları sosyal kuralları reddetmeyi rasyonalize etmede kullanılmaktadır. Kızgınlık ailelerine, genellikle otoriteye ve topluma karşı ya da her ikisine karşı olabilir; bazen kızgınlık durumsal bir tepki (boşanma vb.) ya da ergenlik isyanı olabilir veya bir kültünlük azınlık grubunda olmayla bağlantılılığı yansıtabilir. Böyle olmadığında örüntü uzun sürelidir ve değişme olasılığı düşüktür. İmpulsif olma, kişilerarası ilişkileri değerlendirmede bozukluk, davranışların önceden kestirilememesi, sosyal yabancılaşma, azalmış sorumluluk ve ahlak duygusu ve buna eşlik eden kötü iş yaşamı ve evlilik uyumsuzluğu vardır. Uzun vadeli hedeflerini kısa süreli arzuları uğruna feda ederler ve sonuçları tahmin etme kapasiteleri sınırlıdır. Ergenler için yüksek Pd profilleri: karakteristik olarak evden uzaklaşmak ve kendi kimlik duygularını oluşturmak için isyan ederler; ancak 25 yaşın üzerindeyse bu yükseklik doğal değildir. 40 yaşın üstünde yüksekse uzun süren kişilerarası ilişki kuramama ve antisosyal davranışları yansıtırken, 60 yaş üzerinde apatik bir biçimde katılmama düzeyine varan yabancılaşmayı düşündürür. Bu tür bir kızgınlığı başlatan yaşam olayı olmadığında test 4 özellikleri kalıcı ve değişime dirençlidir.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'Risk alabilen, enerjik, sosyal, maceraperest ve atılgan olan bir bireyle bağlantılıdır. Ancak bu bireyler engellendiklerinde bu özellikler huzursuzluk, saldırganlık ve sosyal olarak uyumlu olmayan davranış biçimine dönüşebilir.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Aşırı kontrol koyma ve kısıtlanma genellikle azdır. Sosyal kurallara kısmen uyum vardır.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 20-44', label: 'Düşük', tone: 'ok',
    text: 'Durağan, pasif ve atılgan olmayan bireylerdir. Maceraperest değildirler ve sıklıkla sosyal geleneklere uyma konusunda bağımlı ve hatta katıdırlar. Danışma durumunda başkalarının onlara karşı olan düşünceleri konusunda güvence ararlar. Çok sevgi dolu olsalar da sıklıkla cinsel ilişkiye girme konusunda girişken değildirler.',
  },
];

export const MF_MALE_T_BANDS: Band[] = [
  {
    min: 80, max: INF, rangeLabel: 'T ≥ 80', label: 'Çok Yüksek', tone: 'alert',
    text: 'Lise eğitimi alan erkeklerde ya da kültürel baskı altındakilerde kültürün verdiği erkeksi rolle özdeşim olmadığını göstermektedir. Yüksek puanlar göreceli olarak pasif erkeklere (eğer 4 alt testi de düşükse), hatta bazı durumlarda kadınsı özelliklere sahip olanlara işaret etmektedir.',
  },
  {
    min: 70, max: 79, rangeLabel: 'T 70-79', label: 'Yüksek', tone: 'watch',
    text: 'Bu erkekler hayal kurmayı seven, içedönük, eğitim yönelimli, spora özel ilgi duyan kişilerdir. Genellikle bu gruptaki erkekler idealist ve hayalperest bireylerdir, sosyal açıdan duyarlıdırlar ve kolay ilişki kurarlar. Eğitimi iyi olan ve kültürel açıdan zengin olan kişilerde bunlar beklenen özelliklerdir.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: '65 T puanının üstündeki yükselmeler demografik ve klinik veri dikkate alınarak değerlendirilmelidir. Üniversite öğrencilerinin bu aralıkta puan almaları beklenen bir durumdur. Ayrıca sanatla ilgili olanlar da (ressamlar, artistler) bu alanda puan alırlar.',
  },
  {
    min: 41, max: 59, rangeLabel: 'T 41-59', label: 'Normal', tone: 'ok',
    text: 'Erkeksi ilgiler ve davranışlar olduğunu göstermektedir ve bütün ilgileri bu alanda daralmıştır. Maceracı kişilerdir; dışarıda yapılan aktiviteleri, sporu ya da mekanik aktiviteleri severler. Bu örüntüye düşük iş ilgileri eşlik eder. Ergen erkeklerde Mf düşüklüğünde suç ve okul ile ilgili sorunlar eşlik etmektedir.',
  },
  {
    min: 0, max: 40, rangeLabel: 'T 26-40', label: 'Düşük', tone: 'watch',
    text: 'Erkeklerde maskülen görünmek için kompülsif bir uğraş vardır ve bu abartılmış bir boyuttadır. Narsisistik bir biçimde kendi güçlerini abartırlar. Bireyin kendi erkekliğini yoğun bir biçimde ortaya koyması altta yatan kendine güvensizlik ile ilgilidir.',
  },
];

export const MF_FEMALE_T_BANDS: Band[] = [
  {
    min: 66, max: INF, rangeLabel: 'T > 65', label: 'Yüksek', tone: 'watch',
    text: 'Bu kadınlar güçlü, kuvvetli, saldırgan, yönlendirici ve yarışmacıdır. Geleneksel erkek rolüne özgü aktivite ve işlere girerler. Güvenli ve spontandırlar; ancak heteroseksüel ilişkilerin olduğu alanlarda ketlenmeleri vardır. Kadınsı cinsel kimliğe uyum sağlamalarının beklendiği durumlarda anksiyöz olabilirler. İddiacı, yarışmacı, inatçıdırlar ve diğer kadınlar gibi görünmek ve davranmaktan hoşlanmayan kişilerdir. Buna karşın davranış ve düşüncelerinde bağımsız, kendine güvenli, spontan, dominant ve saldırgan olabilirler. Kariyer ve iş ile aşırı uğraşma, erkeksi spor ve ilgi alanları ya da dominant lezbiyen cinsel oryantasyonlar görülür. Kadınların çoğunluğu kendilerini kontrol edemeyecekleri durumlarda, özellikle karşı cinsle ilişkilerinde kontrolsüz bir durum varsa çok rahatsız hissederler. Ergen kızlarda 5’in yükselmesi ev, okul ve yasalarla ilgili sorunlar olduğunu gösterir; 14-19 yaşları arasındaki kızlarda 5 yüksekliği normal olabilir, ancak bu yaşlardan sonra oldukça nadirdir. 5 yüksekliği sosyo-ekonomik düzeyi düşük olan ve farklı kültürlerden gelen kadınlarda da görülebilir.',
  },
  {
    min: 56, max: 65, rangeLabel: 'T 56-65', label: 'Orta Yüksek', tone: 'ok',
    text: 'Kadınlarda 60 ve üstünde T puanı onların aktif, atılgan ve yarışmacı olduklarını göstermektedir.',
  },
  {
    min: 41, max: 55, rangeLabel: 'T 41-55', label: 'Normal', tone: 'ok',
    text: 'Bu kadınların ilgi alanları orta sınıf kadınların ilgilendikleri konular ile sınırlıdır. Duyarlı kişilerdir; bu duyarlılık erkeklerle ilişkilerinde daha da belirginleşmektedir. Giyimleri ile kadın olduklarını açıkça gösterirler.',
  },
  {
    min: 0, max: 40, rangeLabel: 'T 26-40', label: 'Düşük', tone: 'watch',
    text: 'Kadınların pasif, çekingen olduğunu göstermektedir. Mf düşüklüğü nevrotik üçlüde yükselme ile ilişkilidir. Eğer Pd yükselmesi Mf düşüklüğüne eşlik ediyorsa seksüel impulsların olası eyleme vurukluğuna dikkat edilmelidir. Bu kadınlar herhangi bir şeyden mutlu olmamak için ellerinden gelen gayreti gösterirler.',
  },
];

export const PA_T_BANDS: Band[] = [
  {
    min: 80, max: INF, rangeLabel: 'T ≥ 80', label: 'Çok Yüksek', tone: 'alert',
    text: 'Kuşkulu, kızgın, küskün ve durumların doğrudan kendilerine yöneldiği biçiminde yorum yapan kişilerdir. Bu bireylerin çoğu paranoyaktır, referans fikirleri vardır, temel savunma mekanizmaları yansıtmadır. Gerçeği değerlendirme bozuktur; delüzyonlar perseküsyon ve/veya grandiyöz biçimindedir.',
  },
  {
    min: 70, max: 79, rangeLabel: 'T 70-79', label: 'Yüksek', tone: 'alert',
    text: 'Diğerlerini suçlama ve hostilite temel özelliklerdir. Bu bireyler katı, inatçı ve aşırı duyarlıdırlar. Kişiler arası ilişkilerde aşırı savunucu tutumları nedeniyle yanlış anlaşılabilirler. Açık paranoid özellikler vardır.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'Duyarlı bireylerdir; kendilerinin ve diğerlerinin duygularının kolayca incinebileceği türünde düşünceleri vardır. Bu sıklıkla depresyonla ilgilidir. Diğerlerinden gelen eleştiri ve önerileri çok ciddiye alırlar ve kendilerinin söyledikleri her şeyin eleştiri gibi alındığı fikri vardır. Kişilerarası ilişkilerde savunucu ve diğer insanlara güvensizdirler, diğerlerinin kendilerinden yararlanacağını düşünürler. Kırgın, küskün olmaya hazırdırlar; çünkü en ufak bir olumsuzluğu üstlerine alırlar. İşte ve evde kendilerinden beklentiler konusunda kontrollüdürler.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Bu kişiler diğerlerini değerlendirmede esnektirler. Onlara karşı duyarlıdırlar ve diğerlerinin kendilerinden beklentilerini doğru anlayarak olumlu yanıt verirler. 55-59 T puanı arasında olan bireyler anlayışlı, duyarlı kişilerdir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 27-44', label: 'Düşük', tone: 'watch',
    text: 'İki tip insan bu puanı verebilir: diğerlerine duyarlılığı olmayan kişiler ve çok fazla şüphesi ve endişesi olan kişiler (bunlar paranoya maddelerini atlarlar). Diğerleri ise yüksek puan alan kişilerle aynıdırlar. Düşük puan alan bireyler geleneksel, güvenilir, kişiler arası ilişkilerde duyarsız, ilkel ve saftırlar. Zekaları sınırlıdır ve ilgi alanları daralmıştır.',
  },
];

export const PT_T_BANDS: Band[] = [
  {
    min: 84, max: INF, rangeLabel: 'T ≥ 84', label: 'Çok Yüksek', tone: 'alert',
    text: 'Bireyin ajite ruminasyonları, korku hali, obsesyonları ve kompulsiyonları ya da fobileri olduğunu göstermektedir. Anksiyete ve gerginlik o kadar fazladır ki günlük yaşamlarını bile devam ettiremezler. Entellektüalizasyon, izolasyon ve rasyonalizasyon sıklıkla kullanılmaktadır.',
  },
  {
    min: 75, max: 83, rangeLabel: 'T 75-83', label: 'Yüksek', tone: 'alert',
    text: 'Temiz, titiz, düzenli kişilerdir. Önemsiz sorular karşısında bile gerginlik ve endişe yaşarlar. Kendilerini yetersiz, aşağılık duyguları ve suçluluğu olan kişiler olarak gösterirler; bu kendilerine güvenmemelerine bağlıdır. Kendilerine ait bir fikirleri yoktur.',
  },
  {
    min: 60, max: 74, rangeLabel: 'T 60-74', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bu yükseltiler dürüst, mükemmeliyetçi, titiz ve kendini eleştiren bireyler olduklarına işaret etmektedir. Küçük sorunları bile kendilerine dert etme eğilimindedirler.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Bireyler yaşamlarını ve işlerini endişe ve güvensizlik duymadan yürütebilirler.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 20-44', label: 'Düşük', tone: 'ok',
    text: 'Rahat, duygusal, gerginliği olmayan bireylerdir. Çoğu kendine güvenir ve uyumludur; üretici ve yeterlidir. Kaygı düzeyleri çok düşük olduğu için sanki tembel gibi görünürler. Başarıya, statüye, kabul görmeye önem veren kişilerdir.',
  },
];

export const SC_T_BANDS: Band[] = [
  {
    min: 100, max: INF, rangeLabel: 'T ≥ 100', label: 'Çok Yüksek', tone: 'alert',
    text: 'Akut bozukluğun eşlik ettiği uzun süreli ciddi bir stresin sonucunda ortaya çıkar. Bu kişiler tipik olarak şizofren değildirler; daha çok akut psikotik reaksiyon içine giren hastalardır. Ayrıca kimlik krizindeki ergenlerde de bu aralığa rastlanır. T 95’ten büyük olan değerler akut durumsal stres ve ciddi özdeşim krizlerini gösterir.',
  },
  {
    min: 75, max: 99, rangeLabel: 'T ≥ 75', label: 'Yüksek', tone: 'alert',
    text: 'Yabancılaşma yaşayan ve doğru düşünemeyen bireyler tarafından verilir. Düşüncede ve hareketlerinde sıradan değildirler, olasılıkla sosyal açıdan çekiniktirler ve derin kişilerarası ilişki kuramazlar. Kendilerinin kim olduğu ve bu dünyadaki yerlerinin ne olduğu konusunda oldukça bozuk düşünceleri vardır ve genellikle bu dünyaya ait olmadıklarını düşünürler. İletişim kurmada sorunlar temeldir; dezorganize düşünceleri vardır ve bunlar açık ve mantıklı düşünmesini engeller. Bireylerin gerçek ile bağlantısı var gibi görünse de bu oldukça yüzeyseldir. 8 alt testindeki yüksek puanlar gerçek psikotik düşünce bozukluğunu yansıtabilecek soğuk, apatik, yabancılaşma; düşünme, iletişim ve anlamada bozulma olması gibi özellikleri gösterebilir. Kişiler arası ilişkiler yerine hayalleri ve fantezileri yeğlerler. Aşağılık duyguları, kendilerinden hoşnutsuzluk ve yalnızlık duyguları içindedirler. T puanı 80’e yaklaştığında mantıkta ve düşünmede tuhaflık belirginleşir; gerçek şizoid düşünce süreci gözlenebilir. Bunlara depresif özellikler ve psikomotor gerileme eşlik eder. Davranışlar ya şizofrenik bir sürecin ya da şizoid bir uyumun ya da uzun süreli ciddi bir stresin sonucu olabilir.',
  },
  {
    min: 60, max: 74, rangeLabel: 'T 60-74', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bu yükselme değerlendirilirken profilin tümü ele alınmalıdır. (1) Bu yükselmenin alt sınırında ve nevrotik profillerde yükselme varsa bireyin soyut konularla ilgilendiğini göstermektedir; eğer Si alt testi de yükselmişse diğerleri tarafından uzak ve anlaşılmaz kişiler olarak tanımlanmaktadır. (2) 65-74 T puanı aralığındaki değerlendirmede genel bir yabancılaşma ya da örtük psikoz olup olmadığı araştırılmalıdır; F ve Pa alt testlerindeki yükselme psikoza eşlik eder. (3) Orta düzeyde yükselmeler, eğer diğer psikotik belirtiler varsa (F, 4, 6, 9 ve nevrotik alt testlerinin yükselmesi), şizoid sosyal uyumu ve bireyin dünyaya kendine özgü bakışını göstermektedir.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Bu bireylerin kuramsal ve pratik görüşlerini normal bir biçimde bir araya getirdiklerini göstermektedir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 21-44', label: 'Düşük', tone: 'ok',
    text: 'Pratik ve gelenekseldirler; davranışları ve yaşama bakış açıları konformaldir. Genellikle bireyler uyumlu, sorumlu, bağımlı ve temkinlidir; ancak hayal güçleri yoktur ve oldukça katıdırlar. İlişkilerinde çekingen, derin duygusal ilişkilerden kaçınan, temkinli, tutucu, rekabet etmek istemeyen kişilerdir.',
  },
];

export const MA_T_BANDS: Band[] = [
  {
    min: 85, max: INF, rangeLabel: 'T ≥ 85', label: 'Çok Yüksek', tone: 'alert',
    text: 'Ajitasyon ya da manik dönem olabilir. Birey hiperaktiftir, davranışları yordanamaz, fikir uçuşmaları vardır. Kendilik değerini abartır.',
  },
  {
    min: 70, max: 84, rangeLabel: 'T 70-84', label: 'Yüksek', tone: 'alert',
    text: 'Enerjik, konuşkan, eylemi düşünceye tercih eden kişilerdir. İlgileri çok geniş bir alana yayılmıştır ve hemen gerçekleştirmek istedikleri çok sayıda projeleri vardır. Bu kişilerin çoğunda aktivite ve güç abartılı düzeyde yüksektir, ancak projelerini tamamlayamazlar. Tipik olarak davranışlarını, düşmanlık duygularını ve öfkelerini kontrol edemezler. Gerçek manik özellikler gösterebilirler: fikir uçuşması, duygudurumda kaymalar ve değişmeler, büyüklük sanrıları ve hiperaktivite gibi. Ergenlerde bu yükselme artmış hareketliliği gösterir; impulsif ve kontrolsüzdürler, grandiyözite ve çağrışımlarında artmalar vardır; iletişim güçlükleri ve suça eğilim görülebilir.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'ok',
    text: 'Enerjik, dışadönük ve aktif bireyleri gösterir; bunlar diğerleri tarafından hoş ve yeterli olarak görülürler. Bu düzeydeki puanlar lise veya lise mezunu öğrencilerde çok sıktır, çünkü bu bireylerde enerji düzeyinin yüksek olması beklenen bir durumdur. Kişiler onay ve statü kazanmak için çaba harcarlar ve düşünce ve davranışlarında özgür olma eğilimleri vardır. Hoş, enerjik, meraklı, sosyal, kolay ilişki kuran, ilgi alanları geniş kişilerdir; bu hallerinden kendileri de memnundur. İyimserlik, bağımsızlık ve kendine güven vardır.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Normal aralıktır. Puan normal aralıktan yükseldikçe mani düzeyinin arttığı düşünülür; bu şekilde puanlardaki artış maniye, giderek hipomaniye işaret eder. Manik hastalar davranışlarından kolaylıkla tanınabildikleri için alt test daha çok ortalarda puan alan hastaların teşhisinde yardımcı olabilir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 21-44', label: 'Düşük', tone: 'watch',
    text: 'Düşük enerji düzeyi, güdü azlığı hatta apatiyi gösterir. Bu geçici yorgunluk ya da hastalığa işaret etmektedir. Düşük puanların çoğunluğu kronik açıdan düşük enerji düzeyinin belirtisidir. Bireylerin kendilerine güvenleri azdır ve genellikle amaçları yoktur; sabahları kalkmak istemezler ve herhangi bir projeye başlarken aşırı çaba sarf etmek zorunda hissederler. Özellikle 2 alt testinin yükselmediği durumlarda depresyon düşünülmelidir. Yaşlı insanlarda 9’un düşüklüğü beklenen bir durumdur, normal yaşlanma sürecini gösterir; 45 yaşın altında düşük olması beklenen bir durum değildir ve dikkat edilmesi gerekir.',
  },
];

export const SI_T_BANDS: Band[] = [
  {
    min: 70, max: INF, rangeLabel: 'T ≥ 70', label: 'Yüksek', tone: 'alert',
    text: 'Sosyal açıdan beceriksiz olan kişilerdir. Sosyal ilişkilerde anksiyete yaşar ve ilişki kurmaktan kaçınırlar.',
  },
  {
    min: 60, max: 69, rangeLabel: 'T 60-69', label: 'Orta Yüksek', tone: 'watch',
    text: 'Bu, kendini ortaya koymak istemeyen, yakın aile çevresinde rahat olan bireylerin profilidir. Çekingen, utangaç kişilerdir.',
  },
  {
    min: 45, max: 59, rangeLabel: 'T 45-59', label: 'Normal', tone: 'ok',
    text: 'Sosyal ilişki kurmada başarılı olan bireylere işaret etmektedir.',
  },
  {
    min: 0, max: 44, rangeLabel: 'T 25-44', label: 'Düşük', tone: 'watch',
    text: 'İyimser, manipülatif, yüzeysel ve hatta biraz uçuk bireylerdir. Dürtü kontrol sorunları vardır. Diğerleri ile olmak isteyen, yalnız kalamayan bireyleri gösterir. Çoğu kolay ilişki kurar; arkadaş canlısı ve meraklıdırlar; sosyal açıdan kabul görme, onaylanma konusunda gereksinimleri çok fazla olan bireylerdir.',
  },
];

/** Klinik ölçek için cinsiyete duyarlı T bandı listesi. */
export function clinicalBands(id: ScaleId, gender: Gender): readonly Band[] {
  switch (id) {
    case 'Hs': return HS_T_BANDS;
    case 'D': return D_T_BANDS;
    case 'Hy': return HY_T_BANDS;
    case 'Pd': return PD_T_BANDS;
    case 'Mf': return gender === 'Erkek' ? MF_MALE_T_BANDS : MF_FEMALE_T_BANDS;
    case 'Pa': return PA_T_BANDS;
    case 'Pt': return PT_T_BANDS;
    case 'Sc': return SC_T_BANDS;
    case 'Ma': return MA_T_BANDS;
    case 'Si': return SI_T_BANDS;
    default: return [];
  }
}

/* ------------------------------------------------------------------ */
/* Tek ölçek yükselmeleri (klinik yorum rehberi "Sadece X alt testinin yükselmesi") */
/* ------------------------------------------------------------------ */

export type SingleElevation = {
  /** Yükselmenin koşulu (kaynaktaki tanım). */
  rule: string;
  text: string;
};

/** Hs: kaynakta eşik verilmez; profilin tek belirgin yükselen klinik ölçeği olması. */
export const SINGLE_HS: SingleElevation = {
  rule: 'Tek yükselen klinik ölçek Hs olduğunda',
  text: 'Bu hastalar belirsiz fiziksel yakınmalar getirirler ve bunları diğer kişileri kontrol ve manipüle etmek için kullanırlar. Bu hastalar her şeyi kötü gören, sızlanan, ilgi çekmek isteyen kişilerdir ve genellikle olumsuz ve kararsızdırlar. Bu hastalara müdahaleler genellikle fazla güven vermez.',
};

/** D: “Sadece D alt testi 70 T puanının üstüne çıktığında”. */
export const SINGLE_D: SingleElevation = {
  rule: 'Sadece D alt testi 70 T puanının üstüne çıktığında',
  text: 'Birey reaktif bir depresyon yaşamaktadır. Yetersiz, güvensizdir; kendini cezalandırarak suçluluk duygularından kurtulma çabası içindedir ve çok fazla kaygılıdır, kendini eleştirir; sanki yaşadığı durum ya da bunu kontrol edememe için bir kefaret (ceza) ödeyecekmiş gibi. Birey depresif olduğunu (bu duygudurum başkaları için çok açık olabildiği halde) inkar edecektir. Psikoterapi prognozu genellikle kısa bir süre içinde iyidir ve bu tür hastalar yöneltici, yüzleştirici bir yaklaşıma iyi yanıt verirler. Lise öğrencilerinde 2’nin tek başına 70 T puanının üstünde olması klinik olarak daha az anlamlıdır ve sıklıkla durumsal sorunları (genellikle karşı cinsle ilişkiler, ders çalışmada ya da mesleki seçenekler üzerindeki kaygıyı) yansıtır. Yüksekokul öğrencilerinde 2’nin tek başına yüksek olması: sorunlarının kökenine inme çabalarını reddederler ve bunun yerine ebeveyn yerine geçen birinden öğüt almaya çalışırlar.',
};

/** Hy: “Sadece 3’ün yüksek olduğu ve diğer hiçbir alt testin 70 T puanının üstünde olmadığı durumda”. */
export const SINGLE_HY: SingleElevation = {
  rule: 'Sadece Hy yüksek ve diğer hiçbir alt test 70 T puanının üstünde değilse',
  text: 'Bireyin kabul edilme ve sevilmeye gereksinimi fazladır. Ait olduğu grup tarafından reddedilme olasılığına yönelik endişe yaşar; kızgınlık ve kendini ortaya koymayı içeren yüzleşme durumlarıyla (akademik ortamlar gibi) uğraşırken çok rahatsız olur. Tartışmalarda iyimserliklerini ve diğer insanlarla olan iyi ilişkilerini vurgularlar ve kendilerinde doğal olmayan ya da sapkın davranışları en aza indirgerler.',
};

/** Pd: “Pd alt testinin diğer testlerden en az 10 ya da daha fazla T puanı yukarıda olmasıdır”. */
export const SINGLE_PD: SingleElevation = {
  rule: 'Pd alt testi diğer testlerden en az 10 T puanı yukarıda olduğunda',
  text: 'Bunlar impulsif, küskün, isyankar ve genelde kurallar, düzenlemeler ve otoriteyi kabullenmekte güçlükleri olan bireylerdir. Sıklıkla yasal sorunları olabilir. İnsan canlısı olabilirler (eğer test 0 düşükse); ancak diğerleriyle ilişkileri yüzeysel, yapay ve kısadır. Uzun süren, yakın ilişkiler kuramazlar; çünkü birliktelikle ilgili empati, sorumluluklar ve talepler konusunda güçlükleri olan bireylerdir. Uzun süreli hedeflere doğru organize davranışları sürdüremezler ve bunun yerine doyum veren kısa süreli istekler üzerinde odaklanma eğiliminde olurlar. Alt test Si 30 T puanına yaklaşırsa bu sorunlar daha kalıcı ve şiddetlidir; ancak birey hoş ve rahat görüntüsü verebilir.',
};

/** Mf (erkek): “Erkeklerde sadece Mf yükselmesi”. */
export const SINGLE_MF_MALE: SingleElevation = {
  rule: 'Erkeklerde sadece test 5 yükseldiğinde',
  text: 'Sadece test 5’in yükselmesi açık ya da örtük homoseksüaliteyi gösterme açısından yeterli değildir. Kendi homoseksüalitesini göstermek isteyen bireyler bu testte yavaş bir yükselme gösterirler. Erkeklerde 5 testinde 75 T puanı ve üstü, eğitim düzeyleri orta ya da lise 1 ise oldukça katı kültürel baskı varsa: bu erkeklerde geleneksel erkeksi yaşam biçimi yoktur; yüksek puanlar pasif erkekleri gösterir (eğer alt test 4 düşükse) ve çoğunluğunda kadınsı özellikler vardır.',
};

/** Pa: “Sadece Pa alt testinin yükselmesi”. */
export const SINGLE_PA: SingleElevation = {
  rule: 'Sadece Pa alt testi yükseldiğinde',
  text: 'Bu bireyler aşırı duyarlı, katı, gergin ve kaygılıdırlar. Yaşamlarında iş ve sosyal baskı olduğunu hissederler. Şüphecilik, güvensizlik, düşüncelere dalma vardır. Yansıtma mekanizmasını sık kullanırlar. Sorunlara aşırı tepki verirler.',
};

/** Pt: “Sadece Pt alt testinin yükselmesi”. */
export const SINGLE_PT: SingleElevation = {
  rule: 'Sadece Pt alt testi yükseldiğinde',
  text: 'Psikiyatrik grupta genellikle kaygılı, gergin, kararsız ve dikkatini bir noktada yoğunlaştıramayan bireyleri tanımlamaktadır. Bu kişilerde obsesif düşünceler, ruminasyonlar, kendinden şüphe ve bunlara eşlik eden depresif özellikler vardır. Fobi ve kompülsif davranış görülebilmesine karşın bu yüksek puanın karakteristiği değildir; pek çok rijid kompülsif hasta alt test 7’yi yükseltmez, çünkü bu kişilerin entellektüel savunmaları anksiyetelerini ve güvensizlik duygularını kontrol edecek kadar güçlüdür. Daha çok entellektüel savunmaları, rasyonalizasyonları ve izolasyonları anksiyete ve gerilimlerini uzun süre kontrol edemeyen hastalar yüksek puan alırlar. Ayrıca alt test 7’deki yüksek puanlar bedensel işlevlere karşı aşırı ilgiyi gösterir; yakınmalar daha çok kardiyovasküler sistemde yoğunlaşır, gastrointestinal işlevlerle ilişkili yakınmalara da rastlanır. Fiziksel yakınmaları genellikle yüksek düzeydeki anksiyetelerini ve bunun bedensel işlevlere etkisini yansıtır. Terapötik yardımlardan önce anksiyetelerinin semptomatik tedavisi gerçekleştirilmelidir.',
};

/* ------------------------------------------------------------------ */
/* F-K endeksi (klinik yorum rehberi s.48)                                       */
/* ------------------------------------------------------------------ */

export const FK_INDEX_NOTE =
  'F-K endeksi 16’nın üstünde ise: Geçerlilik konfigürasyonu bu hastanın test bulgularının ' +
  'değerlendirilmesinde dikkatli olmanın gerekliliğini göstermektedir. Yapılan standart ' +
  'değerlendirme hastanın durumunu yansıtmayabilir. Bu veri için olası açıklamalar şunlardır: ' +
  'Hasta akut bir psikotik bozukluk göstermektedir ve testi içinde bulunduğu duruma bağlı olarak ' +
  'tamamlayamaz — klinik düzelme olduktan sonra test yinelenmelidir. Ya da birey bilinçli olarak ' +
  'durumunu abartmakta ya da bir yarar sağlamak için simülasyon yapmaktadır.';

/** Kaynağa göre profilin geçerliliğini doğrudan düşüren kurallar. */
export const VALIDITY_CUTOFFS = {
  /** Ham 31 ve üstü boş madde → profil büyük olasılıkla geçersizdir. */
  cannotSayInvalid: 31,
  /** Ham 23 ve üstü F → profil geçersizdir. */
  fInvalid: 23,
  /** Ham 16-22 F → profil geçersiz olabilir. */
  fSuspect: 16,
  /** F-K endeksi 16'nın üstünde → dikkatli değerlendirme. */
  fkIndexAlert: 16,
} as const;
