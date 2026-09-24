/**
 * Geçerlik konfigürasyonları — L, F ve K alt testlerinin T puanlarının
 * birlikte oluşturduğu klasik örüntüler. Klinik yorum rehberlerinde tanımlanan
 * V, Tersine V, tümüne doğru/yanlış yanıtlama, rastgele yanıtlama gibi
 * biçimlerin eşiklerini ve kısa yorumlarını içerir.
 *
 * Eşikler T puanıdır; eşleşen ilk konfigürasyon raporlanır.
 */

export type ValidityConfig = {
  id: string;
  name: string;
  /** Kuralın kısa açıklaması (arayüzde gösterilir). */
  rule: string;
  interpretation: string;
  /** Konfigürasyonun geçerliğe etkisi. */
  validity: 'geçerli' | 'şüpheli';
  tone: 'ok' | 'watch' | 'alert';
};

type LFK = { L: number; F: number; K: number };

type ConfigDef = ValidityConfig & { isMatch: (v: LFK) => boolean };

export const VALIDITY_CONFIGS: readonly ConfigDef[] = [
  {
    id: 'reverse-v',
    name: 'Tersine V (Reverse V)',
    rule: 'L ve K, T 50-60 aralığında; F, T 70 üzerinde',
    isMatch: v => v.L >= 50 && v.L <= 60 && v.K >= 50 && v.K <= 60 && v.F > 70,
    interpretation:
      'Birey kişisel ve duygusal zorluklarını kabullenmekte ve yardım istemektedir; sorunlarıyla kendisinin başa çıkabileceğinden emin değildir. F yükseldikçe bireyin sorunlarını abartarak kısa sürede yardım almak istediği ya da simülasyon yaptığı düşünülebilir; hangisinin geçerli olduğuna uygulayıcı karar vermelidir.',
    validity: 'şüpheli',
    tone: 'alert',
  },
  {
    id: 'closed-v',
    name: '"V" — Çok Kapalı Geçerlik',
    rule: 'F, T 50 altında; L ve K, T 60 üzerinde',
    isMatch: v => v.L > 60 && v.K > 60 && v.F < 50,
    interpretation:
      'Kişi kendini olduğundan iyi gösterme çabası içindedir; sorunlarını, kabul edilmeyen dürtü ya da duygularını azaltma/inkâr etme yoluna gitmiştir. İş başvurusu gibi durumlarda sık görülür. İnkâr tutumu klinik ölçekleri düşürür; klinikte bu etkinin karşılanması için 50 T üzerindeki klinik alt testlere pratik olarak 5-10 T puanı eklenmesi önerilir (Greene 1980). K, F\'den 20+ T puanı yüksekse güçlü savunmacılık ve terapötik işbirliğine direnç düşünülmelidir.',
    validity: 'şüpheli',
    tone: 'alert',
  },
  {
    id: 'v-shape',
    name: 'V Şekli',
    rule: 'L ve K en az T 60; F, T 50 civarında/altında',
    isMatch: v => v.L >= 60 && v.K >= 60 && v.F <= 55,
    interpretation:
      'Sorunlarıyla baş edebilecek kaynaklara sahip, test sırasında belirgin stres yaşamayan bireylerin tipik konfigürasyonudur; K yüksekliği eğitim ve sosyo-ekonomik düzeyle birlikte iniş çıkış gösterebilir. Kendiliğinden psikiyatriye başvuranlarda görülme olasılığı düşüktür; işe başvuru ya da adli değerlendirme bağlamını sorgulayın.',
    validity: 'geçerli',
    tone: 'watch',
  },
  {
    id: 'ascending',
    name: 'Yükselen Eğilim',
    rule: 'L < F < K; L ≈ 40 (≤ 45), F 45-55, K ≈ 60 (≥ 55)',
    isMatch: v => v.L < v.F && v.F < v.K && v.L <= 45 && v.F >= 45 && v.F <= 55 && v.K >= 55,
    interpretation:
      'Birey kendini iyi göstermeye çalışır ancak bu çaba etkisizdir; sorunlarını kabul etmekten hoşlanmaz. Klinik ölçekler (özellikle nevrotik üçlü) genellikle yükselir; düşük eğitim ve sosyo-ekonomik düzeydeki bireylerde daha sık görülür.',
    validity: 'şüpheli',
    tone: 'watch',
  },
  {
    id: 'descending',
    name: 'Azalan Eğilim',
    rule: 'L > F > K; L ≈ 60 (≥ 55), F ≈ 50, K 40-45',
    isMatch: v => v.L > v.F && v.F > v.K && v.L >= 55 && v.K >= 40 && v.K <= 45,
    interpretation:
      'Birey sorunlarını açıkça ortaya koymakta ve yardım aramaktadır; kendini olduğundan kötü gösterme eğilimi yoktur ancak yakınmalar abartılı bulunabilir. Klinik başvuruda tipik bir yardım arama örüntüsüdür.',
    validity: 'geçerli',
    tone: 'ok',
  },
  {
    id: 'random',
    name: 'Rastgele Cevaplama',
    rule: 'F, T 105 üzerinde; L ve K, T 50-60 civarı',
    isMatch: v => v.F > 105 && v.L >= 50 && v.L <= 60 && v.K >= 50 && v.K <= 60,
    interpretation:
      'Geleneksel olmayan bir cevap örüntüsüne işaret eder; birey maddeleri rastgele işaretlemiş olabilir. Profil dikkatle değerlendirilmeli, gerekirse test uygulaması yenilenmelidir.',
    validity: 'şüpheli',
    tone: 'alert',
  },
  {
    id: 'all-true',
    name: 'Tümüne "Doğru" Yanıt Verme',
    // Kaynak s.49: "L ve K alt testinin 35 T puanını aşmasını, F alt testinin
    // 120'nin üzerinde yer almasını gerektirir."
    // ANCAK: T puanları [20, 120] aralığına kırpılır (mmpiScoring.ts), bu
    // yüzden "F > 120" matematiksel olarak ULAŞILAMAZ ve örüntü hiç tespit
    // edilemezdi. Kırpma altında "> 120"nin tek temsili tam üst sınırdır.
    // Not: T kırpması kaldırılırsa bu koşul yeniden `> 120` olmalıdır.
    rule: 'F, T 120 (kırpma üst sınırı) ve üzeri; L ve K, T 35\'i aşmaz (kaynak s.49)',
    isMatch: v => v.F >= 120 && v.L <= 35 && v.K <= 35,
    interpretation:
      'Bireyin tüm maddelere "Doğru" yanıtı verdiği bir örüntüdür; profil klinik olarak yorumlanamaz. Testin yönergesi yeniden anlatılarak uygulama tekrarlanmalıdır.',
    validity: 'şüpheli',
    tone: 'alert',
  },
  {
    id: 'all-false',
    name: 'Tümüne "Yanlış" Yanıt Verme',
    // Kaynak s.50: "L, F ve K testlerinin tümü 80 T puanının üzerindedir."
    // ANCAK: kitabın kendi anahtarı + Tablo 30 normlarıyla, gerçek bir
    // "tümüne yanlış" yanıtlayıcı L=81.2, F=**75.3**, K=82.3 üretir → kaynağın
    // F>80 koşulu bu formda ULAŞILAMAZ (kaynak içi tutarsızlık, DECISION-020).
    // Bu yüzden pratik eşik korunur; bkz. CONFLICTS.md CONFLICT-018.
    rule: 'L, F ve K tümü T 75 üzerinde',
    isMatch: v => v.L >= 75 && v.F >= 75 && v.K >= 75,
    interpretation:
      'Bireyin tüm maddelere "Yanlış" yanıtı verdiği bir örüntüdür; kendisini aşırı olumlu gösterme çabası tüm ölçekleri yükseltir. Profil klinik olarak yorumlanamaz; uygulama tekrarlanmalıdır.',
    validity: 'şüpheli',
    tone: 'alert',
  },
  {
    id: 'help-seeking',
    name: 'Psikolojik Yardım İsteği',
    rule: 'L ve K, T 66 altında; F, T 100 ve altı (kaynak s.51)',
    isMatch: v => v.L < 66 && v.K < 66 && v.F >= 70 && v.F <= 100,
    interpretation:
      'Birey psikolojik sıkıntısını açıkça ortaya koymakta ve yardım istemektedir; sorunlarını abartıyor olabilir ancak yardım aramaya isteklidir. Klinik ölçekler bireyin yakınmalarına göre değerlendirilmelidir.',
    validity: 'geçerli',
    tone: 'watch',
  },
  {
    id: 'unconventional',
    name: 'Geleneksel Olmayan Cevap Örüntüsü',
    rule: 'L, T 66 altında; F, T 69 ve K, T 65 üzerinde',
    isMatch: v => v.L < 66 && v.F > 69 && v.K > 65,
    interpretation:
      'Birey hem sıkıntısını dile getirmekte hem de bir ölçüde savunmacı tutum sergilemektedir; alışılmadık, değişken bir test tutumuna işaret eder. Bulgular klinik görüşme ile doğrulanmalıdır.',
    validity: 'şüpheli',
    tone: 'watch',
  },
  {
    id: 'frank',
    name: 'Açık ve Tavizsiz',
    rule: 'L, T 55 altında; F, T 60-70 arası; K, T 45 altında',
    isMatch: v => v.L < 55 && v.K < 45 && v.F >= 60 && v.F <= 70,
    interpretation:
      'Profil geçerlidir; birey konuşma ve tavırlarında açık, lafını sakınmayan bir tutum sergiler. Ergenler dışında ego gücünde düşüklük ve zayıf savunma mekanizmalarıyla ilişkili olabilir; belirgin bir bozukluk yoksa nevrotik bir uyum düşünülür.',
    validity: 'geçerli',
    tone: 'ok',
  },
  {
    id: 'credible',
    name: 'Güvenilir Cevaplayıcı',
    // Kaynak s.54: "L alt testi 50 T puanına yakın, F alt testi 70 T puanının
    // altında, K alt testi 50 T puanının üstündedir." → K için ÜST SINIR YOK.
    // Eski koddaki `K <= 65` kaynakta bulunmayan bir sınırdı ve kaynağın
    // Konfigürasyon 12 sayacağı profilleri (ör. L=50, F=65, K=70) hiçbir
    // konfigürasyona sokmuyordu. Kaldırıldı (CHANGE-010, DECISION-023).
    rule: 'L, T 45-55; F, T 70 altında; K, T 50 üzerinde',
    isMatch: v => v.L >= 45 && v.L <= 55 && v.F < 70 && v.K > 50,
    interpretation:
      'Geçerli bir profildir. Birey yönergeleri dikkatle okuyup anlamış ve uygulamıştır; yanıtlar içtendir ve bireyin durumunu yansıtmaktadır.',
    validity: 'geçerli',
    tone: 'ok',
  },
  {
    id: 'acute-chronic',
    name: 'Akut/Süreğen Dengesi',
    rule: 'L, T 50 üzerinde; F ve K birbirine yakın (fark ≤ 6) ve T 55 üzerinde',
    isMatch: v => v.L > 50 && v.F > 55 && v.K > 55 && Math.abs(v.F - v.K) <= 6,
    interpretation:
      'Birey hem sıkıntısını dile getirmekte hem de belirli bir savunma düzeyini korumaktadır; akut bir kriz ile süreğen uyum arasında denge kurulduğunu düşündürür. Profil dengeli ve yorumlanabilir kabul edilir.',
    validity: 'geçerli',
    tone: 'ok',
  },
  {
    id: 'virtuous',
    name: 'Erdemli Görünme İsteği',
    rule: 'L, T 55 üzerinde; F, T 60 altında; K, T 59-64 arası',
    isMatch: v => v.L > 55 && v.F < 60 && v.K >= 59 && v.K <= 64,
    interpretation:
      'Geçerlik konfigürasyonu, bireyin kendini çok erdemli biri olarak gösterme ve kendini böyle görme isteğini yansıtır; sorunlar olduğundan küçük gösteriliyor olabilir. Klinik ölçekler düşük bulunsa bile inkâr olasılığı göz önünde tutulmalıdır.',
    validity: 'şüpheli',
    tone: 'watch',
  },
  {
    id: 'rigid',
    name: 'Katı / Karmaşıklık Örüntüsü',
    rule: 'L, T 55-65; F, T 70 üzerinde; K, T 40 altında',
    isMatch: v => v.L >= 55 && v.L <= 65 && v.F > 70 && v.K < 40,
    interpretation:
      "F'nin yüksekliği bireyin karmaşıklık (confusion) yaşadığını gösterir; L'deki ortalama-üstü puan dünyayı basit, siyah-beyaz gördüğüne, düşük K ise benlik değerinin ve başa çıkma kaynaklarının azlığına, duygusal katılığa işaret eder. L yüksekliği katı biçimde geleneksel değerlere tutunmayı da gösterebilir.",
    validity: 'şüpheli',
    tone: 'alert',
  },
];

/** L/F/K T puanlarına uyan ilk konfigürasyonu döndürür; yoksa null. */
export function detectValidityConfig(lT: number, fT: number, kT: number): ValidityConfig | null {
  const v = { L: Math.round(lT), F: Math.round(fT), K: Math.round(kT) };
  for (const config of VALIDITY_CONFIGS) {
    if (config.isMatch(v)) {
      const { isMatch: _drop, ...rest } = config;
      return rest;
    }
  }
  return null;
}
