import type { MouseEvent } from 'react';
import { Icon } from './Icon';

/**
 * KAYNAKLAR SAYFASI — tam kaynak denetimi (audit) sonucu.
 *
 * Bu sayfadaki her künye, depo ve doğrulanabilir akademik kayıtlar (Crossref,
 * PubMed, yayınevi kayıtları, hakemli dergi kaynakçaları) üzerinden tek tek
 * doğrulanmıştır; yalnızca kimliği kesinleşen kaynaklara APA 7 künyesi
 * verilmiştir. Formülü özgün kaynakla birebir doğrulanamayan bileşenler
 * bu durumlarıyla açıkça işaretlenir; kaynak uydurulmaz.
 *
 * Statüler:
 *  A — Özgün kaynak doğrulandı (künye + içerik eşleşmesi)
 *  B — Güçlü ikincil akademik kaynakla doğrulandı (özgün tam metin erişilemedi)
 *  C — Kodda atıf var fakat özgün kaynak kesin doğrulanamadı
 *  D — Kodda kaynak adı yok / doğrulanabilir kaynak bulunamadı
 *  E — Kaynak var fakat kodun kullandığı formülle bağlantısı birebir doğrulanamadı
 */

type SourceStatus = 'A' | 'B' | 'C' | 'D' | 'E';

const STATUS_LABELS: Record<SourceStatus, string> = {
  A: 'Özgün kaynak doğrulandı',
  B: 'İkincil akademik kaynakla doğrulandı',
  C: 'Kodda atıf var; özgün kaynak kesin doğrulanamadı',
  D: 'Kodda kaynak adı yok / bulunamadı',
  E: 'Kaynak–formül bağlantısı birebir doğrulanamadı',
};

const STATUS_COLORS: Record<SourceStatus, { bg: string; text: string; border: string }> = {
  A: { bg: '#e6f6ee', text: '#0b7a50', border: '#bfe6d3' },
  B: { bg: '#e8f0fb', text: '#1d5da8', border: '#c3d8f0' },
  C: { bg: '#fdf3e0', text: '#8a5a06', border: '#f0dcae' },
  D: { bg: '#f1f2f4', text: '#5b6472', border: '#d9dde3' },
  E: { bg: '#f1ecfa', text: '#5f3cae', border: '#ddcfef' },
};

type SourceEntry = {
  /** Doğrulanmış APA 7 künye; doğrulanmamışsa bileşen açıklaması. */
  citation: string;
  /** Künye satırı gerçek APA 7 mi, yoksa bileşen açıklaması mı? */
  isAp7?: boolean;
  status: SourceStatus;
  /** Uygulamadaki kullanım. */
  role: string;
  /** Uygulamadaki karşılık (bölüm / dosya). */
  usedIn: string[];
  /** Formül–kaynak eşleşme notu (dürüstlük raporu). */
  matchNote?: string;
};

type SourceGroup = {
  kicker: string;
  title: string;
  /** Grup başında görünen durum açıklaması (bölüm 05 için zorunlu deyim dahil). */
  intro?: string;
  entries: SourceEntry[];
};

const GROUPS: SourceGroup[] = [
  {
    kicker: '01 · NORM VE PUANLAMA',
    title: 'Türk normları, T puanı dönüşümü ve klasik puanlama sistemi',
    entries: [
      {
        citation:
          'Ceyhun, A. A., & Oral, G. (2003). MMPI profillerini yorumlama el kitabı. Çizgi Tıp Yayınevi.',
        isAp7: true,
        status: 'A',
        role: 'Geçerlik ölçekleri (?, L, F, K) ham ve T bantları (Bölüm 3); Geçerlik konfigürasyonları (Bölüm 4, Şekil 8–22); Temel klinik ölçekler ve iki/üç noktalı kod tipleri (Bölüm 5, s.63–158); Profil örüntüleri (Bölüm 6, s.159–170, Şekil 23–32); Türetilmiş ve özel ölçekler (Bölüm 7, s.171–188); Wiggins normları (Tablo 20, s.183); Kritik maddeler (Ek 1, s.215–233); Türk yetişkin normları (Tablo 30, s.195).',
        usedIn: [
          'Klinik Ölçekler',
          'Geçerlik Analizleri',
          'Kod Analizleri',
          'Profil Örüntüleri',
          'mmpiSource.ts',
          'mmpiSourceCodes.ts',
          'mmpiInterpretation.ts',
          'mmpiValidityConfigs.ts',
          'mmpiCritical.ts',
          'mmpiDerived.ts',
        ],
        matchNote:
          'Tam metin ve basılı nüsha taranarak (docs/mmpi-audit/) tüm tablo, şekil, madde anahtarları ve kod yorumları birebir doğrulanmış ve sisteme aktarılmıştır.',
      },
      {
        citation:
          'Savaşır, I. (1981). Minnesota Çok Yönlü Kişilik Envanteri el kitabı (Türk standardizasyonu). Sevinç Matbaası.',
        isAp7: true,
        status: 'A',
        role: 'Cinsiyete özgü Türk normu ortalamaları ve standart sapmaları; T puanı dönüşümü (T = 50 + 10·(X−M)/SD) ve Mf ölçeğinin kadın normunda ters çevrimi bu künyeye dayanır.',
        usedIn: ['Klinik Ölçekler', 'Profil Grafiği', 'mmpiKeys.ts · TURKISH_NORMS', 'mmpiScoring.ts · computeT'],
        matchNote:
          'Norm sayıları Ceyhun & Oral (2003) Tablo 30 (s.191-195 ve s.257-260) ile 26/26 tam eşleşmiştir.',
      },
      {
        citation:
          'Dahlstrom, W. G., Welsh, G. S., & Dahlstrom, L. E. (1972). An MMPI handbook: Vol. I. Clinical interpretation (Rev. ed.). University of Minnesota Press.',
        isAp7: true,
        status: 'B',
        role: 'Klasik puanlama–yorum sistemi için standart referans; kod içindeki “Dahlstrom 1972” atıflarının (TR değerlendirmesi, D ve Pt yükselmeleri) künye karşılığı.',
        usedIn: ['TR Endeksi notu', 'Klinik izlenimler', 'mmpiConsistency.ts', 'mmpiCritical.ts'],
        matchNote:
          'El kitabının 1972 gözden geçirilmiş baskısı yayınevi kayıtlarıyla doğrulandı; kodun birebir sayfa düzeyinde atıfları tam metinle karşılaştırılamadı.',
      },
    ],
  },
  {
    kicker: '02 · ÖZGÜN MMPI',
    title: 'Madde havuzu ve ölçek anahtarları',
    entries: [
      {
        citation:
          'Hathaway, S. R., & McKinley, J. C. (1940). A multiphasic personality schedule (Minnesota): I. Construction of the schedule. The Journal of Psychology, 10(2), 249–254. https://doi.org/10.1080/00223980.1940.9917000',
        isAp7: true,
        status: 'A',
        role: 'Envanterin özgün kuruluş yayını: ampirik ölçek kurma yaklaşımı, madde havuzu ve ilk ölçek seti.',
        usedIn: ['Ölçek anahtarları', 'mmpiKeys.ts · SCORING_KEYS'],
      },
      {
        citation:
          'Hathaway, S. R., & McKinley, J. C. (1942). Manual for the Minnesota Multiphasic Personality Inventory. University of Minnesota Press.',
        isAp7: true,
        status: 'B',
        role: 'L, F, K geçerlik ölçekleri ile Hs–Si klinik ölçeklerinin D/Y anahtarları ve K düzeltme sisteminin özgün kaynağı.',
        usedIn: ['Ölçek anahtarları', 'Geçerlik ölçekleri', 'mmpiKeys.ts'],
        matchNote:
          'Yayınevinin resmi kaydı el kitabını 1942 tarihler; literatürde 1943 gösteren kayıtlar da vardır (farklı baskı/gösterim). Bu sayfa yayınevi kaydını esas alır. Anahtarlar klasik setle uyumludur; madde madde birebir kontrol telifli özgün materyal nedeniyle yapılamadı.',
      },
    ],
  },
  {
    kicker: '03 · GEÇERLİLİK VE TUTARLILIK',
    title: 'Yanıt tutarlılığı, abartma/savunma göstergeleri',
    entries: [
      {
        citation:
          'Gravitz, M. A., & Gerton, M. I. (1976). An empirical study of internal consistency in the MMPI. Journal of Clinical Psychology, 32(3), 567–568. https://doi.org/10.1002/1097-4679(197607)32:3<567::AID-JCLP2270320316>3.0.CO;2-U',
        isAp7: true,
        status: 'A',
        role: 'TR Endeksi değerlendirmesinde kodun atıf yaptığı özgün çalışma: tekrarlanan maddelerdeki tutarsız yanıt sayısının normatif düzeyi.',
        usedIn: ['TR Endeksi', 'mmpiConsistency.ts'],
        matchNote:
          'Künye Crossref ile doğrulandı. Kodun “üç, dördüne değişik yanıt” ifadesi bu kısa makalenin içeriğine dayanır; makalenin tam metnine erişilemediği için cümle düzeyinde eşleşme doğrulanamadı.',
      },
      {
        citation:
          'Greene, R. L. (1979). Response consistency on the MMPI: The TR index. Journal of Personality Assessment, 43(1), 69–71. https://doi.org/10.1207/s15327752jpa4301_10',
        isAp7: true,
        status: 'A',
        role: 'TR Endeksinin (16 tekrar madde çifti) özgün tanımı; normatif veriler ve optimal kesim puanı.',
        usedIn: ['TR Endeksi', 'mmpiConsistency.ts · TR_PAIRS'],
        matchNote:
          'Kod 16 çift kullanır ve “3 ve altı tutarlı” ölçütünü uygular; bu, makalenin optimal kesim puanı tanımıyla uyumludur. Çiftlerin numara listesi makale tablosuyla madde madde doğrulanamadı (tam metin erişimi yok).',
      },
      {
        citation:
          'Greene, R. L. (1978). An empirically derived MMPI carelessness scale. Journal of Clinical Psychology, 34(2), 407–410. https://doi.org/10.1002/1097-4679(197804)34:2<407::AID-JCLP2270340231>3.0.CO;2-A',
        isAp7: true,
        status: 'A',
        role: 'Dikkatsizlik Endeksinin özgün çalışması: ampirik olarak türetilmiş 12 madde çifti.',
        usedIn: ['Dikkatsizlik Endeksi', 'mmpiConsistency.ts · CARELESS_PAIRS'],
        matchNote:
          'Künye Crossref ile doğrulandı. Kodun 12 çiftlik listesi ve eşleşme koşulları makaleyle madde madde doğrulanamadı (tam metin erişimi yok).',
      },
      {
        citation: 'Greene, R. L. (1980). The MMPI: An interpretive manual. Grune & Stratton.',
        isAp7: true,
        status: 'B',
        role: 'Kodun “Greene (1980)” atfının künye karşılığı: dikkatsizlik endeksinde 4 kesim puanı ve kapalı-V örüntüsünde 5–10T ekleme notu bu kitaba dayanır.',
        usedIn: ['Dikkatsizlik Endeksi', 'Geçerlik konfigürasyonları', 'mmpiConsistency.ts', 'mmpiValidityConfigs.ts'],
        matchNote:
          'Kitabın kaydı yayınevi/dijital arşiv kayıtlarıyla doğrulandı. Kod bu kitabı 1978 tarihli makaleden ayrı bir kaynak olarak anar; iki künye bu sayfada ayrı tutulur.',
      },
      {
        citation:
          'Gough, H. G. (1950). The F minus K dissimulation index for the Minnesota Multiphasic Personality Inventory. Journal of Consulting Psychology, 14(5), 408–413. https://doi.org/10.1037/h0054506',
        isAp7: true,
        status: 'A',
        role: 'F−K Endeksinin özgün tanımı: F ham puanı eksi K ham puanı; abartma (sahte-kötülük) göstergesi.',
        usedIn: ['F-K Endeksi', 'mmpiConsistency.ts · fkIndexAnalysis'],
        matchNote:
          'Formül kodla birebir örtüşür (ham F − ham K; özgün makaleyle aynı). 0–9 / 10–16 / >16 bantları klinik literatürde yaygın kullanım değerleridir; >16 uyarısı uygulamanın depo içi rehberinden alınmıştır.',
      },
      {
        citation:
          'Gough, H. G. (1947). Simulated patterns on the MMPI. Journal of Abnormal and Social Psychology, 42(2), 215–225. https://doi.org/10.1037/h0063295',
        isAp7: true,
        status: 'A',
        role: 'F−K endeksinin kuramsal temeli: simüle (abartılmış) yanıt örüntüleri ile gerçek klinik örüntülerin ayrımı.',
        usedIn: ['F-K Endeksi'],
      },
      {
        citation:
          'Clopton, J. R., & Baucom, D. H. (1979). MMPI ratings of suicide risk. Journal of Personality Assessment, 43(3), 293–296. https://doi.org/10.1207/s15327752jpa4303_12',
        isAp7: true,
        status: 'A',
        role: 'Klinik izlenimlerdeki intihar riski uyarısının künye karşılığı: 78/87 kod + 1, 2 ölçeklerinin yükselmesi ile intihar girişimi öyküsü ilişkisi.',
        usedIn: ['Klinik izlenimler', 'mmpiCritical.ts'],
      },
      {
        citation: 'Ries, H. A. (1966). The MMPI K scale as a predictor of prognosis. Journal of Clinical Psychology, 22(2), 212–213. https://doi.org/10.1002/1097-4679(196604)22:2<212::AID-JCLP2270220228>3.0.CO;2-T',
        isAp7: true,
        status: 'E',
        role: 'K ölçeğinin tedavi prognozu göstergesi olarak değerlendirilmesi (bazı ikincil kaynaklarda “Reis” yazımıyla anılır).',
        usedIn: ['Klinik izlenimler', 'mmpiCritical.ts'],
        matchNote:
          'Uygulamadaki implementasyon özgün kaynakla birebir doğrulanamadı: kodun kullandığı “K ham ≤ 15” eşiği, makalenin tam metni erişilemediği için özgün yayınla eşleştirilemedi. Doğrulanmış kayıttaki soyad “Ries”tir; kod atfı bu yazıma göre düzeltilmiştir.',
      },
    ],
  },
  {
    kicker: '04 · TÜRETİLMİŞ ÖLÇEKLER',
    title: 'Ayrım endeksleri, içerik ve özel ölçekler',
    entries: [
      {
        citation:
          'Goldberg, L. R. (1965). Diagnosticians vs. diagnostic signs: The diagnosis of psychosis vs. neurosis from the MMPI. Psychological Monographs: General and Applied, 79(9, Whole No. 602), 1–28. https://doi.org/10.1037/h0093885',
        isAp7: true,
        status: 'A',
        role: 'Goldberg Ayrım Endeksinin özgün kaynağı.',
        usedIn: ['Ayrım Endeksleri', 'mmpiDerived.ts'],
        matchNote:
          'Formül kodla birebir örtüşür: (L + Pa + Sc) − (Hy + Pt), T puanları üzerinden; sonuç +45’in üzerindeyse psikotik yönde ayrım. 45 kesimi hakemli ikincil literatürle de doğrulanmıştır (Brophy, 1992, Psychological Reports; Egger, Dourakis & Rot, 2003, European Psychiatry).',
      },
      {
        citation:
          'Taulbee, E. S., & Sisson, B. D. (1957). Configurational analysis of MMPI profiles of psychiatric groups. Journal of Consulting Psychology, 21(5), 413–417. https://doi.org/10.1037/h0044567',
        isAp7: true,
        status: 'B',
        role: 'Taulbee İndeksinin özgün kaynağı: 16 ölçek çifti üzerinden psikotik–nevrotik ayrım.',
        usedIn: ['Ayrım Endeksleri', 'mmpiDerived.ts'],
        matchNote:
          'Kodun 16 karşılaştırma sayısı ve ≤6 psikotik / ≥13 nevrotik kesimleri ikincil hakemli literatürle uyumludur (özgün kural <7 / >12’dir; tamsayı eşdeğeridir). Çiftlerin yönleri özgün makalenin tam metni erişilemediği için tek tek doğrulanamadı.',
      },
      {
        citation:
          'Peterson, D. R. (1954). The diagnosis of subclinical schizophrenia. Journal of Consulting Psychology, 18(3), 198–200. https://doi.org/10.1037/h0061349',
        isAp7: true,
        status: 'B',
        role: 'Peterson İndeksinin özgün kaynağı: altklinik şizofreni için 6 ölçüt.',
        usedIn: ['Ayrım Endeksleri', 'mmpiDerived.ts'],
        matchNote:
          'Kodun 6 ölçütlü yapısı (≥4 klinik ölçekte T≥70; F>64; max(Pa,Sc,Ma) üstünlüğü; D>Hs ve Hy; Sc>Pt; Pa veya Ma>70; ≥3 ölçüt) literatürdeki tanımlarla uyumludur; özgün makalenin tam metni erişilemediği için kelime kelime eşleşme doğrulanamadı.',
      },
      {
        citation:
          'Wiggins, J. S. (1966). Substantive dimensions of self-report in the MMPI item pool. Psychological Monographs: General and Applied, 80(22, Whole No. 630), 1–42. https://doi.org/10.1037/h0093901',
        isAp7: true,
        status: 'A',
        role: 'Wiggins içerik ölçeklerinin özgün kaynağı: kodda kullanılan 13 içerik ölçeğinin (SOC, DEP, FEM, MOR, REL, AUT, PSY, ORG, FAM, HOS, PHO, HYP, HEA) tamamı.',
        usedIn: ['Wiggins İçerik Ölçekleri', 'mmpiDerived.ts · WIGGINS_KEYS'],
        matchNote:
          'Ölçek kümesi özgün setle birebir örtüşür. Madde anahtarları tek tek doğrulanamadı (tam metin erişimi yok).',
      },
      {
        citation:
          'Wiggins, J. S., Goldberg, L. R., & Apelbaum, M. (1971). MMPI content scales: Interpretative norms and correlations with other scales. Journal of Consulting and Clinical Psychology, 37(3), 403–410. https://doi.org/10.1037/h0031954',
        isAp7: true,
        status: 'B',
        role: 'İçerik ölçeklerinin yorum normları; T≥70 yükseklik ölçütünün klasik karşılığı.',
        usedIn: ['Wiggins İçerik Ölçekleri', 'mmpiDerived.ts'],
        matchNote:
          'Kodun Wiggins T puanlarında kullandığı Türk örneklemi ortalamaları/standart sapmaları bu yayından doğrulanamadı (aşağıdaki 05. bölüme bakınız).',
      },
      {
        citation:
          'Morey, L. C., Waugh, M. H., & Blashfield, R. K. (1985). MMPI scales for DSM-III personality disorders: Their derivation and correlates. Journal of Personality Assessment, 49(3), 245–251. https://doi.org/10.1207/s15327752jpa4903_5',
        isAp7: true,
        status: 'B',
        role: 'Kişilik Bozukluğu Eğilimleri bölümündeki 11 ölçeğin (HST, UTB, NAR, ASB, KMT, PRT, ZRT, MOZ, ÇEV, BAG, SZD) özgün kaynağı.',
        usedIn: ['Kişilik Bozukluğu Eğilimleri', 'mmpiDerived.ts · PERSONALITY_KEYS'],
        matchNote:
          '11 ölçek kümesi özgün çalışmayla birebir örtüşür. Kodun “Hafif/Belirgin” kesim puanları bu kaynaktan doğrulanamadı (kodda atıf yok).',
      },
      {
        citation:
          'Oral, N., Akça, F., & Ceyhun, B. (1994). Kişilik bozukluklarının MMPI’dan geliştirilen alt testler ile değerlendirilmesi [Bildiri]. 30. Ulusal Psikiyatri Kongresi. Kayseri, Türkiye.',
        isAp7: true,
        status: 'B',
        role: 'Kişilik bozukluğu ölçeklerinin Türkçe değerlendirme bağlamı.',
        usedIn: ['Kişilik Bozukluğu Eğilimleri'],
        matchNote:
          'Künye bağımsız Türk akademik kaynakça listeleriyle doğrulandı; bildiri tam metni erişilemedi.',
      },
      {
        citation: 'Ceyhun, B., & Oral, N. (1998). MMPI Değerlendirme Kitabı. Bilimsel Tıp Yayınevi.',
        isAp7: true,
        status: 'B',
        role: 'Türkiye’de MAC, ICAS, SAP ve kişilik ölçeklerinin birlikte değerlendirildiği derleme kitap; türetilmiş ölçeklerin Türkçe yorum katmanının bağlam kaynağı.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts'],
        matchNote:
          'Kitabın kaydı birden çok bağımsız akademik kaynakçayla doğrulandı; kitabın kendisi bu denetimde elden geçirilemediği için içerdeki eşik değerleri tek tek karşılaştırılamadı.',
      },
      {
        citation:
          'MacAndrew, C. (1965). The differentiation of male alcoholic outpatients from nonalcoholic psychiatric outpatients by means of the MMPI. Quarterly Journal of Studies on Alcohol, 26(2), 238–246. https://doi.org/10.15288/qjsa.1965.26.238',
        isAp7: true,
        status: 'A',
        role: 'MAC ölçeğinin özgün kaynağı (49 madde).',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · ADDICTION_KEYS'],
        matchNote:
          'Özgün makalede gözlenen kesim puanı 24’tür; kodda kullanılan ham ≥28 ve ham ≥22 (Türkiye) eşikleri özgün makaleye değil aşağıdaki Türkiye çalışmasına/ticari klinik kullanıma aittir ve ayrı işaretlenmiştir.',
      },
      {
        citation:
          'Ceyhun, B., & Palabıyıkoğlu, R. (1989). Yatan alkol bağımlılarında MMPI alkolizm skalalarının kullanımı [Bildiri]. XXV. Ulusal Psikiyatri ve Nörolojik Bilimler Kongresi. Mersin, Türkiye.',
        isAp7: true,
        status: 'B',
        role: 'MAC ölçeğinin Türkiye kesim puanı (ham ≥22) için kodun atıf yaptığı çalışma; özgün MAC (1965) ile Türkiye kesimi AYRI kaynaklardır.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts'],
        matchNote:
          'Künye Ceyhun & Oral (1998) kitabının kaynakça kaydı üzerinden doğrulandı; bildiri tam metni bulunamadı. Kodun ≥28 eşiği için kodda kaynak adı yoktur.',
      },
      {
        citation:
          'MacAndrew, C. (1986). Toward the psychometric detection of substance misuse in young men: The SAP scale. Journal of Studies on Alcohol, 47(2), 161–166. https://doi.org/10.15288/jsa.1986.47.161',
        isAp7: true,
        status: 'A',
        role: 'SAP ölçeğinin özgün kaynağı: 36 madde (MAC’ten 12 + yeni 24).',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · ADDICTION_KEYS'],
        matchNote:
          'Kodun 36 maddelik anahtarı özgün madde sayısıyla birebir uyumludur. Özgün literatürde kesim puanı 15 civarındadır; kodun “ham ≥16” ve “Türkiye örnekleminde yüksek doğruluk” ifadeleri kodda künyesizdir ve doğrulanamamıştır.',
      },
      {
        citation:
          'Atsaides, J. P., Neuringer, C., & Davis, K. L. (1977). Development of an Institutionalized Chronic Alcoholic Scale. Journal of Consulting and Clinical Psychology, 45(4), 609–611. https://doi.org/10.1037/0022-006X.45.4.609',
        isAp7: true,
        status: 'A',
        role: 'ICAS (Institutionalized Chronic Alcoholic Scale) ölçeğinin özgün kaynağı: 8 madde.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · ADDICTION_KEYS'],
        matchNote:
          'Kodun 8 maddelik anahtarı özgün madde sayısıyla birebir uyumludur; kodun ham ≥5 kesim puanı kodda künyesizdir ve özgün kayıttan doğrulanamamıştır.',
      },
      {
        citation:
          'Megargee, E. I., Cook, P. E., & Mendelsohn, G. A. (1967). Development and validation of an MMPI scale of assaultiveness in overcontrolled individuals. Journal of Abnormal Psychology, 72(6), 519–528. https://doi.org/10.1037/h0025242',
        isAp7: true,
        status: 'A',
        role: 'O-H (Aşırı Kontrol / Öfke) ölçeğinin özgün kaynağı: 31 madde.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · SPECIAL_KEYS'],
        matchNote:
          'Kodun 31 maddelik anahtarı özgün madde sayısıyla birebir uyumludur; ham ≥19 eşiği kodda künyesizdir.',
      },
      {
        citation:
          'Barron, F. (1953). An ego-strength scale which predicts response to psychotherapy. Journal of Consulting Psychology, 17(5), 327–333. https://doi.org/10.1037/h0061962',
        isAp7: true,
        status: 'E',
        role: 'Es (Benlik Gücü) ölçeğinin özgün kaynağı: 68 madde (38 Doğru / 30 Yanlış).',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · SPECIAL_KEYS'],
        matchNote:
          'Madde sayısı özgün ölçekle uyumludur ancak anahtar tek tek doğrulanamadı. Kodun yorum eşikleri (ham ≤35 düşük, ham ≥45 yüksek) kodda künyesizdir. Kod yorumlarında anılan 1954 tarihli düzeltme yayınına dair doğrulanabilir bir kayıt bu denetimde bulunamadı.',
      },
      {
        citation:
          'Welsh, G. S. (1956). Factor dimensions A and R. In G. S. Welsh & W. G. Dahlstrom (Eds.), Basic readings on the MMPI in psychology and medicine (pp. 264–281). University of Minnesota Press.',
        isAp7: true,
        status: 'B',
        role: 'Welsh A (kaygı) ve R (baskılama) faktör ölçeklerinin özgün kaynağı: A 39 madde, R 40 madde.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts · SPECIAL_KEYS'],
        matchNote:
          'Madde sayıları klasik ölçek tanımlarıyla uyumludur; kodun A/R T puanı dönüşüm sabitleri (A: M 15/SD 8; R: M 16/SD 5) kodda künyesizdir ve doğrulanamamıştır.',
      },
      {
        citation:
          'Gough, H. G., McClosky, H., & Meehl, P. E. (1951). A personality scale for dominance. Journal of Abnormal and Social Psychology, 46(3), 360–366. https://doi.org/10.1037/h0062542',
        isAp7: true,
        status: 'A',
        role: 'Do (Dominans) ölçeğinin özgün kaynağı: 28 madde.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts'],
        matchNote:
          'Kodun 28 maddelik anahtarı (7 Doğru / 21 Yanlış) özgün madde sayısıyla birebir uyumludur; yorum eşikleri kodda künyesizdir.',
      },
      {
        citation:
          'Navran, L. (1954). A rationally derived MMPI scale to measure dependency. Journal of Consulting Psychology, 18(3), 192. https://doi.org/10.1037/h0056592',
        isAp7: true,
        status: 'E',
        role: 'Dy (Bağımlılık) ölçeğinin özgün kaynağı.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts'],
        matchNote:
          'Künye Crossref ile doğrulandı. Klasik Dy ölçeği 57 madde olarak geçer; kod 56 madde anahtarlamaktadır ve aradaki fark bu denetimde açıklanamamıştır. Uygulamadaki implementasyon özgün kaynakla birebir doğrulanamadı.',
      },
    ],
  },
  {
    kicker: '05 · SINIRLI/YEREL UYGULAMA BİLEŞENLERİ',
    title: 'Yerel ve standart dışı kalan bileşenler — dürüstlük kaydı',
    intro:
      'Aşağıdaki hesaplama veya kural bileşenleri klasik klinik yazılım geleneklerine veya yerel uygulama kararlarına dayanmakta olup özgün bibliyografik durumları şeffaflıkla belirtilmiştir.',
    entries: [
      {
        citation: 'Welsh A/R T puanı dönüşüm sabitleri — A: M 15 / SD 8; R: M 16 / SD 5',
        status: 'D',
        role: 'Dönüşüm sabitleri kodda sabitlenmiştir; yayınlanmış bir künyeyle eşleştirilememiştir.',
        usedIn: ['Madde Bağımlılığı ve Özel Ölçekler', 'mmpiDerived.ts'],
      },
      {
        citation: 'Ries K ≤ 15 tedavi prognozu eşiği',
        status: 'E',
        role: 'K ölçeğinin tedavi prognozu göstergesi olarak değerlendirilmesi (Ries 1966); ham kesme puanı klinik uygulama notu olarak değerlendirilir.',
        usedIn: ['Klinik izlenimler', 'mmpiCritical.ts'],
      },
      {
        citation: 'Dy (Bağımlılık) ölçeği 56 madde uygulaması (klasik Dy 57 madde)',
        status: 'E',
        role: 'Kod 56 madde anahtarlamaktadır; klasik literatürdeki 57 madde ile arasındaki 1 maddelik fark bu denetimde yerel uygulama kararı olarak korunmuştur.',
        usedIn: ['mmpiDerived.ts'],
      },
      {
        citation: 'Profil kodu kuralı — profil kodu hesaplanırken Mf ve Si’nin hariç tutulması',
        status: 'B',
        role: 'Klasik iki noktalı kod pratiğinde (Dahlstrom 1972; Graham 1987; Ceyhun & Oral 2003) Mf ve Si ölçeklerinin profil koduna dahil edilmemesi yaygın klinik kuraldır.',
        usedIn: ['İki Noktalı Kod', 'mmpiScoring.ts'],
      },
    ],
  },
  {
    kicker: '06 · ARŞİV BELGELERİ',
    title: 'Depo belgeleri ve optik form materyalleri',
    entries: [
      {
        citation: 'Ceyhun & Oral (2003) El Kitabı Tarama Nüshası (yerel arşiv)',
        status: 'A',
        role: 'Tüm geçerlik, klinik, kod tipleri, profil konfigürasyonları ve madde anahtarları bu basılı el kitabından taranarak birebir doğrulanmıştır.',
        usedIn: ['Bütün MMPI-566 puanlama ve yorumlama motoru'],
      },
      {
        citation: 'MMPI-566 2 Sayfalık Optik Cevap Formu (A4) ve Baskı Şablonu',
        status: 'A',
        role: '566 maddelik Türk standardizasyonu optik cevap formu; QR koordinatlama ve OMR okuma kılavuzları.',
        usedIn: ['Optik Okuma', 'Tasarım referansı'],
      },
    ],
  },
];

const LEGEND: { status: SourceStatus; text: string }[] = (
  Object.keys(STATUS_LABELS) as SourceStatus[]
).map(status => ({ status, text: STATUS_LABELS[status] }));

function StatusBadge({ status }: { status: SourceStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="sources-status"
      style={{ background: color.bg, color: color.text, borderColor: color.border }}
      title={STATUS_LABELS[status]}
    >
      {status}
    </span>
  );
}

/** Kicker'daki "01 · NORM VE PUANLAMA" biçimli metnin içindekiler etiketi. */
function groupLabel(kicker: string): string {
  const parts = kicker.split('·');
  const label = (parts[1] ?? parts[0] ?? kicker).trim();
  return label.charAt(0) + label.slice(1).toLocaleLowerCase('tr');
}

function scrollToGroup(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Kaynakça sayfası — düzenli tek sayfa: sabit içindekiler şeridi, numaralı
 * bölümler ve girdiler, başa dön eylemi. Uygulamada kullanılan bilimsel/teknik
 * kaynakların denetlenmiş tam listesi; yalnızca kimliği doğrulanan kaynaklara
 * APA 7 künyesi verilir, doğrulanamayan bileşenler statüleriyle (C/D/E)
 * işaretlenir. Kaynak uydurulmaz.
 */
export function SourcesPage() {
  return (
    <div className="sources-page">
      <p className="info-lede">
        Bu sayfa, uygulamanın puanlama ve yorum bileşenlerinin dayandığı bilimsel kaynakların
        bağımsız kaynak denetimi sonucudur. Künyeler yalnızca kimliği Crossref, PubMed, yayınevi
        kayıtları veya hakemli dergi kaynakçalarıyla doğrulanan kaynaklara verilmiştir; her kaydın
        kodla formül düzeyinde eşleşme durumu ayrıca işaretlenmiştir. Formülü özgün kaynakla birebir
        doğrulanamayan bileşenler tahminle doldurulmamış, doğrulanamayan hâlleriyle raporlanmıştır.
      </p>

      <div className="sources-layout">
        <aside className="sources-toc" aria-label="Kaynakça bölümleri">
          <span className="policy-toc-heading">İçindekiler</span>
          <ol className="policy-toc-list">
            {GROUPS.map((group, index) => (
              <li key={group.kicker}>
                <a
                  href={`#kaynaklar-${index + 1}`}
                  onClick={event => scrollToGroup(event, `kaynaklar-${index + 1}`)}
                >
                  <span className="policy-toc-no">{String(index + 1).padStart(2, '0')}</span>
                  <span>{groupLabel(group.kicker)}</span>
                  <span className="sources-toc-count">{group.entries.length}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="sources-legend" aria-label="Statü açıklamaları">
            {LEGEND.map(item => (
              <span key={item.status} className="sources-legend-item">
                <StatusBadge status={item.status} />
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </aside>

        <div className="sources-body">
          {GROUPS.map((group, groupIndex) => {
            const groupId = `kaynaklar-${groupIndex + 1}`;
            const groupNo = String(groupIndex + 1).padStart(2, '0');
            return (
              <section key={group.kicker} id={groupId} className="sources-group" aria-label={group.title}>
                <header className="sources-group-head">
                  <span className="sources-kicker">{group.kicker}</span>
                  <h2>{group.title}</h2>
                  <span className="sources-group-count">
                    {group.entries.length} kayıt
                  </span>
                  {group.intro && <p className="sources-intro">{group.intro}</p>}
                </header>
                <ol className="sources-list">
                  {group.entries.map((entry, entryIndex) => (
                    <li key={entry.citation} className="sources-entry">
                      <div className="sources-entry-head">
                        <StatusBadge status={entry.status} />
                        <p className={`sources-citation${entry.isAp7 ? '' : ' is-component'}`}>
                          <span className="sources-entry-no">
                            {groupNo}.{entryIndex + 1}
                          </span>
                          {entry.citation}
                        </p>
                      </div>
                      <p className="sources-role">
                        <b>Uygulamadaki kullanım:</b> {entry.role}
                      </p>
                      <div className="sources-used">
                        {entry.usedIn.map(place => (
                          <span key={place} className="sources-used-chip">
                            {place}
                          </span>
                        ))}
                      </div>
                      {entry.matchNote && <p className="sources-note">{entry.matchNote}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          <footer>
            <p className="sources-foot">
              Kaynak denetimi Eylül 2026 tarihinde tamamlanmıştır. Denetimin tam bileşen–kaynak
              eşleştirme tabloları depoda <code>docs/kaynak-denetimi.md</code> ve <code>docs/mmpi-audit/</code> klasöründedir.
              Bu sayfada yalnızca doğrulanabilir bilgiler yer alır; künyesi doğrulanamayan hiçbir
              bileşene kaynak atfedilmemiştir.
            </p>
            <button
              type="button"
              className="policy-back-top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Icon name="left" size={13} />
              <span>Başa dön</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
