const SOURCES = [
  {
    kicker: 'Beck Depresyon',
    items: [
      'Beck, A. T., Ward, C. H., Mendelson, M., Mock, J., & Erbaugh, J. (1961). An inventory for measuring depression. Archives of General Psychiatry, 4(6), 561–571.',
      'Hisli, N. (1989). Beck Depresyon Envanteri’nin üniversite öğrencileri için geçerliği, güvenirliği. Psikoloji Dergisi, 7(23), 3–13.',
      'Kesme bantları bu çalışma alanında: 0–9 minimal, 10–16 hafif, 17–29 orta, 30–63 şiddetli. Madde 9 > 0 intihar düşüncesi uyarısıdır.',
    ],
  },
  {
    kicker: 'Beck Anksiyete',
    items: [
      'Beck, A. T., Epstein, N., Brown, G., & Steer, R. A. (1988). An inventory for measuring clinical anxiety. Journal of Consulting and Clinical Psychology, 56(6), 893–897.',
      'Ulusoy, M., Şahin, N. H., & Erkmen, H. (1998). Turkish version of the Beck Anxiety Inventory. Journal of Cognitive Psychotherapy, 12, 163–172.',
      'Kesme bantları: 0–7 minimal, 8–15 hafif, 16–25 orta, 26–63 şiddetli.',
    ],
  },
  {
    kicker: 'SCL-90-R',
    items: [
      'Derogatis, L. R. (1994). SCL-90-R: Symptom Checklist-90-R. Administration, scoring, and procedures manual (3rd ed.). NCS Pearson.',
      'Dağ, İ. (1991). Belirti Tarama Listesi (SCL-90-R)’nin üniversite öğrencileri için güvenirliği ve geçerliği. Türk Psikiyatri Dergisi, 2(1), 5–12.',
      'Boyut puanı, madde ortalamasıdır. GSI, PST ve PSDI genel indekslerdir. GSI ≥ 1.0 klinik eşik uyarısı olarak işaretlenir; norm iddiası tek başına tanı değildir.',
    ],
  },
  {
    kicker: 'GAD-7 ve PHQ-9',
    items: [
      'Spitzer, R. L., Kroenke, K., Williams, J. B. W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder: The GAD-7. Archives of Internal Medicine, 166(10), 1092–1097.',
      'Kroenke, K., Spitzer, R. L., & Williams, J. B. W. (2001). The PHQ-9. Journal of General Internal Medicine, 16(9), 606–613.',
      'GAD-7: 0–4 minimal, 5–9 hafif, 10–14 orta, 15–21 şiddetli. PHQ-9: 0–4 minimal, 5–9 hafif, 10–14 orta, 15–19 orta-ileri, 20–27 şiddetli. PHQ-9 madde 9 güvenlik maddesidir.',
    ],
  },
] as const;

export function SourcesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: 'var(--soft)', lineHeight: 1.6 }}>
        Puanlama kuralları yukarıdaki kaynaklardaki standart toplam ve kesme noktalarını izler. Türkçe madde metinleri klinik uygulama için kısaltılmış karşılıklardır; basılı telifli formun yerine geçmez.
      </p>
      {SOURCES.map((group) => (
        <section key={group.kicker} className="modern-table-card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>{group.kicker}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--soft)', lineHeight: 1.55 }}>
            {group.items.map((item) => (
              <li key={item} style={{ marginBottom: 6 }}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
