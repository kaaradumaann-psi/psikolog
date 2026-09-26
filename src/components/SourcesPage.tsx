const RIGHTS = [
  {
    title: 'Beck Depresyon ve Beck Anksiyete',
    status: 'Lisanslı / çoğaltma kısıtlı',
    body: 'Beck envanterleri telif ve marka koruması altındaki ticari araçlardır. Uygulayıcı resmî formu, güncel el kitabını ve gerekli kullanım hakkını yayıncıdan ayrıca temin etmelidir. Uygulamadaki yanıt aktarım çıktısı test kitapçığı değildir ve madde metni içermez.',
    href: 'https://www.pearsonassessments.com/footer/legal-policies.html',
    link: 'Pearson yasal kullanım politikası',
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

const SOURCES = [
  {
    kicker: 'Beck Depresyon',
    items: [
      'Beck, A. T., Ward, C. H., Mendelson, M., Mock, J., & Erbaugh, J. (1961). An inventory for measuring depression. Archives of General Psychiatry, 4(6), 561–571.',
      'Hisli, N. (1989). Beck Depresyon Envanteri’nin üniversite öğrencileri için geçerliği, güvenirliği. Psikoloji Dergisi, 7(23), 3–13.',
      'Bu çalışma alanındaki bantlar: 0–9 minimal, 10–16 hafif, 17–29 orta, 30–63 şiddetli. Madde 9 > 0 güvenlik değerlendirmesi uyarısıdır; tek başına risk kararı değildir.',
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
