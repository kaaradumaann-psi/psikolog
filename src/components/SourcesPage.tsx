const RIGHTS = [
  {
    title: 'Beck Depresyon ve Beck Anksiyete',
    status: 'Yetkili materyal gerekli',
    body: 'Bu depoda resmî Türkçe Beck formu için lisans/yetki veya doğrulanmış madde bankası belgesi bulunmamaktadır. Bu nedenle BDI ekranı madde ve seçenek metni dağıtmaz; yalnız yetkili form yanında numaralı puan aktarımı ve sonuç kaydı yapar. BDI modülü BDI-II olarak sunulmaz.',
    href: 'https://www.pearsonassessments.com/footer/legal-policies.html',
    link: 'Pearson materyal kullanım politikası',
  },
  {
    title: 'SCL-90-R®',
    status: 'Lisanslı / çoğaltma kısıtlı',
    body: 'SCL-90-R® telif, marka ve test güvenliği koruması altındadır. Resmî materyal ve kullanım hakkı ayrıca temin edilmelidir. Uygulamadaki yanıt aktarım çıktısı test maddelerini yeniden üretmez.',
    href: 'https://www.pearsonassessments.com/footer/legal-policies.html',
    link: 'Pearson yasal kullanım politikası',
  },
  {
    title: 'PHQ-9 ve GAD-7',
    status: 'Çoğaltıma açık',
    body: 'Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke ve çalışma arkadaşları tarafından Pfizer Inc. eğitim desteğiyle geliştirilmiştir. Resmî kullanım beyanına göre çoğaltmak, çevirmek, göstermek veya dağıtmak için izin gerekmez. Uygulama bu nedenle danışan için tam boş form çıktısı sunar.',
    href: 'https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care',
    link: 'Pfizer erişim duyurusu',
  },
] as const;

const BDI_AUTHORITATIVE_LINKS = [
  { label: 'Beck ve ark. (1961) — PubMed kaydı', href: 'https://pubmed.ncbi.nlm.nih.gov/13688369/' },
  { label: 'Beck ve ark. (1961) — JAMA Psychiatry / DOI', href: 'https://doi.org/10.1001/archpsyc.1961.01710120031004' },
  { label: 'Türk Psikologlar Derneği — Hisli (1989) yayın kaydı', href: 'https://psikolog.org.tr/yayinlar/turk-psikoloji-dergisi' },
  { label: 'APA — depresyon değerlendirme araçları ve erişim bilgisi', href: 'https://www.apa.org/depression-guideline/assessment' },
  { label: 'Pearson — BDI-II resmî ürün bilgisi (ayrı sürüm)', href: 'https://www.pearsonclinical.in/products/programs/beck-depression-inventory.html' },
  { label: 'Kapçı ve ark. (2008) — Türk yetişkin BDI-II çalışması', href: 'https://onlinelibrary.wiley.com/doi/10.1002/da.20371' },
] as const;

const SOURCES = [
  {
    kicker: 'Beck Depresyon — sürüm kararı',
    items: [
      'Kodda bulunan tarihsel sıra; 1961 BDI / Hisli Türkçe uyarlama ailesiyle ilişkilidir ve BDI-II değildir. Önceki depodaki seçenek metinleri yetkili Türkçe formdan doğrulanamadığı için kaldırılmıştır.',
      'Beck, A. T., Ward, C. H., Mendelson, M., Mock, J., & Erbaugh, J. (1961). An inventory for measuring depression. Archives of General Psychiatry, 4(6), 561–571. DOI: 10.1001/archpsyc.1961.01710120031004.',
      'Hisli, N. (1988). Beck Depresyon Envanteri’nin geçerliği üzerine bir çalışma. Psikoloji Dergisi, 6(22), 118–126; Hisli, N. (1989). Beck Depresyon Envanteri’nin üniversite öğrencileri için geçerliği, güvenirliği. Psikoloji Dergisi, 7(23), 3–13.',
      'Puanlama yalnız 21 madde × 0–3 toplamıdır (0–63). Doğrulanmamış Bilişsel/Duygusal ve Somatik/Performans alt skorları üretilmez. 17 puan yalnız Türkçe BDI literatüründeki tarama referansı olarak gösterilir; tanı veya şiddet sınıfı değildir.',
      'BDI-II ayrı bir 1996 sürümüdür. Pearson kaynağı farklı yazarları, iki haftalık süreyi, 13–80 yaş aralığını ve değişen madde yapısını bildirir; bu modül BDI-II puanlaması yapmaz. Kapçı ve ark. (2008) Türk yetişkin BDI-II çalışmasının 0–12 / 13–18 / 19–28 / 29–63 aralıkları bu BDI modülüne uygulanmaz.',
    ],
  },
  {
    kicker: 'Beck Anksiyete',
    items: [
      'Beck, A. T., Epstein, N., Brown, G., & Steer, R. A. (1988). An inventory for measuring clinical anxiety. Journal of Consulting and Clinical Psychology, 56(6), 893–897.',
      'Ulusoy, M., Şahin, N. H., & Erkmen, H. (1998). Turkish version of the Beck Anxiety Inventory. Journal of Cognitive Psychotherapy, 12, 163–172.',
      'Bu çalışma alanındaki bantlar: 0–7 minimal, 8–15 hafif, 16–25 orta, 26–63 şiddetli.',
    ],
  },
  {
    kicker: 'SCL-90-R',
    items: [
      'Derogatis, L. R. (1994). SCL-90-R: Symptom Checklist-90-R. Administration, scoring, and procedures manual (3rd ed.). NCS Pearson.',
      'Dağ, İ. (1991). Belirti Tarama Listesi (SCL-90-R)’nin üniversite öğrencileri için güvenirliği ve geçerliği. Türk Psikiyatri Dergisi, 2(1), 5–12.',
      'Boyut puanı madde ortalamasıdır. GSI, PST ve PSDI genel indekslerdir. GSI ≥ 1,0 yalnız klinik eşik uyarısı olarak işaretlenir; tek başına tanı değildir.',
    ],
  },
  {
    kicker: 'GAD-7 ve PHQ-9',
    items: [
      'Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. Archives of Internal Medicine, 166(10), 1092–1097.',
      'Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9. Journal of General Internal Medicine, 16(9), 606–613.',
      'GAD-7: 0–4 minimal, 5–9 hafif, 10–14 orta, 15–21 şiddetli. PHQ-9: 0–4 minimal, 5–9 hafif, 10–14 orta, 15–19 orta-ileri, 20–27 şiddetli. PHQ-9 madde 9 ayrıca değerlendirilir.',
    ],
  },
] as const;

export function SourcesPage() {
  return (
    <div className="sources-page">
      <p className="sources-intro">
        Bu sayfa hem psikometrik kaynakları hem de materyal kullanım sınırlarını kaydeder. Bir aracın çalışma
        alanında listelenmesi, telifli test materyalini çoğaltma hakkı vermez. Uygulayıcı güncel yayıncı koşullarını
        ve mesleki yetkinlik gerekliliklerini uygulama öncesinde doğrular.
      </p>

      <section className="sources-rights" aria-labelledby="sources-rights-title">
        <div className="sources-section-head">
          <span>KULLANIM SINIRI</span>
          <h2 id="sources-rights-title">Telif ve basılı form durumu</h2>
        </div>
        {RIGHTS.map((item) => (
          <article key={item.title} className="sources-right-row">
            <div><strong>{item.title}</strong><span>{item.status}</span></div>
            <p>{item.body}</p>
            <a href={item.href} target="_blank" rel="noopener noreferrer">{item.link}</a>
          </article>
        ))}
      </section>

      <section className="sources-bibliography" aria-labelledby="sources-bdi-links-title">
        <div className="sources-section-head">
          <span>BDI KİMLİK DENETİMİ</span>
          <h2 id="sources-bdi-links-title">Birincil ve otoritatif bağlantılar</h2>
        </div>
        <article className="sources-reference-row">
          <h3>Doğrulama zinciri</h3>
          <ul>
            {BDI_AUTHORITATIVE_LINKS.map((source) => (
              <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>
            ))}
          </ul>
        </article>
      </section>

      <section className="sources-bibliography" aria-labelledby="sources-bibliography-title">
        <div className="sources-section-head">
          <span>KAYNAKÇA</span>
          <h2 id="sources-bibliography-title">Araç bazında dayanaklar</h2>
        </div>
        {SOURCES.map((group) => (
          <article key={group.kicker} className="sources-reference-row">
            <h3>{group.kicker}</h3>
            <ul>
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
