const RIGHTS = [
  {
    title: 'Beck Depresyon ve Beck Anksiyete',
    status: 'UNKNOWN / VERIFY LICENSE · yetkili materyal ve dijital kullanım doğrulanmalı',
    body: 'Bu depoda resmî Türkçe Beck formları için lisans, kullanım yetkisi veya doğrulanmış madde bankası belgesi yoktur. BDI ve BAI ekranları madde/yanıt çapası yayımlamaz; yalnız yetkili form yanında numaralı puan aktarımı yapar. BDI modülü BDI-II olarak sunulmaz.',
    href: 'https://www.pearsonassessments.com/footer/legal-policies.html',
    link: 'Pearson materyal kullanım politikası',
  },
  {
    title: 'SCL-90-R®',
    status: 'UNKNOWN / VERIFY LICENSE · bu kurulumun kullanım yetkisi belgelenmedi',
    body: 'Pearson SCL-90-R® formlarını, puanlama anahtarını ve dijital uygulama/rapor kullanımını ticari ürün olarak sunar. Depoda bu hakları belgeleyen lisans yoktur. Ekran ve çıktı korunan madde/yanıt metnini yeniden üretmez; dağıtım öncesi dijital puanlama yetkisi ayrıca doğrulanmalıdır.',
    href: 'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Symptom-Checklist-90-Revised/p/100000645',
    link: 'Pearson SCL-90-R ürün ve puanlama bilgisi',
  },
  {
    title: 'PHQ-9 ve GAD-7',
    status: 'Çoğaltıma açık · Türkçe form provenansı UNKNOWN / VERIFY LICENSE',
    body: 'PHQ Screeners resmî sayfası PHQ ve GAD-7 ölçekleri ile çevirilerinin izin almadan çoğaltılabileceğini, çevrilebileceğini, gösterilebileceğini ve dağıtılabileceğini belirtir. Buna rağmen depodaki önceki Türkçe ifadelerin otoritatif dağıtılmış/uyarlanmış formla birebir eşliği kanıtlanamadı. Klinik geçerliği uydurmamak için bu sürüm yalnız sayısal aktarım çizelgesi sunar.',
    href: 'https://www.phqscreeners.com/select-screener',
    link: 'PHQ Screeners resmî erişim ve kullanım beyanı',
  },
] as const;

const AUTHORITATIVE_LINKS = [
  { label: 'BDI — Beck ve ark. (1961), JAMA Psychiatry / DOI', href: 'https://doi.org/10.1001/archpsyc.1961.01710120031004' },
  { label: 'BDI/BDI-II ayrımı — APA değerlendirme araçları', href: 'https://www.apa.org/depression-guideline/assessment' },
  { label: 'BAI — Beck ve ark. (1988), DOI', href: 'https://doi.org/10.1037/0022-006X.56.6.893' },
  { label: 'SCL-90-R — Pearson resmî ürün sayfası', href: 'https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Symptom-Checklist-90-Revised/p/100000645' },
  { label: 'SCL-90-R Türkçe — Dağ (1991) bibliyografik kayıt', href: 'https://turkmedline.net/detay/belirti-tarama-listesi-scl-90-rnin-universite-ogrencileri-icin-guvenirligi-ve-gecerligi/d3a3f6156970f7/tr/29+1991' },
  { label: 'GAD-7 Türkçe — Konkan ve ark. (2013) tam makale', href: 'https://www.noropsikiyatriarsivi.com/sayilar/415/buyuk/53-58ing.pdf' },
  { label: 'PHQ/GAD-7 — resmî puanlama yönergesi', href: 'https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf' },
  { label: 'PHQ-9 Türkçe — Sarı ve ark. (2016)', href: 'https://www.alliedacademies.org/articles/turkish-reliability-of-the-patient-health-questionnaire9.html' },
] as const;

const SOURCES = [
  {
    kicker: 'Beck Depresyon — sürüm kararı',
    items: [
      'Kimlik: 1961 özgün BDI / Hisli 1988–1989 Türkçe çalışma ailesi; BDI-II değildir. Önceki seçenek metinleri yetkili Türkçe formdan doğrulanamadığı için dağıtılmaz.',
      'Beck, A. T., Ward, C. H., Mendelson, M., Mock, J., & Erbaugh, J. (1961). An inventory for measuring depression. Archives of General Psychiatry, 4(6), 561–571. DOI: 10.1001/archpsyc.1961.01710120031004.',
      'Hisli, N. (1988). Beck Depresyon Envanteri’nin geçerliği üzerine bir çalışma. Psikoloji Dergisi, 6(22), 118–126; Hisli, N. (1989). Beck Depresyon Envanteri’nin üniversite öğrencileri için geçerliği, güvenirliği. Psikoloji Dergisi, 7(23), 3–13.',
      'Puanlama 21 madde × 0–3 toplamıdır. Doğrulanmamış alt skorlar ve şiddet sınıfları üretilmez. 17 yalnız Türkçe BDI literatüründeki tarama referansıdır; tanı değildir.',
    ],
  },
  {
    kicker: 'Beck Anksiyete — BAI',
    items: [
      'Beck, A. T., Epstein, N., Brown, G., & Steer, R. A. (1988). An inventory for measuring clinical anxiety. Journal of Consulting and Clinical Psychology, 56(6), 893–897. DOI: 10.1037/0022-006X.56.6.893.',
      'Ulusoy, M., Şahin, N. H., & Erkmen, H. (1998). Turkish version of the Beck Anxiety Inventory: Psychometric properties. Journal of Cognitive Psychotherapy, 12(2), 163–172.',
      'Standart sonuç tek 0–63 toplamdır. Eski dört geliştirici alt skoru kaldırılmıştır. 0–7 / 8–15 / 16–25 / 26–63 aralıkları el kitabı bağlamıyla etiketlenir; Türkçe tanı eşiği veya tedavi emri değildir.',
      'Kimlik: 21 madde, 0–3, geçen hafta (bugün dâhil), ağırlıklı olarak yetişkin kullanım bağlamı. Madde ve yanıt çapaları bu depoda yer almaz.',
    ],
  },
  {
    kicker: 'SCL-90-R®',
    items: [
      'Derogatis, L. R. (1994). SCL-90-R: Administration, scoring and procedures manual (3rd ed.). NCS Pearson. Yayıncı: 90 madde, beşli ölçek, 13 yaş ve üzeri, dokuz temel boyut ve üç global indeks.',
      'Dağ, İ. (1991). Belirti Tarama Listesi (SCL-90-R)’nin üniversite öğrencileri için güvenirliği ve geçerliği. Türk Psikiyatri Dergisi, 2(1), 5–12. Örneklem üniversite öğrencileridir; çalışma alt boyutların klinik tanı amacıyla kullanımına yeterli kanıt olmadığını vurgular.',
      'Uygulama yalnız ham dokuz boyut ortalaması ile GSI, PST ve PSDI üretir. “Ek maddeler” onuncu bir boyut olarak raporlanmaz. Norm tablosu, T-puanı ve genel GSI ≥ 1 klinik eşiği uygulanmaz.',
      'Türkçe kaynaklarda zaman yönergesine ilişkin tutarsız ikincil aktarımlar bulunduğundan yetkili Türkçe formun kendi yönergesi esas alınır; UNKNOWN alanı tahminle tamamlanmaz.',
    ],
  },
  {
    kicker: 'GAD-7',
    items: [
      'Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. Archives of Internal Medicine, 166(10), 1092–1097. DOI: 10.1001/archinte.166.10.1092.',
      'Konkan, R., Şenormancı, Ö., Güçlü, O., Aydın, E., & Sungur, M. Z. (2013). GAD-7 Türkçe uyarlaması, geçerlik ve güvenirliği. Nöropsikiyatri Arşivi, 50, 53–58. Klinik örneklemde en uygun tarama referansı 8 bulunmuştur.',
      'Puan 7 madde × 0–3, toplam 0–21’dir. Özgün 5/10/15 belirti bantları gösterilir; Türkçe klinik örneklemdeki 8 puan yalnız tarama referansıdır. Hiçbiri tek başına tanı değildir.',
    ],
  },
  {
    kicker: 'PHQ-9',
    items: [
      'Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9: Validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613. DOI: 10.1046/j.1525-1497.2001.016009606.x.',
      'Sarı, Y. E., Kökoğlu, B., Balcıoğlu, H., Bilge, U., Çolak, E., & Ünlüoğlu, İ. (2016). Turkish reliability of the Patient Health Questionnaire-9. Çalışma 96 yetişkin aile hekimliği başvurusunda güvenirliği bildirmiştir; bu uygulama için tanısal Türkçe kesme değeri doğrulamamıştır.',
      'Puan 9 madde × 0–3, toplam 0–27’dir. Puanlanmayan işlevsellik sorusu ayrı kod olarak saklanabilir. Madde 9 yanıtı toplamdan bağımsız nötr klinik inceleme bayrağıdır; risk yüzdesi veya düzeyi değildir.',
    ],
  },
] as const;

export function SourcesPage() {
  return (
    <div className="sources-page">
      <p className="sources-intro">
        Bu sayfa psikometrik kaynakları, sürüm kararlarını ve materyal kullanım sınırlarını kaydeder. Bir aracın çalışma alanında listelenmesi telifli test materyalini çoğaltma veya dijital puanlama hakkı vermez. UNKNOWN alanlar tahmin edilmez.
      </p>

      <section className="sources-rights" aria-labelledby="sources-rights-title">
        <div className="sources-section-head"><span>KULLANIM SINIRI</span><h2 id="sources-rights-title">Telif, form ve dijital kullanım durumu</h2></div>
        {RIGHTS.map((item) => <article key={item.title} className="sources-right-row"><div><strong>{item.title}</strong><span>{item.status}</span></div><p>{item.body}</p><a href={item.href} target="_blank" rel="noopener noreferrer">{item.link}</a></article>)}
      </section>

      <section className="sources-bibliography" aria-labelledby="sources-links-title">
        <div className="sources-section-head"><span>DOĞRULAMA ZİNCİRİ</span><h2 id="sources-links-title">Otoritatif ve hakemli bağlantılar</h2></div>
        <article className="sources-reference-row"><ul>{AUTHORITATIVE_LINKS.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul></article>
      </section>

      <section className="sources-bibliography" aria-labelledby="sources-bibliography-title">
        <div className="sources-section-head"><span>KAYNAKÇA</span><h2 id="sources-bibliography-title">Araç bazında kimlik ve yorum sınırları</h2></div>
        {SOURCES.map((group) => <article key={group.kicker} className="sources-reference-row"><h3>{group.kicker}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
      </section>
    </div>
  );
}
