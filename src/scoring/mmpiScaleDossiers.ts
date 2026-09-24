/**
 * Ölçek Bazlı Detaylı Klinik Rapor — kanıta dayalı dosya içerikleri.
 *
 * Kaynak (hepsi görsel olarak teyit edilmiştir):
 *   Ceyhun & Oral, "Minnesota Çok Yönlü Kişilik Envanteri Klinik Testlerin
 *   Değerlendirilmesi" (kaynak PDF: docs/sources/mmpi-kaynak-2-ocr.pdf)
 *   — Graham (1987) listeleri, Tablo 8-17, T puanı bantları ve demografik notlar.
 *   Normlar: TURKISH_NORMS (Tablo 30 / Savaşır, 1981) — dipnot ortalamaları
 *   yerine Tablo 30 değerleri kullanılır (audit: CONFLICT-028/037/040 REJECTED).
 *
 * Metin içine sayfa referansı KONMAZ; kaynak yalnızca kart altlığında belirtilir.
 * Madde listeleri (Doğru/Yanlış) ile "Madde Sayısı" SCORING_KEYS'ten üretilir;
 * anahtarlar kitap tablolarıyla birebir doğrulanmıştır (tests/mmpiKeyIntegrity).
 */

import type { Gender, ScaleId } from './mmpiKeys';
import { SCORING_KEYS, TURKISH_NORMS, isGendered, K_CORRECTION } from './mmpiKeys';

export type ClinicalScaleId = Exclude<ScaleId, '?' | 'L' | 'F' | 'K'>;

export const CLINICAL_SCALE_ORDER: readonly ClinicalScaleId[] = [
  'Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si',
];

/** Graham listesi — isteğe bağlı alt maddeler (a., b., …) Pa'da kullanılır. */
export type GrahamItem = string | { text: string; sub: string[] };

export type GrahamList = {
  /** İsteğe bağlı ara başlık (ör. Mf'de cinsiyete göre listeler). */
  label?: string;
  items: GrahamItem[];
};

export type DossierCondition = {
  /** Kısa koşul etiketi. */
  when: string;
  /** Kaynaktaki koşullu cümlenin tamamı. */
  sentence: string;
  /** Bu profil için koşul sağlanıyor mu? */
  match: (t: Record<ScaleId, number>) => boolean;
};

export type DossierNoteGroup = {
  title?: string;
  paragraphs?: string[];
  list?: string[];
};

export type ScaleDossier = {
  id: ClinicalScaleId;
  /** MMPI alt test numarası: Hs=1 … Ma=9, Si=0 */
  number: string;
  /** "Hipokondriyazis (Hs)" */
  name: string;
  tablo: {
    no: number;
    /** "Hipokondriyazis alt testi: Madde numaraları ve puanlama yönü" */
    title: string;
  };
  /** "EK KLİNİK BİLGİLER" giriş paragrafı. */
  overview: string;
  /** T ≥ 70 kartı: "(GRAHAM 1987)" listeleri (Mf'de cinsiyete göre iki liste). */
  high: GrahamList[];
  /** T ≤ 40 kartı. Pa'da T'ye göre liste seçilir (bkz. paListFor). */
  low: GrahamList[];
  /** Pa: T'ye göre ek listeler (orta 65-70, hafif 55-64) — kaynak bütünlüğü için. */
  scoreLists?: { range: string; list: GrahamList }[];
  notes?: DossierNoteGroup[];
  conditions?: DossierCondition[];
  /** Kitap sayfa aralığı (yalnız kart altlığında gösterilir). */
  pages: string;
};

const at = (t: Record<ScaleId, number>, id: ScaleId) => t[id] ?? 0;

const HS_HIGH: GrahamList = {
  items: [
    'Aşırı bedensel uğraşları vardır.',
    'Somatik delüzyonlar (eğer T>80) görülebilir.',
    'Somatik semptomlar genellikle belirsizdir, eğer belirginse temelde mide ve karın bölgesine ilişkindir.',
    'Kronik yorgunluk, ağrı ve güçsüzlükten yakınır.',
    'Somatoform, depresyon ya da anksiyete bozukluğu tanısı konulabilir.',
    'Açık anksiyete belirtisi göstermez.',
    'Kendine odaklanmış, bencil, narsisistiktir.',
    'Karamsar, yıkıcı, alaycı bir yapısı vardır.',
    'Doyumsuz ve mutsuzdur.',
    'Diğerlerini bıktırır.',
    'Yakınır.',
    'Sızlanır.',
    'Diğerlerine bağımlı ve eleştiricidir.',
    'Düşmanlığını dolaylı yollardan ifade eder.',
    'Psikopatik davranışları azdır.',
    'Donuk ve ilgisizdir.',
    'Sözelleştirmede başarısızdır.',
    'Uzun süreden beri devam eden sorunları vardır.',
    'Uyumunda herhangi bir bozukluk olmamasına karşın, etkinliği azalmış gibi davranır.',
    'Semptomları için tıbbi açıklamalar ve tedaviler ister.',
    'Psikoterapi ya da danışmanlığa içgörü eksikliği ve alaycı tavrıyla çok iyi yanıt vermez.',
    'Terapisti somatizasyon ile ifade ettiklerini göstermektedir.',
    'Terapistin kendine yeterli ilgi ve desteği vermediğini düşündüğünde terapiyi sonlandırma eğilimindedir.',
  ],
};

const D_HIGH: GrahamList = {
  items: [
    'Depresif, mutsuz, kederli ve sıkıntılıdır.',
    'Gelecekten umutsuzdur.',
    'Kendini aşağılamaktadır.',
    'Suçluluk duyguları vardır.',
    'Konuşmak istemez.',
    'Ağlar.',
    'Yavaş hareket eder.',
    'Depresif tanısı konulabilir.',
    'Somatik yakınmaları vardır.',
    'Güçsüzlük, yorgunluk, enerji kaybından yakınır.',
    'Ajite ve gergindir.',
    'Kolay kızar.',
    'Üzüntüye eğilimlidir.',
    'Kendine güveni azalmıştır.',
    'Okulda ya da işte başarısız olduğunu düşünür.',
    'Kendini işe yaramaz ve iş görmez gibi görür.',
    'İçe çekilmiş, utangaç, ürkek, yalnız kalmaya eğilimli ve ketumdur.',
    'Soğuktur.',
    'Kişilerarası ilişkilerden kaçınır, insanlarla fazla konuşmaz.',
    'Temkinli ve gelenekseldir.',
    'Karar vermede güçlük çeker.',
    'Saldırgan değildir.',
    'Aşırı kontrollüdür, dürtülerini inkâr eder.',
    'Hoş olmayan durumlardan kaçınır.',
    'Yüzleştirmeden kaçınmak için ödün verir.',
    'Huzursuzluğu nedeniyle psikoterapiye güdülüdür.',
    'Var olan stresi yatıştığında terapiyi sonlandırma eğilimindedir.',
  ],
};

const HY_HIGH: GrahamList = {
  items: [
    'Strese fiziksel semptomlar geliştirerek tepki verir ve sorumluluktan kaçar.',
    'Baş ağrısı, göğüs ağrıları, güçsüzlük, taşikardi, anksiyete atakları vardır.',
    'Semptomlar bir görünür, bir kaybolur.',
    'Semptomlarının nedenlerine ilişkin içgörü azdır.',
    'Kendi güdü ve duygularını anlamaz.',
    'Üzüntüye eğilimlidir.',
    'Gerginlik, anksiyete, depresyon belirtileri göstermez.',
    'Nadiren delüzyonlar, hallüsinasyonlar, hezeyanlardan yakınır.',
    'Psikotik tanısı konulamaz.',
    'Eğer psikiyatrik hastaysa sıklıkla konversiyon bozukluğu tanısı konulur.',
    'Psikolojik açıdan gelişmemiş, çocuksu ve immatürdür.',
    'Kendine odaklıdır, narsisistik, ben-merkezcildir.',
    'Diğerlerinden ilgi ve sevgi bekler.',
    'İlgi ve sevgiyi alabilmek için dolaylı ve baştan çıkarıcı yollar kullanır.',
    'Hostilite ve kızgınlığını açık olarak ifade etmez.',
    'Sosyal açıdan katılımcıdır.',
    'Dost canlısı, konuşkan, gayretli ve ataktır.',
    'Kişilerarası ilişkilerinde yüzeysel ve çocuksudur.',
    'İnsanlarla kendi çıkarları için ilgilenir.',
    'Zaman zaman önemsemediği ve anlamaya çalışmadığı cinsel açıdan eyleme vuruk davranışlar sergiler.',
    'Başlangıçta tedaviye isteklidir.',
    'Doğrudan verilen akıl ya da önerilere uyar.',
    'Kendi davranışının nedenlerine ilişkin içgörüyü kazanması yavaştır.',
    'Psikolojik yorumlara ve tedaviye dirençlidir.',
    'Okulda ya da işte başarısız olacağına ilişkin endişe taşır.',
    'Evlilikle ilgili mutsuz yaşantıları vardır.',
    'Sosyal grup tarafından kabul görmediği hissini duyar.',
    'Otorite figürleriyle sorunu vardır.',
    'Aile öyküsünde reddedici baba figürü bulunur.',
  ],
};

const PD_HIGH: GrahamList = {
  items: [
    {
      text: 'Toplumun kurallarına ve değerlerine uymada güçlük çeker.',
      sub: [],
    },
    {
      text: 'Asosyal ya da antisosyal davranış içine girer:',
      sub: [
        'a. Yalan söyleme, çalma, dolandırıcılık',
        'b. Cinsel eyleme vuruk davranış',
        'c. Alkol ve/veya madde kullanım öyküsü',
      ],
    },
    'Otorite figürlerine karşı isyankardır.',
    'Aile ilişkileri fırtınalıdır.',
    'Sorunları için ebeveynlerini suçlar.',
    'Yaşam öyküsünde kötü bir iş yaşamı vardır.',
    'Evlilik sorunları vardır.',
    'İmpulsiftir, impulsları için hemen doyum ister.',
    'İyi planlama yapamaz.',
    'Davranışının sonuçlarını düşünmeden hareket eder.',
    'Sabırsızdır, engellenme eşiği düşüktür.',
    'Yargılaması yetersizdir, düşünmeden tehlikeye atılır.',
    'Deneyimlerinden yararlanamaz.',
    'İmmatür ve çocuksudur.',
    'Narsisistik, benmerkezci ve bencildir.',
    'Dikkati çekmek ister, gösterişcidir.',
    'Diğer kişilere karşı duyarsızdır.',
    'Diğerlerini nasıl kullanabileceğiyle ilgilidir.',
    'Beğenilir, ilk imajı iyidir.',
    'Kişilerarası ilişkileri yüzeyeldir.',
    'Sıcak ve yakın ilişkiler kuramaz.',
    'Dışadönük ve sempatiktir.',
    'Konuşkan, aktif, enerjik, maceracı, kendine güvenlidir.',
    'Zeki ve spontandır.',
    'Geniş ilgi alanları vardır.',
    'Belirli amaçları yoktur.',
    'Hostil ve saldırgandır.',
    'Küçümseyici ve alaycıdır.',
    'Gücenik ve asidir.',
    'Eyleme vuruk davranışları vardır.',
    'Saldırgan patlamaları olur.',
    'Muhalif ve inatçıdır.',
    'Davranışlarından dolayı suçluluk yaşar.',
    'Başı belada olduğu zaman suçluluk ve vicdan azabı çok az hisseder.',
    'Anksiyete, depresyon semptomları göstermez.',
    'Genellikle pasif agresif kişilik ya da antisosyal kişilik bozukluğu tanısı konulur.',
    'Endişeye eğilimli ve tatminsizdir.',
    'İçten duygusal tepkileri yoktur.',
    'Can sıkıntısı ve boşluk duyguları vardır.',
    'Psikoterapi ya da danışmanlıkla değişme prognozu kötüdür.',
    'Sorunları için diğerlerini suçlama eğilimindedir.',
    'Entellektüalizasyonu kullanır.',
    'Hapsedilmekten ya da diğer hoş olmayan yaşantılardan kurtulmak için tedaviyi kabul eder, ancak kısa sürede sonlandırır.',
  ],
};

const MF_HIGH_MALE: GrahamList = {
  label: 'Yüksek puan alan bir erkek (Graham 1987):',
  items: [
    'Cinsel kimliğine ilişkin çatışması vardır, depresyon ve psikotik semptomlar göstermez, hoşnuttur, durağandır.',
    'Erkek rolünde güvensizdir.',
    'Estetik ve artistik ilgileri vardır.',
    'Kadınsıdır.',
    'Zeki ve yeteneklidir.',
    'Hırslı, yarışmacı ve sabırlıdır.',
    'Zeki, mantıksal ve düzenlidir.',
    'İyi yargılama yeteneği vardır, sağduyuludur.',
    'Meraklıdır.',
    'Yaratıcıdır, hayal gücü zengindir ve sorunlara yaklaşımı bireyseldir.',
    'Sosyaldir, insanlara duyarlıdır.',
    'Hoşgörülüdür.',
    'Diğerlerine olumlu duygular göstermede yeteneklidir.',
    'Kişilerarası ilişkilerde pasif, bağımlı ve itaatkârdır.',
    'Barışı sever, çatışmadan kaçınmak için boyun eğmeyi tercih eder.',
    'Kendini iyi kontrol eder, nadiren eyleme vuruk davranış gösterir.',
    'Homoerotik eğilimler ya da bastırılmış homoseksüel davranışlar gösterebilir.',
  ],
};

const MF_HIGH_FEMALE: GrahamList = {
  label: 'Yüksek puan alan bir kadın:',
  items: [
    'Geleneksel kadınlık rolünü reddetme eğilimindedir.',
    'İş, spor ve hobilerde erkeksi ilgileri vardır.',
    'Aktif ve atılgandır.',
    'Yarışmacı, saldırgan ve yönlendiricidir.',
    'Kaba, terbiyesiz ve serttir.',
    'Açık yüreklidir, serbest, kendine güvenlidir.',
    'Kolay yönlendirilir, rahat ve dengelidir.',
    'Mantıksal ve hesaplıdır.',
    'Duygusuzdur.',
    'Arkadaş canlısı değildir.',
    'Eğer psikiyatrik hastaysa hallüsinasyonlar, delüzyonlar ve kuşkuculuk gösterir, ancak eylemevuruk davranışlara rastlanmaz.',
    'Eğer psikiyatrik hastaysa psikoz tanısı alma olasılığı vardır.',
  ],
};

const MF_LOW_MALE: GrahamList = {
  label: 'Düşük puan alan bir erkek:',
  items: [
    'Kendini aşırı düzeyde erkeksi olarak sergiler.',
    'Fiziksel güç ve cesarete önem verir.',
    'Saldırgan, maceracı ve pervasızdır.',
    'Kaba ve serttir.',
    'Kendi erkek kimliğine ilişkin şüpheleri vardır.',
    'Entellektüel yeterliliği sınırlıdır.',
    'İlgi alanları daralmıştır.',
    'Katıdır ve sorunlara yaklaşımı yaratıcı değildir.',
    'Hareketi düşünceye tercih eder.',
    'Pratiktir.',
    'Kolay uyum sağlayan sakin ve rahattır.',
    'Neşeli, esprilidir.',
    'Halinden memnundur.',
    'Çevresini nasıl etkilediğini fark etmez.',
    'Kendi güdülerine ilişkin içgörüsü azdır.',
  ],
};

const PA_LIST_HIGH: GrahamList = {
  items: [
    'Açık psikotik bir davranış gösterir.',
    'Düşünce bozukluğu vardır.',
    'Perseküsyon ve/veya grandioz türünde delüzyonları vardır.',
    'Referans fikirleri vardır.',
    'Kendine kötü davranıldığını ya da kendisiyle alay edildiğini düşünür.',
    'Öfkeli ve güceniktir, kıskançlık içindedir.',
    'Savunma mekanizması olarak yansıtmayı kullanır.',
    'Tanı sıklıkla şizofrenik ya da paranoid bozukluktur.',
  ],
};

const PA_LIST_ORTA: GrahamList = {
  items: [
    'Paranoid uğraşları vardır.',
    'Diğerlerinin tepkilerine aşırı duyarlıdır.',
    'Kendini yaşamda haksızlığa uğramış gibi hisseder.',
    'Rasyonalize eder, kendi sorunları için diğerlerini suçlar.',
    'Şüpheci, savunucudur.',
    'Hostil, gücenik, tartışmacıdır.',
    'Tutucu ve katıdır.',
    'Aşırı mantıklıdır.',
    'Psikoterapiye yanıtı kötüdür.',
    'Duygusal sorunları hakkında konuşmak istemez.',
    'Terapistle ilişki kurmakta ve ona sorunlarını anlatmakta güçlüğü vardır.',
    'Aile üyelerine karşı hostilite ve gücenme gösterir.',
  ],
};

const PA_LIST_HAFIF: GrahamList = {
  items: [
    {
      text: 'Eğer psikiyatrik hastaysa ve başka herhangi bir sorunu yoksa:',
      sub: [
        'a. Kibar, duygusal ve naziktir.',
        'b. Huzurlu ve yumuşak kalplidir.',
        'c. Duyarlıdır.',
        'd. Güvenilirdir.',
        'e. İşbirlikçidir.',
        'f. Samimidir.',
        'g. İlgi alanları çoktur.',
        'h. Enerjiktir.',
        'ı. İnsiyatif gösterir, iş ve diğer aktivitelerde ego katılımı vardır.',
        'j. Zekidir, mantıklıdır, açık düşüncelidir, içgörüsü vardır.',
        'k. İtaatkârdır.',
        'l. Kendine güveni azalmıştır.',
        'm. Beklenti düzeyi yüksektir, endişeye eğilimlidir.',
      ],
    },
    {
      text: 'Eğer psikiyatrik hastaysa ve başka uyumsuzlukları da varsa:',
      sub: [
        'a. Yaşama daha paranoid bir uyumu vardır.',
        'b. Çevresini kendisinden isteyen olarak görür, destekleyen olarak değil.',
        'c. Diğerlerinin ne düşündüğü konusunda aşırı duyarlıdır.',
        'd. Diğerlerinin motiflerinden şüphelenir.',
        'e. Öfkeli ve güceniktir.',
      ],
    },
  ],
};

const PA_LIST_DUSUK: GrahamList = {
  items: [
    {
      text: 'Psikiyatrik hasta değilse ve herhangi bir sorunu yoksa:',
      sub: [
        'a. Neşelidir.',
        'b. Dengelidir.',
        'c. Düzenlidir.',
        'd. Ciddi, olgun ve mantıklıdır.',
        'e. Akıllı ve kararlıdır.',
        'f. Sosyal açıdan ilgilidir.',
        'g. Sorunlarla kolay bir biçimde baş eder.',
        'h. Güvenilir ve sadıktır.',
        'ı. Kendini kontrol eder, temkinlidir.',
      ],
    },
    {
      text: 'Eğer psikiyatrik hastaysa ya da uyumsuzluğun diğer göstergeleri varsa:',
      sub: [
        'a. İnatçı ve savunucudur.',
        'b. Ben merkezcidir.',
        'c. Kendisini doğrudan ilgilendirmeyen şeyle çok az ilgi gösterir.',
        'd. Kendinden hoşnut değildir.',
        'e. Diğerlerinin tepkilerine aşırı duyarlıdır.',
        'f. Anlayışsızdır.',
        'g. Sosyal ilgileri ve yetenekleri sınırlıdır.',
        'h. Vicdanı gelişmemiştir, kuralları çok dikkate almaz.',
        'ı. Kabadır.',
        'j. Huysuz ve karşıttır.',
        'k. Yeteneksizdir.',
        'l. Psikotik semptomlar pek görülmez, bu nedenle psikoz tanısı konulmaz.',
      ],
    },
  ],
};

const PA_LIST_ASIRI_DUSUK: GrahamList = {
  items: [
    'Açık paranoid bozukluğu olabilir.',
    'Delüzyonları olabilir, şüpheler, etkilenme düşünceleri gösterebilir.',
    'Semptomları Pa alt testinde yüksek puan alan bireylerden daha belirsizdir.',
    'Baştan savıcı ve savunucudur.',
    'Utangaçtır, sırlarla doludur ve içe çekilmiştir.',
  ],
};

const PT_HIGH: GrahamList = {
  items: [
    'Telâş ve huzursuzluk yaşar.',
    'Kaygılı, gergindir.',
    'Endişeli ve vesveselidir.',
    'Sinirli ve tedirgindir.',
    'Dikkatini yoğunlaştırmada güçlüğü vardır.',
    'Sıklıkla anksiyete bozukluğu tanısı konulur.',
    'İçe dönük, derin düşünceleri olan biridir.',
    'Düşüncelerinde obsesiftir.',
    'Kompulsif davranışları vardır.',
    'Güvensizdir ve aşağılık duyguları yaşar.',
    'Kendinden emin değildir.',
    'Kendine yönelik şüpheleri vardır, kendini eleştirir.',
    'Katıdır.',
    'Kendisi ve diğerleri için yüksek standartlara sahiptir.',
    'Mükemmeliyetçi ve vicdan sahibidir.',
    'Suçluluk duyar ve depresiftir.',
    'Temiz, düzenli, tertipli ve titizdir.',
    'Tutucudur.',
    'Güvenilirdir.',
    'Sıkıcıdır.',
    'Donuktur.',
    'Tereddüt eder.',
    'Sorunların önemini çarptırır, aşırı tepkiseldir.',
    'Çekingendir.',
    'Sosyal etkileşimde başarısızdır.',
    'Anlaşılması zordur.',
    'Sevilme ve kabul görme konusunda endişeleri vardır.',
    'Huzurlu, yumuşak kalpli, güvenilir, duyarlıdır.',
    'Bağımlıdır.',
    'Bireyseldir.',
    'Heyecanlıdır.',
    'İmmatürdür.',
    {
      text: 'Bedensel yakınmaları vardır:',
      sub: [
        'a. kalp',
        'b. üriner sistem',
        'c. gastrointestinal sistem',
        'd. yorgunluk, bitkinlik, uykusuzluk',
      ],
    },
    'Kısa psikoterapiye iyi yanıt vermez.',
    'Sorunlarına ilişkin kısmi içgörüsü vardır.',
    'Entellektüalize ve rasyonalize eder.',
    'Psikoterapide yapılan yorumlara direnç gösterir.',
    'Terapiste karşı düşmanca duygular içindedir.',
    'Pek çok hastadan daha uzun süre psikoterapide kalır.',
    'Psikoterapide yavaş, ancak kalıcı bir gelişme gösterir.',
    'Psikoterapide otorite konumunda olan kişilerle yaşadığı güçlüklerden, işteki başarısızlığından ve çalışma alışkanlıklarından, homoseksüel dürtülerle ilişkili kuşkularından söz eder.',
  ],
};

const SC_HIGH: GrahamList = {
  items: [
    'Açık psikotik davranış gösterebilir.',
    'Konfüzyondadır, dezorganize ve dezoryantedir.',
    'Garip düşünce ve tutumları, delüzyonları vardır.',
    'Hallüsinasyonları vardır.',
    'Yargılaması kötüdür.',
    'Şizoid yaşam biçimi sergiler.',
    'Kendini sosyal çevrenin dışında görür.',
    'Kendini izole, yabancılaşmış, yanlış anlaşılmış hisseder.',
    'Arkadaşları tarafından kabul görmediğini düşünür.',
    'Yalnız ve ulaşılmazdır.',
    'İnsanlarla ve yeni durumlarla karşılaşmaktan kaçınır.',
    'Utangaç ve çekingendir, katılımcı değildir.',
    'Yaygın anksiyete yaşar.',
    'Kendini öç alıcı, hostil, saldırgan hisseder.',
    'Duygularını ifade edemez.',
    'Strese, hayal ve fantezi dünyasına çekilerek tepki verir.',
    'Gerçekle hayaliyi ayırmada sorunu vardır.',
    'Kendi ile ilgili kuşkuları vardır.',
    'Aşağılık, yetersizlik, tatminsizlik duyguları yaşar.',
    'Cinsellikle ilgili düşünsel uğraşları vardır, cinsel kimliğine ilişkin rol karmaşası içindedir.',
    'Alışılmamış, olağandışı, garip ve tuhaftır.',
    'Belirgin olmayan ve uzun süredir devam eden psikolojik sorunları vardır.',
    'İnatçı, kaprisli, dik kafalıdır.',
    'Cömert, sakin ve duygusaldır.',
    'İmmatür ve impulsiftir.',
    'Maceraperesttir.',
    'Zekidir.',
    'Vicdanlıdır.',
    'Çok sinirlidir.',
    'İlgi alanının genişliğine bağlı olarak dikkat toplaması güçtür.',
    'Yaratıcıdır ve hayal gücü zengindir.',
    'Soyut, belirsiz amaçları vardır.',
    'Sorun çözümüne ilişkin temel bilgilerin farkında değildir.',
    'Psikoterapide prognozu kötüdür.',
    'Terapistle anlamlı bir ilişki kurmak konusunda gönülsüzdür.',
    'Pek çok hastadan daha uzun süre psikoterapide kalır.',
    'Terapistte güven duyması zor olabilir.',
    'Tıbbi yardım ve ilâç tedavisinden yararlanabilir.',
  ],
};

const MA_HIGH: GrahamList = {
  items: [
    'Manik dönemde olabilir.',
    'Aşırı, amaçsız aktiviteler gösterebilir.',
    'Konuşması hızlanmıştır.',
    'Hallüsinasyonları, büyüklük delüzyonları olabilir.',
    'Duygusal açıdan labildir.',
    'Konfüze olabilir.',
    'Fikir uçuşmaları gösterebilir.',
    'Enerjik ve konuşkandır.',
    'Hareketi düşünceye tercih eder.',
    'Geniş ilgi alanları vardır, pek çok aktiviteye girer.',
    'Enerjisini uygun kullanmaz, projeleri tamamlayamaz.',
    'Yaratıcı, girişken ve beceriklidir.',
    'Rutine ya da ayrıntılara çok az ilgi gösterir.',
    'Çabuk sıkılır, huzursuzdur, engellenme eşiği düşüktür.',
    'İmpulslarını engellemede güçlüğü vardır.',
    'Sinirlilik, hostilite dönemleri, agresif patlamaları olur.',
    'Gerçekçi olmayan bir iyimserlik içindedir.',
    'Büyük emellere sahiptir.',
    'Kendi değerini ve önemini abartır.',
    'Kendi yeteneklerinin sınırlarını görmez.',
    'Açık yürekli ve sosyaldir.',
    'Diğer insanlarla birlikte olmayı sever.',
    'İlk bakışta bıraktığı izlenim iyidir.',
    'Arkadaş canlısıdır.',
    'Kendine aşırı güvenir.',
    'İnsan ilişkileri yüzeyseldir.',
    'Manipülatif, aldatıcı ve güvenilmezdir.',
    'Tatminsizlik duyguları gösterir.',
    'Kendini üzgün, gergin, endişeli, kaygılı hisseder.',
    'Depresyon epizodları olabilir.',
    'Ajitedir, endişeye eğilimlidir.',
    'Kendini yönlendiren ebeveynlerine karşı olumsuz duyguları vardır.',
    'Okulda ya da işte sorunları vardır, suça yönelik davranışlar gösterir.',
    'Kadınsa, geleneksel kadınlık rolünü reddedici olabilir.',
    'Erkekse homoseksüel dürtülerden endişe duyar.',
    'Terapide prognozu kötüdür.',
    'Psikoterapide yoruma direnç gösterir.',
    'Psikoterapiye düzensiz aralıklarla gelir.',
    'Psikoterapiyi erken sonlandırır.',
    'Sorunları stereotipik bir biçimde tekrarlar.',
    'Terapiste bağımlı olmayı sevmez.',
    'Terapiste hostil ve agresif olabilir.',
  ],
};

const SI_HIGH: GrahamList = {
  items: [
    'Sosyal açıdan içe çekilmiştir.',
    'Yalnızdır ya da çok az arkadaşla rahattır.',
    'Ürkek, çekingen, temkinli, utangaçtır.',
    'Karşı cinsten kişilerin olduğu ortamlarda rahat değildir.',
    'Kendini küçük görür.',
    'Anlaşılmaz zor biridir.',
    'Diğerlerinin düşüncelerine duyarlıdır.',
    'Diğer insanlarla ilişkiye giremediği için üzülür.',
    'Aşırı kontrollüdür, duygularını açıkca dile getirmekten hoşlanmaz.',
    'İtaatkâr, uysal ve boyun eğicidir.',
    'Otoriteyi kabul etmede aşırıdır.',
    'Ciddidir, kişisel temposu yavaştır.',
    'Güvenli, bağımlıdır.',
    'Temkinlidir, sorunlara yaklaşımı sıradandır.',
    'Tutumlarında ve düşüncelerinde katı ve tutucudur.',
    'Küçük fikirler üretmede bile güçlüğü vardır.',
    'Çalışmayı sever.',
    'Endişeye eğilimlidir, sinirli ve kaygılıdır.',
    'Karamsardır.',
    'Suçluluk duyguları, depresyon dönemleri yaşar.',
  ],
};

export const SCALE_DOSSIERS: Record<ClinicalScaleId, ScaleDossier> = {
  Hs: {
    id: 'Hs',
    number: '1',
    name: 'Hipokondriyazis (Hs)',
    tablo: { no: 8, title: 'Hipokondriyazis alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Bu alt test hipokondriyak bireylerin kişilik özelliklerini değerlendirmek amacıyla geliştirilmiştir. ' +
      'Bilindiği gibi hipokondriazis kişinin vücut semptomlarını yanlış yorumlamasına bağlı olarak ciddi bir hastalığı ' +
      'olacağı korkusunu ya da ciddi bir hastalığı olduğu düşüncesini taşıyıp durmasıdır. Bunlar bedensel hiçbir ' +
      'hastalıkları olmadığı halde birçok hastalık belirtisini kendilerinde bulur ve endişelenirler.',
    high: [HS_HIGH],
    low: [
      {
        items: [
          'Somatik uğraşları yoktur.',
          'İyimserdir.',
          'Duyarlıdır.',
          'İçgörüsü vardır.',
          'Günlük yaşamda oldukça etkindir.',
        ],
      },
    ],
    notes: [
      {
        paragraphs: ['Hs alt testinin 40 yaşın üzerindekilerde daha çok yükseldiği ancak genç grupta daha düşük olduğu belirtilmektedir.'],
      },
      {
        paragraphs: [
          'Ciddi bedensel hastalığı olan bireylerde de bu alt testte yükselme vardır, ancak bu psikiyatrik hastalar kadar yüksek değildir. ' +
            'Hipokondriyak tanısı konulan hastaların semptomları uzun sürelidir, değişmeye dirençlidirler ve bu, artık strese tepkiden farklı bir şeydir. ' +
            'Bu bireyler önerilen tedaviyi uygulamaz ve sık sık doktor doktor gezerler.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 3 de birlikte yükselmişse',
        sentence:
          'Alt test 3 de birlikte yükselmişse aile ve evlilik sorunları, kızgınlık ve sosyal yetersizlik duyguları ile birlikte bağımlılık-bağımsızlık çatışmaları ön plana çıkmıştır.',
        match: t => at(t, 'Hy') >= 70,
      },
    ],
    pages: 's.64-67',
  },

  D: {
    id: 'D',
    number: '2',
    name: 'Depresyon (D)',
    tablo: { no: 9, title: 'Depresyon alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Bu alt test, depresyon belirtilerinin derecesini ölçmek amacıyla geliştirilmiştir. Depresyonda olan kişilerin ' +
      'ana belirtileri, karamsarlık, gelecekten ümitsizlik; kendini değersiz, işe yaramaz görme, suçluluk duyguları, ' +
      'hareketlerde ve düşüncede yavaşlama ve çeşitli bedensel yakınmalardır. Sıklıkla ölüm ve intiharla ilgili ' +
      'düşüncelerin yoğunluğu da dikkati çeker. Depresyon belirtileri başka birçok psikiyatrik tanı grubuna da eşlik edebilir.',
    high: [D_HIGH],
    low: [
      {
        items: [
          'Gerginlik, anksiyete, suçluluk ve depresyondan arınmıştır.',
          'Rahat ve huzurludur.',
          'Kendine güvenlidir.',
          'Duygusal açıdan dengeli ve tutarlıdır.',
          'Pek çok durumda etkili davranır.',
          'Neşeli ve iyimserdir.',
          'Sözelleştirmede gücü çok azdır.',
          'Aktif, enerjik, uyanıktır.',
          'Yarışmacıdır.',
          'Sorumluluk alabilir.',
          'Sosyal ortamlarda rahattır.',
          'Liderlik rolü üstlenir.',
          'Zeki, espirili ve renklidir.',
          'İlk bakışta olumlu bir izlenim yaratır.',
          'İmpulsif değildir, kontrollüdür.',
          'Ketlenmemiştir, kendini kolaylıkla ortaya koyabilir.',
          'Diğer insanlarda kızgınlık ve düşmanlık uyandırır.',
          'Otorite rolünde olan kişilerle çatışması vardır.',
        ],
      },
    ],
    notes: [
      {
        paragraphs: [
          'Alt test 2’nin yorumlanması, birlikte yükselen diğer alt testlere göre değişmektedir. Depresyon çok farklı ' +
            'nedenlerden kaynaklanabilir ve bunlar ancak diğer alt testlerdeki yükselmelere bakılarak yorumlanabilir.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 2 tek başına T-70 üzerinde yükselirse',
        sentence:
          'Alt test 2 tek başına T-70 değeri üzerinde bir yükseliş gösteriyorsa ve depresyona ilişkin açık davranışsal belirtiler yoksa, intihar riskine karşı dikkatli olmak gerekir.',
        match: t =>
          at(t, 'D') >= 70 &&
          CLINICAL_SCALE_ORDER.filter(id => id !== 'D').every(id => at(t, id) < 70),
      },
    ],
    pages: 's.78-81',
  },

  Hy: {
    id: 'Hy',
    number: '3',
    name: 'Histeri (Hy)',
    tablo: { no: 10, title: 'Histeri alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Histeri, fizik bir neden olmadan bir organın işlevinin kaybedilmesidir. Bu alt test nevrotik bozukluklardan ' +
      'konversiyon histerisine tanı koymada yardımcı olmak amacıyla geliştirilmiştir.',
    high: [HY_HIGH],
    low: [
      {
        items: [
          'Temkinli, geleneksel ve uysaldır.',
          'Maceracı ve çalışkan değildir.',
          'İlgi alanları daralmıştır.',
          'Sosyal katılımı sınırlıdır.',
          'Lider olma rolünden kaçar.',
          'Arkadaş canlısı değildir, anlaşılması zor biridir.',
          'Kuşkucudur, diğer insanlara güvenmez.',
          'Gerçekçidir, mantıklıdır, sorunları aşama aşama çözer.',
          'Yaşama bakışı donuktur.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Sadece 3’ün yüksek olduğu ve diğer hiçbir alt testin 70 T puanının üstünde olmadığı durumda',
        sentence:
          'Bireyin kabul edilme ve sevilmeye gereksinimi fazladır. Ait olduğu grup tarafından reddedilme olasılığına yönelik endişe yaşar; kızgınlık ve kendini ortaya koymayı içeren yüzleşme durumlarıyla (akademik ortamlar gibi) uğraşırken çok rahatsız olur. Tartışmalarda iyimserliklerini ve diğer insanlarla olan iyi ilişkilerini vurgularlar ve kendilerinde doğal olmayan ya da sapkın davranışları en aza indirgerler.',
        match: t =>
          at(t, 'Hy') >= 70 &&
          CLINICAL_SCALE_ORDER.filter(id => id !== 'Hy').every(id => at(t, id) < 70),
      },
    ],
    pages: 's.92-95',
  },

  Pd: {
    id: 'Pd',
    number: '4',
    name: 'Psikopatik Sapma (Pd)',
    tablo: { no: 11, title: 'Psikopatik sapma alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Psikopatik bir birey toplum kurallarını hiçe sayar, saldırgandır, engellenme eşiği düşüktür, iç çatışmaları, ' +
      'suçluluk duygusu azdır, deneyimden pek fazla ders almaz. Bu gibi özellikleri tanımlamak için bu alt test ' +
      'geliştirilmiştir. Alt test 4, psikopatik eğilimleri de yansıttığı ve psikopatik kişiliği kesin olarak teşhis ' +
      'etmediği için McKinley ve Hathaway (1956) alt ölçeğe “psikopatik sapma” adını vermişlerdir.',
    high: [PD_HIGH],
    low: [
      {
        items: [
          'Geleneksel ve itaatkardır.',
          'Otoriteye boyun eğer.',
          'Pasif, itaatkar ve çekingendir.',
          'Diğerlerinin nasıl tepki vereceğini düşünür.',
          'Samimi ve güvenilirdir.',
          'Enerji düzeyi düşüktür, yarışmacı değildir.',
          'Mevki ve güvencede olmaya dikkat eder.',
          'İlgi alanları daralmıştır.',
          'Yaratıcı ve spontan değildir.',
          'İnatçıdır.',
          'Kuralcı ve katıdır.',
          'Erkekse cinsellikle çok ilgili değildir, kadınlardan korkar.',
          'Kendini eleştirir, kendinden memnun değildir.',
          'Önerileri ve fikirleri kabul eder.',
          'Tedaviye çok bağımlı olmaya eğilimlidir.',
          'Kendi davranışının sorumluluğunu kabul etmekten korkar.',
        ],
      },
    ],
    notes: [
      {
        title: 'Yaş ile değerlendirme',
        paragraphs: [
          'Ergenler için yüksek Pd profilleri karakteristik olarak evden uzaklaşmak ve kendi kimlik duygularını oluşturmak için isyan ederler; ancak 25 yaşın üzerindeyse bu yükseklik doğal değildir.',
          '40 yaşın üstünde yüksekse uzun süren kişilerarası ilişki kuramama ve antisosyal davranışları yansıtırken, 60 yaş üzerinde apatik bir biçimde katılmama düzeyine varan yabancılaşmayı düşündürür.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 3 de birlikte yükselmişse',
        sentence:
          'Alt test 3 de birlikte yükselmişse aile ve evlilik sorunları, kızgınlık ve sosyal yetersizlik duyguları ile birlikte bağımlılık-bağımsızlık çatışmaları ön plana çıkmıştır.',
        match: t => at(t, 'Hy') >= 70,
      },
    ],
    pages: 's.106-109',
  },

  Mf: {
    id: 'Mf',
    number: '5',
    name: 'Kadınlık-Erkeklik (Mf)',
    tablo: { no: 12, title: 'Kadınlık-Erkeklik alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Bu alt test, cinsel kimlikteki sapmaları değerlendirmek amacıyla geliştirilmiştir. Maddeler oldukça heterojendir. ' +
      'Çeşitli mesleklere karşı ilgi, boş zaman faaliyetleri, uğraşlar, sosyal aktivitelerle ilgili maddelerden başka ' +
      'korkular, endişeler ve bireysel duyarlılıklarla ilgili maddeler bulunmaktadır. Doğrudan doğruya cinsel içerikli ' +
      'maddeler de vardır.',
    high: [MF_HIGH_MALE, MF_HIGH_FEMALE],
    low: [
      MF_LOW_MALE,
      {
        label: 'Kadınlarda Mf alt testinde düşüklük (eğitim düzeyine göre):',
        items: [
          {
            text: 'Eğitim düzeyi düşük kadınlarda:',
            sub: [
              'a. Kendini geleneksel kadın rolünde gibi sergiler.',
              'b. Kendi kadınlığı konusunda şüpheleri olan.',
              'c. Pasif, uysal, itaatkardır.',
              'd. Kendinden memnun değildir, yakınan biridir.',
              'e. Diğerleri tarafından katı, duyarlı, idealistik olarak tanımlanır.',
              'f. Karar verirken erkeklerin düşüncelerine başvurur.',
              'g. Sıkıcıdır.',
              'h. Duyguludur.',
              'ı. Alçakgönüllüdür.',
              'j. İdealisttir.',
              'k. Eğer hastanede yatan psikiyatrik hastaysa büyük olasılıkla psikotik değildir.',
              'l. Eğer hastanede yatan psikiyatrik hastaysa diğer kadın hastalara kıyasla daha sosyaldir.',
            ],
          },
          {
            text: 'Eğitim düzeyi yüksek olan kadınlarda:',
            sub: [
              'a. Geleneksel kadın rolünü reddeden.',
              'b. Stereotipik bir biçimde kadın olmadığı halde pek çok geleneksel kadınsı ilgileri vardır.',
              'c. Kendini yetenekli, mücadeleci olarak görür.',
              'd. Kendini alaycı, hayalperest olmayan, ilgisiz biri olarak tanımlar.',
              'e. Diğerleri tarafından zeki, yetenekli, zorlayıcı, içgörüsü olan biri olarak tanımlanır.',
            ],
          },
        ],
      },
    ],
    notes: [
      {
        paragraphs: [
          'Tablo 12’de (*) işaretli sorular kadınlarda ters yönde puan almaktadır: 69, 179, 231, 297, 133.',
        ],
      },
    ],
    pages: 's.120-123',
  },

  Pa: {
    id: 'Pa',
    number: '6',
    name: 'Paranoya (Pa)',
    tablo: { no: 13, title: 'Paranoya alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Paranoya geç erişkinlik döneminde başlayan ve değişik koşullar altında ortaya çıkan başkalarının davranışını ' +
      'kötü niyetli olarak yorumlayan sürekli bir güvensizlik ve kuşkuculuk durumudur.',
    high: [PA_LIST_HIGH],
    low: [PA_LIST_DUSUK, PA_LIST_ASIRI_DUSUK],
    scoreLists: [
      { range: 'T: 65-70', list: PA_LIST_ORTA },
      { range: 'T: 55-64', list: PA_LIST_HAFIF },
    ],
    conditions: [
      {
        when: 'Alt test 6 ve 8 birlikte, 7’den en az 10 T yüksekse (Paranoid Vadi)',
        sentence:
          'Alt test 6 ve 8 birlikte yükselip 7, bunlardan en az 10 T düşükse duygusal olarak geri çekilmişlerdir, sosyal izolasyon içindedir, şüpheci, düşmanlık duyguları taşıyan ve davranışları hakkında içgörüsü olmayan kişilerdir. Ayrıca düşünce bozuklukları, halüsinasyon ve delüzyonlara rastlanabilir; genellikle paranoid şizofreni tanısına uygundurlar. Bu örüntü, hepsini doğru yanıtlama şeklinde de ortaya çıkar.',
        match: t => at(t, 'Pa') >= 70 && at(t, 'Sc') >= 70 && at(t, 'Pt') <= Math.min(at(t, 'Pa'), at(t, 'Sc')) - 10,
      },
    ],
    pages: 's.126-129',
  },

  Pt: {
    id: 'Pt',
    number: '7',
    name: 'Psikasteni (Pt)',
    tablo: { no: 14, title: 'Psikasteni alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Bu alt test, psikasteni ya da obsesif kompulsif bozukluğu değerlendirmek amacıyla geliştirilmiştir. Bu ' +
      'hastalarda obsesif ruminasyonlar, kompulsif ritüeller görülmektedir. Ayrıca anormal korkular, karar vermede ' +
      've dikkati toplamada güçlük, suçluluk duyguları ve bunaltı sıklıkla rastlanan özelliklerdir. Kendi kendini ' +
      'eleştiride aşırı ahlâki standartlar bu tür kişilerde sıklıkla görülür.',
    high: [PT_HIGH],
    low: [
      {
        items: [
          'Korkular ve kaygılardan arınmıştır.',
          'Kendine güven duymaktadır.',
          'Geniş ilgi alanları vardır.',
          'Sorumlu, gerçekçi, etkili, uyumludur.',
          'Başarı, mevki ve tanınıp bilinmeye ilişkin değerleri vardır.',
        ],
      },
    ],
    pages: 's.136-139',
  },

  Sc: {
    id: 'Sc',
    number: '8',
    name: 'Şizofreni (Sc)',
    tablo: { no: 15, title: 'Şizofreni alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Şizofreni, bir aylık bir dönem boyunca bu sürenin önemli bir kesiminde hezeyanlar, halüsinasyonlar, ' +
      'dezorganize konuşma, ileri derecede dezorganize ya da katatonik davranış, negatif semptomlar yani affektif ' +
      'belirtiler ve konuşamazlık gibi belirtilerden ikisinin bulunmasıdır.',
    high: [SC_HIGH],
    low: [
      {
        items: [
          'Arkadaşça, neşeli, duyarlı, güvenilirdir.',
          'Dengelidir, uyumludur.',
          'Sorumluluk sahibidir, bağımlıdır.',
          'İlişkilerde tutucudur, derin duygusal ilişkiler kurmaktan kaçınır.',
          'İtaatkârdır, uysal, otoriteyi açıkca kabul eder.',
          'Temkinli ve geleneksel tutucudur, sorunlara yaklaşımında hayal gücünden yoksundur.',
          'Pratiktir, somut düşünür.',
          'Başarı, statü ve güçle ilgilidir.',
          'Rekabet gerektiren durumlara girmekte gönülsüzdür.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 6 ve 8 birlikte, 7’den en az 10 T yüksekse (Paranoid Vadi)',
        sentence:
          'Alt test 6 ve 8 birlikte yükselip 7, bunlardan en az 10 T düşükse duygusal olarak geri çekilmişlerdir, sosyal izolasyon içindedir, şüpheci, düşmanlık duyguları taşıyan ve davranışları hakkında içgörüsü olmayan kişilerdir. Ayrıca düşünce bozuklukları, halüsinasyon ve delüzyonlara rastlanabilir; genellikle paranoid şizofreni tanısına uygundurlar. Bu örüntü, hepsini doğru yanıtlama şeklinde de ortaya çıkar.',
        match: t => at(t, 'Pa') >= 70 && at(t, 'Sc') >= 70 && at(t, 'Pt') <= Math.min(at(t, 'Pa'), at(t, 'Sc')) - 10,
      },
      {
        when: 'Alt test 2 ya da 7, özellikle 8 ile birlikte yükselirse',
        sentence:
          'Alt test 2 ya da 7 özellikle alt test 8’in eşlik ettiği durumlarda, ruminatif davranışların kuvvetlendiği görülür.',
        match: t => (at(t, 'D') >= 70 || at(t, 'Pt') >= 70) && at(t, 'Sc') >= 70,
      },
    ],
    pages: 's.143-148',
  },

  Ma: {
    id: 'Ma',
    number: '9',
    name: 'Hipomani (Ma)',
    tablo: { no: 16, title: 'Hipomani alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Hipomani olağandışı ve sürekli, taşkın ya da huzursuz bir duygu durum döneminin en az bir hafta olmasıdır.',
    high: [MA_HIGH],
    low: [
      {
        items: [
          'Düşük enerji ve aktivite seviyesi vardır.',
          'Uyuşuk, apatik, kayıtsızdır.',
          'Motive olması güçtür.',
          'Kronik yorgunluk, fiziksel tükenmişlik hisseder.',
          'Depresif, anksiyeteli ve gergindir.',
          'Güvenilir ve sorumluluk sahibidir.',
          'Sorunlara pratik ve mantıksal bir biçimde yaklaşır.',
          'Kendine güvensizdir.',
          'Samimi, sakin ve alçak gönüllüdür.',
          'İçeçekilmiş, ketumdur.',
          'Başkalarınca pek tanınmaz.',
          'Aşırı kontrollüdür, duygularını açıkça ortaya koymak istemez.',
          'Erkekse ev ve ailesi ile ilgilidir, düzen kurmayı sever.',
          'Hastanede yatan psikiyatrik hastaysa prognozu iyidir.',
        ],
      },
    ],
    notes: [
      {
        paragraphs: [
          'Yalnızca alt test 9’u kullanarak bir yoruma gitmek güçtür; diğer klinik alt testlerdeki yükselmelerle bu enerji artışının nedeni araştırılmalıdır.',
          'Beyin hasarı olan bir hasta, hiperaktivite ve tepkisel davranışlar gösterebilir; yine bu hastalarda duygusal tepkiler depresyon şeklinde ortaya çıkabilir.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 4 ya da 8 ile birlikte yükselirse',
        sentence:
          'Hipomani alt testiyle birlikte alt test 4’ü yükselen bir hastanın yorumu, alt test 8 ile 9’u birlikte yükseltmiş hastadan farklıdır.',
        match: t => at(t, 'Ma') >= 70 && (at(t, 'Pd') >= 70 || at(t, 'Sc') >= 70),
      },
    ],
    pages: 's.149-151',
  },

  Si: {
    id: 'Si',
    number: '0',
    name: 'Sosyal İçedönüklük (Si)',
    tablo: { no: 17, title: 'Sosyal içedönüklük alt testi: Madde numaraları ve puanlama yönü' },
    overview:
      'Standart MMPI profiline sonradan eklenmiş bir alt testtir. İçedönüklük ve dışadönüklük üzerinde çok çalışılmış ' +
      'bir kişilik boyutudur. Bu alt test içedönüklüğün yalnızca bir boyutunu, sosyal ilişkilerdeki içedönüklüğü ölçmeyi ' +
      'amaçlamaktadır. Diğer alt testlerden daha farklı olarak geliştirilmiştir.',
    high: [SI_HIGH],
    low: [
      {
        items: [
          'Sosyaldir, dışadönüktür.',
          'Açık yürekli, arkadaşça, konuşkandır.',
          'Diğer insanlarla birlikte olmak için güçlü bir isteği vardır.',
          'Kolay kaynaşır.',
          'Zekidir, kendini ifade edebilir.',
          'Aktif, enerjik ve gayretlidir.',
          'Güç, mevki ve tanınmak ister.',
          'Mücadele edecek ortamlar arar.',
          'İmpuls kontrolüyle ilgili sorunları vardır.',
          'Eylemlerinin sonuçlarını düşünmeden davranır.',
          'İmmatürdür, kendini düşünür.',
          'Yüzeysel ve insanlarla ilişkileri yapmacıktır.',
          'İnsanları kullanır ve fırsatkârdır.',
          'Diğerlerinde hostilite ve öfke uyandırır.',
        ],
      },
    ],
    notes: [
      {
        paragraphs: [
          'Alt test Si’deki puanlar yaşla birlikte artar. Ergenler ve yüksekokul öğrencileri genellikle 40 ile 50 T puanlık bir aralıkta iken yaşlı kişiler 50 ile 60 T puanı arasında yer alırlar.',
          'Alt test Si, evlilik ilişkileri üzerinde tahminler yapmaya yararlıdır. Alt test Si’de 20 puanlık bir farklılık olan çiftlerin, sosyal ilişkiler açısından evlilik çatışmalarına düşmeleri olasıdır.',
        ],
      },
    ],
    conditions: [
      {
        when: 'Alt test 4 ve 9 da yükselmişse',
        sentence:
          'Alt test Si’deki yükselmeye, alt test 4 ve 9’daki yükselmeler de eşlik ediyorsa, eyleme vurukluğun bastırıldığı düşünülmelidir.',
        match: t => at(t, 'Si') >= 70 && at(t, 'Pd') >= 70 && at(t, 'Ma') >= 70,
      },
      {
        when: 'Alt test 2 ya da 7, özellikle 8 ile birlikte yükselirse',
        sentence:
          'Alt test 2 ya da 7 özellikle alt test 8’in eşlik ettiği durumlarda, ruminatif davranışların kuvvetlendiği görülür.',
        match: t => (at(t, 'D') >= 70 || at(t, 'Pt') >= 70) && at(t, 'Sc') >= 70,
      },
    ],
    pages: 's.155-157',
  },
};

/** Pa: T puanına göre kaynaktaki listeyi seçer (klinik kart eşikleriyle uyumlu). */
export function paListFor(tScore: number): { range: string; list: GrahamList } {
  if (tScore >= 70) return { range: '', list: PA_LIST_HIGH };
  if (tScore >= 55 && tScore <= 64) return { range: 'T: 55-64', list: PA_LIST_HAFIF };
  if (tScore >= 65) return { range: 'T: 65-70', list: PA_LIST_ORTA };
  if (tScore < 35) return { range: 'T<35', list: PA_LIST_ASIRI_DUSUK };
  return { range: 'T: 35-45', list: PA_LIST_DUSUK };
}

/** Kartta gösterilecek Graham listeleri (yön: 'high' | 'low'). */
export function grahamListsFor(
  id: ClinicalScaleId,
  tScore: number,
  direction: 'high' | 'low',
): { range: string; lists: GrahamList[] } {
  const dossier = SCALE_DOSSIERS[id];
  if (id === 'Pa') {
    const picked = paListFor(tScore);
    if (direction === 'high') return { range: '', lists: [PA_LIST_HIGH] };
    return { range: picked.range, lists: [picked.list] };
  }
  return { range: '', lists: direction === 'high' ? dossier.high : dossier.low };
}

export type TabloDetail = {
  no: number;
  title: string;
  count: number;
  dogru: number[];
  yanlis: number[];
  kEkleli: boolean;
  normMale: number;
  normFemale: number;
  extraNote?: string;
};

/** Tablo bloğu: Doğru/Yanlış maddeler SCORING_KEYS'ten (kitap tablolarıyla birebir). */
export function tabloDetail(id: ClinicalScaleId, gender: Gender): TabloDetail {
  const dossier = SCALE_DOSSIERS[id];
  const rule = SCORING_KEYS[id];
  const effective = isGendered(rule) ? (gender === 'Erkek' ? rule.male : rule.female) : rule;
  const dogru = [...effective.trueItems].sort((a, b) => a - b);
  const yanlis = [...effective.falseItems].sort((a, b) => a - b);
  return {
    no: dossier.tablo.no,
    title: dossier.tablo.title,
    count: dogru.length + yanlis.length,
    dogru,
    yanlis,
    kEkleli: id in K_CORRECTION,
    normMale: TURKISH_NORMS.Erkek[id].mean,
    normFemale: TURKISH_NORMS.Kadın[id].mean,
    extraNote: id === 'Mf' ? '(*) işaretli sorular kadınlarda ters yönde puan almaktadır: 69, 179, 231, 297, 133.' : undefined,
  };
}

/** Kart altlığı — sayfa referansı yalnız burada. */
export function dossierSourceLine(id: ClinicalScaleId): string {
  const d = SCALE_DOSSIERS[id];
  return `Kaynak: Graham (1987) · Ceyhun & Oral (2003), ${d.pages} (Tablo ${d.tablo.no}) · Savaşır (1981) normları.`;
}

/**
 * Metin gövdesinden "s.29" tarzı sayfa referanslarını düşürür (kullanıcı kuralı:
 * sayfa referansı yalnız kaynak/altlık satırlarında görünür). Veri katmanı olduğu
 * gibi kalır; yalnızca ekran/metin çıktısı süzülür.
 */
export function stripPageRefs(text: string): string {
  return text
    .replace(/\s*\(\s*s\.\d+(?:\s*[-–]\s*\d+)?\s*\)/g, '')
    .replace(/\bs\.\d+(?:\s*[-–]\s*\d+)?\b\s*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
}
