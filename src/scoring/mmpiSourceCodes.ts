/**
 * yorum rehberindeki iki noktalı kod yorumları (Kod Analizleri).
 *
 * Anahtarlar kanonik biçimde yazılır: kodun iki rakamı küçükten büyüğe
 * sıralanır ("21" → "12"). Kaynakta kodların büyük kısmı "12/21" gibi her iki
 * sıralamayla birlikte ele alındığı için yorumlar ortak verilir; kaynağın
 * sıralamaya bağlı notları metin içinde korunmuştur. Metinler kaynak raporun
 * sadık özetleridir; olası tanılar kaynaktaki gibi listelenir.
 */

export type CodeInterpretation = {
  /** Kanonik kod etiketi, ör. "12/21". */
  code: string;
  text: string;
  /** Kaynakta verilmişse olası tanılar. */
  diagnosis?: string[];
  /** Kaynağın yönlendirdiği diğer kodlar. */
  seeAlso?: string;
  /**
   * Yorumun kaynakta verildiği alt test bloğu (DECISION-029/A, CONFLICT-031).
   * Kaynak, aynı rakam çiftini farklı bloklarda FARKLI gövdeyle verir.
   */
  block?: CodeScaleKey;
  /** Kaynaktaki tam kod biçimi (ör. "049", "027(8)") — kanonik iki haneye indirgenmez. */
  rawCode?: string;
  /** Koşullu ek yorumlar (DECISION-029/A; CONFLICT-025/027). */
  conditions?: CodeCondition[];
};

/** Kaynağın kullandığı ölçek anahtarları (kod rakamları + geçerlik ölçekleri). */
export type CodeScaleKey =
  | 'Hs' | 'D' | 'Hy' | 'Pd' | 'Mf' | 'Pa' | 'Pt' | 'Sc' | 'Ma' | 'Si'
  | 'L' | 'F' | 'K';

/** Kod rakamı → alt test eşlemesi (kaynak notasyonu: 1=Hs … 9=Ma, 0=Si). */
export const CODE_DIGIT_SCALE: Record<string, CodeScaleKey> = {
  '1': 'Hs', '2': 'D', '3': 'Hy', '4': 'Pd', '5': 'Mf',
  '6': 'Pa', '7': 'Pt', '8': 'Sc', '9': 'Ma', '0': 'Si',
};

/** Koşullu yorumların değerlendirildiği bağlam. */
export type CodeConditionContext = {
  /** T puanı erişicisi; ölçek profile yoksa undefined döner. */
  t: (scale: CodeScaleKey) => number | undefined;
  gender?: 'Erkek' | 'Kadın';
  /** Profilin üçüncü yükselen alt testi (kaynak bunu sık koşul olarak kullanır). */
  third?: CodeScaleKey;
};

/**
 * Kaynağın kod yorumuna bağladığı KOŞUL. `test` verilmişse profil üzerinden
 * makinece değerlendirilir; `manual: true` olanlar (yaş gibi profil dışı veri
 * gerektirenler) her zaman uyarı olarak gösterilir.
 */
export type CodeCondition = {
  /** Kaynak sayfası/bloğu, ör. "s.68". */
  source: string;
  /** Kaynaktaki koşul cümlesinin birebir alıntısı. */
  quote: string;
  test?: (ctx: CodeConditionContext) => boolean;
  manual?: boolean;
};


const CODES: Record<string, CodeInterpretation> = {
  '12': {
    code: '12/21',
    text:
      'Bu kodun en belirgin özelliği bedensel rahatsızlık ve ağrıdır. Bireyler bedensel işlevleriyle çok fazla ilgilidir. Genel olarak hipokondriyak yakınmaları, somatizasyon bozukluğu ya da psikofizyolojik reaksiyon şeklinde kendini gösterir ve stres dönemlerinde daha da belirginleşir. Semptomlarının duygusal çatışmalarla ilgili olduğunu ve bunları kullanarak psikolojik sorunlarından kaçmaya çalıştıklarını anlamak istemezler. Yakınmaları belirsizdir ve medikal olarak ayrıştırılması zordur. Hipokondriak özelliklerinden dolayı herhangi bir tıbbi müdahale olabildiğince kısıtlı olmalıdır. 12 kodunda 1 ve 2 alt testleri arasında 5 T puanı kadar fark varsa 21’e bakılır: bu kişiler fiziksel semptom ve yakınmalarını dile getirir, bedensel işlevlerine aşırı ilgi gösterirler. Genel olarak belirgin organik bir patoloji yoktur ancak az da olsa var olan fiziksel sorunlarını abartma eğilimi gösterirler. Somatik yakınmalar arasında baş ağrısı, mide ağrısı, sırt ağrısı gibi ağrılar; kardiyak yakınmalar ya da anoreksiya, bulantı, kusma, ülser gibi gastrointestinal zorluklar odak noktasını oluşturur. Sinirlilik, huzursuzluk ve depresyonun eşlik ettiği yorgunluk, zayıflık ve baş dönmesi vardır. Hastalar yakınmalarını kullanma ve yaşam biçimi haline getirmeyi öğrendikleri için tedavi edilmeleri zordur; kısa süreli tedaviye cevap verebilirler ancak semptomları geri döner. Bedensel semptomlarının psikolojik sorunlardan kaynaklandığını reddederler; içgörüleri oldukça sınırlıdır. Duygularını ifade etmeleri güçtür ve özellikle öfke gibi olumsuz duyguların gösterileceği durumlarda kendilerini huzursuz hisseder ve öfkeyi somatizasyonla gösterirler.',
    diagnosis: ['Pasif-bağımlı kişilik bozukluğu', 'Somatizasyon bozukluğu', 'Depresyon'],
    seeAlso: '3 alt testi 1’in 5 T puanı alanı içindeyse 123/213 kodlarına da bakınız.',
  },
  '13': {
    code: '13/31',
    text:
      'Bu alt test hem normal hem de psikiyatrik hastalarda görülür. Bu hastalar genellikle immatür, benmerkezcil ve bağımlıdırlar; histerik özellikleri vardır. Dikkati kendi üzerlerinde toplamayı ve ilgi çekmeyi isterler ve bunu oldukça manipülatif bir biçimde yaparlar. Hastalar psikolojik sorunlarını somatik yakınmalar haline dönüştürürler; bu somatik yakınmalarında psikolojik etkenlerin de olabileceğini kabul etmezler, stres altında fiziksel semptomlar gösterirler. Yakınmalarında genellikle ikincil kazanç vardır (histeriden çok hipokondriyak özellikler gösterirler). Bedensel yakınmaları spesifik ve net olmamakla birlikte genellikle baş, göğüs, sırt ağrısı, uyuşma, el ve ayaklarda aşırı titreme şeklindedir; sıklıkla yorgunluk, baş dönmesi, uyuşukluk ve titreme görülür; yemek yemekten rahatsızlık ve bulantı gibi yakınmalar olabilir, bazen anoreksiya ve bulimiya görülür. 13/31 kodu ile birlikte 2 ve 7 testleri normal sınırlar içinde olsa bile birey bastırma, inkar, rasyonalizasyon ve projeksiyon mekanizmalarını aşırı bir biçimde kullanır; nadiren olumsuz kızgınlık duyguları gösterirler ve bu duygularla yüzleşmekten kaçınır ya da pasif-agresif bir biçimde davranır. Geleneksel psikoterapiye dirençlidirler; terapide kesin cevaplar ve çözümler olmazsa terapiyi başlangıç aşamasında bırakırlar. İçgörüleri yoktur; bedensel yakınmalarının psikolojik kaynaklı olduğuna ilişkin yorumlara çok dirençlidirler. Bedensel semptomlar ikincil kazanç sağlar: sorumluluk almama ve görevden kaçma. Yüksek K ile (özellikle 2, 7 ve 8’in T puanı 70’in ve F’nin 50’nin altında olduğu durumda) bireyler kendini normal, sorumluluk sahibi, yardımsever ve sempatik olarak sunmaya çalışır. Düşük 2 ile birlikte histerik kişilik özellikleri ve klasik psikosomatik semptomlar gösterirler.',
    seeAlso: '132/312, 134/314, 136/316, 137, 138/318, 139 kodlarına da bakınız.',
  },
  '14': {
    code: '14/41',
    text:
      'Erkeklerde kadınlardan daha sıktır. Benmerkezci, karamsar ve sızlanan kişilerdir. Hastaların hipokondriyak yakınmaları özgün olmayan baş ağrıları biçimindedir. Sosyal açıdan dışadönük olarak görülmelerine karşın karşı cinsle ilişkilerinde oldukça rahatsızlık yaşarlar. Aileye yönelik isyan duyguları olsa bile bunu ifade edemezler. Genel olarak aşırı alkol alımı tabloda görülür; karşı cinsle ilişki sorunları tanımlarlar; okul ve iş başarıları düşüktür. Kısa süreli semptomatik tedaviye iyi yanıt vermekle birlikte uzun süre tedavide kalamazlar. Alt test 3 de birlikte yükselmişse aile ve evlilik sorunları, kızgınlık ve sosyal yetersizlik duyguları ile birlikte bağımlılık-bağımsızlık çatışmaları ön plana çıkmıştır. Sorunlarının psikolojik kökenli olabileceğini inkar ettikleri için tedaviye dirençlidirler. Yüksek 1/Düşük 4 örüntüsü karşılaşılan sorunlarla başa çıkamama ve ev yaşantısındaki güçlüklerle bağlantılıdır; öfkelerini kolaylıkla dile getirmelerine karşın psikofizyolojik tepkiler verirler; sürekli yakınma ve karamsarlık genel özellikleridir.',
    diagnosis: ['Alkolizm', 'Daha seyrek olarak kadınlarda maskeli depresyon'],
  },
  '15': {
    code: '15/51',
    text:
      'Yetişkin erkekler yakınan, telaşlı ve eleştiren ve temel olarak pasif bir yaşam biçimine sahiptir; somatik alanda sorunlar getirirler. Genel olarak açık eyleme vuruk davranış yoktur; nadiren açık çatışma ve kararsızlık gösterirler. Bu kodda kadın hasta daha az görülmektedir; orta ve üst sosyo-ekonomik düzeyden gelen ve eğitimli kadınlarda karamsarlık yakınmaları oldukça fazladır. Bağımlı gibi görünseler de kişiler arası ilişkilerinde yarışmacı ve saldırgan olma eğilimleri vardır; bunları kontrol edebilmek için somatizasyon yakınmaları getirirler. Ergenlerde çatışmalarını ya da sorunlarını ifade etme güçlükleri vardır; sıklıkla kendilerinde bedensel hastalık olduğunu kabul ederler ve diğerleri ile bunu kullanarak ilişki kurarlar.',
    seeAlso: '15/51 kodunu yorumlarken 5 alt testini bırakarak yükselen üçüncü alt teste bakmak gereklidir.',
  },
  '16': {
    code: '16/61',
    text:
      'Bu bireyler katı, inatçı, eleştiriye açık, duyarlı ve diğerlerini suçlama eğiliminde olan kişilerdir. Her şeyi baştan savma eğilimindedirler, savunucudurlar ve duygusal ilişkiden endişe duyarlar. Genel olarak öfkelerini rasyonalizasyonu ve yansıtmayı kullanarak gösterirler. Kontrollerinin çok fazla olmasına karşın bu gruptaki kişilerde (özellikle ergenlerde) şiddetli öfke patlamaları görülmektedir. Alt test 8 de yükselmişse alışılmamış somatik uğraşların varlığı dikkate alınmalı, belki de somatik delüzyonların olabileceği düşünülmelidir; bazı bireyler bedensel uğraşlarıyla “psikotik bir dönemden” kurtulmaya gayret ederler.',
    diagnosis: ['Alt test 4’ün T değeri 70’ten azsa: Paranoid Şizofreni'],
  },
  '17': {
    code: '17/71',
    text:
      'Bu hastaların bedensel yakınmaları onların yaşadığı gerilim ve kaygıyı yansıtmaktadır. Yüksek enerji düzeyi ve ajitasyonla birlikte çoklu somatik semptomlar görülebilir. Bireyde gerilimin yarattığı somatik yakınmaların yanı sıra anksiyete belirgindir. Genel olarak bedensel işlevlerdeki bozuklukları ile obsesif bir biçimde uğraşırlar. Bu kod erkeklerde kadınlardan daha fazladır.',
  },
  '18': {
    code: '18/81',
    text:
      'Hastalarda düşmanlık ve saldırganlık duyguları vardır ancak bu duygularını uygun bir biçimde ifade edemezler. Beden işlevleri ve bedensel hastalıklara ilişkin delüzyonel düşüncelerini açıkça gösterirler. Genellikle bizar tabiatlı somatik yakınmaları vardır; somatik hezeyanları olabilir. Ayrıca somatik yakınmaları gerçek psikotik yaşantının ortaya çıkmasına karşı savunmaları yansıtıyor olabilir. Bu kişilerde karşı cinsin üyelerine ilişkin hostilite vardır; diğerlerine karşı güvensizlik, kendini onlardan kopmuş gibi hissetme uzaklaşma ve izolasyon ortaya çıkarabilir. Özellikle stres altında kişilerde şaşkınlık ve düşüncede konfüzyon olabilir; somatik uğraşları gerçek ile bağlantılarını koparabilir. Öfke ve hostilite duyguları belirgindir ancak bunu açıkça ifade edemezler. Tedavi sürecinde basit müdahaleler bu hastalara yetmez; içgörü sağlamaya yönelik yaklaşımlarla da yarar sağlanamaz. Bu kod tipini veren ergenlerin okul başarısı düşüktür, unutkanlık oldukça fazladır; baş ağrısı ve mide ağrısı gibi somatik yakınmaları vardır; arkadaşları azdır; hem okulda hem sosyal yaşamda uyumları bozuktur; madde bağımlılığı ya da intihar girişimleri olabilir. Bu örüntüyü gösteren ergenlerin 2/3’ü boşanmış ailelerden gelmektedir.',
    diagnosis: ['Eğer F alt testi de yükselmişse şizofreni', 'Pre-psikotik bozukluk tanısı da düşünülmelidir'],
  },
  '19': {
    code: '19/91',
    text:
      'Hastalar gergin ve kaygılı olarak tanımlanır; çok yoğun duygusal karmaşa yaşarlar. Sindirim sorunları, baş ağrıları ve bitkinlik gibi bedensel yakınmalar yaygındır ve bu kişiler semptomlarına yönelik psikolojik açıklamayı kabul etmezler. Kendilerinden beklentileri çok yüksektir ancak açık ve belirgin amaçları yoktur; engellenme duyguları kendileri için belirledikleri bu yüksek amaçları yerine getirememekten kaynaklanmaktadır. Pasif-bağımlı bireylerdir, yetersizliklerini kompanse etmek isterler. Bu kod tipi aynı zamanda beyin hasarı olan bireylerde görülmektedir; kendi sınırlılıkları ve yıkımları ile başa çıkmada güçlükleri vardır. Eğer bu profilde 2 ve 3 alt testlerinin değerleri 5 T puanından aşağıda ise 129 ve 139 koduna bakınız.',
    diagnosis: ['Organik beyin bozukluğuna bağlı güçlükler', 'Pasif-bağımlı kişilik bozukluğu'],
  },
  '01': {
    code: '10/01',
    text:
      'Bu kod oldukça nadirdir; sosyal açıdan rahatsız, içe çekilmiş, soğuk, pasif kişilerde ortaya çıkar. Genel olarak bunlara bedensel yakınmalar eşlik eder. Üçüncü yükselen alt test 8 olduğu zaman genellikle çok sayıda somatik yakınmalarla birlikte şizoid çekilme ve sosyal yetersizliğin olduğu söylenebilir. Sıklıkla 2 ve 3 yükselen testlerdir ve eğer T değeri 70’in üstünde ise destek sistemleri zayıflamıştır ve maskeli depresyon vardır.',
  },
  '23': {
    code: '23',
    text:
      'Bireyler kendilerini sıklıkla (özellikle düşük 9) zayıf, yorgun ya da tükenmiş hissederler ve bunların depresyonu genellikle uzun sürelidir. Mutsuzluğu tolere ederler ve görevlere başlayamadıkları, başladıklarında tamamlayamadıkları için düşük bir etkinlik düzeyinde fonksiyon gösterirler. Kod, histeroid savunmaların yetersiz kullanılışı sonucu ortaya çıkar; hastalar azalmış aktivite düzeyi, apati ve çaresizlik içeren depresyon gösterirler. Hastalar kişilik özellikleri olarak immatür, yetersiz ve bağımlı olarak tanımlanırlar; kronik sorunlarına alışmışlardır ve yıllar boyunca bu azalmış etkinlik düzeyinde işlevlerini sürdürürler. Bedensel yakınmalar sıklıkla histerik niteliktedir ve değişkendir. Bu hastalar psikoterapiye dirençlidir çünkü kronik sorunlarına nasıl uyum yapacaklarını öğrenmişlerdir; değişime ilişkin motivasyonları düşüktür. 23 kodlu erkekler görünüşte çok fazla başarı yönelimlidir ancak sıklıkla işlerinde fark edilmediklerinden yakınırlar. 23 kodlu kadınlar (özellikle düşük Mf ya da düşük Ma) zayıflık, apati ve belirgin depresyon gösterirler; evde ve işte mutsuzluk ve genel bir etkin olamama hali kronikleşmiştir, ayrıca evlilik ve aile uyumsuzluğu öyküsü vardır. Bu kod 25 yaşın üzerindekilerde daha sık ise de ergenlerde de görülür ve kötü arkadaş ilişkileri ile bağlantılıdır.',
    diagnosis: ['Depresif nevroz'],
    seeAlso: 'Eğer uygunsa 213/231 kodlarına bakınız; alt test 3, alt test 2’nin 5 T puanı alanı içinde ise 32 kodlarına bakınız.',
  },
  '24': {
    code: '24/42',
    text:
      'Bu tür profil veren hasta immatür, bağımlı ve benmerkezcidir. Dürtülerini kontrol etmekte zorluk çekmektedir ancak şu anda depresyon, pişmanlık ve suçluluk yaşamamaktadır. Sosyal olarak kabul edilmeyen bir biçimde eyleme vurma davranışından sonra rahatsızlık yaşar. Görünen suçluluk duygusu şiddetli olsa da (hatta olayla orantılı olmayacak kadar fazla) eyleme vuruk davranışlar gelecekte döngüsel bir biçimde tekrarlanır. Aile ile ilişki sorunları ve iş kaybı öyküsü bu örüntüye eşlik eder; içki içme, madde kötüye kullanımı ya da alkolizm ve yasal sorunlar sıktır. Çoğunlukla 3, 7 ya da 8 üçüncü yükselen testtir. Bu örüntüdeki ergenler kabul edilmiş sosyal standartlara belirgin bir aldırmazlık gösterirler; özellikle otorite figürlerine karşı küskün, tartışmacı, başkaları ile yakınlık kurmaktan korkan, suçlayıcı ve sıklıkla ilaç kullanan bireylerdir; yasal ihlaller (tutuklanma, mahkumiyet, göz hapsine olma) geneldir, bunun yanında evden ya da tedavi merkezlerinden kaçma da görülür. Birey davranışlarını değiştirmek için kesin bir biçimde niyetli olabilir ancak bu örüntü süreğendir ve uzun sürede prognoz iyi değildir; hızlı, geçici ilerleme gösterebilir ancak yüzeysel değişikliklerden daha öteye gidecek tedavide kalamaz. Tedavide katı sınırlamalar, stratejik terapi yordamaları, sık görüşme ve çevresel düzenlemelerin bir arada kullanımı çok yardımcı olabilir.',
    diagnosis: [
      'Psikopatik kişilik bozukluğu tanısı konulan bireylerde duruma bağlı depresyon',
      'Dürtü kontrol bozukluğu',
      'Stres karşısında alkol ya da madde kullanımı',
    ],
    seeAlso: '243/432, 247/427/472/742 ve 248 kodlarına da bakınız.',
  },
  '25': {
    code: '25/52',
    text:
      'Bu koddaki erkekler içe dönük, pasif, kararsız, depresif ancak idealist bireylerdir. Kaygılı ve geri çekilmişlerdir, somatik yakınma öyküsü verirler ve açık bir biçimde düşünememekten yakınabilirler. Nadiren flört ederler ve genellikle heteroseksüel uyumları göreceli olarak kötüdür. Sıklıkla bu kodda erkeklerde 7, 3, 4 ya da 0 alt testleri de birlikte yükselir. 25/52 koddaki kadınlar depresiftirler ve kendilerine yönelmişlerdir ancak başkalarına dayanmak yerine kendi kendilerine yetmeye çalışırlar. Bu kodda ergenler genellikle kardeşleri ya da arkadaşları ile ilişkilerinin kötü olması, utangaçlık, aşırı negativizm ya da aşırı duyarlık nedenleri ile başvururlar. Kişilerarası ilişkilerde utangaç, pasif ve çekingen olan bu ergenler sıklıkla mükemmeliyetçilik ve titizlikle birlikte aşırı entellektüalizasyon gösterirler; genellikle kaygı, suçluluk, aşırı duyarlık, kendini suçlama, depresyon ve sosyal beceriksizlik vardır.',
  },
  '26': {
    code: '26/62',
    text:
      'Alıngan, depresif ve eleştiriye aşırı duyarlı kişilerdir. Bu bireylerde altta yatan güçlü bir kızgınlık duygusu ve sıklıkla süreğen kişiler arası ilişki güçlükleri vardır. Genellikle paranoid eğilim gösterirler; nötr durumları kötü niyetli olarak değerlendirir ve yetersiz veriye dayanarak sonuç çıkarırlar. Küskünlük, ajitasyon, yorgunluk ve saldırganlık genellikle belirgindir. Sıklıkla bu bireyler başkaları onları reddetmeden önce onları reddetme düşüncesi ile ya da bağımlı olmaktan kaçınma aracı olarak kavgaya hazırdırlar. Pa alt testi belirgin bir biçimde yükseldiğinde ve/veya 4 ve 8 alt testi 70 T puanının üzerinde ise bireyin psikozun erken dönemlerinde olma olasılığı artar. Bu tür hastalar kızgın depresif kişilerdir; çok şiddetli kızgınlıklarını çevrelerine ve kendilerine karşı yöneltebilirler. Kızgınlıklarını ifade edemeyen diğer deprese hastalara göre bu hastalar açıkça hostil ve küskün olabilirler.',
    diagnosis: ['Psikozun erken dönemi'],
  },
  '27': {
    code: '27/72',
    text:
      'Bu hastalar pasiftir; kişiler arası ilişkilerinde bağımlı olduklarında kendilerini çok rahat hissederler. Korunduklarında ve başkalarının bakımı altına alındıklarında bu duruma çok kolay uyum sağlarlar. Bireyler çoğunlukla kendileri için çok yüksek standartlar belirleyerek stres yaşarlar. Stresleri arttığında başkalarından yardım isterler; depresyon ve endişeleri içinde belirgin bir biçimde ve yapışırcasına bağımlı hale gelirler. Bu görünen çaresizlik, uysallık ve kendini değersizleştirme düşünceleri başkalarını onları kurtarma ve korumaya yöneltir. Hs alt testi de yükselmişse bu bireyler kaygıyla bağlantılı somatik yakınmaların yanı sıra kendine acıma, suçlama ve başkalarının onlara bakmasını istemelerine karşın sosyal geri çekilme gösterirler.',
    seeAlso: '273/723, 274/724, 275/725, 278/728, 270 kodlarına da bakınız.',
  },
  '28': {
    code: '28/82',
    text:
      'Bu kod tipindeki kişiler anksiyete ve ajitasyonla birlikte şiddetli depresyon yaşayan hastalardır. Depresyon ve ajitasyon ile genellikle dikkat ve konsantrasyonda azalma, unutkanlık ve konfüzyon hali ortaya çıkabilir. Sıklıkla obsesif ruminasyonlar sergilerler; düşünce bozukluğu, yorgunluk gibi somatik yakınmalar sık görülür. Kişiler arası ilişkilerden ve aktivitelerden kendilerini izole edip çekilme eğilimleri vardır. İntihar girişimleri olabilir; dikkat edilmesi gerekir. Bu nedenle prognoz itibariyle hastanın değişmesi ihtimali zayıftır. Bu özelliklerin yanı sıra “şizofrenik özellikler” de gösterebilirler: işitsel ve görsel halüsinasyonlar ve sistemli hezeyanlar olabilir; düşünce bozukluğu değerlendirilmelidir. Garip karakterde somatik semptomlar görülebilir. Deprese, izole ve çekiniktirler. Bu kronik uyum örüntüsü genellikle hastaneye yatmayla son bulur. Bu bireylerde terapötik ilişki kurmak zordur; psikoterapi prognozu kötüdür; psikofarmakoloji en azından başlangıçta yararlı olabilir.',
    diagnosis: ['En sık konulan tanı: manik depresif psikoz, melankoli ve şizoaffektif bozukluk'],
    seeAlso: '281/821, 284/824 ve 287/827 kodlarına da bakınız.',
  },
  '29': {
    code: '29/92',
    text:
      'Bu gruptaki kişiler benmerkezci ve narsisistik olma eğilimindedirler; kendi değerlerini abartırlar. Bu bireyler yüksek bir enerji düzeyine sahiptir ancak bu depresyon ve kaygı ile bağlantılıdır; yüksek enerji düzeyi ya başa çıkmayı ya da bir kontrol kaybını telafi etme girişimini temsil eder. Genellikle üç tip birey bu kodu elde eder: (1) Ajite depresyonu olan bireyler — ağlama, feryat etme, depresif ruminasyonlar belirgindir; çocuklar gibi ilgi çekmek için çok fazla duygusal olabilirler. (2) Alttaki depresyonlarıyla manik savunmalar kullanarak başa çıkmaya çalışan bireyler — büyüklük düşünceleri ve inkar depresyonu maskelemede yeterli olabilir ancak çoğunlukla bu savunmalar uzun süre etkili değildir; bireyde daha sonra çok fazla içki içme davranışı ortaya çıkar. (3) Organik beyin sendromu olan, işlevsellik ve yeteneklerindeki azalmanın farkında ama bunu inkar etmeye ve başkalarından saklamaya çalışan bireyler — daha önce kolaylıkla yaptıkları şeyleri yapmamanın eksikliğine bağlı ajitasyon göstereceklerdir.',
  },
  '02': {
    code: '20/02',
    text:
      'Bu bireylerde sinirlilik, zayıflık, yorgunluk, benlik değerinde düşme belirgin özelliklerdir. Kod sosyal olarak geri çekilmiş hafif ancak kronik depresyonu olan bireyleri gösterir. Depresyon sıklıkla bireyin kişiler arası ve sosyal becerilerinin kötü olması ile bağlantılıdır ve aşağılık ve utangaçlık duyguları ile birliktedir. Profilde hem yetişkinler hem de ergenler özellikle sosyal ilişkilerde sinirlidirler ve engellenmiş hissederler; çok az arkadaşları vardır. Çoğu (özellikle test 1 düşükse) fiziksel olarak çekici olmadığını düşünür. Uykusuzluk, suçluluk duyguları ve endişe de sıklıkla vardır.',
    diagnosis: ['Pasif-agresif kişilik'],
  },
  '34': {
    code: '34/43',
    text:
      'Her iki kod tipi de kızgın, immatür ve bencildir. Evlilik uyumsuzluğu, rastgele cinsel ve yüzeysel ilişkiler, boşanma, alkolizm temel özelliklerdir. En belirgin özellikleri kronik ve şiddetli öfkedir; düşmanlık ve saldırganlık dürtüleri vardır. Öfkelerini olduğu gibi gösterirler ve bu duygularını uygun zamanda ifade edebilecek uygun yolları geliştirememişlerdir. Çoğunlukla aşırı kontrollü olmalarına karşın kısa saldırganlık dönemleri vardır. Başkalarını cezalandırma ve sorunları için başkalarını suçlama eğilimi içindedirler. Sıklıkla kişilik bozukluğu tanısı konulmaktadır; ancak 3 ve 4’ün göreceli yükseklikleri bu tür bireylerin kızgınlıklarını ve diğer impulslarını ne ölçüde ketlediğinin (eğer 3 yüksekse) ya da öfkelerinin daha fazla ifade edildiğinin (eğer 4 yüksekse) bir göstergesidir. Koddaki kadınlar sıklıkla yaşamlarının yüzeysel yönleri üzerinde çok fazla dururlar, sabırsızdırlar ve sürekli isterler; ayrıca hafif düzeyde psikosomatik yakınmaları vardır. 34/43 kodu, okulla ve otoriteyle çatışması olan ergenlerde çok sık görülür: hırsızlık, ilaç kullanımı, okuldan kaçma ve evden kaçma sıklıkla vardır; ayrıca intihar düşünceleri ve uyku güçlükleri gözlenir. Yüksek 3/Düşük 4 örüntüsünde birey kızgınlık duygularını dolaylı olarak gösterir; 4’ün 3’ten önemli ölçüde yüksek olduğu durumlarda kızgınlık baskındır ancak uzun süre baskı altında tutulmuş ve sonra öfke patlamalarıyla ifade edilmiştir.',
    diagnosis: ['Pasif-agresif kişilik bozukluğu, agresif tip'],
  },
  '35': {
    code: '35/53',
    text:
      'Bu koddaki erkekler pasif ve hatta geri çekilme eğilimindedirler. Davranımda bulunmaktan çok beklerler; inhibe ve güvensiz görünürler ancak çok güçlü ilgi gereksinimleri vardır. Genellikle utangaç, kaygılı ve sosyal olarak rahatsızdırlar (özellikle eğer Si alt testi yükselmişse). Çoğunun ahlak anlayışı farklıdır.',
  },
  '36': {
    code: '36/63',
    text:
      'Yüzeyde bu bireyler eleştiriye aşırı duyarlı, kuşkulu, gergin ve hatta şüphecidirler. Sıklıkla baş ağrıları ya da gastrointestinal yakınmaları da vardır. Sorunlar ortaya çıktığında başkalarını ya da durumları suçlarlar. Yüzeydeki bu durumun altında aile üyelerine karşı yaygın ve uzun süredir devam eden kızgınlık duyguları vardır; kızgınlık fark edildiğinde rasyonalize edilir. Bu hastalar eleştiriye aşırı duyarlıdır; belirgin anksiyete ve gerginlikleri vardır; sıklıkla somatik yakınmaları getirirler. Gerçekte bu bireylerin çoğu ile birlikte olmak zordur çünkü kendileri üzerinde odaklanırlar ve vücut pozisyonları sanki tetikte gibidir. Bu ikili kod kadınlar arasında erkeklere oranla daha fazladır. Alt test 6, 3’ten 5 ya da daha fazla T puanı yüksek olduğunda birey güç ve prestij kazanmak ister ve kızgın bir biçimde bencildir, hatta acımasız manipülasyonlar noktasına gidebilir; tipik olarak davranışlarında katı ve savunucudurlar; bazıları belirgin paranoid özellikler gösterebilir. Alt test 3, 6’dan yüksekse bu tür bireyler kızgınlıklarının farkında değildirler ancak bu başkaları için çok açık olabilir; kendi üzerinde odaklanma ve benmerkezcilik açıkça vardır ve genellikle incitme duyguları birliktedir.',
  },
  '37': {
    code: '37/73',
    text:
      'Çok sık rastlanamayan bir koddur; gerginlik, anksiyete, uykusuzluk, kronik rahatsızlık, diğer bedensel yakınmalar ve düşük akademik başarı ile bağlantılıdır. Bu semptomların altında çözümlenmemiş bağımlılık istekleri, yetersizlik duyguları yatmaktadır; ancak bu bireyler bastırmayı kullanırlar ve bu içgörüye önemli ölçüde engel olur. Birey düşünce ve davranışlarında tuhaf ve gariptir; belirli bir şeye odaklanmada, hatırlamada ve hatta karar vermede güçlükleri vardır. Kendilerini yabancılaşmış hissetseler de abartılmış bir sevilme gereksinimi duyarlar ancak başlanmaktan korkarlar; başkalarından sevgi almaya çalıştıklarında tipik olarak bunu çocuksu bir biçimde yaparlar ve başkaları bunu tuhaf bulur. Psikolojik karmaşaları oldukça büyüktür; öyle ki bu durum otistik aşırı düşünme ya da delüzyonlar gibi majör bir düşünce bozukluğunu temsil ediyor olabilir, buna davranışsal regresyon eşlik eder. Gerçek olmama duyguları ve duygusal uygunsuzluğa bulanık görme, baş dönmesi, ateş basması ve baş ağrıları eşlik eder. Bazıları kısa, cinsellikle dolu psikotik epizodlar gösterirler ve bunu daha sonra hatırlamazlar. Psikolojik stres ya da çatışmalar sonucunda kronik fiziksel yakınmalar geliştirirler; dışarıdan görülen davranışsal gerginlik ve kaygıya rağmen psikolojik sorunlarının varlığını inkar ederler.',
  },
  '38': {
    code: '38/83',
    text:
      'Bu hastalar ruhsal karmaşa içindedirler. Düşünme ve konsantrasyon bozukluklarından yakınırlar. Psikolojik stres fiziksel streslerle ifade edilir; fiziksel yakınmalar baş ağrısı, uykusuzluk ya da yorgunluk olabilir, bizar özellikleri vardır. İmmatür, egosantrik ve bağımlılık gibi histerik özelliklerin yanı sıra hostilite, gerginlik ve endişe sergilerler. Gerçek psikotik olabilirler; bir düşünce bozukluğu ihtimali dikkatle değerlendirilmelidir. Psikotik reaksiyonlar görüldüğünde bunlar davranışsal regresyona eşlik eden infantil ve narsisistik niteliklerdir. Çağrışımlarda bozukluk görülebilir; obsesif düşüncelere, açık delüzyona, halüsinasyonlara, anlamsız ve enkoheran konuşmaya rastlanabilir. Destekleyici yöntemler telkin edilmelidir.',
    diagnosis: ['Şizofreni', 'Bazı durumlarda histerik nevroz'],
  },
  '39': {
    code: '39/93',
    text:
      'Bu bireyler genellikle girişken, dışadönük ve açık olarak kendine güvenen kişilerdir; ancak çok yüzeysel olabilirler (özellikle eğer alt test Si 40 T puanının altında ise). Genellikle sözel olarak saldırgandırlar; bağımlılık-bağımsızlık çatışmaları vardır ve özellikle baskıcı anneye karşı kızgın olarak tanımlanırlar. Klinik ortamlarda dönemsel anksiyete ve akut rahatsızlık öyküleri vardır ve sıklıkla bunlara çarpıntı, taşikardi ve gastrointestinal alanla ilgili semptomlar eşlik eder. Genelde bu semptomlar medikal yönden doğal ve olası değildir. Tipik olarak bireylerdeki bu somatik yakınmalar güvenceyle birlikte verilen semptomatik tedaviye iyi yanıt verirler.',
  },
  '03': {
    code: '30/03',
    text:
      'Nadir görülen bu kod pasif, bağımlı ve geri çekilme boyutunda sosyal yönden pasif olan bireylerle bağlantılıdır. Ancak onlar bu tür bir uyumda göreceli olarak rahat görünürler ve sosyal durumlardan kaçmayı ve rahatsız edici duygularını bastırmayı yeğlerler. Stres durumlarında dönemsel psikosomatik yakınmalar görülebilir.',
  },
  '45': {
    code: '45/54',
    text:
      'Ergenler için bu kod öfke patlamalarının olduğunu gösterir; kuralları ve otoriteyi sevmezler ve sıklıkla okuldan kaçma, okula ara verme ve sınıfta kalma öyküleri vardır (özellikle 4 alt testi 5 alt testinden daha yüksek olduğunda bu daha belirgindir). Bireyler öfkelerini kontrol etmede büyük zorluk çekerler; ilaç kullanımı, hırsızlık veya anti-sosyal davranışlar da olabilir. Ancak bu ergenler girişken (insan canlısı), dışa dönük ve genellikle akranları tarafından sevilen kişilerdir ve prognoz iyidir. Bu koddaki yetişkinler liseden daha az eğitimi olan kişilerdir ve sıklıkla olgunlaşmamış ve narsisistiktir; görünümleri ve davranışları ile sosyal kurallara meydan okumaktan zevk duyarlar. Lise ya da daha yüksek eğitimi olan yetişkin erkeklerin narsisistik biçimde uyumsuz olma olasılığı daha azdır; bunun yerine bu bireyler kurumlara karşı sosyal protestolar ya da hareketler içine girerler; sıklıkla çok idealist ve fikirlerini açık ve etkin bir biçimde iletebilecek yetenektedirler; baskın olma ve bağımsızlık bu bireyler için önemli konulardır. Alt test 3’ün sonraki en yüksek test olduğu durumda birey aşırı kontrollüdür ve bağımlılık ve hatta pasifliği daha fazla vurguluyordur. 45 ve 54 kodlu kadınlar tipik olarak pasifliği kadınsı rol ve kendilikle birleştirirler; bu kadınların bazıları için bu erkeksi bir protesto ve/veya lezbiyen bir ilişkide erkek rolünün kabul edilmesidir; diğer kadınlarda, özellikle kırsal alan kadınlarında bu profil sadece geleneksel olarak kadınsı olmayan bir yaşam biçimini gösterir.',
    diagnosis: ['Pasif-agresif kişilik bozukluğu, pasif tip — erkeklerde 5 yüksektir, kadınlarda 5 düşüktür'],
  },
  '46': {
    code: '46/64',
    text:
      'Temel özellikler kızgınlık, küskünlük, güvensizlik, somurtkanlık, sinirlilik, eleştiriye ve başkalarının isteklerine karşı aşırı duyarlılık ve suçun başkaları üzerine yansıtılmasıdır. Bu bireyler kendilerini çok çabuk reddedilmiş hissederler; yetersiz veri ve çok az öngörü ile sonuçlara varırlar. Düşünceleri tipik olarak nasıl ihmal edildikleri, başkalarının nasıl hatalı olduğu ve kendilerini nasıl koruyabilecekleri üzerinde odaklanır; zor durumlar ya da sorunları yaratmada kendi rollerinin ne olduğu üzerinde düşünmezler. Bu bireylerin öyküleri ciddi sosyal ilişki sorunları, çok az yakın ilişkiler ve sıklıkla ilaç kullanımı ya da alkolizm gösterir. Başkalarının kendiyle çok fazla ilgilenmesini isterler ancak aynı davranış kendilerinden beklendiğinde gücenip kızarlar. Bu kod yetişkin normaller arasında nadirdir ancak ergenlik dönemine özgüdür: bu koddaki ergenlerin aileleriyle ve otorite figürleriyle sürekli çatışmaları vardır; onları kinci, düşman ve yalancı olarak görürler; impulsların kendine zarar verici biçimde kontrol edilmemesi karakteristiktir. Yetişkin erkeklerde bu kod sıklıkla psikotik ya da pre-psikotik durumlar ile (468/648) ya da borderline kişiliklerle (462/642 ve 463/643) bağlantılıdır; bireylerin hepsinde kuşkuculuk, güvensizlik ve aşırı genelleme ile paranoid özellikler vardır. Alt test 4, test 6’dan yüksek olduğunda aile ve iş güçlükleri tipiktir, bunlarla birlikte kızgınlık hakim özelliktir; alt test 6, 4’ten yüksek olduğunda daha çarpıcı paranoid özellikler ön plandadır. Kadınlarda 46/64 kodu psikoz ya da prepsikozla (özellikle eğer test 8 yüksek ve K düşük ise) ilişkili olabilir ancak sıklıkla pasif-agresif kişilik biçimleri ile özellikle erkeklere kızgınlıkla bağlantılıdır.',
    diagnosis: [
      'Pasif-agresif kişilik bozukluğu',
      'Eğer 8 alt testi yükselmişse borderline ya da psikotik bozukluk tanısı konabilir',
    ],
  },
  '47': {
    code: '47/74',
    text:
      'Bu bireylerde (hem ergenler hem yetişkinler) kızgınlık açıkça göze çarpan bir özellik ise de kendi kendini eleştirme ve suçluluk da sık görülür. Bireyin davranışı döngüsel bir örüntü gösterir: bir dönem için düşünmeden ya da çok az impuls kontrolü ile narsisistik ve kendi isteklerini önplana çıkarıcı bir biçimde eyleme vuruk davranış gösterirler; bu sırada sıklıkla başkalarının isteklerini, duygularını düşüncesizce ayaklar altına alır, sosyal ve yasal sınırlamaları çiğnerler. Eyleme vurma döneminden sonra (bu sıklıkla rastgele cinsel ilişkiler, fahişelik ya da aşırı alkol kullanımını içerir) davranışlarının sonucundan dolayı çok fazla pişmanlık, utanma ve suçluluk yaşarlar. Vicdan azapları çok şiddetli olur ancak davranışlarını kontrol etme (genellikle aşırı kontrol etme eğilimi) geçicidir ve daha sonra da eyleme vuruk davranış dönemleri beklenir. Davranışlarının altında bağımlılık ve bağımsızlık arasında büyük çatışma vardır. Görünen davranışsal sosyal aldırmazlıklara karşın güvensizdirler; güçlü ilgi ve güven gereksinimleri duyarlar. Başkaları tarafından konulan kuralları ve düzenlemeleri çok fazla sinir bozucu bulurlar; tipik olarak kendi duyguları ile çok fazla ilgilenirler, başkalarının duyguları ve durumlarına karşı çok fazla duyarsızdırlar. Psikoterapi suçluluk yaşadıkları dönemde yapılırsa etkili olabilir; ancak uzun süreli prognoz iyi değildir.',
    seeAlso: '247/427/274 kodlarına da bakınız.',
  },
  '48': {
    code: '48/84',
    text:
      'Bu kod tipindeki bireyler sinirlilik, hostilite, şüphelenme ve olasılıkla referans fikirlerinin yanı sıra yoğun sıkıntı yaşamaktadırlar. Yansıtma ve eyleme vuruk davranışlar asosyal yollarla ifade edilir. Sosyal açıdan izoledirler ve duygusal bağlanmadan korktukları için yakın kişiler arası ilişkilere girmezler. Bu bireylerin davranışları yordanamaz, değişkendir ve duruma uygun değildir. Cinsel kimlik sorunları vardır; ciddi alkol kullanım öyküsü ve madde bağımlılığı olabilir. Yargılama bozuk, içgörü sınırlıdır; sıklıkla intihar girişimi görülebilir. Ergenlerde bu kod çok geneldir ve en azından orta düzeyde ve belki de çok ciddi geçici uyum sorunları yansıtır; diğerlerinde bu prepsikotik bir süreci göstermektedir. Bu ergenler kızgın ve mutsuzdurlar, garip düşünce örüntüleri gösterirler, devam eden kişiler arası ilişki güçlükleri vardır ve uyumsuz biçimlerde impulsiftirler; akademik yönden başarısızdırlar ve suç işleyebilirler. Bu koddaki yetişkinler genellikle majör bir kişilik bozukluğu ya da psikotik bir süreç gösterirler. Sosyal yargılamanın kötü olması, uyumsuzluk ve impulsivite dışa vurma olasılığını artırır. Bu koddaki bireylerin işlediği suçlar (özellikle test 6 ve 9 da yüksekse) sıklıkla anlamsızca yapılmış, zalim ve acımasızdır, kötü planlanmıştır ve sapkın cinsel davranışlar ya da cinayet işleme dönemlerini içerir. Kadınların sıklıkla istenmeyen gebelikleri ve her alanda başarısız olan erkeklerle ilişki kurma öyküleri vardır; benlik değerleri düşüktür. Yüksek F/Düşük 2 ile birlikte bu bireyler genellikle başkalarından farklı ve yabancılaşmış olmaktan dolayı rahattırlar; sıklıkla saldırgan ve cezalandırıcıdırlar ve başkalarını kontrol etmeye çalışırlar; bu kişilere “sosyopat kişilik” tanısı konabilir.',
    diagnosis: [
      'Psikiyatrik yatan hasta ise şizofreni (Paranoid tip)',
      'Borderline kişilik bozukluğu',
      'Antisosyal, paranoid, şizoid kişilik bozukluğu',
    ],
    seeAlso: '482/842, 486/846, 489/849 kodlarına da bakınız.',
  },
  '49': {
    code: '49/94',
    text:
      'Hem yetişkinler hem de ergenler için bu kod kendi isteklerini ön plana çıkarma ve sınırlar, kurallar ve düzenlemelere kızma ile bağlantılıdır. Benmerkezci, narsisistik ve bencildirler; hedeflerine ulaşmak için çok fazla enerji harcasalar da kendilerine verilen sorumlulukları kabul etmede isteksizdirler. Çoğu aktivitelerini haz alma, heyecan ve kısa vadeli hedefler üzerine yoğunlaştırırlar. Sosyal standartların ve değerlerin onlar için önemi çok azdır; değerler konusunda bocalama yaşarlar ya da kendi değerlerini kendileri oluştururlar. Birey 20 yaşın üstünde olduğunda örüntü daha kalıcıdır ve daha fazla uyumsuzluk vardır. Kısa kişilerarası bağlantılarda ve sosyal durumlarda bu bireyler sıklıkla iyi izlenim bırakırlar çünkü enerji dolu ve güvenli görünürler; ancak uzun süreli ilişki durumunda genellikle başkalarına bağlanmaları konusunda yüzeysel ve yapay, hatta sorumsuz ve güvenilmez oldukları ve böylece insanlara yabancılaştıkları ortaya çıkar. Evlilik uyumları kötü olabilir ve birçoğu evlilik dışı ilişkilere girebilir. Bu koddaki ergenlerin tahmin edileceği gibi düşük bir engellenme eşiği vardır; ebeveynleri ile sık sık çatışırlar ve okuldan kaçarlar; genellikle impulsif, umursamaz ve kışkırtıcı davranışlar (örneğin yalan söyleme, dolandırma ve hırsızlık gibi) gösterirler; ilaç ve aşırı alkol kullanımı geneldir. Eğer K testi 50 T puanının üzerinde ise ve/veya test 2, 5, 7 ya da 0, 70 T puanı üstünde üçüncü yükselen test ise hem ergenler hem de yetişkinlerde suç işleme ya da antisosyal davranış olasılığı daha azdır. Alt test Si 50 T puanının altında olduğunda 49/94 özelliklerine sahip olsa bile bireyin sosyal ilişkileri iyidir. Bu kişiler için psikoterapi prognozu genellikle çok kötüdür; çoğu tedaviyi erken bitirir ve tedavi sırasında genellikle sinirli ve düşmanca bir tutum sergilerler.',
    diagnosis: [
      'Antisosyal kişilikle birlikte bazı tip karakter bozuklukları',
      'Pasif-agresif kişilik bozukluğu, agresif tip',
    ],
    seeAlso:
      '94/49 kodu Ma bloğunda ayrıca "Eyleme vuruk davranış ile ilgilidir" notunu taşır (s.153). ' +
      '493/943, 495/945, 496/946 kodlarına bakınız.',
  },
  '04': {
    code: '40/04',
    text:
      'Koddaki bireyler hem kızgındırlar hem de kişilerarası ilişkilerde geri çekilmişlerdir. Tipik olarak kızgınlıklarını açık biçimde ifade etmezler, uygun biçimde atılgan davranmada güçlükleri vardır ve kıskançlık duygularını içlerinde tutma eğilimindedirler. Şüpheci, küskün ve utangaçtırlar; pasif olarak direnme eğilimindedirler. Yüksek puanla görülen bir depresyon durumu varsa bu çoğunlukla gerçek psikomotor retardasyon ya da vegetatif depresyon belirtileri yerine depresif düşünce ve duygulara ilişkindir; depresyon davranışlarından dolayı suçlanmaktan çok o andaki sınırlılıklar nedeniyle hoşnutsuzluktan kaynaklanır. Kendi davranışlarına olan ilgisizlikleri nedeniyle psikoterapötik yaklaşımda fazla etkili değillerdir; kişisel olgunlaşma diğer yaklaşımlardan daha etkili olabilmektedir. Alt test 4’te yüksek puan alanlara bazen kişilik bozukluğu tanısı konulabilir ancak psikotik tanısı almazlar. Alt test 4’teki yükselme suça ilişkin davranışlar ve hapse girip çıkma oranıyla pozitif korelasyon gösterir.',
  },
  '56': {
    code: '56/65',
    text:
      'Bu kod tipindeki bireyler hakkında çok az bilgi vardır. Genel olarak duygularının incinmesi konusunda aşırı duyarlıdırlar ve başkaları ile duygusal ilişkiye girmede kendilerine güvenmezler, bundan korkarlar. Eğer başkaları onlardan bir şey isterlerse sinirlenirler. Çoğunluğunun eğitim düzeyi yüksektir ve kariyer sahibi kişilerdir.',
  },
  '57': {
    code: '57/75',
    text:
      'Kararsız, endişeli, içedönük, gergin, mutsuz ve sürekli onay bekleyen erkeklerdir. Eğitim düzeyi düşük olan erkeklerde kendi yetersizlikleri ile obsesif ruminasyonlar, anksiyete ve depresif dönemler vardır. Karşı cinsle ilişkilerinde sıklıkla kendilerini yetersiz hissederler. Kadınlarda bu çok daha azdır; 5 testinde görüldüğünden çok daha az agresif ve daha çok kendilerini analiz eden kişilerdir. Entellektüel olarak yarışmacıdırlar.',
  },
  '58': {
    code: '58/85',
    text:
      'Bu koddaki erkekler içe dönüktür ve zamanlarının çoğunu düşünme ile geçirirler. Genellikle konfüzyonda, mutsuz ve diğerlerine yabancılaşmış oldukları duygusunu yaşarlar ve ev çatışmaları vardır.',
  },
  '59': {
    code: '59/95',
    text:
      'Erkeklerde 5’in yükselmesi açık eyleme vuruk davranışların azaldığını gösterir; burada entellektüalizasyon, inkarın ve rasyonalizasyonun aşırı kullanımı vardır. Aslında bu koddaki erkeklerin çoğu akademik olarak başarılıdır. Duygusal bağımlılık (anne bağımlılığı) ve benlik atılganlığının olmaması sorun alanlarıdır. Kadınlarda 5 alt testinin yükselmesi saldırganlığın açığa çıkmasını gösterir; bu saldırganlık duruma bağlı sözel veya davranışsaldır. Bu kadınlar enerjik ve yarışmacıdırlar (erkeklerle yarışırlar), kendilerine güvenirler, engellenmemiş ve maceracıdırlar; eğer onların istekleri sorgulanır ya da engellenmek istenirse sinirli ya da kendine dönük olurlar.',
  },
  '05': {
    code: '50/05',
    text:
      'Bu koddaki erkekler içe dönüktür ve genellikle kişisel ve entellektüel izolasyon yaşarlar, diğerlerine ulaşmak istemezler. Diğerleri ile ilişkilerinde temkinli, engellenmiş, içe çekilmiş ve kaygılıdırlar. Aşırı kontrollüdürler ve her şeyi aşırı idealize ederler. Sosyal açıdan beceriksizdirler; atılgan olma konusunda sorunları vardır; kendi yeterlilikleri konusunda hep sorgulama içindedirler. Karşı cinsle ilişkilerinde sorunlar ve rahatsızlıklar vardır. Bu koddaki kadınlar tipik olarak daha az kendine güvenen, spontan ve güçlüdürler ve bu testin yükselmesinden beklenenden daha atılgandırlar. Sıklıkla kadınların eğitim düzeyi daha düşüktür; alt sosyo-ekonomik düzeyden gelirler.',
  },
  '67': {
    code: '67/76',
    text:
      'Oldukça nadir görülür. Bireyler gergin, kaygılı, aşırı duyarlı ve sıklıkla çabuk küsen kişilerdir. Başkalarının kendilerine haksızlık ettiğini düşünerek ilişkilerini bozarlar. Aşağılık ve/veya suçluluk duyguları vardır ve bunu diğerlerine yansıtırlar. Eğer 6 alt testi 7’den daha yüksekse ya da ikisi aynı düzeydeyse obsesif-kompulsif bozukluktan psikotik döneme bir geçiş olabileceği dikkate alınmalıdır.',
    diagnosis: ['Dekompanse obsesif kompulsif bozukluk', 'Alt test 6, 7’den daha yüksek ya da aynı düzeyde ise obsesif kompulsif bozukluktan şizofreniye geçiş olasıdır'],
  },
  '68': {
    code: '68/86',
    text:
      'Bu kodu alan kişilerde yoğun aşağılık duyguları dikkati çeker; kendilerine güvenleri ve saygıları yoktur. Bu bireyler mutsuz, sinirli, negativist olarak tanımlanır. Hem ergenlerde hem de yetişkinlerde bu kod ciddi psikopatolojiyi gösterir ve F alt testi de yükselmiştir; birey kabul edilmeyen yaşantılar getirir. Paranoid vadide paranoid şizofreni düşünülmelidir. Düşünce sürecindeki bozukluklar aşırı genellemeler, yanlış yorumlamalar ve delüzyonlarla kendini gösterir. Duygusal uygunsuzluk, aşırı idealleştirme, şüphe, güvensizlik, konsantre olmada güçlük, gerçek ile bağlantı kopukluğu ve bozuk kişiler arası ilişkiler vardır; bunlara depresyon ya da korkular ve fobiler eşlik eder. Bu bireylerin düşünce süreçleri garip olmamakla birlikte gerçeğe çok uygun değildir. Cinselliğe ilişkin içsel çatışmalar vardır. Tipik olarak sosyal açıdan içe çekilmiş ya da izoledirler (yetişkinlerin çoğu yalnızdır) ve zamanlarının çoğunu kendi kurdukları fanteziler ile geçirirler. Davranış açısından bu bireyler yordanamazdır; 4’ün yükseldiği durumlarda bu daha da zor olmaktadır. Ergenlerde genellikle saldırganlık nöbetleri (eğer K 50 T puanının altında ise), kötü arkadaş ilişkileri vardır; zamanlarının çoğunu kavga etmekle geçirirler, derslerinde başarısızdırlar ve aile içinde ciddi cezalandırmalar ve dayak vardır. 6 ve 8’in T puanı 80’in üzerinde ve 7 daha düşükse bu profil “Paranoid vadi” ya da “Psikotik V” olarak adlandırılır ve psikiyatri hastalarında sık görülür.',
    diagnosis: ['Paranoid durum', 'Paranoid şizofreni (6 ve 8 alt testleri 75 T puanının üstünde ise)', 'Şizoid kişilik'],
    seeAlso: '468/648, 486/846, 489/849 kodlarına da bakınız.',
  },
  '69': {
    code: '69/96',
    text:
      'Hastalar gergin ve anksiyöz kişilerdir. Grandiyözite ve egosantrik sezgiler içindedirler, heyecanlı ve enerjiktirler. Belirgin olan kızgınlık ve hostilitelerini sosyal açıdan kabul edilebilir bir biçimde dışsallaştırmada güçlükleri vardır. Düşünce bozukluğunun varlığı halinde bunun manik ya da şizofrenik özellikler mi olduğu gözden geçirilmelidir. Kod daha çok kadınlarda görülmektedir: bu koddaki kadınlar gergin, daldan dala atlayan, küçük durumlara aşırı tepki veren kişilerdir; durumları kendileri için tehdit olarak alırlar; gürültücü, ilgi çekici, sinirli ve şüpheci olma eğilimi içindedirler. Aile öykülerinde aşırı koruyucu ve sevecen bir anne vardır ancak çok sert disiplin verirler; baba genellikle karışmayan bir kişidir. Kadınlar duygusal ilişkiye girmekten korkarlar, diğerleri ile aralarına mesafe koyarlar; eleştiriye aşırı duyarlıdırlar ve güvensizlikleri kroniktir.',
    diagnosis: ['Manik bozukluğun bazı tipleri', 'Akut psikotik epizod', 'Alt test F ve Sc yüksekse paranoid şizofreni'],
    seeAlso: '698/968 kodlarına da bakınız.',
  },
  '06': {
    code: '60/06',
    text:
      'Erkeklerde çok az görülür; genç kadınlarda hemen hemen hiç görülmeyebilir. Kadınlarda özellikle 30 yaşından sonra rastlanır. Bunu veren bireyler utangaç, içe çekilmiş ve kişilerarası ilişkilerde huzursuzdurlar; diğerlerinin kendilerini sevmediğini ya da kabul etmediğini düşünürler. Eleştiriye aşırı duyarlıdırlar; kendilerini aşağılanmış hissettikleri için reddedilmeyi kolaylıkla kabul ederler. Duygularında oldukça mükemmeliyetçi ve aşırı kontrollüdürler.',
  },
  '78': {
    code: '78/87',
    text:
      'Psikolojik yardım arayan kişilerde oldukça sık görülür. Bu kodu veren bireyler nevrotik ve psikotik tanısı alabilirler. Yetişkinlerde 8 alt testi 7’den yüksekse akut psikotik durum vardır; ergenlerde 78 kodu 87 kodu kadar ciddi değildir. Bu kodda olan bireyler endişeli, kaygılı, gergin ve tekrarlayıcı ruminasyonları olan kişilerdir. Düşünce ve dikkatlerini toplama konusunda sorunları vardır. Stresleri o kadar fazladır ki uykusuzluk ve intihar düşünceleri görülebilir; intihar potansiyeli dikkatli bir biçimde değerlendirilmelidir. 8 alt testi 7 alt testinden daha yüksekse intihar girişimi tuhaftır ve kendine zarar vermeyi içerir. Bireylerde halüsinasyon ve delüzyonlar, duygudurumda sığlık ve gerçekle bağlantıda güçlükler olabilir. Diğer işlevlerde yıkım vardır ancak bunlar psikotik davranışlar şeklinde değildir. Yakın kişilerarası ilişkiler kurmada güçlükleri vardır; genelde içedönük ve çekiniktirler ve bu özellikler obsesif ruminasyonlarını arttırmaktadır. Düşünce bozukluğunun var olup olmadığı araştırılmalıdır; psikofarmakolojik müdahale yoğun anksiyetelerini azaltmakta faydalı olabilir. Psikolojik müdahale güçtür çünkü psikolojik çatışmaları kroniktir ve bundan dolayı kişilerarası ilişki zorlukları vardır. Karşı cinsle ilişkilerde kendilerini yetersiz hissederler; çoğu gevşemek için aşırı alkol alabilir. 7, 8’den büyükse: birey düşünce ve davranış bozukluğu geliştirmemek için hâlâ savaş vermektedir. 7, 8’den küçükse: her iki yükselme de 75 T puanının üstünde ve 8 alt testinde belirgin bir yükselme varsa tanı şizofrenidir; intihar girişimi varsa tuhaftır, kendini kesme ve cezalandırmayı içermektedir.',
    diagnosis: ['782 kodu: Depresif Bozukluk, Obsesif Kompulsif Bozukluk', '872 kodu: Şizofrenik Reaksiyon', '784/874 kodu: Şizofrenik Reaksiyon, Şizoid Kişilik Bozukluğu'],
  },
  '79': {
    code: '79/97',
    text:
      'Bu oldukça az görülen bir koddur. Bu bireyler ajitasyon düzeyinde kaygı yaşarlar. Korkuları vardır, olaylara aşırı tepki verirler; korkularına ve yetersizliklerine bağlı olarak kendilerini gevşetmeleri ve bunlardan kurtulmaları mümkün değildir ve aşırı ruminasyonlar gösterirler. Eğer 2 alt testi de yükselmişse depresyon görülür; ancak klinik tabloda anksiyete ve gerginlik ön plandadır ve hastalar sıklıkla fiziksel semptomlar (örneğin sırt ağrısı, kas spazmları ve uykusuzluk) getirirler. Bazı bireylerde manik örüntü vardır ve bu farmakolojik müdahale gerektirir. Bu kodu alan ergenlerin yoğun ilgi gereksinimleri vardır ancak kontrolü kaybedeceklerini düşünerek böyle bir şey yapmaktan kaçınırlar; ayrıca ergenlerde bağımlılık-bağımsızlık çatışması çok fazladır.',
  },
  '07': {
    code: '70/07',
    text:
      'Bu profili veren kişiler utangaç, içedönük, sosyal becerilerden yoksun, gergin ve endişelidirler; uykusuzluktan yakınırlar. Oldukça nadir görülür. Bu koddaki erkekler sosyal yetenekler ve/veya fiziksel görünümleri konusunda endişeli ve gergindirler, kendilerini yetersiz görürler. Çoğunluğu içedönüktür; güvensizlikleri ve karar verme güçlükleri onları konfüzyonda bırakır, aşırı kontrollüdürler ve kendilerini suçlarlar. Ruminasyonları uykusuzluk ile sonlanır. Anneleri ve kardeşleri ile yoğun çatışmaları vardır; sosyal alandaki yetersizlikleri karşı cinsle olan ilişkilerini de etkilemektedir. Kadınlarda eğer 5 alt testi 40 T puanının altında ise aynı örüntü vardır.',
  },
  '89': {
    code: '89/98',
    text:
      'Bu kod tipi ergenlerde ve yetişkinlerde ciddi psikopatolojiyi gösterir. Benmerkezcidir ve başkalarından çocuksu beklentileri vardır. Aşırı derecede idealize kişilerdir; günlerini fanteziler, hayal kurmalar ve ruminasyonlarla geçirirler. Gerginlik, ajitasyon ve uykusuzluk vardır. Genellikle çok konuşma, davranışsal huzursuzluk, duygusal labilite ve fikir uçuşmaları görülebilir. Kişilerarası ilişki durumlarında (örneğin terapi görüşmelerinde) konudan konuya atlarlar; terapötik odaklanma mümkün değildir. Kişilerarası ilişkilerinde özellikle karşı cinsle ilişkilerinde huzursuzluk oldukça tipiktir. Bireyler yakın kişilerarası ilişkilerden korkarlar ve bu nedenle bu tür ilişki kurmak istemezler. Stres altında dağılma belirtileri vardır. Kod daha da yükselirse delüzyon ve halüsinasyonlar görülür, psikotik bir tablo ortaya çıkar.',
    diagnosis: ['Şizofreni', 'Madde kullanımına bağlı psikoz'],
  },
  '08': {
    code: '80/08',
    text:
      'Genellikle sosyal açıdan çekingen kişilerdir. Kişilerarası ilişkilerde hata yapmak istemedikleri için ilişki kurmaktan kaçınırlar. Fantezi kurarak zamanlarını geçirirler. Sosyal izolasyonları o kadar fazladır ki kendi ailelerinden bile uzaklaşırlar. Bunun yanı sıra endişeli, kararsız, kaygılı, depresif ve diğerleri tarafından yanlış anlaşılan kişilerdir. Kendilerini neyin rahatsız ettiği, diğerlerinden ne istedikleri konusunda konfüzyonları vardır. Atılgan değillerdir; danışmanlık görüşmelerinde genellikle konuşmazlar.',
    diagnosis: ['Şizoid Kişilik'],
  },
  '09': {
    code: '90/09',
    text:
      'Kod oldukça nadirdir, özellikle erkeklerde çok az görülür. Bu koddaki bireyler enerjik ve olasılıkla ajitedirler. Genellikle yalnız kişilerdir. Si alt testinin yükselmesi bırakılarak yorum yükselen diğer iki alt test ile yapılmaktadır; daha sonra eğer gerekliyse Si alt testi yorumlanmalıdır.',
  },
};

/* ------------------------------------------------------------------ */
/* DECISION-029 (A) — blok-yerel kod gövdeleri (CONFLICT-030/031/036) */
/* ------------------------------------------------------------------ */

/**
 * Kaynağın **belirli bir alt test bloğunda** verdiği, iki-haneli kanonik
 * anahtarla çarpışan (yaşayan) kod gövdeleri. Anahtar: `Blok:kanonikRakamlar`.
 *
 * Bunlar `CODES`'a konmaz: aynı rakam çifti başka blokta **başka** bir gövde
 * taşır (ör. `'19'` = Hs bloğunun 19/91'i, `'46'` = Pd bloğunun 46/64'ü).
 * Metinler kitap sayfasından **birebir** aktarılmıştır (bkz. docs/mmpi-audit/
 * SOURCE_FACTS.md · SOURCE-PA-00x, SOURCE-MA-00x, SOURCE-SI-00x).
 */
const BLOCK_CODES: Record<string, CodeInterpretation> = {
  // Ma (9) bloğu, s.153: "91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)"
  'Ma:19': {
    code: '91/19',
    block: 'Ma',
    rawCode: '91/19',
    text:
      'Ender görülmektedir. Hastalar hipomanik durumdadırlar, ancak gergindirler ve yerlerinde duramazlar. ' +
      'İhtiraslıdırlar. Başarısızlıkla engellenmişlerdir. Hipokondriak sorunlarıyla karşılaştıkları durumsal ' +
      'güçlükler arasındaki ilişkiyi ispatlamak kolaydır.',
    seeAlso:
      'Ayrıca 19/91 Koduna da Bakınız. 92/29, 93/39, 94/49, 95/59, 96/69, 97/79, 98/89 kodlarına bakınız; ' +
      'kaynak 94/49 için ayrıca "Eyleme vuruk davranış ile ilgilidir" notunu verir (s.153).',
  },
  // Pa (6) bloğu, s.130-131: "64/46 Kodu (Ayrıca 46/64, 462/642, 463/643 kodlarına ve 468/648 kodlarına bakınız.)"
  'Pa:46': {
    code: '64/46',
    block: 'Pa',
    rawCode: '64/46',
    text:
      'Bu koddaki bireyler immatür, narsisistik, pasif- bağımlı kişilerdir. Sosyal ilişki kurulması zordur. ' +
      'Diğerlerine öfke duyarlar ancak bunu kontrol edebilirler. Zaman zaman öfke patlamaları olur. ' +
      'Kızgınlıklarının suçunu başkalarına yüklerler. Diğer insanlara kuşku ile bakarlar ve paranoid özellikler ' +
      'yaşarlar. Uzun zamandan beri sosyal uyumsuzluk gösterirler. Sonuç olarak psikolojik yardım için uygun ' +
      'kişiler değillerdir. 64/46 kodunun yanında 8 alt testi de yükselmişse süreç daha kötü olur. Yukarıdaki ' +
      'özelliklere ek olarak bu hastalar psikolojik sorunlarını kabul etme yerine kaçma yolunu seçmektedirler. ' +
      'Mantık ve yargılamalarda da güçlükleri ortaya çıkmaktadır. Öfkeyle doludurlar ve bu da onların eleştiriye ' +
      'duyarlılık ve kıskançlıkları ile birleştiğinde tahmin edilemeyen ve mantıksız öfke patlamalarına yol açar. ' +
      'Açık olarak herşeye karşı çıkar ve düşmancıdır. Davranış değişikliği için getirdikleri çözüm ise, ' +
      'karşısındakilerin kendi belirtilerine uygun bir şekilde davranış değiştirmesidir.',
    seeAlso: 'Ayrıca 46/64, 462/642, 463/643 kodlarına ve 468/648 kodlarına bakınız.',
    conditions: [
      {
        source: 's.131',
        quote: '64/46 kodunun yanında 8 alt testi de yükselmişse süreç daha kötü olur.',
        test: ({ t }) => (t('Sc') ?? 0) >= 70,
      },
    ],
  },
  // Si (0) bloğu, s.157 — üç haneli/blok-yerel kodlar; iki-haneli modele sığmıyorlardı.
  'Si:049': {
    code: '049',
    block: 'Si',
    rawCode: '049',
    text: 'Psikiyatrik olgularda eyleme vurukluğun bastırılması',
    seeAlso: 's.157 (Si alt testinin diğer alt testlerle ilişkisi).',
    conditions: [
      {
        source: 's.157 (Si bloğu)',
        quote: 'Alt test Si\'deki yükselmeye, alt test 4 ve 9\'daki yükselmeler de eşlik ediyorsa, eyleme vurukluğun bastırıldığı düşünülmelidir.',
        test: ({ t }) => (t('Si') ?? 0) >= 70 && (t('Pd') ?? 0) >= 70 && (t('Ma') ?? 0) >= 70,
      },
    ],
  },
  'Si:027': {
    code: '027(8)',
    block: 'Si',
    rawCode: '027(8)',
    text: 'Bireyde güçlü ruminatif davranışlar görülebilir.',
    seeAlso: 's.157-158 (Si alt testinin diğer alt testlerle ilişkisi).',
    conditions: [
      {
        source: 's.157 (Si bloğu)',
        quote: 'Alt test 2 ya da 7 özellikle alt test 8\'in eşlik ettiği durumlarda, ruminatif davranışların kuvvetlendiği görülür.',
        test: ({ t }) => ((t('D') ?? 0) >= 70 || (t('Pt') ?? 0) >= 70) && (t('Sc') ?? 0) >= 70,
      },
    ],
  },

  // --- Hs (Hipokondriasis / 1) Bloğu (s.67-78) · DECISION-031/A ---
  // s.68-69: 123/213 Kodu
  'Hs:123': {
    code: '123/213',
    block: 'Hs',
    rawCode: '123/213',
    text:
      'Bu koddaki bireylerde belirgin bir somatizasyon bozukluğu ve hipokondriyak uğraşlar görülür. Bedensel ' +
      'işlevleri ile aşırı ilgilidirler ve sıklıkla birden fazla fiziksel yakınma bildirirler. Ağrı, halsizlik, ' +
      'çabuk yorulma, uyku bozuklukları, mide-bağırsak sorunları ve kardiyak yakınmalar sıktır. Yaşadıkları ' +
      'duygusal ve psikolojik sorunları bedenselleştirerek ifade ederler. Bedensel semptomların psikolojik ' +
      'kökenli olduğunu kabul etmezler ve içgörüleri oldukça sınırlıdır. Pasif-bağımlı kişilik özellikleri ' +
      'taşırlar, sorumluluk almaktan kaçınırlar ve hastalık semptomları yoluyla ikincil kazanç sağlarlar. ' +
      'Depresif duygulanım, anksiyete ve karamsarlık tabloya eşlik eder. Tedavide psikoterapiye dirençlidirler; ' +
      'somatik tedavilere yönelmek isterler ancak tıbbi tedavilerden de nadiren tam fayda görürler.',
    diagnosis: [
      'Belirgin somatizasyon bozukluğu ve hipokondriyak uğraşlar',
      'Pasif-bağımlı kişilik bozukluğu',
      'Depresif bozukluk',
    ],
    seeAlso: '213 ve 231 kodlarına da bakınız (s.69).',
    conditions: [
      {
        source: 's.69',
        quote: '213 kodunda 2 ve 1 alt testleri arasında belirgin fark varsa 213/231 kodlarına bakılır.',
        manual: true,
      },
    ],
  },
  // s.69: 1234 Kodu
  'Hs:1234': {
    code: '1234',
    block: 'Hs',
    rawCode: '1234',
    text:
      'Bu koddaki bireyler pasif-agresif kişilik örüntüsü sergilerler. Öfke ve düşmanlık duygularını doğrudan ' +
      'ifade etmekte zorlanırlar; öfkelerini dolaylı yollardan, somatik yakınmalar ve inatçı, dirençli ' +
      'tutumlarla gösterirler. Aile ve evlilik ilişkilerinde ciddi çatışmalar yaşarlar. Alkol kötüye kullanımı ' +
      've bağımlılık sorunları görülebilir. Tedaviye ve değişime dirençlidirler; başkalarını suçlama eğilimindedirler.',
    diagnosis: [
      'Pasif-agresif kişilik',
      'Somatizasyon bozukluğu',
      'Alkol bağımlılığı / kötüye kullanımı',
    ],
    seeAlso: '123/213 ve 24/42 kodlarına bakınız (s.69).',
  },
  // s.69: 1236 Kodu
  'Hs:1236': {
    code: '1236',
    block: 'Hs',
    rawCode: '1236',
    text:
      'Bu koddaki bireylerde somatizasyon ve hipokondriyak yakınmaların yanı sıra belirgin kuşkuculuk, ' +
      'alınganlık ve paranoid eğilimler görülür. Diğer insanların kendilerine haksızlık yaptığını, onları ' +
      'anlamadığını veya kasıtlı olarak zarar vermeye çalıştığını düşünürler. Bedensel semptomlarını başkalarının ' +
      'hatalı tutumlarına veya çevresel faktörlere bağlarlar. Kişilerarası ilişkilerde aşırı mesafeli, güvensiz ' +
      've savunucudurlar. Tedavi ilişkisi kurmak oldukça zordur; hekimleri ve terapistleri yetersizlikle suçlayabilirler.',
    diagnosis: [
      'Paranoid özellikli somatizasyon bozukluğu',
      'Paranoid kişilik özellikleri',
    ],
    seeAlso: '123/213 ve 16/61 kodlarına bakınız (s.69).',
  },
  // s.69: 1237 Kodu
  'Hs:1237': {
    code: '1237',
    block: 'Hs',
    rawCode: '1237',
    text:
      'Bu kod tipinde pasif-bağımlı kişilik yapısında anksiyete ve psikofizyolojik reaksiyonlar ön plandadır. ' +
      'Bireyler sürekli bir endişe, gerginlik, kuruntu ve panik hali içindedirler. Somatik yakınmalar çok ' +
      'çeşitlidir; çarpıntı, terleme, titreme, nefes darlığı ve gastrointestinal spazmlar yaygındır. ' +
      'Obsesif-kompulsif eğilimler ve ruminasyonlar tabloya eşlik edebilir. Yoğun yetersizlik duyguları ' +
      'yaşarlar ve başkalarına bağımlı olmaya ihtiyaç duyarlar; ancak bu bağımlılık ilişkilerinde de yoğun ' +
      'kaygı hissederler.',
    diagnosis: [
      'Pasif bağımlı kişilik yapısında anksiyete ve psikofizyolojik reaksiyon',
      'Yaygın anksiyete bozukluğu',
      'Panik bozukluk',
    ],
    seeAlso: '123/213 ve 17/71 kodlarına bakınız (s.69).',
  },
  // s.69: 1270 Kodu
  'Hs:1270': {
    code: '1270',
    block: 'Hs',
    rawCode: '1270',
    text:
      'Bu koddaki bireyler sosyal olarak son derece içe çekilmiş, utangaç ve yetersizlik duyguları yoğun ' +
      'olan kişilerdir. Bedensel yakınmalar ve kronik anksiyete nedeniyle sosyal ortamlardan kaçınırlar. ' +
      'Depresif duygulanım ve apati belirgindir. Kendilerine güvenleri son derece düşüktür; başkalarıyla ' +
      'ilişki kurmaktan korkarlar ve yalnızlığı tercih ederler. Ruminatif düşünceler ve bedensel meşguliyetler ' +
      'yaşamlarını kısıtlar.',
    diagnosis: [
      'Sosyal fobi / Çekingen kişilik bozukluğu',
      'Kronik distimi ve anksiyete',
    ],
    seeAlso: '127/217 ve 10/01 kodlarına bakınız (s.69).',
  },
  // s.69-70: 12378 Kodu
  'Hs:12378': {
    code: '12378',
    block: 'Hs',
    rawCode: '12378',
    text:
      'Bu profil ağır bir psikopatolojiye işaret eder. Yoğun somatik yakınmalar, derin depresyon, aşırı kaygı ' +
      've obsesyonların yanı sıra yabancılaşma, düşünce karmaşası ve psikotik sınırlarda gezinme görülür. ' +
      'Birey gerçeklikten kopma yaşantıları, bizar somatik delüzyonlar ve yoğun panik yaşayabilir. Günlük ' +
      'işlevsellik ciddi şekilde bozulmuştur. Kriz durumlarında hastaneye yatış gerekebilir.',
    diagnosis: [
      'Ağır nevrotik çözülme veya sınırda (borderline) durum',
      'Psikotik özellikli ağır depresyon',
    ],
    seeAlso: '123/213, 17/71 ve 18/81 kodlarına bakınız (s.70).',
  },
  // s.70: 128/218 Kodu
  'Hs:128': {
    code: '128/218',
    block: 'Hs',
    rawCode: '128/218',
    text:
      'Bu koddaki bireylerde hipokondriyak ve depresif belirtilere bizar somatik düşünceler ve psikotik ' +
      'eğilimler eşlik eder. Beden organlarının çürüdüğü, çalışmadığı veya biçim değiştirdiği şeklinde somatik ' +
      'delüzyonlar bulunabilir. Şiddetli anksiyete, ajitasyon ve yabancılaşma duyguları yaygındır. Sosyal geri ' +
      'çekilme belirgindir. Düşünce süreçlerinde çözülmeler ve mantık hataları gözlenebilir.',
    diagnosis: [
      'Şizoafektif bozukluk',
      'Psikotik depresyon',
      'Şizofreni (somatik tip)',
    ],
    seeAlso: '18/81 ve 28/82 kodlarına bakınız (s.70).',
  },
  // s.70: 129/219 Kodu
  'Hs:129': {
    code: '129/219',
    block: 'Hs',
    rawCode: '129/219',
    text:
      'Bu kod tipi sıklıkla beyin hasarı veya organik beyin sendromu olan bireylerde görülür. Hastalar gergin, ' +
      'huzursuz ve ajitedir; aşırı etkinlik göstermeye çalışırlar ancak bedensel kısıtlılıkları ve bilişsel ' +
      'yetersizlikleri nedeniyle çabuk engellenir ve öfkelenirler. Somatik yakınmalarla birlikte depresif ve ' +
      'manik dalgalanmalar yaşayabilirler. Kendi kısıtlılıklarını inkar etme ve abartılı çabalara girme eğilimindedirler.',
    diagnosis: [
      'Organik beyin bozukluğuna bağlı duygulanım bozukluğu',
      'Bipolar bozukluk (karışık dönem)',
    ],
    seeAlso: '19/91 ve 29/92 kodlarına bakınız (s.70).',
  },
  // s.70: 120/210 Kodu
  'Hs:120': {
    code: '120/210',
    block: 'Hs',
    rawCode: '120/210',
    text:
      'Bu koddaki bireyler kronik bedensel yakınmalar ve depresif ruh hali nedeniyle sosyal ilişkilerden ' +
      'tamamen elini eteğini çekmiş kişilerdir. İçe kapanık, sessiz, utangaç ve pasiftirler. İnsan ilişkilerinde ' +
      'rahatsızlık duyarlar ve yalnız yaşamayı tercih ederler. Somatizasyon ve hipokondriasis onların sosyal ' +
      'temaslardan kaçınma ve sorumluluktan uzak durma araçlarıdır. Tedavi motivasyonları oldukça düşüktür.',
    diagnosis: [
      'Distimik bozukluk ve şizoid/çekingen kişilik',
      'Kronik somatizasyon bozukluğu',
    ],
    seeAlso: '10/01 ve 20/02 kodlarına bakınız (s.70).',
  },
  // s.72-73: 132/312 Kodu
  'Hs:132': {
    code: '132/312',
    block: 'Hs',
    rawCode: '132/312',
    text:
      'Bu profil klasik "nevrotik triad" yükselmesidir. Hastalar belirgin histerik ve hipokondriyak özelliklerin ' +
      'yanı sıra depresif duygulanım sergilerler. Beden yakınmaları çok yaygın ve dramatiktir; baş ağrıları, ' +
      'sırt ve boyun ağrıları, göğüs ağrıları, halsizlik ve mide-bağırsak sorunları sıktır. Sorunlarını çözmede ' +
      'inkar ve bastırma mekanizmalarını yoğun biçimde kullanırlar. Duygusal çatışmalarını bedenselleştirerek ' +
      'çevrelerinden ilgi, şefkat ve destek elde ederler. Pasif-bağımlı ilişki örüntüleri kurarlar. Tedaviye ' +
      'ilişkin içgörüleri düşüktür; semptomlarının organik kökenli olduğuna inanırlar ve psikolojik açıklamaları ' +
      'kesinlikle reddederler.',
    diagnosis: [
      'Somatizasyon bozukluğu / Hipokondriyazis',
      'Konversiyon bozukluğu',
      'Distimi ve histerik kişilik',
    ],
    seeAlso: '13/31, 23/32 ve 123/213 kodlarına bakınız (s.73).',
  },
  // s.73-74: 134/314 Kodu
  'Hs:134': {
    code: '134/314',
    block: 'Hs',
    rawCode: '134/314',
    text:
      'Bu koddaki bireylerde somatizasyon ve histerik özelliklerin altında güçlü bir öfke, düşmanlık ve isyan ' +
      'duygusu yatar. Ancak bu öfkelerini doğrudan ifade etmek yerine bedensel semptomlar ve pasif-agresif ' +
      'davranışlar yoluyla çevrelerini manipüle etmek için kullanırlar. Aile ve evlilik çatışmaları çok ' +
      'yoğundur. Alkol kullanımı ve fevri davranışlar görülebilir. Başkalarını suçlama eğilimindedirler ve ' +
      'ilişkilerinde talepkar, bencil ve manipülatiftirler.',
    diagnosis: [
      'Pasif-agresif kişilik bozukluğu',
      'Histerik kişilik bozukluğu',
      'Somatoform bozukluk ve dürtü kontrol güçlükleri',
    ],
    seeAlso: '13/31 ve 14/41 kodlarına bakınız (s.74).',
  },
  // s.74: 1342 Kodu
  'Hs:1342': {
    code: '1342',
    block: 'Hs',
    rawCode: '1342',
    text:
      'Bu kod tipinde yoğun somatizasyon, histerik savunmalar ve antisosyal/dürtüsel eğilimlerle birlikte ' +
      'belirgin depresyon ve suçluluk duyguları bulunur. Bireyler çevreleriyle kronik çatışma halindedir; ' +
      'eyleme vuruk davranışlar sergiledikten sonra yoğun depresyon ve pişmanlık yaşayabilirler, ancak bu ' +
      'döngüyü kırmakta zorlanırlar. Alkol ve madde kötüye kullanımı sıktır.',
    diagnosis: [
      'Dürtü kontrol bozukluğu ve komorbid depresyon',
      'Sınırda veya pasif-agresif kişilik örüntüsü',
    ],
    seeAlso: '134/314 ve 24/42 kodlarına bakınız (s.74).',
  },
  // s.74: 136/316 Kodu
  'Hs:136': {
    code: '136/316',
    block: 'Hs',
    rawCode: '136/316',
    text:
      'Bu koddaki bireylerde somatizasyon ve histerik özelliklerin yanında belirgin paranoid eğilimler, ' +
      'alınganlık ve kuşkuculuk vardır. Öfkelerini bastırmaya çalışırlar ancak bunu başaramadıklarında çevreye ' +
      'yansıtırlar ve başkalarını kendilerine düşman olmakla suçlarlar. Hastalık semptomlarını başkalarının ' +
      'hatalı tutumlarının bir sonucu olarak görürler. Tıbbi personelle ve aile üyeleriyle sürekli tartışma ' +
      've sürtüşme yaşarlar.',
    diagnosis: [
      'Paranoid özellikli somatoform bozukluk',
      'Paranoid kişilik bozukluğu',
    ],
    seeAlso: '13/31 ve 16/61 kodlarına bakınız (s.74).',
    conditions: [
      {
        source: 's.74',
        quote:
          'Pa alt testi Hy alt testinden 10 T puanı veya daha fazla yüksek olduğunda paranoid özellikler ve ' +
          'hezeyansal düşünceler çok daha belirgindir.',
        test: ({ t }) => ((t('Pa') ?? 0) - (t('Hy') ?? 0)) >= 10,
      },
      {
        source: 's.74',
        quote:
          'Hy alt testi Pa alt testinden 10 T puanı veya daha fazla yüksek olduğunda histerik savunmalar ve ' +
          'bedenselleştirme ön plandadır.',
        test: ({ t }) => ((t('Hy') ?? 0) - (t('Pa') ?? 0)) >= 10,
      },
    ],
  },
  // s.74-75: 137 Kodu
  'Hs:137': {
    code: '137',
    block: 'Hs',
    rawCode: '137',
    text:
      'Bu koddaki bireylerde bedensel yakınmalar, histerik özellikler ve kronik anksiyete-gerginlik bir aradadır. ' +
      'Kişi sürekli bir panik, endişe ve felaket beklentisi içindedir. Kalp çarpıntısı, göğüs sıkışması, ' +
      'titreme ve bayılma hissi gibi panik benzeri semptomlar sıktır. Obsesif ruminasyonlar ve sağlık kaygıları ' +
      'yoğundur. İntihar düşünceleri veya girişimleri eşlik edebilir. Tedaviye yoğun yardım arayışıyla gelirler ' +
      'ancak kaygıları nedeniyle terapiye uyum sağlamakta güçlük çekerler.',
    diagnosis: [
      'Panik bozukluk ve agorafobi',
      'Hipokondriyazis ve yaygın anksiyete bozukluğu',
    ],
    seeAlso: '13/31 ve 17/71 kodlarına bakınız (s.75).',
    conditions: [
      {
        source: 's.75',
        quote:
          'Ma alt testi yüksek ve/veya K 50 T puanının altında olduğunda intihar riski ve aşırı ajitasyon olasılığı artar.',
        test: ({ t }) => (t('Ma') ?? 0) >= 70 || (t('K') ?? 100) < 50,
      },
    ],
  },
  // s.75: 138/318 Kodu
  'Hs:138': {
    code: '138/318',
    block: 'Hs',
    rawCode: '138/318',
    text:
      'Bu profil ciddi bir kişilik patolojisine veya psikotik bir sürece işaret eder. Yoğun somatik yakınmalar, ' +
      'histerik konversiyon semptomları ve yabancılaşma duyguları bir aradadır. Bireylerde bizar bedensel ' +
      'delüzyonlar, cinsel kimlik karmaşası, depresif çökkünlük ve ani öfke patlamaları görülebilir. Gerçeklik ' +
      'testi zayıflamıştır; stres altında psikotik dekompansasyon gelişebilir. İlişkilerinde sınırda (borderline) ' +
      'özellikler, yoğun terk edilme korkusu ve manipülatif intihar tehditleri sık gözlenir.',
    diagnosis: [
      'Borderline kişilik bozukluğu',
      'Şizofreni (psödonörotik veya somatik tip)',
      'Ağır somatoform bozukluk',
    ],
    seeAlso: '13/31 ve 18/81 kodlarına bakınız (s.75).',
  },
  // s.75: 1382 Kodu
  'Hs:1382': {
    code: '1382',
    block: 'Hs',
    rawCode: '1382',
    text:
      'Bu koddaki bireylerde hipokondriyak ve histerik savunmaların, psikotik yabancılaşmanın yanında derin ' +
      'bir depresyon ve çökkünlük eşlik eder. Birey yoğun suçluluk, umutsuzluk ve değersizlik hisseder. ' +
      'Bedensel işlevlerinin tamamen bozulduğu veya çürüdüğü yönünde delüzyonlar (nihilistik hezeyanlar) ' +
      'ortaya çıkabilir. İntihar riski oldukça yüksektir.',
    diagnosis: [
      'Psikotik depresyon',
      'Şizoafektif bozukluk',
    ],
    seeAlso: '138/318 ve 28/82 kodlarına bakınız (s.75).',
  },
  // s.75-76: 139 Kodu
  'Hs:139': {
    code: '139',
    block: 'Hs',
    rawCode: '139',
    text:
      'Bu koddaki bireylerde somatizasyon, histerik özellikler ve aşırı enerji-ajitasyon birlikte görülür. ' +
      'Hastalar gergin, huzursuz ve sabırsızdır. Bedensel semptomlarını dramatik ve abartılı bir dille ifade ' +
      'ederler. Sürekli hareket halinde olmalarına karşın başladıkları işleri bitiremezler. Çabuk sinirlenir ' +
      've öfke patlamaları gösterirler. Organik beyin hasarı olan hastalarda da bu örüntü görülebilir.',
    diagnosis: [
      'Somatoform bozukluk ve hipomanik durum',
      'Organik duygulanım bozukluğu',
    ],
    seeAlso: '13/31 ve 19/91 kodlarına bakınız (s.76).',
    conditions: [
      {
        source: 's.76',
        quote:
          'Alt test 4 yüksek ve K alt testi düşük olduğunda fevri davranışlar, öfke patlamaları ve antisosyal eyleme vurukluk riski belirgindir.',
        test: ({ t }) => (t('Pd') ?? 0) >= 70 && (t('K') ?? 100) < 50,
      },
    ],
  },
  // s.76: Yüksek 1 / Düşük 4 Kodu
  'Hs:14_low4': {
    code: 'Yüksek 1 / Düşük 4',
    block: 'Hs',
    rawCode: 'Yüksek 1 / Düşük 4',
    text:
      'Yüksek 1/Düşük 4 örüntüsü karşılaşılan sorunlarla başa çıkamama ve ev yaşantısındaki güçlüklerle ' +
      'bağlantılıdır; öfkelerini kolaylıkla dile getirmelerine karşın psikofizyolojik tepkiler verirler; ' +
      'sürekli yakınma ve karamsarlık genel özellikleridir. Bireyler aşırı pasif, uyumlu ve bağımlıdır; ' +
      'çatışmalardan kaçınmak için bedensel semptomlar geliştirirler.',
    diagnosis: [
      'Pasif-bağımlı kişilik yapısı ve somatizasyon',
    ],
    seeAlso: '14/41 koduna bakınız (s.76).',
  },
  // s.76: 146 Kodu
  'Hs:146': {
    code: '146',
    block: 'Hs',
    rawCode: '146',
    text:
      'Bu koddaki bireylerde somatik yakınmalar, dürtüsellik ve belirgin paranoid kuşkuculuk bir aradadır. ' +
      'Kişilerarası ilişkilerinde savunucu, alıngan ve kavgacıdırlar. Kurallara uymakta zorlanırlar ve ' +
      'karşılaştıkları sorunlarda çevrelerindeki kişileri suçlarlar. Bedensel rahatsızlıklarını başkalarının ' +
      'eylemlerine bağlarlar. Sosyal çevrelerinde sürekli gerginlik ve geçimsizlik yaratırlar.',
    diagnosis: [
      'Paranoid ve antisosyal özellikli kişilik bozukluğu',
      'Somatizasyon bozukluğu',
    ],
    seeAlso: '14/41 ve 16/61 kodlarına bakınız (s.76).',
  },
  // s.76: 1469 Kodu
  'Hs:1469': {
    code: '1469',
    block: 'Hs',
    rawCode: '1469',
    text:
      'Bu kod tipinde somatik meşguliyetler, antisosyal dürtüler, paranoid kuşkuculuk ve aşırı psikomotor ' +
      'ajitasyon birleşir. Bireyler son derece sabırsız, huzursuz, tahrik edici ve saldırgan olabilirler. ' +
      'Dürtü kontrolleri çok zayıftır; fevri öfke patlamaları ve yıkıcı davranışlar gösterebilirler. Yasal ' +
      'sorunlar ve madde kullanımı sıktır. Bireyin davranışlarını kontrol altında tutması güçtür.',
    diagnosis: [
      'Ağır dürtü kontrol bozukluğu ve antisosyal kişilik',
      'Hipomanik durumla birlikte paranoid reaksiyon',
    ],
    seeAlso: '146 ve 49/94 kodlarına bakınız (s.76).',
  },

  // --- D (Depresyon / 2) Bloğu (s.82-94) · DECISION-031/A ---
  // s.83-84: 213/231 Kodları
  'D:213': {
    code: '213/231',
    block: 'D',
    rawCode: '213/231',
    text:
      'Yorumu 21 koduna benzerdir; ancak depresyon, durumun daha önemli bir parçasıdır. Bağımlı, immatür ' +
      'bireylerdir, mutsuzluğu tolere etmeyi öğrenmişlerdir. Bu hastalar depresyonun yanı sıra baş ağrısı, ' +
      'göğüs ağrısı ya da bulantı ve kusma gibi hipokondriyak yakınmalar gösterirler. Ancak, bunların ' +
      'depresyonu gülümseyen bir depresyon olabilir, yani bunlar ağlarken gülümserler, ancak neden olduğunu ' +
      'bilmezler. Kızgınlığı inkar ederler, ketlenmişlerdir ve abartılmış bir sevgi gereksinimleri vardır. ' +
      'Tipik olarak yakın aile üyelerinden çok az destek gördüklerini düşünürler ve bunların önemli bir ' +
      'kısmının çok genç yaşta iken ebeveynlerinden birini kaybetme öyküsü vardır. Duygusal açıdan bağlanmada ' +
      'çatışma yaşamaktadırlar. Sempati talebinde bulunmalarına ve semptomlarından ikincil kazançlar sağlamalarına ' +
      'karşın, çok fazla bağımlı olmaktan dolayı hoşnut değillerdir. Alt test 7 de yükseldiğinde endişe, ' +
      'klinik görünümün özel bir parçasıdır.',
    diagnosis: [
      'Depresif reaksiyon ya da somatoform bozukluk',
    ],
    seeAlso: 'Ayrıca 123 koduna da bakınız (s.83).',
    conditions: [
      {
        source: 's.84',
        quote: 'Alt test 7 de yükseldiğinde endişe, klinik görünümün özel bir parçasıdır.',
        test: ({ t }) => (t('Pt') ?? 0) >= 70,
      },
    ],
  },
  // s.85: 243/432 Kodları
  'D:243': {
    code: '243/432',
    block: 'D',
    rawCode: '243/432',
    text:
      '24/42 kodundaki yorumlarda tanımlanan özelliklere ek olarak bu bireyler kızgınlığı bastırma ve inkar ' +
      'yoluyla duygusal kontrol etmeye çalışırlar. Kızgınlıklarını pasif-agresif biçimlerde ya da (eğer açıksa) ' +
      'öfke patlamaları biçiminde ifade ederler. İmmaturite, bencillik ve başkalarının onları nasıl gördüğüne ' +
      'ilişkin içgörü eksikliği vardır. Bu bireyler, eyleme vuruk davranışları olan uçlardaki bireylerle ' +
      'ilişki kurarlar ve bu nedenle de kendi antisosyal eğilimlerini başkası aracılığıyla tatmin ederler.',
    seeAlso: '24/42 koduna bakınız (s.85).',
  },
  // s.85-86: 247/427/472 ve 742 Kodları
  'D:247': {
    code: '247/427/472/742',
    block: 'D',
    rawCode: '247/427/472/742',
    text:
      'Bireyin öfkesinden kaynaklanan aile ve evlilik sorunları vardır ancak birey bunu ifade edemez ve ' +
      'sonuçta suçluluk duyguları ortaya çıkar. Gergin, endişeli ve sosyal açıdan yetersizdir, depresyonu ' +
      'vardır. Depresyonlarını ortadan kaldırma çabası içinde aşırı alkol kullanımı ya da epizodik alkol ' +
      'alımları vardır. Bu bireyler genelde başarısızdır, olası başarısızlık nedeniyle herhangi bir şeyi ' +
      'denemekten korkuyor gibidirler. Sorunlarının açıkça görülmesine karşın bunları tartışmada samimi ve ' +
      'açık değildirler. Ayrıca, çok küçük problemlere aşırı tepki gösterirler ve bunlar sanki olağanüstüymüş ' +
      'gibi davranırlar. Bu örüntüdeki erkekler, genellikle bağımlı ve immatür yapıda olmalarına karşın ' +
      '(özellikle test 5 de yüksek ise) sözel olarak saldırgandırlar. Evlilik sorunları vardır ve genellikle ' +
      'eş güçlü ve baskındır ve/veya kısa süreli evlilikler yaparlar. Bu erkekler annelerine daha yakındırlar. ' +
      'Kadınlar (özellikle Mf alt testi düşükse) kendilerini güçsüz, aşağılanmış, suçlu ve çekingen olarak ' +
      'sunarlar. Bunlar gerçekte başkalarının kendilerini korumasını ve baskı altına almasını isterler. Bu tür ' +
      'ilişkiler sıklıkla suçluluk duygularının, genellikle ifade edilmeyen öfkenin bedelinin ödenmesi gibidir. ' +
      'Bireylerin öyküsünde çok çalışkan ve başarılı bir baba vardır. Terapi prognozu sıklıkla iyi değildir, ' +
      'çünkü tedavideki kaygıya dayanma konusunda isteksizdirler. Katı, yönlendirici, amaç yönelimli terapi, ' +
      'belki de atılganlık eğitimini içeren tedavi düşünülmelidir.',
    diagnosis: [
      'Pasif-agresif kişilik bozukluğu',
      'Depresif semptomlar',
      'Anksiyete bozukluğu',
    ],
    seeAlso: 'Ayrıca 274 koduna da bakınız (s.85).',
    conditions: [
      {
        source: 's.85',
        quote:
          'Bu örüntüdeki erkekler, genellikle bağımlı ve immatür yapıda olmalarına karşın (özellikle test 5 de yüksek ise) sözel olarak saldırgandırlar.',
        test: ({ t, gender }) => gender === 'Erkek' && (t('Mf') ?? 0) >= 70,
      },
      {
        source: 's.85-86',
        quote:
          'Kadınlar (özellikle Mf alt testi düşükse) kendilerini güçsüz, aşağılanmış, suçlu ve çekingen olarak sunarlar.',
        test: ({ t, gender }) => gender === 'Kadın' && (t('Mf') ?? 100) < 50,
      },
    ],
  },
  // s.86: 248 Kodu
  'D:248': {
    code: '248',
    block: 'D',
    rawCode: '248',
    text:
      'Depresyon, küskünlük, aile ve evlilik sorunları çok olsa da, bu tür bireyler 24/42 kod tiplerinden ' +
      'daha az açık kızgınlık biçiminde eyleme vurma davranışı gösterirler. Bunun yerine, kızgınlık içeren ' +
      'fanteziler kurarlar, başkalarına karşı kendilerini güvensiz, uzak ve bağları kopmuş gibi hissederler. ' +
      'Ancak dürtüleri üzerindeki kontrolü kaybetmekten korkarlar ve doğal olmayan, rahatsız edici düşünceler ' +
      'üzerinde çok fazla dururlar. Sıklıkla başkaları tarafından huysuz ve nasıl davranacakları belli olmayan ' +
      'kişiler olarak görülürler. Çeşitli cinsel sorunlar, intihar düşünceleri ve çok sayıda intihar girişimleri vardır.',
    seeAlso: '24/42 ve 28/82 kodlarına bakınız (s.86).',
    conditions: [
      {
        source: 's.86',
        quote: '248 Kodu / Yüksek F Kodu: Temel şizofrenik konfigürasyon',
        test: ({ t }) => (t('F') ?? 0) >= 70,
      },
    ],
  },
  // s.86: 248 Kodu / Yüksek F Kodu
  'D:248_highF': {
    code: '248 / Yüksek F',
    block: 'D',
    rawCode: '248 / Yüksek F',
    text:
      'Temel şizofrenik konfigürasyon. 248 kodundaki depresif, küskün ve dürtü kontrol güçlüklerine yüksek F ' +
      'eşlik ettiğinde açık psikotik çözülme ve şizofrenik süreç ön plana çıkar.',
    diagnosis: [
      'Temel şizofrenik konfigürasyon',
      'Şizofreni',
    ],
    seeAlso: '248 ve 28/82 kodlarına bakınız (s.86).',
  },
  // s.88: 273/723 Kodları
  'D:273': {
    code: '273/723',
    block: 'D',
    rawCode: '273/723',
    text:
      'Bu hastalar pasiftir, kişiler arası ilişkilerinde bağımlı olduklarında kendilerini çok rahat hissederler. ' +
      'Korunduklarında ve başkalarının bakımı altına alındıklarında bu duruma çok kolay uyum sağlarlar. ' +
      'Bireyler, çoğunlukla kendileri için çok yüksek standartlar belirleyerek stres yaşarlar. Stresleri ' +
      'arttığında başkalarından yardım isterler, depresyon ve endişeleri içinde belirgin bir biçimde ve ' +
      'yapışırcasına bağımlı hale gelirler. Bu görünen çaresizlik, uysallık ve kendini değersizleştirme ' +
      'düşünceleri başkalarını, onları kurtarma ve korumaya yöneltir. Hs alt testi de yükselmişse, bu ' +
      'bireyler kaygıyla bağlantılı somatik yakınmaların yanı sıra, kendine acıma, suçlama ve başkalarının ' +
      'onlara bakmasını istemelerine karşın sosyal geri çekilme gösterirler.',
    seeAlso: '27/72 ve 23/32 kodlarına bakınız (s.88).',
    conditions: [
      {
        source: 's.88',
        quote:
          'Hs alt testi de yükselmişse, bu bireyler kaygıyla bağlantılı somatik yakınmaların yanı sıra, kendine acıma, suçlama ve başkalarının onlara bakmasını istemelerine karşın sosyal geri çekilme gösterirler.',
        test: ({ t }) => (t('Hs') ?? 0) >= 70,
      },
    ],
  },
  // s.88: 274/724 Kodları
  'D:274': {
    code: '274/724',
    block: 'D',
    rawCode: '274/724',
    text:
      'Yoğun yetersizlik ve suçluluk duyguları vardır. Kendilerini küçülterek, kendi zayıflık ve yetersizlikleriyle ' +
      'sürekli uğraşırlar. Diğer kişilere olan aşırı bağımlılıklarını kabul etmezler. Çoklu nevrotik belirtilerin ' +
      'gerçek bir düşünce bozukluğunu maskelemesi ihtimali dikkatle incelenmelidir. İntihar düşünceleri, niyeti ' +
      've planı sıklıkla görülür. Bu açıdan değerlendirilmelidir. Hastaların olası klinik tanısı depresif ' +
      'reaksiyon olmakla birlikte, kişilik yapıları oldukça kalıcıdır. Temel anksiyetelerini ve davranış ' +
      'biçimlerini değiştirmek çok zordur. Bu koddaki erkekler çoğunlukla annelerine bağımlıdır ve kendileri ' +
      'için de bağımlı ilişki ararlarsa da genellikle buna eşlik eden kontrolü istemez ve ilişkiyi sonlandırırlar. ' +
      'Alt test 3 yükseldiğinde kronik alkolizm olasılığı fazladır, alkol kaygıyı azaltmak ve depresyonla başa ' +
      'çıkmak amacıyla kullanılmaktadır. Bu profildeki kadınlar sıklıkla babaları tarafından ilgi ve övünme ' +
      'nesnesi olmuşlardır. Genellikle, kendilerini izole ederler, zayıf ve çekingen görünmeye çalışırlar ' +
      '(özellikle alt test 5 düşükse). Diğerleri ile ilişkilerinde güçlükler yaşasalar da evli erkeklerle ' +
      'uzun süreli ilişkileri olabilir.',
    diagnosis: [
      'Depresif reaksiyon',
    ],
    seeAlso:
      'Eğer test 4 ve 7 birbirlerinin 5 T puanı alanı içindeyse 247 ve 427 kod yorumlarına da bakınız (s.88).',
    conditions: [
      {
        source: 's.88',
        quote:
          'Alt test 3 yükseldiğinde kronik alkolizm olasılığı fazladır, alkol kaygıyı azaltmak ve depresyonla başa çıkmak amacıyla kullanılmaktadır.',
        test: ({ t }) => (t('Hy') ?? 0) >= 70,
      },
      {
        source: 's.88',
        quote:
          'Bu profildeki kadınlar sıklıkla babaları tarafından ilgi ve övünme nesnesi olmuşlardır. Genellikle, kendilerini izole ederler, zayıf ve çekingen görünmeye çalışırlar (özellikle alt test 5 düşükse).',
        test: ({ t, gender }) => gender === 'Kadın' && (t('Mf') ?? 100) < 50,
      },
    ],
  },
  // s.88-89: 275/725 Kodları
  'D:275': {
    code: '275/725',
    block: 'D',
    rawCode: '275/725',
    text:
      'Bireyde endişe, depresyon ve aşırı düzeyde aynı şeyler üzerinde durmaya ek olarak, çekingenlik görülür. ' +
      'Kronik bir başarısızlık duygusu ya da kendilik değeri konusunda ambivalansları var gibidir. Kendilerini ' +
      'yetersiz, zayıf, aşağılanmış, suçlu ve pasif olarak tanımlarlar; 4 alt testi düşük olduğunda daha ' +
      'belirgindir. Bireyler sürekli olarak başkalarının onları küçümsediği ilişkiler arayarak depresyonları ' +
      'için bedel öderler ve bu tür ilişkilerde çok rahat ederler. Karşı cinsle ilişkilerde güçlükler vardır.',
    seeAlso: '27/72 ve 25/52 kodlarına bakınız (s.88).',
    conditions: [
      {
        source: 's.89',
        quote:
          'Kendilerini yetersiz, zayıf, aşağılanmış, suçlu ve pasif olarak tanımlarlar; 4 alt testi düşük olduğunda daha belirgindir.',
        test: ({ t }) => (t('Pd') ?? 100) < 50,
      },
    ],
  },
  // s.89: 278/728 Kodları
  'D:278': {
    code: '278/728',
    block: 'D',
    rawCode: '278/728',
    text:
      'Kişisel yeterliliklerine ilişkin kuşkularla dolu olan bu bireylerde intihar düşüncesi ya da girişimi ' +
      'olasılığı yüksektir. Obsesif düşünme, korkular ve fobiler çok görülür, bunların yanı sıra kendi ' +
      'başarısızlıkları üzerinde yoğunlaşırlar. Bu insanlar çoğunlukla çok titiz ve mükemmeliyetçidir, ' +
      'kendileri ve başkaları için çok yüksek standartlar koyarlar ve bu standartlara ulaşamadıklarında çok ' +
      'fazla suçluluk yaşarlar. Aşırı biçimde kendilerini sorgulamaları ve kendi kendilerine baskı yapmaları ' +
      'sıklıkla belirli bir şeye odaklanma güçlüklerine ve performansta düşmeye yol açar ve bu da onların ' +
      'depresyon ve kaygısını arttırır. Karşı cinsle, aşk ilişkileri gibi duygusal bağlantılar kurmada özel ' +
      'zorlukları vardır. Sıklıkla bu tür ilişkilerin çok ufak ayrıntıları üzerinde odaklanır ve olması ' +
      'gerekenden daha fazla dikkat eder ve endişelenirler. Kontrol, eleştiri, kabul edilme ve kızgınlığın ' +
      'ifadesi gibi durumlar sorun alanlarıdır. Bu kodda, özellikle alt testlerden K ve Hs, 50 T puanının ' +
      'altında olduğunda ve/veya Ma alt testi yükseldiğinde intihar olasılığı dikkatle değerlendirilmelidir. ' +
      'Bu kodda Ma alt testinin yükselmesi, depresyonun ajite yönünü gösterir. Eğer Si alt testi yükselmişse ' +
      'bireyin depresyonu daha çok kroniktir ve buna utangaçlık, içe çekilme ve fiziksel yetersizlik duyguları ' +
      'eşlik eder. Alt testlerden Pd düşük olduğunda pasiflik ve çekingenlik ön plandadır, sıklıkla cinsel ' +
      'ilgilerde azalma ve cinsel yetersizlik buna eşlik eder. Kadınlarda 278/728 kodunda 5 alt testi düşmüşse ' +
      'bu kişiler, kendileri için bedel ödemeleri gerektiğini hissederler ve hatta bu şekilde başkalarının ' +
      'kızgınlığını arttırırlar. Bu kadınlar çoğunlukla mazohistik biçimde kendilerine kızarlar. Baş ağrıları, ' +
      'sırt ağrıları ve cinsel güçlükleri içeren çok çeşitli fiziksel yakınmaları vardır. Çoklu nevrotik ' +
      'semptomlar gösterirler. Major semptomlardan depresyon, sinirlilik ve obsesyonlar görülür. Kararsızlık, ' +
      'şüphe ve kaygı karakterleridir. Obsesyonlarından dolayı düşünceye iyi kanalize olamazlar. Düşünce ' +
      'bozukluğunun değerlendirilmesi önemlidir. Sosyal açıdan yetersizdirler. Aşırı obsesyonları için ' +
      'psikofarmakolojik tedavi gerekir. Psikoterapide daha çok problem çözücü ve destekleyici terapi tercih edilmelidir.',
    seeAlso: '27/72 ve 28/82 kodlarına bakınız (s.89).',
    conditions: [
      {
        source: 's.89',
        quote:
          'Bu kodda, özellikle alt testlerden K ve Hs, 50 T puanının altında olduğunda ve/veya Ma alt testi yükseldiğinde intihar olasılığı dikkatle değerlendirilmelidir.',
        test: ({ t }) => ((t('K') ?? 100) < 50 && (t('Hs') ?? 100) < 50) || (t('Ma') ?? 0) >= 70,
      },
      {
        source: 's.89',
        quote:
          'Eğer Si alt testi yükselmişse bireyin depresyonu daha çok kroniktir ve buna utangaçlık, içe çekilme ve fiziksel yetersizlik duyguları eşlik eder.',
        test: ({ t }) => (t('Si') ?? 0) >= 70,
      },
      {
        source: 's.89',
        quote:
          'Alt testlerden Pd düşük olduğunda pasiflik ve çekingenlik ön plandadır, sıklıkla cinsel ilgilerde azalma ve cinsel yetersizlik buna eşlik eder.',
        test: ({ t }) => (t('Pd') ?? 100) < 50,
      },
      {
        source: 's.89',
        quote:
          'Kadınlarda 278/728 kodunda 5 alt testi düşmüşse bu kişiler, kendileri için bedel ödemeleri gerektiğini hissederler',
        test: ({ t, gender }) => gender === 'Kadın' && (t('Mf') ?? 100) < 50,
      },
    ],
  },
  // s.90: 270 Kodu
  'D:270': {
    code: '270',
    block: 'D',
    rawCode: '270',
    text:
      'Gergin, depresif, sinirli, kendini aşağılayan, suçluluk duyguları olan kişilerdir. Devamlı aynı konu ' +
      'üzerinde düşünürler; yetersizlik, güvensizlik duyguları vardır. Aşırı kontrollü olmaya çalışırlar, ' +
      'duygularını açığa vurmada zorluk çekerler, kişiler arası ilişkilerde bağımlıdırlar, kendilerini ortaya ' +
      'koymaktan kaçınırlar. İçe dönük tutumları kronik düzeydedir. Şizoid kişilik bozukluğu tanısı konulabilir.',
    diagnosis: [
      'Şizoid kişilik bozukluğu',
    ],
    seeAlso: '27/72 ve 20/02 kodlarına bakınız (s.90).',
  },
  // s.90-91: 281/821 Kodları
  'D:281': {
    code: '281/821',
    block: 'D',
    rawCode: '281/821',
    text:
      '28/82 kodu ile bağlantılı genel özelliklere ek olarak, bu bireylerin çok çeşitli somatik yakınmaları vardır. ' +
      'Genellikle bunlar belirsiz ya da medikal yönden atipiktir ve titremeler, düşünme güçlükleri ya da hatta ' +
      'somatik delüzyonlar içerebilir. Bu örüntü psikotik bir epizoddan önce gelen kendi üzerinde yoğunlaşmayı ' +
      'temsil ediyor olabilir ve genellikle açık bir gerginlik ve entellektüel konfüzyon ile bağlantılıdır. ' +
      'Diğer bireylerde, özellikle test 3 de yükselmiş ise, bu somatik yakınmalar ve bunlarla bağlantılı ' +
      'davranışlar, terapisti kurtarma ve koruma rolüne çekme girişimini temsil edebilir.',
    seeAlso: '28/82 ve 128/218 kodlarına bakınız (s.90).',
    conditions: [
      {
        source: 's.91',
        quote:
          'Diğer bireylerde, özellikle test 3 de yükselmiş ise, bu somatik yakınmalar ve bunlarla bağlantılı davranışlar, terapisti kurtarma ve koruma rolüne çekme girişimini temsil edebilir.',
        test: ({ t }) => (t('Hy') ?? 0) >= 70,
      },
    ],
  },
  // s.91: 284/824 Kodları
  'D:284': {
    code: '284/824',
    block: 'D',
    rawCode: '284/824',
    text:
      'Yetişkinlerde bu kod sıklıkla şizoid ya da şizofrenik durumlarla bağlantılıdır ve F alt testi de ' +
      'yükselmiştir. 28/82\'nin özelliklerine ek olarak kızgınlık, isyankarlık ve düşmanlık duyguları ön plandadır. ' +
      'Kontrolünü kaybetme korkuları çoktur (özellikle Pd alt testi 80\'in üzerinde ise) ve eyleme vuruk ' +
      'davranışlar, garip ve tuhaf şekillerde olur. Sosyal alanda ve evlilikte uyumsuzluk olasıdır ' +
      '(test 4, test 2 ya da 8\'in 5 T puanı alanı içinde ise 482/842 kodlarının yorumuna bakınız). ' +
      'Ergenlerde bu kod, yetişkinlerde belirtilen devamlı bir patolojiyi temsil etmiyor olabilir. Bunun ' +
      'yerine, bu kod daha çok birçok ergende bulunan isyankarlığı ve sosyal gruptan uzaklaşmayı yansıtır. ' +
      'Dürtü kontrolünde zayıflık vardır ve bunun yanı sıra doğal olmayan davranışlar ve duygularda kısıtlılık ' +
      'görülür, ancak altta yatan patoloji daha az şiddetlidir.',
    seeAlso: '28/82 ve 482/842 kodlarına bakınız (s.91).',
    conditions: [
      {
        source: 's.91',
        quote:
          'Kontrolünü kaybetme korkuları çoktur (özellikle Pd alt testi 80\'in üzerinde ise) ve eyleme vuruk davranışlar, garip ve tuhaf şekillerde olur.',
        test: ({ t }) => (t('Pd') ?? 0) > 80,
      },
    ],
  },
  // s.91: 287/827 Kodları
  'D:287': {
    code: '287/827',
    block: 'D',
    rawCode: '287/827',
    text:
      'Bu kod tipindeki hastalar anksiyete, ajitasyon ve panik benzeri belirtiler gösterirler, kendilerini ' +
      'insanlardan uzak hissederler, eleştiriye çok fazla duyarlıdırlar ve genelde insanlara güvenmezler. ' +
      'Bunlar çoğu zaman belirli bir şeye odaklanamama, baş dönmesi epizodları, mental konfüzyon, uykusuzluk, ' +
      'görev ve sorumlulukları yerine getirme yeteneğinin azalması gibi önemli bilişsel güçlükler tanımlarlar. ' +
      'Gerçekten psikotik olan bireylerde sıklıkla hallusinasyonlar ya da açık düşünce bozuklukları vardır. ' +
      'Tipik olarak bu bireyler, genellikle bağımlılık korkularına bağlı olarak yakın kişilerarası ilişkilerden ' +
      'kaçınırlar ve duygusal bağlanmadan korkarlar. Sıklıkla cinsellik ve kendini ifade etme konularında ' +
      'çatışmaları vardır. İntihar düşünceleri, zihnin sürekli bir şeyle meşgul olması ve tehditler çok ' +
      'olasıdır ve eğer K alt testi 50 T puanının altında ise ve Ma alt testi 70 T puanının üzerinde ise bunlar ' +
      'dikkatle değerlendirilmelidir. İntihar çoğunlukla garip biçimlerde gerçekleştirilir.',
    seeAlso: '28/82 ve 278/728 kodlarına bakınız (s.91).',
    conditions: [
      {
        source: 's.91',
        quote:
          'İntihar düşünceleri, zihnin sürekli bir şeyle meşgul olması ve tehditler çok olasıdır ve eğer K alt testi 50 T puanının altında ise ve Ma alt testi 70 T puanının üzerinde ise bunlar dikkatle değerlendirilmelidir.',
        test: ({ t }) => (t('K') ?? 100) < 50 && (t('Ma') ?? 0) >= 70,
      },
    ],
  },
  // s.92: 207 Kodu
  'D:207': {
    code: '207',
    block: 'D',
    rawCode: '207',
    text:
      'Bu kod tipindeki bireyler gergin, kaygılı, ürkek kişilerdir. Kendilik değerinde düşme vardır. ' +
      'Şizoid içe çekilme gösterirler. Sosyal ortamlarda yetersizlik duygusu ve gerçek sosyal beceri eksikliği ' +
      'ile içe dönük tutum sergilerler. İnsanlarla etkileşimlerinde güvensizdirler, karşı cinsle ilişkilerinde ' +
      'mutsuzdurlar. Depresyonları ile yaşamayı öğrenmişlerdir. Bu bireylerin saldırganlık ve öfke patlamaları ' +
      'göstermesi beklenmez.',
    seeAlso: '20/02 ve 270 kodlarına bakınız (s.92).',
  },

  /* ------------------------------------------------------------------ */
  /* Hy (Histeri / 3) alt testi kod bloğu (kitap s.95-103)              */
  /* ------------------------------------------------------------------ */

  'Hy:3_highK': {
    code: 'Yüksek 3 / Yüksek K',
    block: 'Hy',
    text:
      'Alt testler 3 ve K ikisi birden yüksek olduğunda ve F ve Sc alt testleri düşük olduğunda, sevilme, kabul edilme ve kendisini yaşamı üzerinde kontrol sağlıyor gibi gösterme gereksinimi çok abartılıdır. Karakter olarak, bu bireyler çok katı bir optimizm gösterirler ve bazı şeyler görünür biçimde felaket ya da başarısızlıkla çevrelenmişken bile bu iyimserliği ısrarla sürdürürler. Bu insanların diğerleri ile iyi ilişkileri ve uyumları vardır ve kızgınlık, bozulma ya da zedeleyici duyguların olduğu ya da bağımsız karar vermeleri ya da güç kullanmaları gereken durumlardan kaçınırlar (ya da çok rahatsız olurlar).',
    seeAlso: '13/31 ve 32 kodlarına bakınız (s.96).',
    conditions: [
      {
        source: 's.96',
        quote:
          'Alt testler 3 ve K ikisi birden yüksek olduğunda ve F ve Sc alt testleri düşük olduğunda, sevilme, kabul edilme ve kendisini yaşamı üzerinde kontrol sağlıyor gibi gösterme gereksinimi çok abartılıdır.',
        test: ({ t }) => {
          const hy = t('Hy');
          const k = t('K');
          const f = t('F');
          const sc = t('Sc');
          return hy !== undefined && k !== undefined && f !== undefined && sc !== undefined &&
            hy >= 70 && k >= 70 && f < 50 && sc < 50;
        },
      },
    ],
  },

  'Hy:32': {
    code: '32',
    block: 'Hy',
    text:
      '23 kod tiplerinin aksine, bu bireyler sağlıkları ve bir ölçüde de belirgin olmayan depresyonları ile fazlaca ilgilenirler. Yorgunluk, gastrik yakınmalar, baş ağrıları ve baş dönmesi geneldir, ancak çeşitli fiziksel yakınmalar da olabilir. Genellikle bu semptomlar hafiftir ve anksiyete ve depresyon duygularını kontrol etme çabaları ile açık olarak ilişkilidir. Erkekler, anksiyeteyle ilgili olarak genellikle gergin ve meraklıdırlar, iş sorunları ile kendilerini üzerler, gerginliğin sonucu semptomlar ortaya çıkarlar. Bedensel sorunlarının psikolojik yorumlarını reddederler ve içgörüleri yoktur, yardım alma olasılıkları düşüktür. Erkekler için test 1, 8 ve 9 sıklıkla üçüncü en yüksek testtir. 32 kodlu kadınların sıklıkla sorunlu evlilik öyküsü (boşanmalar nadiren olsa da) vardır, kocaları ile cinsel ilişkiyi istemezler ve cinsellikten hoşlanmadıklarını belirtirler. Tipik olarak, depresiftirler, eşlerinin sadakatsizliğinden ve alkol almasından yakınırlar. Eleştiriye ya da reddedilmeye karşı aşırı duyarlıdırlar ve bu kadınların çoğu kronik mutsuzluğa dayanabilirler. Genelde, kendilerini yetersiz hissederler ve önemli ölçüde kendi kendilerine ilişkin kuşkuları vardır. Yorgunluk ve tükenmişlikten yakınabilirler (özellikle eğer test 5 düşük ise), ancak işlerinde çalışkan olma eğilimi gösterirler. Çarpıntı, terleme, uykusuzluk ve belirsiz korku gibi fiziksel semptomlar sıklıkla bildirilir. Bazen bu profil menapoz güçlükleri ile bağlantılıdır. Kadınlar için çoğunlukla 1, 4 ve 8, üçüncü en yüksek testtir. Bu kod tipindeki kadınlar, daha çok evliliklerinde güçlükler yaşarlar. Boşanma azdır ve çoğunluğunda frijidite vardır.',
    seeAlso: '2 alt testi 3 alt testinin 5 T puanı sınırları içinde ise 23 koduna da bakınız (s.96).',
    conditions: [
      {
        source: 's.96',
        quote: 'Eğer 2 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise 23 koduna da bakınız.',
        test: ({ t }) => {
          const d = t('D');
          const hy = t('Hy');
          return d !== undefined && hy !== undefined && Math.abs(d - hy) <= 5;
        },
      },
      {
        source: 's.96',
        quote: 'Erkekler için test 1, 8 ve 9 sıklıkla üçüncü en yüksek testtir.',
        test: ({ gender, third }) => gender === 'Erkek' && (third === 'Hs' || third === 'Sc' || third === 'Ma'),
      },
      {
        source: 's.97',
        quote: 'Yorgunluk ve tükenmişlikten yakınabilirler (özellikle eğer test 5 düşük ise), ancak işlerinde çalışkan olma eğilimi gösterirler.',
        test: ({ gender, t }) => {
          const mf = t('Mf');
          return gender === 'Kadın' && mf !== undefined && mf < 50;
        },
      },
      {
        source: 's.97',
        quote: 'Kadınlar için çoğunlukla 1, 4 ve 8, üçüncü en yüksek testtir.',
        test: ({ gender, third }) => gender === 'Kadın' && (third === 'Hs' || third === 'Pd' || third === 'Sc'),
      },
    ],
  },

  'Hy:321': {
    code: '321',
    block: 'Hy',
    text:
      '32 kodlu bireylerin özelliklerine ek olarak, bu bireyler kabızlık, ishal, anoreksiya, uykusuzluk, kas gerginliği, genital bölgede ağrı, çarpıntılar ve tükenmişlik gibi çok çeşitli hipokondriyak yakınmalar gösterirler. Bu profildeki kadınlar sıklıkla tekrarlayan jinekolojik yakınmalar getirir ve/veya histerektomi olurlar. Erkekler sıklıkla gastrik rahatsızlık ya da ülser gösterirler. Her iki cinste, evlilik sorunları ve cinsellikle ilgili duygusal çatışmalar olabilir. Bunlar depresyon ve endişeyle ilgilidir. Depresyon ve endişe, aşağılık hatta umutsuzluk duyguları ile bağlantılıdır. Bireylerin kendileri ya da başkaları hakkında fikirleri yoktur ve bunun bir sonucu olarak sıklıkla kendilerini rahatsız edici kişiler arası ilişkilerin içinde bulurlar. Engelleyici durumlar karşısında kendini cezalandırıcı biçimde depresif olmaya da kendilerine zarar verecek biçimlerde tepki gösterme eğilimindedirler. Örneğin, sıklıkla başkalarının eleştiri ya da reddetmesini tolere edemezler. Karışık semptomatoloji ile eşleşen kronik nevrotik bir durumu ortaya koyan bu hastalarda depresyon, çökkünlük, gerilim, kaygı ile birlikte özellikle baş ağrısı ve uykusuzluğun eşlik ettiği çoklu somatik yakınmaları vardır. Özellikle histerik davranışları ile ikincil kazançları gözlenebilir. Tedavi motivasyonları düşüktür. Yetersizlik duyguları, genellikle kronik nevrotik bir durum sergiler.',
    seeAlso: '32 ve 123/213 kodlarına bakınız (s.97).',
  },

  'Hy:34_low4': {
    code: 'Yüksek 3 / Düşük 4',
    block: 'Hy',
    text:
      'Alt test 3\'ün önemli ölçüde yüksek olduğu durumda, birey kızgınlık duygularını dolaylı olarak gösterir ya da dışavuran davranışları olan bireylerle birlikte kızgınlık ve isyan duygularını ifade eder. Sıklıkla bu bireyler, bağımlılık bağımsızlık çatışması yaşarlar. Kızgın bir biçimde çok fazla istenmek ve yeterli derecede istenmemek arasında gider gelirler. Bağımlı olmak istemelerine karşın, bunda kendi rollerinin ne olduğu konusunda içgörüleri yoktur. Bastırma, inkar ve kızgınlığın aşırı kontrol edilmesinden dolayı, öfke patlamaları olduğunda tipik olarak aşırı öfkelidirler, ancak hemen bunu iyi bir biçimde rasyonalize ederler. 34 kodlarında, 4\'ün 3\'ten önemli ölçüde yüksek olduğu durumlarda, kızgınlık baskındır, ancak uzun süre baskı altında tutulmuştur ve sonra öfke patlamaları ile ifade edilir, hatta bazen ciddi saldırı ya da cinayetlerle sonlanır. Bunların patlamaları çok şaşırtıcı olur, çünkü öfkeyi başlatan sıklıkla çok küçük bir olaydır. Bazen bu bireylerde şiddet patlamaları döngüsel bir örüntüde olur. Kadınlarla yapılan bir araştırmada arkadaşları bu kadınların sabırsız olduklarını belirtirken kadınlar kendilerini konuşkan, enerji dolu, tam anlaşılmayan kişiler olarak tanımlamaktadır. 3\'te bastırma, 4\'te saldırganlık fazladır, 3 yüksek, 4 oldukça yüksek ise pasif-agresif kişiliktir. Sinsi tipler ufak bir hadise çıkarıp önemli birşeyi engellerler.',
    diagnosis: ['Pasif-agresif kişilik bozukluğu'],
    seeAlso: '34/43 koduna bakınız (s.98-99).',
  },

  'Hy:345': {
    code: '345/435/534',
    block: 'Hy',
    text:
      'Bu profildeki erkekler, diğerleriyle olan ilişkilerinde belirgin bir biçimde immatür ve genellikle cinsel yönden yetersizdirler. Sıklıkla sıradan cinsel ilişkiden farklı bir ilişki ararlar, teşhircilik görülebilir, homoseksüel olma korkuları vardır. Alt test 3, 4\'ten yüksekse ve K alt testi 50 T puanının üstündeyse, duyguların ve isteklerin eyleme dökülme olasılığı düşüktür.',
    seeAlso: '34/43 ve 35/53 kodlarına bakınız (s.99).',
    conditions: [
      {
        source: 's.99',
        quote:
          'Alt test 3, 4\'ten yüksekse ve K alt testi 50 T puanının üstündeyse, duyguların ve isteklerin eyleme dökülme olasılığı düşüktür.',
        test: ({ t }) => {
          const hy = t('Hy');
          const pd = t('Pd');
          const k = t('K');
          return hy !== undefined && pd !== undefined && k !== undefined && hy > pd && k > 50;
        },
      },
    ],
  },

  'Hy:346': {
    code: '346/436',
    block: 'Hy',
    text:
      'Sıklıkla bu bireyler uyumlu gibi görünseler de, dönemsel aşırı eyleme vuruk davranış öyküleri olabilir ve bunu uzun süre devam eden sıradan davranışlar izler. Sıklıkla bu bireyler eleştiriye aşırı duyarlıdırlar ve kızgınlık duygularının bir sonucu olarak gergin ve kaygılıdırlar. Genellikle bunların kızgınlığı aile üyelerine yöneliktir, ancak zihinlerinde bu durumu iyi bir biçimde rasyonalize eder ve kendilerini haklı çıkarırlar. Çoğu, eyleme vuruk davranışları olan bireylerle uzun-süreli (ancak sıklıkla çalkantılı) ilişkiler kurarlar, böylece kendi kızgınlık ve isyankar impulslarına başkaları aracılığıyla doyum sağlarlar. Onların düşünceleri genellikle diğerlerini suçlamaya yöneliktir ve bu bireyler nadiren değişme gereksinimi duyarlar ve psikolojik tedaviyi reddederler.',
    seeAlso: '6 alt testi 3 alt testinin 5 T puanı sınırları içinde ise 36/63 kodlarına da bakınız (s.99).',
    conditions: [
      {
        source: 's.99',
        quote: 'Eğer 6 alt testi, 3 alt testinin 5 T puanı sınırları içinde ise, 36/63 kodlarına da bakınız.',
        test: ({ t }) => {
          const pa = t('Pa');
          const hy = t('Hy');
          return pa !== undefined && hy !== undefined && Math.abs(pa - hy) <= 5;
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Pd (Psikopatik Sapma / 4) alt testi kod bloğu (kitap s.107-121)    */
  /* ------------------------------------------------------------------ */

  'Pd:4_low5': {
    code: 'Yüksek 4 / Düşük 5',
    block: 'Pd',
    text:
      'Erkeklerde düşük 5, bireyin kendini erkeksi, hatta aşırı erkeksi gösterme çabasını yansıtır. Kaba ve geleneksel maskülin ilgileri olanlarda, bu grubun geleneksel değerlerini yansıtabilir. Orta ya da üst sınıftan ve yüksekokul eğitimi olan erkeklerde bu örüntü, yetersizlik duygularını, özellikle kadınlara karşı, güçlü bir biçimde kapatma çabasını düşündürür. Sıklıkla kendi egolarını desteklemek ve kendi kendilerine güç ve kontrolü kanıtlamak için kadınları aşağılarlar. Ergenlerde bu örüntü, açık suçluluk ile bağlantılıdır. Bu örüntüdeki kadınlar kızgındırlar, ancak bu duygularını doğrudan ifade edemezler. Bunların kızgınlığı özel olarak erkeklere yöneliktir ve heteroseksüel sorunlar beklenir. İlginç olarak, bu kadınlar ilişkilerinde yüzeyseldir ve sıklıkla çekingen, yumuşak başlı ve çekici biçimindeki kültürel kadın stereotipleri ile özdeşleşmişlerdir ve bu tür rolleri aşırı sevgi ve ilgi gereksinimlerine ulaşmada manipülatif olarak kullanırlar. Kendi yeteneklerine çok fazla güvenirler ve başkalarının yardımına gereksinim duyduklarını inkar ederler; bu nedenle evlilik ve heteroseksüel sorunları konusunda danışmanlık almaya karşı dirençlidirler. Erkeklere karşı olan kızgınlıklarını pasif-agresif biçimde cinsel yolları kullanarak ifade ederler. Kadınlar sıklıkla bu tür davranışlarla (özellikle eğer test 6 da yüksekse) başkalarını da kızdırmaya çalışırlar, ancak sonra yanlış anlaşıldıkları için kendilerine acırlar. Hatta bir melodram krizi başlatmış oldukları için hoşlanmış görünürler. Alt test 3 de yükselmişse, bu kadınlar kendilerinin başkaları üzerindeki etkisinin farkında değillerdir ve düşmanlık duygularını inkar ederler. Evlilik ve aile sorunları ve cinsel fonksiyon bozuklukları ve cinsel hoşlanma eksikliğinin olması şaşırtıcı değildir. Baş ve sırt ağrıları da sık görülür.',
    seeAlso: 'Ayrıca Mf alt testinin düşüklüğüne de bakınız (s.111).',
    conditions: [
      {
        source: 's.111',
        quote: 'Erkeklerde düşük 5, bireyin kendini erkeksi, hatta aşırı erkeksi gösterme çabasını yansıtır.',
        test: ({ gender, t }) => gender === 'Erkek' && (t('Mf') ?? 100) < 50,
      },
      {
        source: 's.111',
        quote: 'Bu örüntüdeki kadınlar kızgındırlar, ancak bu duygularını doğrudan ifade edemezler.',
        test: ({ gender, t }) => gender === 'Kadın' && (t('Mf') ?? 100) < 50,
      },
      {
        source: 's.111',
        quote: 'Kadınlar sıklıkla bu tür davranışlarla (özellikle eğer test 6 da yüksekse) başkalarını da kızdırmaya çalışırlar.',
        test: ({ gender, t }) => gender === 'Kadın' && (t('Pa') ?? 0) >= 70,
      },
      {
        source: 's.112',
        quote: 'Alt test 3 de yükselmişse, bu kadınlar kendilerinin başkaları üzerindeki etkisinin farkında değillerdir ve düşmanlık duygularını inkar ederler.',
        test: ({ gender, t }) => gender === 'Kadın' && (t('Hy') ?? 0) >= 70,
      },
    ],
  },

  'Pd:456': {
    code: '456',
    block: 'Pd',
    text:
      'Talep edici, bağımlı ve duygusal kişilerdir, ancak diğer kişileri tedirgin ederek ve onlara karşı çıkarak ilişki kurarlar. Davranış örüntüleri yakın aile çevrelerine yabancılaşmalarına yol açar. Bu durum talep edici, bağımlı ve duygusal ilişki gereksinimlerini karşılamalarını zorlaştırır (Bakınız Scarlett O\'Hara Vadisi).',
    seeAlso: 'Scarlett O\'Hara Vadisi ve 46/64 koduna bakınız (s.113).',
  },

  'Pd:462': {
    code: '462/642',
    block: 'Pd',
    text:
      '46/64 koduyla bağlantılı kızgınlık ve duyarlılığa ek olarak, bu bireyler ajitedirler. Sinirlilik, kaygı ve depresyon yakınmaları vardır. Sıklıkla bu manipülatif bir ilgi, sempati ve kontrol isteğidir. İntihar tehditleri görülür. Bu bireyler başkalarına karşı güvensiz ve kuşkucudurlar ve onlardan şüphelenirler. Özellikle kuşkucudurlar ve otorite durumundaki bireylerle sorunları vardır. Çoğunlukla bu bireyler katı ve savunucudurlar, zor durumları ya da sorunları kendi kontrollerinin dışındaki konulara bağlayarak ya da başkalarını suçlayarak rasyonalize ederler. Cinsellikte ve evlilikte uyumsuzluk olabilir. Genelde insanlarla olan rahatsızlıklarına ve otoriteye olan kızgınlıklarına karşın, bireylerin abartılmış bir sevgi ve bağımlılık gereksinimleri vardır (hatta test 3 de yükselmiş ise daha fazla olasıdır). Bunların rahatsızlık ve eleştirilerinin çoğu aşırı biçimde diğerlerine bağımlı olma korkularından (ve böylece başkaları tarafından kontrol edilme) kaynaklanıyor görünmektedir. Sonuç olarak, aileleri ya da çalışma arkadaşları ile azalmış bir birliktelik duygusu gösterebilirler.',
    seeAlso: '46/64 koduna bakınız (s.114-115).',
    conditions: [
      {
        source: 's.114',
        quote:
          'Genelde insanlarla olan rahatsızlıklarına ve otoriteye olan kızgınlıklarına karşın, bireylerin abartılmış bir sevgi ve bağımlılık gereksinimleri vardır (hatta test 3 de yükselmiş ise daha fazla olasıdır).',
        test: ({ t }) => (t('Hy') ?? 0) >= 70,
      },
    ],
  },

  'Pd:463': {
    code: '463/643',
    block: 'Pd',
    text:
      'Bu bireylerin aşırı sevgi isteklerinin doyurulması, özellikle bu bireylerin kendilerini rahatsız edici ve küskün tarzları göz önüne alındığında, oldukça zordur. Genellikle bağımlılık gereksinimleri heteroseksüeldir ve benmerkezci biçimlerde isteme (hatta düşmancıl) şeklinde ifade edilir, bazen açık manipülasyon ya da kışkırtma içerir. Bu örüntü, sıklıkla kendi kendini bozguna uğratıcıdır, ancak bunların eşleri bireyin aşırı ister durumundan bıktıklarında onlara gereken ilgiyi göstermezler. Sıklıkla benzer biçimde terapist ya da tedaviyi veren diğer bireylerden de aşırı isteklerde bulunurlar, ancak aynı zamanda da aldıkları tedaviyi eleştirir ve karşı çıkarlar. Reddedilmeye olan duyarlılıkları ile, bu kod tipindeki bireyler kronik olarak acı çeken, küskün ve güvensiz kişilerdir. İçgörüleri yoktur. 5 alt testinin 40 T puanının altında olduğu kadınlarda pasiflik, bağımlılık ve kendine acıma görülür (bakınız yüksek 4 ve düşük 5). Menstrüasyonda düzensizlikler, cinsel işlev bozukluğu, baş ağrıları ve sırt ağrıları gibi fiziksel yakınmalar da olur.',
    seeAlso: '46/64 koduna bakınız (s.114-115).',
  },

  'Pd:468': {
    code: '468/648',
    block: 'Pd',
    text:
      'Eğer birey psikiyatride yatan bir hasta ise şiddetli ve olasılıkla kronik, duygusal bir rahatsızlığı, büyük olasılıkla paranoid şizofreniyi düşündürür. Bu bireyler kuşkucu, kızgın, aşırı duyarlı, suçlayıcıdırlar. Eleştiriden kolayca yaralanırlar, diğer insanlara güvenmezler ve olayları çarpıtma ve aşırı genelleme eğilimindedirler. Kendilerine yapılan gerçek ya da hayali haksızlıklar üzerinde kızgın bir biçimde sürekli düşünme eğilimindedirler, delüzyonlar ya da referans fikirleri olabilir, büyüklük (grandiyözite) elemanları, en azından benmerkezci tarzda olabilir. Bireyler gerçekte kızgınlıklarını açıkça ifade edemezler ve bunu sıklıkla, yansıtmayı şeffaf bir biçimde kullanarak yaparlar. Kızgınlıklarını fark ettiklerinde, bunu kafalarında iyi bir şekilde rasyonalize eder ve kendilerini haklı çıkarırlar. Kızgınlığa sıklıkla yargılamanın kötü olması, içgörü eksikliği ve impulsivite eşlik eder. Saldırı, ilaç kötü kullanımı ya da bağımlılığı ve intihar girişimlerinin hepsi olabilir. Kişiler arası, evlilik ve cinsel uyum sorunları tipiktir.',
    diagnosis: ['Paranoid şizofreni'],
    seeAlso: '46/64 ve 48/84 kodlarına bakınız (s.115).',
    conditions: [
      {
        source: 's.115',
        quote: 'K testi 50 T puanının altında, test 5, 4 ve 6\'nın 5 T puanı alanı içinde ve/veya test 8 yüksek ise tablo daha ağırdır.',
        test: ({ t }) => (t('K') ?? 100) < 50,
      },
      {
        source: 's.115',
        quote: 'test 5, 4 ve 6\'nın 5 T puanı alanı içinde',
        test: ({ t }) => {
          const mf = t('Mf');
          const pd = t('Pd');
          const pa = t('Pa');
          return mf !== undefined && pd !== undefined && pa !== undefined &&
            (Math.abs(mf - pd) <= 5 || Math.abs(mf - pa) <= 5);
        },
      },
    ],
  },

  'Pd:469': {
    code: '469',
    block: 'Pd',
    text:
      '46 koduna ek olarak test 9 da 70 T puanının üzerinde ise bu ani öfke patlamaları olan bireyleri göstermektedir.',
    seeAlso: '46/64 koduna bakınız (s.115).',
    conditions: [
      {
        source: 's.115',
        quote: '46 koduna ek olarak test 9 da 70 T puanının üzerinde ise bu ani öfke patlamaları olan bireyleri göstermektedir.',
        test: ({ t }) => (t('Ma') ?? 0) >= 70,
      },
    ],
  },

  'Pd:48_highF_low2': {
    code: '48/84 (Yüksek F / Düşük 2)',
    block: 'Pd',
    text:
      'rahattırlar ve başkalarına ebeveynlik ederler. Sıklıkla saldırgan ve cezalandırıcıdırlar ve başkalarını kontrol etmeye çalışırlar. Eğer zeka puanları ortalamanın üstünde ise diğerlerinde suçluluk ve anksiyete yaratarak onları manipüle edebilirler. Başka bir deyişle, bunların davranışları, katı bir disiplinden gerçek sadizme kadar geniş bir ranjda olabilir. Profildeki bazı bireyler (özellikle eğer K da yüksekse), bu özellikleri vurgulayan işlere girebilirler (Yasa koyma ve yürütme, askeri uzmanlıklar vb..). Profildeki kişilere "sosyopat kişilik" tanısı konulabilir.',
    diagnosis: ['Sosyopat kişilik'],
    seeAlso: '48/84 koduna bakınız (s.117-118).',
    conditions: [
      {
        source: 's.117',
        quote: 'Yüksek F ve Düşük 2 örüntüsü: sosyopat kişilik',
        test: ({ t }) => (t('F') ?? 0) >= 70 && (t('D') ?? 100) < 50,
      },
      {
        source: 's.117',
        quote: 'özellikle eğer K da yüksekse, bu özellikleri vurgulayan işlere girebilirler',
        test: ({ t }) => (t('K') ?? 0) >= 70,
      },
    ],
  },

  'Pd:482': {
    code: '482/842/824',
    block: 'Pd',
    text:
      'Daha önce verilen 48/84 tanımlarına ek olarak, bu bireylerde depresyon, anksiyete, gerginlik, sinirlilik yaygındır. Bunların duyguları çok çeşitlidir, ancak genellikle suçluluk, aşağılık ve umutsuzluk duyguları görülür. İntihar girişimi göreceli olarak fazladır. Kalıcı (uzun süreli) kişilerarası ilişkileri (özellikle heteroseksüel) yoktur. Genelde bu bireyler bekardır ya da sorunlu evlilikleri vardır, cinsel çatışmalar ya da güçlüklerle ilgili sorunlar yaşarlar. Bu insanların güçlü (hatta çoğunlukla abartılmış) ilgi ve sevgi gereksinimleri varsa da, başkalarına karşı güvensizdirler. Duygusal yaklaşımlar korku yaratır ve bireyler duygusal istekler ya da beklentilere karşı çok fazla duyarlıdır.',
    seeAlso: '48/84 ve 284/824 kodlarına bakınız (s.118).',
  },

  'Pd:489': {
    code: '489/849',
    block: 'Pd',
    text:
      'Yüksek 9 testinin yanı sıra, 48/84 kod yorumlarının eklenmesi tuhaf, hatta garip ve öngörülmez şekillerde eyleme vuruk davranışların ifade edilmesi olasılığını arttırır. Davranışsal ajitasyon sıklıkla görülür; bu saldırma, savaşma ve hatta şiddet gösterme biçiminde ortaya çıkar.',
    seeAlso: '48/84 ve 49/94 kodlarına bakınız (s.118).',
    conditions: [
      {
        source: 's.118',
        quote:
          'Yüksek 9 testinin yanı sıra, 48/84 kod yorumlarının eklenmesi tuhaf, hatta garip ve öngörülmez şekillerde eyleme vuruk davranışların ifade edilmesi olasılığını arttırır.',
        test: ({ t }) => (t('Ma') ?? 0) >= 70,
      },
    ],
  },

  'Pd:493': {
    code: '493/943',
    block: 'Pd',
    text:
      '49/94 özelliklerine ek olarak, birey benmerkezcidir ve kendilerine yönelik içgörüleri yoktur. Bunlarda eyleme vuruk davranış olasılığı nadirdir ve olumsuz duygularını daha çok pasif-agresif ve dolaylı yollardan gösterirler. Alt test 3, test 4\'ün 5 T puanı alanı içinde ise 34/43 kod tipinin özellikleri de bulunabilir (bakınız 34/43 kodları). Böylece, bu koddaki bazı bireyler kızgınlıklarını sadece hiddetlenme şeklinde (genellikle bir aile üyesine karşı) açığa çıkarmak üzere biriktirebilirler.',
    seeAlso: '49/94 ve 34/43 kodlarına bakınız (s.119-120).',
    conditions: [
      {
        source: 's.119',
        quote: 'Alt test 3, test 4\'ün 5 T puanı alanı içinde ise 34/43 kod tipinin özellikleri de bulunabilir.',
        test: ({ t }) => {
          const hy = t('Hy');
          const pd = t('Pd');
          return hy !== undefined && pd !== undefined && Math.abs(hy - pd) <= 5;
        },
      },
    ],
  },

  'Pd:495': {
    code: '495/945',
    block: 'Pd',
    text:
      'Geleneksel olmayan bir cinsel yönelimi (genellikle homoseksüel) kabul etmesini gösterir ya da daha sıklıkla çok iyi eğitim görmüş, ilgi alanları geniş ve böylece impulsifliği ve isyankarlığı kontrol edebilmiş, daha sosyal bir bireyle bağlantılıdır. Bazen bu bireyler kendilerini varolan geleneklere karşı çıkan sosyal hareketler içine sokarlar (Özellikle test 4 ve 9\'un orta derecede yükseldiği ve test 7\'nin de 70 T puanı ya da üstü olduğu durumlarda). Böyle olsa da, bu bireyler kuralları, düzenlemeleri ya da diğerlerinin sıkı kontrolünü sevmezler ve kendi özgürlüklerine ve kendi ilgilerine fazla değer verirler.',
    seeAlso: '49/94 koduna bakınız (s.120).',
    conditions: [
      {
        source: 's.120',
        quote: 'Özellikle test 4 ve 9\'un orta derecede yükseldiği ve test 7\'nin de 70 T puanı ya da üstü olduğu durumlarda.',
        test: ({ t }) => (t('Pt') ?? 0) >= 70,
      },
    ],
  },

  'Pd:496': {
    code: '496/946',
    block: 'Pd',
    text:
      'Kod saldırgan, zarar verici ve hatta homisidal davranışı olan bireyi göstermektedir (özellikle eğer test 8 de yükselmişse). Örüntü, bireylerde sıklıkla aniden garip biçimlerde ortaya çıkar ve bunlar daha sonra yanlış yaptıklarını ya da kendilerini zayıf hissettiklerini belirtirler. Yargılamaları ve olumsuz duygularını kontrolleri kötüdür (özellikle eğer K alt testi 50\'nin altında ise).',
    seeAlso: '49/94 koduna bakınız (s.120).',
    conditions: [
      {
        source: 's.120',
        quote: 'Kod saldırgan, zarar verici ve hatta homisidal davranışı olan bireyi göstermektedir (özellikle eğer test 8 de yükselmişse).',
        test: ({ t }) => (t('Sc') ?? 0) >= 70,
      },
      {
        source: 's.120',
        quote: 'Yargılamaları ve olumsuz duygularını kontrolleri kötüdür (özellikle eğer K alt testi 50\'nin altında ise).',
        test: ({ t }) => (t('K') ?? 100) < 50,
      },
    ],
  },

  'Pd:498': {
    code: '498/948',
    block: 'Pd',
    text:
      '49/94 özelliklerine ek olarak, doğal olmayan, hatta tuhaf davranış olasılığı çok yüksektir. 20 yaşın üstündeki bireylerde, bu kod genellikle major ve uzun süreli bir psikopatolojiyi gösterir. Ergenlerde, kod sıklıkla (bu kodda daha yaşlı bireylerde daha sıklıkla bulunan ciddi psikopatoloji yerine) bir ergenlik dönemi isyanı ile bağlantılıdır. Ancak, hem yetişkinler, hem de ergenler yabancılaşma duyguları, aile çatışmaları, yüksek enerji düzeyleri, otoriteyle güçlükler ve isyankar davranışlar gösterirler.',
    seeAlso: '489/849 ve 496/946 kodlarına bakınız (s.120).',
  },

  /* ------------------------------------------------------------------ */
  /* Pa (Paranoya / 6) alt testi kod bloğu (kitap s.127-135)           */
  /* ------------------------------------------------------------------ */

  'Pa:678': {
    code: '678/876',
    block: 'Pa',
    text:
      '6 ve 8, 7\'den yüksek ise bu psikotik vadiyi oluşturur. Ciddi psikopatolojileri vardır. Şizofrenik bozukluklardan paranoid tip tanısı konulabilir. Hallüsinasyonlar, delüzyonlar ve aşırı şüphelerle birlikte görülür. Affektleri donuktur. Bunlar ürkek, içedönük, sosyal ilişkilerde çekingen ama alkol aldıklarında agresif olan kişilerdir. Bellek ve konsantre olmada sorunları olabilir. Fantezi ve hayal aleminde yaşarlar. Geçmiş ya da hayali hatalar üzerinde ruminatif biçimde düşünürler.',
    diagnosis: ['Paranoid tip şizofreni'],
    seeAlso: 'Psikotik V / Psikotik Vadi (6 ve 8 > 7, s.131-132).',
    conditions: [
      {
        source: 's.131',
        quote: '6 ve 8, 7\'den yüksek ise bu psikotik vadiyi oluşturur.',
        test: ({ t }) => {
          const pa = t('Pa');
          const sc = t('Sc');
          const pt = t('Pt');
          return pa !== undefined && sc !== undefined && pt !== undefined && pa > pt && sc > pt;
        },
      },
    ],
  },

  'Pa:679': {
    code: '679',
    block: 'Pa',
    text:
      'Aşırı duyarlı ve katıdırlar. Sosyal ve iş yaşamlarında kendilerini bastırılmış hissederler; şüphecidirler ve güvensizlik duyarlar, çabuk gücenirler ve öfke patlamaları vardır. İmpulsif dönemlerini, dönemsel suçluluk ve kendine yönelme izlemektedir.',
    seeAlso: 's.132.',
  },

  'Pa:680': {
    code: '680/860',
    block: 'Pa',
    text:
      'Hastalarda paranoid şizofrenide görülen paranoid özellikler ve düşünce bozukluğu vardır. Sistemli hezeyanlar görülebilir. Hastalar gerginlik, kaygı, depresyon yakınmaları ile kişisel sıkıntılarını ifade ederler. Sosyal olarak izole ve çekiniktirler. Sosyal ilişkilerde düşmanlık ve şüphe hakimdir. Davranışlar genellikle sosyal açıdan uygun değildir ve önceden tahmin edilemez.',
    diagnosis: ['Paranoid şizofreni'],
    seeAlso: '68/86 ve 80/08 kodlarına bakınız (s.133).',
  },

  'Pa:694': {
    code: '694/964',
    block: 'Pa',
    text:
      'Hastaların sosyal, aile ve iş yaşamları hostilitelerine, yargılamalarının bozukluğuna ve duygularını kontrol edememelerine bağlı olarak bozuktur. İçgörüleri yoktur ve suçu diğerlerinin üstüne atma tipiktir. Saldırma, mücadele etme ve hatta cinayet potansiyeli değerlendirilmelidir.',
    seeAlso: '69/96 ve 49/94 kodlarına bakınız (s.133-134).',
  },

  'Pa:698': {
    code: '698/968',
    block: 'Pa',
    text:
      '69/96 kodunda tanımlanan birey tipine ek olarak bu bireylerde ruhsal karışıklık, konfüzyon, düşünce ve dikkat toplamada güçlük vardır. Ayrıca delüzyonlar, paranoid şüphe ve hallüsinasyon da vardır. Eğer 8 alt testi, 6\'dan 5 T puanı aşağıda ise 68/86 koduna bakın.',
    diagnosis: ['Şizofreni paranoid tip'],
    seeAlso: '69/96 ve 68/86 kodlarına bakınız (s.134).',
    conditions: [
      {
        source: 's.134',
        quote: 'Eğer 8 alt testi, 6\'dan 5 T puanı aşağıda ise 68/86 koduna bakın.',
        test: ({ t }) => {
          const pa = t('Pa');
          const sc = t('Sc');
          return pa !== undefined && sc !== undefined && pa - sc >= 5;
        },
      },
    ],
  },

  'Pa:456_scarlett': {
    code: '456 (Scarlett O\'Hara Vadisi)',
    block: 'Pa',
    text:
      'Genellikle kadınlarda görülen bir örüntüdür. 4 ve 6 alt testleri T puanı olarak 65\'in üzerinde, 5 alt testi T puanı olarak 35\'tedir. 4 ve 6 alt testlerinin profilde en yüksek noktalar olması gerekli değildir. Yüzeysel bir sosyallik, diğerlerine yönelik düşmanlık duygularının inkârı söz konusu olabilir; diğerlerini kontrol ve manipüle etme davranış kalıbını yansıtır. Birey psikolojik yardıma dirençlidir. Bu örüntü, düşmanlık ve kızgınlık duygularını doğrudan ifade edemeyen, bağımlı, daima sevgi isteyen ve düzensiz duygulanım içindeki kadınlarda görülür. Diğerlerini öfkelendirecek davranışları vardır. Böylece diğerlerini kendilerinden uzaklaştırır ve sonra da kendilerine ne kadar kötü davranıldığını düşünürler; aile, evlilik ve cinsel konularda sorunları vardır. Bu tür kadınlar terapisti kızdırarak terapötik müdahaleyi güçleştirirler.',
    seeAlso: 'Şekil 21 (s.134-135) ve Pd:456 (s.113).',
    conditions: [
      {
        source: 's.134',
        quote: 'Bu örüntüye alt test 3\'ün yükselmesi eşlik ediyorsa...',
        test: ({ t }) => (t('Hy') ?? 0) >= 70,
      },
    ],
  },

  // --- Pt (Psikasteni / 7) Bloğu (s.137-142) · DECISION-031/A ---
  'Pt:47': {
    code: '74/47',
    block: 'Pt',
    rawCode: '74/47',
    text:
      'Psikiyatrik hasta grubunda pasif agresif kişilik bozukluğu tanısı konulabilir. Kararsız, güvensiz kişilerdir. Sadece sinirli olduklarını belirtirler. Saldırganlıklarını kendilerine çevirdiklerinde depresyon görülür, ancak eyleme vuruk davranışları da olabilir.',
    diagnosis: ['Pasif-agresif kişilik bozukluğu'],
    seeAlso: 'Bakınız 47/74 Kodu (s.140).',
    conditions: [
      {
        source: 's.140',
        quote: 'Saldırganlıklarını kendilerine çevirdiklerinde depresyon görülür, ancak eyleme vuruk davranışları da olabilir.',
        test: ({ t }) => (t('D') ?? 0) >= 70,
      },
    ],
  },

  'Pt:67': {
    code: '76/67',
    block: 'Pt',
    rawCode: '76/67',
    text:
      'Bu hastalar kaygılı, endişeli, kuşkucudurlar. Düşmanlık duygularını dolaylı yollardan ifade ederler. Gerçek paranoid değillerdir. Kişilik yapılarını değiştirmek zordur.',
    seeAlso: 'Bakınız 67/76 Kodu (s.140).',
  },

  'Pt:782': {
    code: '782',
    block: 'Pt',
    rawCode: '782',
    text:
      '78/87 koduna 2 alt testinin eşlik ettiği durumdur. Olası Tanı: Depresif Bozukluk, Obsesif Kompulsif Bozukluk.',
    diagnosis: ['Depresif Bozukluk', 'Obsesif Kompulsif Bozukluk'],
    seeAlso: '78/87 koduna ve 872 koduna bakınız (s.141).',
  },

  'Pt:872': {
    code: '872',
    block: 'Pt',
    rawCode: '872',
    text:
      '78/87 kodunda 8 alt testinin 7\'den yüksek olduğu ve 2\'nin eşlik ettiği tablodur. Olası Tanı: Şizofrenik Reaksiyon.',
    diagnosis: ['Şizofrenik Reaksiyon'],
    seeAlso: '78/87 koduna ve 782 koduna bakınız (s.141).',
  },

  'Pt:784': {
    code: '784/874',
    block: 'Pt',
    rawCode: '784/874',
    text:
      '78/87 koduna 4 alt testinin eşlik ettiği tablodur. Olası Tanı: Şizofrenik Reaksiyon, Şizoid Kişilik Bozukluğu.',
    diagnosis: ['Şizofrenik Reaksiyon', 'Şizoid Kişilik Bozukluğu'],
    seeAlso: '78/87 koduna bakınız (s.141).',
  },

  'Pt:789': {
    code: '789',
    block: 'Pt',
    rawCode: '789',
    text:
      'Hostil, gergin, şüpheci, hiperaktif, huzursuz bireylerdir. Günlerini fanteziler ve hayal kurmayla geçirirler. Yansıtmayı kullanır, uygunsuz duygudurum gösterirler. Sınırlı sosyal yaşantıları vardır. Diğerlerinden çocuksu tarzda ilgi ve sevgi beklerler, istekleri gerçekleşmediğinde ise gücenip, düşmanca davranırlar. Yakın duygusal ilişkiye giremezler. Kendilerine ilişkin grandioziteleri vardır, kendileri ile övünürler. Başarıya ulaşma isteklerinin çok fazla olmasına karşın orta düzeyde performans gösterirler.',
    seeAlso: '78/87 koduna bakınız (s.141).',
  },

  'Pt:794': {
    code: '794',
    block: 'Pt',
    rawCode: '794',
    text:
      'Hastalar kronik olarak kaygılı ve gergindirler. Yüksek enerji düzeyleri obsesif ruminasyonlarına katkıda bulunur. Konuşmalarının genellikle izlenmesi zordur, bağlantısız fikirler görülür. İmpulsif dışa vurma dönemleri, suçluluk ve kendini aşağılama dönemleri birbiri ardına sıralanır. Diğer manik özelliklerin de birlikte görülüp görülmediği araştırılmalıdır.',
    seeAlso: '79/97 koduna bakınız (s.142).',
  },

  // --- Sc (Şizofreni / 8) Bloğu (s.143-148) · DECISION-031/A ---
  'Sc:68': {
    code: '86/68',
    block: 'Sc',
    rawCode: '86/68',
    text:
      '6 ve 8\'in T puanı 80\'nin üstünde, 7 de 70 T puanındadır. Bu profil psikiyatri hastalarında sıklıkla görülür. "Paranoid vadi" ya da "Psikotik V" olarak adlandırılır.',
    diagnosis: ['Paranoid durum', 'Paranoid şizofreni', 'Şizoid kişilik'],
    seeAlso: 'Bakınız 68/86 Kodu (s.132-133 ve s.146).',
    conditions: [
      {
        source: 's.146 (Sc bloğu)',
        quote: '6 ve 8\'in T puanı 80\'nin üstünde, 7 de 70 T puanındadır.',
        test: ({ t }) => {
          const pa = t('Pa') ?? 0;
          const sc = t('Sc') ?? 0;
          const pt = t('Pt') ?? 0;
          return pa >= 80 && sc >= 80 && pt >= 65 && pt <= 75;
        },
      },
    ],
  },

  'Sc:78': {
    code: '87/78',
    block: 'Sc',
    rawCode: '87/78',
    text:
      'Endişeli, kendi kendini tetkik edebilen, derin düşünceye dalan kişilerdir, kişilik güçlükleri kroniktir. Bağımsız, kendine güvenen kimseler değildirler, daha çok pasif bağımlıdır. Cinsel sorunları vardır. Olgun ve yakın ilişkiler kuramazlar, öğrendikleri şeyleri bağdaştıramazlar.',
    seeAlso: 'Bakınız 78/87 Kodu (s.140-141 ve s.146).',
    conditions: [
      {
        source: 's.140-141, s.146 (Sc bloğu)',
        quote: 'Pt & Sc ≥ 75 ∧ Sc > Pt şizofreni eğilimi güçlenir.',
        test: ({ t }) => {
          const pt = t('Pt') ?? 0;
          const sc = t('Sc') ?? 0;
          return pt >= 75 && sc >= 75 && sc > pt;
        },
      },
    ],
  },

  'Sc:8726': {
    code: '8726 / Yüksek 9',
    block: 'Sc',
    rawCode: '8726',
    text: 'Ajite şizofren bir hastayı göstermektedir.',
    diagnosis: ['Ajite şizofreni'],
    seeAlso: '872 ve 78/87 kodlarına bakınız (s.141, s.146).',
    conditions: [
      {
        source: 's.146 (Sc bloğu)',
        quote: '8726 kod tipine 9 (Ma) alt testinin yüksekliği eşlik eder.',
        test: ({ t }) => (t('Ma') ?? 0) >= 70,
      },
    ],
  },

  'Sc:paranoid_valley': {
    code: 'Paranoid Vadi (Şekil 22)',
    block: 'Sc',
    rawCode: 'Paranoid Vadi',
    text:
      'Bu örüntüyü gösteren hastalar, duygusal olarak geri çekilmişlerdir, sosyal izolasyon içindedirler, şüpheci, düşmanlık duyguları taşıyan ve davranışları hakkında içgörüsü olmayan kişilerdir. Ayrıca düşünce bozuklukları, hallüsinasyon ve delüzyonlara rastlanabilir. Genellikle paranoid şizofreni tanısına uygundurlar. Bu örüntü, hepsini doğru yanıtlama şeklinde de ortaya çıkar.',
    diagnosis: ['Paranoid şizofreni'],
    seeAlso: 'Şekil 22 (s.147), 68/86 ve 86/68 kodlarına bakınız.',
    conditions: [
      {
        source: 's.147 (Sc bloğu)',
        quote: 'Pa ve Sc yüksek, Pt daha düşük vadi görünümündedir (Paranoid Vadi).',
        test: ({ t }) => {
          const pa = t('Pa') ?? 0;
          const sc = t('Sc') ?? 0;
          const pt = t('Pt') ?? 0;
          return pa >= 70 && sc >= 70 && pt <= pa - 10 && pt <= sc - 10;
        },
      },
    ],
  },

  // --- Ma (Hipomani / 9) Bloğu (s.149-153) · DECISION-031/A ---
  'Ma:9_highK': {
    code: 'Yüksek 9 / Yüksek K',
    block: 'Ma',
    rawCode: 'Yüksek 9 / Yüksek K',
    text:
      'Eğer 9 ve K alt testlerinde puanlar 70 T puanında (2 alt testi T: 50\'nin altında ise) ise bu kişiler enerjik, organize, diğerlerinin kendileri üzerinde otorite kurmasını istemeyen kişilerdir. Genellikle çok iyi yöneticidirler. Güç yönelimli bireylerdir, bunlar için belirsizlik, fikir üretmeme ya da çelişkili durumlar tahammül edilemez şeylerdir. Kendilerinin kontrol edemediği durumlarda ve bilgi verilmeyen, yapılanmamış durumlarda rahatsız olurlar.\n' +
      'Bu bireylerin çoğu yarışmacıdır. K alt testi 70 T puanının üzerine çıkarsa, kendi yaşamlarını ve çevrelerindeki diğer kişilerin yaşamlarını organize etme çabaları vardır. Kendilerini rahatsız ya da tehdit eden durumlarda bağımlı, itaatkar, duygusal ve kontrolü kaybeden kişiler olabilirler. Bireyler diğerleri üzerinde kontrol koyarak onları kendilerine itaat ettirirler. Aslında temelde kendilerine güvensizdirler, rollerine, görünümlerine sıkı sıkıya bağlıdırlar.\n' +
      'Kadınlar fiziksel çekicilik konusunda teşhircidirler (eğer 5 alt testinde T:40\'ın altında ise), böylece kendilerini kabul ettirir ve diğerlerini kontrol ettiklerini düşünürler.',
    seeAlso: 'Ma alt testinin diğer alt testlerle ilişkisi (s.152).',
    conditions: [
      {
        source: 's.152 (Ma bloğu)',
        quote: '2 alt testi T: 50\'nin altında ise',
        test: ({ t }) => (t('D') ?? 100) < 50,
      },
      {
        source: 's.152 (Ma bloğu)',
        quote: 'K alt testi 70 T puanının üzerine çıkarsa, kendi yaşamlarını ve çevrelerindeki diğer kişilerin yaşamlarını organize etme çabaları vardır.',
        test: ({ t }) => (t('K') ?? 0) > 70,
      },
      {
        source: 's.152 (Ma bloğu)',
        quote: 'Kadınlar fiziksel çekicilik konusunda teşhircidirler (eğer 5 alt testinde T:40\'ın altında ise)',
        test: ({ gender, t }) => gender === 'Kadın' && (t('Mf') ?? 100) < 40,
      },
    ],
  },

  'Ma:9_lowK': {
    code: 'Yüksek 9 / Düşük K',
    block: 'Ma',
    rawCode: 'Yüksek 9 / Düşük K',
    text:
      'Narsisistik kişilerdir. Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri bu şekilde üstlerine çekerler.',
    diagnosis: ['Narsisistik kişilik'],
    seeAlso: 'Ma alt testinin diğer alt testlerle ilişkisi (s.153).',
    conditions: [
      {
        source: 's.153 (Ma bloğu)',
        quote: 'Kadınlar, eksibisyonist bir biçimde kendilerini sergileyerek dikkatleri bu şekilde üstlerine çekerler.',
        test: ({ gender }) => gender === 'Kadın',
      },
    ],
  },
};

// 213/231 karşılıklı kod eşleşmesi (D:231 -> D:213)
BLOCK_CODES['D:231'] = BLOCK_CODES['D:213']!;

// Hy bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Hy:435'] = BLOCK_CODES['Hy:345']!;
BLOCK_CODES['Hy:534'] = BLOCK_CODES['Hy:345']!;
BLOCK_CODES['Hy:436'] = BLOCK_CODES['Hy:346']!;

// Pd bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Pd:642'] = BLOCK_CODES['Pd:462']!;
BLOCK_CODES['Pa:642'] = BLOCK_CODES['Pd:462']!;
BLOCK_CODES['Pd:643'] = BLOCK_CODES['Pd:463']!;
BLOCK_CODES['Pa:643'] = BLOCK_CODES['Pd:463']!;
BLOCK_CODES['Pd:648'] = BLOCK_CODES['Pd:468']!;
BLOCK_CODES['Pa:648'] = BLOCK_CODES['Pd:468']!;
BLOCK_CODES['Pd:842'] = BLOCK_CODES['Pd:482']!;
BLOCK_CODES['Sc:842'] = BLOCK_CODES['Pd:482']!;
BLOCK_CODES['Pd:824'] = BLOCK_CODES['Pd:482']!;
BLOCK_CODES['Sc:824'] = BLOCK_CODES['Pd:482']!;
BLOCK_CODES['Pd:849'] = BLOCK_CODES['Pd:489']!;
BLOCK_CODES['Sc:849'] = BLOCK_CODES['Pd:489']!;
BLOCK_CODES['Pd:943'] = BLOCK_CODES['Pd:493']!;
BLOCK_CODES['Ma:943'] = BLOCK_CODES['Pd:493']!;
BLOCK_CODES['Pd:945'] = BLOCK_CODES['Pd:495']!;
BLOCK_CODES['Ma:945'] = BLOCK_CODES['Pd:495']!;
BLOCK_CODES['Pd:946'] = BLOCK_CODES['Pd:496']!;
BLOCK_CODES['Ma:946'] = BLOCK_CODES['Pd:496']!;
BLOCK_CODES['Pd:948'] = BLOCK_CODES['Pd:498']!;
BLOCK_CODES['Ma:948'] = BLOCK_CODES['Pd:498']!;

// Pa bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Pa:876'] = BLOCK_CODES['Pa:678']!;
BLOCK_CODES['Sc:678'] = BLOCK_CODES['Pa:678']!;
BLOCK_CODES['Sc:876'] = BLOCK_CODES['Pa:678']!;
BLOCK_CODES['Pa:860'] = BLOCK_CODES['Pa:680']!;
BLOCK_CODES['Sc:680'] = BLOCK_CODES['Pa:680']!;
BLOCK_CODES['Sc:860'] = BLOCK_CODES['Pa:680']!;
BLOCK_CODES['Si:068'] = BLOCK_CODES['Pa:680']!;
BLOCK_CODES['Si:086'] = BLOCK_CODES['Pa:680']!;
BLOCK_CODES['Pa:964'] = BLOCK_CODES['Pa:694']!;
BLOCK_CODES['Ma:694'] = BLOCK_CODES['Pa:694']!;
BLOCK_CODES['Ma:964'] = BLOCK_CODES['Pa:694']!;
BLOCK_CODES['Pa:968'] = BLOCK_CODES['Pa:698']!;
BLOCK_CODES['Ma:698'] = BLOCK_CODES['Pa:698']!;
BLOCK_CODES['Ma:968'] = BLOCK_CODES['Pa:698']!;
BLOCK_CODES['Sc:698'] = BLOCK_CODES['Pa:698']!;
BLOCK_CODES['Sc:968'] = BLOCK_CODES['Pa:698']!;

// Pt bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Pt:74'] = BLOCK_CODES['Pt:47']!;
BLOCK_CODES['Pt:76'] = BLOCK_CODES['Pt:67']!;
BLOCK_CODES['Sc:872'] = BLOCK_CODES['Pt:872']!;
BLOCK_CODES['Pt:874'] = BLOCK_CODES['Pt:784']!;
BLOCK_CODES['Sc:874'] = BLOCK_CODES['Pt:784']!;
BLOCK_CODES['Sc:784'] = BLOCK_CODES['Pt:784']!;
BLOCK_CODES['Pd:784'] = BLOCK_CODES['Pt:784']!;
BLOCK_CODES['Pd:874'] = BLOCK_CODES['Pt:784']!;
BLOCK_CODES['Sc:789'] = BLOCK_CODES['Pt:789']!;
BLOCK_CODES['Ma:789'] = BLOCK_CODES['Pt:789']!;
BLOCK_CODES['Pt:879'] = BLOCK_CODES['Pt:789']!;
BLOCK_CODES['Sc:879'] = BLOCK_CODES['Pt:789']!;
BLOCK_CODES['Ma:879'] = BLOCK_CODES['Pt:789']!;
BLOCK_CODES['Ma:974'] = BLOCK_CODES['Pt:794']!;
BLOCK_CODES['Pd:794'] = BLOCK_CODES['Pt:794']!;
BLOCK_CODES['Ma:794'] = BLOCK_CODES['Pt:794']!;

// Sc bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Sc:86'] = BLOCK_CODES['Sc:68']!;
BLOCK_CODES['Pa:86'] = BLOCK_CODES['Sc:68']!;
BLOCK_CODES['Sc:87'] = BLOCK_CODES['Sc:78']!;
BLOCK_CODES['Pt:87'] = CODES['78']!;
BLOCK_CODES['Sc:8726_high9'] = BLOCK_CODES['Sc:8726']!;
BLOCK_CODES['Pt:8726'] = BLOCK_CODES['Sc:8726']!;
BLOCK_CODES['Ma:8726'] = BLOCK_CODES['Sc:8726']!;
BLOCK_CODES['Sc:psychotic_v'] = BLOCK_CODES['Sc:paranoid_valley']!;
BLOCK_CODES['Pa:paranoid_valley'] = BLOCK_CODES['Sc:paranoid_valley']!;
BLOCK_CODES['Pa:psychotic_v'] = BLOCK_CODES['Sc:paranoid_valley']!;

// Ma bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Ma:9K'] = BLOCK_CODES['Ma:9_highK']!;
BLOCK_CODES['Ma:high9_highK'] = BLOCK_CODES['Ma:9_highK']!;
BLOCK_CODES['Ma:high9_lowK'] = BLOCK_CODES['Ma:9_lowK']!;

// Si bloğu çok-haneli ve çapraz kod eşleşmeleri
BLOCK_CODES['Pd:049'] = BLOCK_CODES['Si:049']!;
BLOCK_CODES['Ma:049'] = BLOCK_CODES['Si:049']!;
BLOCK_CODES['D:027'] = BLOCK_CODES['Si:027']!;
BLOCK_CODES['Pt:027'] = BLOCK_CODES['Si:027']!;
BLOCK_CODES['Sc:027'] = BLOCK_CODES['Si:027']!;
BLOCK_CODES['Si:0278'] = BLOCK_CODES['Si:027']!;

/** Blok-yerel kayıtların anahtarları (test ve doğrulama için). */
export const KNOWN_BLOCK_CODES = Object.keys(BLOCK_CODES);

/**
 * Var olan iki-haneli kayıtlara bağlanan koşullu ek yorumlar. Kaynak bu
 * cümleleri gövdenin içine gömmüş ya da hiç taşımamıştır (CONFLICT-025/027);
 * burada **makinece değerlendirilebilir** hâle getirilirler.
 */
const CODE_CONDITIONS: Record<string, CodeCondition[]> = {
  '12': [
    {
      source: 's.68',
      quote: '12 kodunda 1 ve 2 alt testleri arasında 5 T puanı kadar fark varsa 21’e bakılır',
      test: ({ t }) => {
        const hs = t('Hs');
        const d = t('D');
        return hs !== undefined && d !== undefined && Math.abs(hs - d) <= 5;
      },
    },
    {
      source: 's.68',
      quote: '3 alt testi 1’in 5 T puanı alanı içindeyse 123/213 kodlarına da bakınız.',
      test: ({ t }) => {
        const hs = t('Hs');
        const hy = t('Hy');
        return hs !== undefined && hy !== undefined && Math.abs(hs - hy) <= 5;
      },
    },
    {
      source: 's.68',
      quote: 'Pd, Ma ve Mf alt testleri de yükseldiğinde dürtüsel eyleme vurukluk ve bağımlılık çatışmaları belirginleşir.',
      test: ({ t }) => (t('Pd') ?? 0) >= 70 && (t('Ma') ?? 0) >= 70,
    },
  ],
  '13': [
    {
      source: 's.72',
      quote:
        'Yüksek K ile (özellikle 2, 7 ve 8’in T puanı 70’in ve F’nin 50’nin altında olduğu durumda) bireyler ' +
        'kendini normal, sorumluluk sahibi, yardımsever ve sempatik olarak sunmaya çalışır.',
      test: ({ t }) =>
        (t('D') ?? 100) < 70 && (t('Pt') ?? 100) < 70 && (t('Sc') ?? 100) < 70 && (t('F') ?? 100) < 50,
    },
    {
      source: 's.72',
      quote: 'Düşük 2 ile birlikte histerik kişilik özellikleri ve klasik psikosomatik semptomlar gösterirler.',
      test: ({ t }) => (t('D') ?? 100) < 50,
    },
    {
      source: 's.72',
      quote: '13/31 kodunda 2, 7, 8 ve 9 alt testleri 70 T puanının üzerinde ve K alt testi düşük olduğunda ciddi bir psikolojik bozulma söz konusudur.',
      test: ({ t }) => (t('D') ?? 0) >= 70 && (t('Pt') ?? 0) >= 70 && (t('Sc') ?? 0) >= 70 && (t('Ma') ?? 0) >= 70 && (t('K') ?? 100) < 50,
    },
    {
      source: 's.72',
      quote: 'L ve K alt testleri 70 T puanının üzerinde olduğunda bireyler kendilerini olduğundan daha iyi gösterme eğilimindedirler.',
      test: ({ t }) => (t('L') ?? 0) >= 70 && (t('K') ?? 0) >= 70,
    },
  ],
  '14': [
    {
      source: 's.76',
      quote: 'Alt test 3 de birlikte yükselmişse aile ve evlilik sorunları, kızgınlık ve sosyal yetersizlik duyguları ile birlikte bağımlılık-bağımsızlık çatışmaları ön plana çıkmıştır.',
      test: ({ t }) => (t('Hy') ?? 0) >= 70,
    },
  ],
  '16': [
    {
      source: 's.77',
      quote: 'Alt test 8 de yükselmişse alışılmamış somatik uğraşların varlığı dikkate alınmalı, belki de somatik delüzyonların olabileceği düşünülmelidir',
      test: ({ t }) => (t('Sc') ?? 0) >= 70,
    },
    {
      source: 's.77',
      quote: 'Alt test 4’ün T değeri 70’ten azsa Paranoid Şizofreni düşünülmelidir.',
      test: ({ t }) => (t('Pd') ?? 100) < 70,
    },
  ],
  '18': [
    {
      source: 's.77',
      quote: 'Eğer F alt testi de yükselmişse şizofreni; pre-psikotik bozukluk tanısı da düşünülmelidir.',
      test: ({ t }) => (t('F') ?? 0) >= 70,
    },
  ],
  '19': [
    {
      source: 's.78',
      quote: 'Eğer bu profilde 2 ve 3 alt testlerinin değerleri 50 T puanından aşağıda ise 129 ve 139 koduna bakınız.',
      test: ({ t }) => (t('D') ?? 100) < 50 && (t('Hy') ?? 100) < 50,
    },
  ],
  '01': [
    {
      source: 's.78',
      quote: 'Üçüncü yükselen alt test 8 olduğu zaman genellikle çok sayıda somatik yakınmalarla birlikte şizoid çekilme ve sosyal yetersizliğin olduğu söylenebilir.',
      test: ({ third }) => third === 'Sc',
    },
    {
      source: 's.78',
      quote: 'Sıklıkla 2 ve 3 yükselen testlerdir ve eğer T değeri 70’in üstünde ise destek sistemleri zayıflamıştır ve maskeli depresyon vardır.',
      test: ({ t }) => (t('D') ?? 0) >= 70 && (t('Hy') ?? 0) >= 70,
    },
  ],
  '23': [
    {
      source: 's.83',
      quote: '23 kodlu kadınlar (özellikle düşük Mf ya da düşük Ma) zayıflık, apati ve belirgin depresyon gösterirler.',
      test: ({ t }) => (t('Mf') ?? 100) < 50 || (t('Ma') ?? 100) < 50,
    },
    {
      source: 's.83',
      quote: 'Bireyler kendilerini sıklıkla (özellikle düşük 9) zayıf, yorgun ya da tükenmiş hissederler',
      test: ({ t }) => (t('Ma') ?? 100) < 50,
    },
  ],
  '24': [
    {
      source: 's.84',
      quote: 'Çoğunlukla 3, 7 ya da 8 üçüncü yükselen testtir.',
      test: ({ third }) => third === 'Hy' || third === 'Pt' || third === 'Sc',
    },
  ],
  '26': [
    {
      source: 's.87',
      quote:
        'Pa alt testi belirgin bir biçimde yükseldiğinde ve/veya 4 ve 8 alt testi 70 T puanının üzerinde ise, ' +
        'bireyin psikozun erken dönemlerinde olma olasılığı artar.',
      test: ({ t }) => (t('Pd') ?? 0) > 70 && (t('Sc') ?? 0) > 70,
    },
  ],
  '27': [
    {
      source: 's.87',
      quote:
        'Çok fazla yükselmeler (örneğin, 85 T puanının üstünde) sıklıkla bireyin sözel psikoterapide yeterli ' +
        'derecede odaklanamayacak kadar ajite ve endişeli olduğu anlamına gelir ve daha etkili müdahale formları ' +
        '(ilaç gibi) gerekli olabilir.',
      test: ({ t }) => (t('D') ?? 0) > 85 || (t('Pt') ?? 0) > 85,
    },
    {
      source: 's.87',
      quote:
        'Hs alt testi de yükselmişse bu bireyler kaygıyla bağlantılı somatik yakınmaların yanı sıra kendine acıma, suçlama ve başkalarının onlara bakmasını istemelerine karşın sosyal geri çekilme gösterirler.',
      test: ({ t }) => (t('Hs') ?? 0) >= 70,
    },
  ],
  '02': [
    {
      source: 's.92',
      quote: 'Bu kod tipinde çoğunlukla test 7 ya da 4, üçüncü en yüksek testtir.',
      test: ({ third }) => third === 'Pt' || third === 'Pd',
    },
  ],
  '34': [
    {
      source: 's.98',
      quote: 'Erkekler için test 2, 5 ve 6 sıklıkla üçüncü en yüksek testtir.',
      test: ({ gender, third }) => gender === 'Erkek' && (third === 'D' || third === 'Mf' || third === 'Pa'),
    },
    {
      source: 's.98',
      quote: 'Kadınlar için üçüncü en yüksek testler sıklıkla 2, 6 ve 8\'dir.',
      test: ({ gender, third }) => gender === 'Kadın' && (third === 'D' || third === 'Pa' || third === 'Sc'),
    },
    {
      source: 's.98',
      quote: '3 ve 4\'ün göreceli yüksekliklerinde 3 yüksekse kızgınlık ve dürtüler ketlenir.',
      test: ({ t }) => (t('Hy') ?? 0) > (t('Pd') ?? 0),
    },
    {
      source: 's.98',
      quote: '3 ve 4\'ün göreceli yüksekliklerinde 4 yüksekse öfke daha fazla ifade edilir.',
      test: ({ t }) => (t('Pd') ?? 0) > (t('Hy') ?? 0),
    },
  ],
  '35': [
    {
      source: 's.99',
      quote: '4 ya da 6 genellikle üçüncü yüksek testtir.',
      test: ({ third }) => third === 'Pd' || third === 'Pa',
    },
  ],
  '36': [
    {
      source: 's.100',
      quote: 've sıklıkla üçüncü yükselen test Si ya da Sc\'dir.',
      test: ({ third }) => third === 'Si' || third === 'Sc',
    },
    {
      source: 's.100',
      quote:
        'Alt test 6, 3\'ten 5 ya da daha fazla T puanı yüksek olduğunda, bu birey güç ve prestij kazanmak ister ve kızgın bir biçimde bencildir, hatta bu acımasız manipülasyonlar noktasına gidebilir.',
      test: ({ t }) => ((t('Pa') ?? 0) - (t('Hy') ?? 0)) >= 5,
    },
    {
      source: 's.100',
      quote:
        'Alt test 3, 6\'dan yüksekse, bu tür bireyler kızgınlıklarının farkında değildirler, ancak bu başkaları için çok açık olabilir.',
      test: ({ t }) => (t('Hy') ?? 0) > (t('Pa') ?? 0),
    },
  ],
  '37': [
    {
      source: 's.100',
      quote: 'Her iki cinsiyette de 1, 2 ve 4 alt testleri sıklıkla üçüncü en yüksek testtir.',
      test: ({ third }) => third === 'Hs' || third === 'D' || third === 'Pd',
    },
  ],
  '39': [
    {
      source: 's.101',
      quote: 'özellikle eğer alt test Si 40 T puanının altında ise çok yüzeysel olabilirler.',
      test: ({ t }) => (t('Si') ?? 100) < 40,
    },
    {
      source: 's.101',
      quote: 'En sık görülen üçlü kod tipi 394/934\'tür.',
      test: ({ third }) => third === 'Pd',
    },
  ],
  '03': [
    {
      source: 's.101',
      quote: 'Üçüncü en yüksek test 1 ve 2\'dir.',
      test: ({ third }) => third === 'Hs' || third === 'D',
    },
  ],
  '45': [
    {
      source: 's.113',
      quote: 'Erkeklerde 5 yüksektir.',
      test: ({ gender, t }) => gender === 'Erkek' && (t('Mf') ?? 0) >= 70,
    },
    {
      source: 's.113',
      quote: 'Kadınlarda 5 düşüktür.',
      test: ({ gender, t }) => gender === 'Kadın' && (t('Mf') ?? 100) < 50,
    },
    {
      source: 's.112',
      quote: 'özellikle 4 alt testi, 5 alt testinden yüksek olduğunda daha belirgindir.',
      test: ({ t }) => (t('Pd') ?? 0) > (t('Mf') ?? 0),
    },
  ],
  '46': [
    {
      source: 's.114',
      quote: 'Alt test 4, test 6\'dan yüksek olduğunda, aile ve iş güçlükleri tipiktir, bunlarla birlikte kızgınlık hakim özelliktir.',
      test: ({ t }) => (t('Pd') ?? 0) > (t('Pa') ?? 0),
    },
    {
      source: 's.114',
      quote: 'Alt test 6, 4\'ten yüksek olduğunda daha çarpıcı paranoid özellikler ön plandadır.',
      test: ({ t }) => (t('Pa') ?? 0) > (t('Pd') ?? 0),
    },
    {
      source: 's.114',
      quote: 'Kadınlarda 46/64 kodu psikoz ya da prepsikozla (özellikle eğer test 8 yüksek ve K düşük ise) ilişkili olabilir.',
      test: ({ gender, t }) => gender === 'Kadın' && (t('Sc') ?? 0) >= 70 && (t('K') ?? 100) < 50,
    },
  ],
  '49': [
    {
      source: 's.118-121 (Pd bloğu)',
      quote:
        'Eğer K testi 50 T puanının üzerinde ise ve/veya test 2, 5, 7 ya da 0, 70 T puanı üstünde üçüncü ' +
        'yükselen test ise hem ergenler hem de yetişkinlerde suç işleme ya da antisosyal davranış olasılığı daha azdır.',
      test: ({ t }) => (t('K') ?? 0) > 50,
    },
    {
      source: 's.118-121 (Pd bloğu)',
      quote: 'Alt test Si 50 T puanının altında olduğunda 49/94 özelliklerine sahip olsa bile bireyin sosyal ilişkileri iyidir.',
      test: ({ t }) => (t('Si') ?? 100) < 50,
    },
  ],
  // '70/07', '86/68' ve '06/60' kayıtları CODES'ta kanonik SIRALI anahtarda durur;
  // koşul tablosu da aynı anahtarı taşımak zorundadır (çözümleyici sorted digits ile arar).
  '06': [
    {
      source: 's.134 (Pa bloğu)',
      quote: 'Erkeklerde çok az görülür, kadınlarda özellikle 30 yaşından sonra rastlanır.',
      test: ({ gender }) => gender === 'Kadın',
    },
    {
      source: 's.134 (Pa bloğu)',
      quote: '2, 4 ve 3 yükselen diğer alt testlerdir.',
      test: ({ third }) => third === 'D' || third === 'Pd' || third === 'Hy',
    },
  ],
  '07': [
    {
      source: 's.142 (Pt bloğu)',
      quote: '2 ve 8 alt testleri, en sık görülen üçüncü yüksekliktir.',
      test: ({ third }) => third === 'D' || third === 'Sc',
    },
    {
      source: 's.142 (Pt bloğu)',
      quote: 'Kadınlarda eğer 5 alt testi, 40 T puanının altında ise aynı örüntü vardır.',
      test: ({ gender, t }) => gender === 'Kadın' && (t('Mf') ?? 100) < 40,
    },
  ],
  '67': [
    {
      source: 's.131 (Pa bloğu)',
      quote: 'Oldukça nadir görülür. 2 ya da 8 alt testleri yükselen üçüncü alt testtir.',
      test: ({ third }) => third === 'D' || third === 'Sc',
    },
    {
      source: 's.131 (Pa bloğu)',
      quote: 'Eğer 6 alt testi 7\'den daha yüksekse ya da ikisi aynı düzeydeyse, obsesif-kompulsif bozukluktan psikotik döneme bir geçiş olabileceği dikkate alınmalıdır.',
      test: ({ t }) => {
        const pa = t('Pa');
        const pt = t('Pt');
        return pa !== undefined && pt !== undefined && pa >= pt;
      },
    },
  ],
  '68': [
    {
      source: 's.132 (Pa bloğu)',
      quote: 'Pd ve Pt alt testleri, en yüksek üçüncü testtir.',
      test: ({ third }) => third === 'Pd' || third === 'Pt',
    },
    {
      source: 's.132 (Pa bloğu)',
      quote: 'Paranoid vadide 6 ve 8 alt testleri 70 T puanı civarındadır ve 7 alt testi 10 T puanı aşağıdadır.',
      test: ({ t }) => {
        const pa = t('Pa') ?? 0;
        const sc = t('Sc') ?? 0;
        const pt = t('Pt') ?? 0;
        return pa >= 70 && sc >= 70 && pt <= pa - 10 && pt <= sc - 10;
      },
    },
    {
      source: 's.132-133 (Pa bloğu)',
      quote: 'Ergenlerde genellikle saldırganlık nöbetleri (eğer K 50 T puanının altında ise)',
      test: ({ t }) => (t('K') ?? 100) < 50,
    },
    {
      source: 's.133 (Pa bloğu)',
      quote: '6 ve 8 alt testleri 75 T puanının üstünde ise paranoid şizofreni düşünülmelidir.',
      test: ({ t }) => (t('Pa') ?? 0) >= 75 && (t('Sc') ?? 0) >= 75,
    },
    {
      source: 's.146 (Sc bloğu)',
      quote: '86/68 kodunda 7 de 70 T puanındadır.',
      test: ({ t }) => (t('Pt') ?? 0) >= 70,
    },
  ],
  '69': [
    {
      source: 's.133 (Pa bloğu)',
      quote: '4 ve 8 alt testi, en çok yükselen üçüncü alt testtir.',
      test: ({ third }) => third === 'Pd' || third === 'Sc',
    },
    {
      source: 's.133 (Pa bloğu)',
      quote: 'Alt test F ve Sc yüksekse paranoid şizofreni.',
      test: ({ t }) => (t('F') ?? 0) >= 70 && (t('Sc') ?? 0) >= 70,
    },
    {
      source: 's.133 (Pa bloğu)',
      quote: 'Kod daha çok kadınlarda görülmektedir; daldan dala atlayan, küçük durumlara aşırı tepki veren kişilerdir.',
      test: ({ gender }) => gender === 'Kadın',
    },
  ],
  '78': [
    {
      source: 's.140 (Pt bloğu)',
      quote: '2 ve 4 diğer yükselen alt testlerdir (Eğer 2 ve 4, 8 alt testinin 5 T puanı altındaysa 278/728 ve 478/748 kodlarına bakınız).',
      test: ({ third }) => third === 'D' || third === 'Pd',
    },
    {
      source: 's.140 (Pt bloğu)',
      quote: 'Yetişkinlerde 8 alt testi 7\'den yüksekse akut psikotik durum vardır.',
      test: ({ t }) => (t('Sc') ?? 0) > (t('Pt') ?? 0),
    },
    {
      source: 's.140-141 (Pt bloğu)',
      quote: '8 alt testi, 7 alt testinden daha yüksekse intihar girişimi tuhaftır ve kendine zarar vermeyi içerir.',
      test: ({ t }) => (t('Sc') ?? 0) > (t('Pt') ?? 0),
    },
    {
      source: 's.141 (Pt bloğu)',
      quote: '7 > 8: Birey düşünce ve davranış bozukluğu geliştirmemek için hala savaş vermektedir.',
      test: ({ t }) => (t('Pt') ?? 0) > (t('Sc') ?? 0),
    },
    {
      source: 's.141 (Pt bloğu)',
      quote: '7 < 8: Her iki yükselmede 75 T puanının üstünde ve 8 alt testinde belirgin bir yükselme varsa tanı şizofrenidir.',
      test: ({ t }) => (t('Pt') ?? 0) >= 75 && (t('Sc') ?? 0) >= 75 && (t('Sc') ?? 0) > (t('Pt') ?? 0),
    },
  ],
  '79': [
    {
      source: 's.141 (Pt bloğu)',
      quote: '8 ve 4, üçüncü yükselen alt testtir.',
      test: ({ third }) => third === 'Sc' || third === 'Pd',
    },
    {
      source: 's.142 (Pt bloğu)',
      quote: 'Eğer 2 alt testi de yükselmişse depresyon görülür, ancak klinik tabloda anksiyete ve gerginlik ön plandadır.',
      test: ({ t }) => (t('D') ?? 0) >= 70,
    },
  ],
  '89': [
    {
      source: 's.147-148 (Sc bloğu)',
      quote: "Yaşı 27'den küçük olanlarda görülür.",
      manual: true,
    },
    {
      source: 's.148 (Sc bloğu)',
      quote: 'üçüncü yükselen alt test 4, 7 ya da 6’dır',
      test: ({ third }) => third === 'Pd' || third === 'Pt' || third === 'Pa',
    },
  ],
  '08': [
    {
      source: 's.148 (Sc bloğu)',
      quote: 'Bu kod tipindeki 7 ve 2 alt testleri en yüksek üçüncü testtir.',
      test: ({ third }) => third === 'Pt' || third === 'D',
    },
  ],
  '09': [
    {
      source: 's.153 (Ma bloğu)',
      quote: 'Kod oldukça nadirdir, özellikle erkeklerde çok az görülür.',
      test: ({ gender }) => gender === 'Erkek',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Çözümleyici — KERİTME YOK (DECISION-029/A, CONFLICT-030 kapandı)   */
/* ------------------------------------------------------------------ */

export type CodeRef = {
  /** Rakam dizisi (sıralı, kanonik), ör. "19" ya da "049". */
  digits: string;
  /** Parantezli alt-test niteliği, ör. "027(8)" için "8". */
  qualifier?: string;
  /** Kodun birinci (en yüksek) ölçeği → kaynağın bloğu. */
  block?: CodeScaleKey;
};

/** Kod düğümünü ayrıştırır: "91/19" → 91, "027(8)" → 027 + (8). */
export function parseCode(code: string | undefined): CodeRef | undefined {
  if (!code) return undefined;
  const trimmed = code.trim();
  if (/yüksek\s*1.*düşük\s*4/i.test(trimmed) || trimmed === '1_low4' || trimmed === '14_low4') {
    return { digits: '14_low4', block: 'Hs' };
  }
  if (trimmed.startsWith('248') && (trimmed.includes('F') || trimmed.includes('f'))) {
    return { digits: '248_highF', block: 'D' };
  }
  if (/yüksek\s*3.*yüksek\s*k/i.test(trimmed) || trimmed === '3_highK' || trimmed === '3K') {
    return { digits: '3_highK', block: 'Hy' };
  }
  if (/yüksek\s*3.*düşük\s*4/i.test(trimmed) || trimmed === '3_low4' || trimmed === '34_low4') {
    return { digits: '34_low4', block: 'Hy' };
  }
  if (/yüksek\s*4.*düşük\s*5/i.test(trimmed) || trimmed === '4_low5' || trimmed === '45_low5') {
    return { digits: '4_low5', block: 'Pd' };
  }
  if (trimmed.startsWith('48') && (trimmed.includes('Yüksek F') || trimmed.includes('Düşük 2') || trimmed.includes('highF') || trimmed.includes('F'))) {
    return { digits: '48_highF_low2', block: 'Pd' };
  }
  if (/scarlett/i.test(trimmed) || trimmed === '456_scarlett' || trimmed === 'scarlett_valley') {
    return { digits: '456_scarlett', block: 'Pa' };
  }
  if (trimmed.startsWith('8726')) {
    return { digits: '8726', block: 'Sc' };
  }
  if (/paranoid\s*vadi|psikotik\s*v/i.test(trimmed) || trimmed === 'paranoid_valley' || trimmed === 'psychotic_v') {
    return { digits: 'paranoid_valley', block: 'Sc' };
  }
  if (/yüksek\s*9.*yüksek\s*k/i.test(trimmed) || trimmed === '9_highK' || trimmed === '9K' || trimmed === 'high9_highK') {
    return { digits: '9_highK', block: 'Ma' };
  }
  if (/yüksek\s*9.*düşük\s*k/i.test(trimmed) || trimmed === '9_lowK' || trimmed === 'high9_lowK') {
    return { digits: '9_lowK', block: 'Ma' };
  }
  const colonMatch = trimmed.match(/^([A-Z][a-z]?):(\w+)(?:\s*\((\d)\))?/);
  if (colonMatch && colonMatch[2]) {
    const blk = colonMatch[1] as CodeScaleKey;
    const raw = colonMatch[2];
    const qual = colonMatch[3];
    return { digits: raw, qualifier: qual, block: blk };
  }
  const m = trimmed.match(/^(\d{2,})(?:\s*\((\d)\))?/);
  const raw = m?.[1];
  if (!raw) return undefined;
  const digits = raw.length === 2 ? raw.split('').sort().join('') : raw;
  const lead = raw[0] ?? '';
  return { digits, qualifier: m?.[2], block: CODE_DIGIT_SCALE[lead] };
}

function withConditions(entry: CodeInterpretation | undefined, key: string): CodeInterpretation | undefined {
  if (!entry) return undefined;
  if (entry.conditions) return entry;
  const extra = CODE_CONDITIONS[key];
  return extra ? { ...entry, conditions: extra } : entry;
}

/**
 * Koda karşılık gelen kaynak yorumu.
 *
 * Çözümleme sırası:
 *  1. **blok-yerel gövde** — kodun ilk rakamı bloğu verir (91 → Ma, 64 → Pa);
 *     üç+ haneli kodlar yalnız burada adreslenir (`049`, `027(8)`).
 *  2. **ortak iki-haneli kayıt** — `CODES`.
 *  3. eşleşme yoksa **`undefined`**. ESKİ DAVRANIŞIN aksine kod **`slice(0, 2)` ile
 *     kırpılmaz** → 3+ haneli bir kod artık başka bir kodun metnini dönmez
 *     (CONFLICT-030). Çağıran taraf "bu kod için kaynak yorumu tanımlı değil"
 *     durumunu gösterir.
 */
/** Çözümlenen kayıt başına tek örnek: aynı kayda giden her sorgu AYNI nesneyi döndürür. */
const RESOLVED_CACHE = new Map<string, CodeInterpretation>();

function cachedRecord(key: string, build: () => CodeInterpretation | undefined): CodeInterpretation | undefined {
  const hit = RESOLVED_CACHE.get(key);
  if (hit) return hit;
  const made = build();
  if (made) RESOLVED_CACHE.set(key, made);
  return made;
}

export function resolveCodeInterpretation(code: string | undefined): CodeInterpretation | undefined {
  const ref = parseCode(code);
  if (!ref) return undefined;
  // 1) blok-yerel gövde (kaynağın o bloğa özgü başlığı)
  if (ref.block) {
    const scoped = BLOCK_CODES[`${ref.block}:${ref.digits}`];
    if (scoped) return scoped;
  }
  // 2) ortak iki-haneli kayıt — Kırpma YOK: 3+ haneli kod burada undefined döner
  if (ref.digits.length !== 2) return undefined;
  return cachedRecord(`shared:${ref.digits}`, () => withConditions(CODES[ref.digits], ref.digits));
}

/** Koşullu yorumlardan profili gerçekten karşılık olanlar (manuel olanlar her zaman). */
export function activeCodeConditions(
  entry: CodeInterpretation | undefined,
  ctx: CodeConditionContext,
): CodeCondition[] {
  if (!entry?.conditions) return [];
  return entry.conditions.filter((c) => c.manual || !c.test || c.test(ctx));
}

/** Kodu kanonik biçime çevirir: "21" → "12". */
export function canonicalCode(code: string): string {
  const chars = code.split('').sort();
  return chars.join('');
}

/**
 * Kod için kaynak yorumu; tanımlı değilse `undefined`.
 *
 * **DECISION-029/A:** eski uygulama `code.slice(0, 2)` ile kodu kırpıyor ve bu
 * yüzden `049`, `027(8)`, `794`, `8726`, `273/723` gibi blok-yerel/çok haneli
 * kodlar **başka bir kodun metnine** düşüyordu (CONFLICT-030). Artık çözümleme
 * `resolveCodeInterpretation()` ile yapılır: blok-yerel gövde öncelikli, iki
 * haneden fazlası kırpılmaz, eşleşme yoksa `undefined` döner.
 */
export function codeInterpretation(code: string | undefined): CodeInterpretation | undefined {
  return resolveCodeInterpretation(code);
}

/** Bilinen tüm kod anahtarları (test ve doğrulama için). */
export const KNOWN_CODES = Object.keys(CODES);
