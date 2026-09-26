export type AssessmentKey = 'bdi' | 'bai' | 'scl90' | 'gad7' | 'phq9';

export type AssessmentCatalogEntry = {
  key: AssessmentKey;
  code: string;
  title: string;
  registeredName: string;
  access: 'licensed' | 'free-reproduction';
  accessLabel: string;
  period: string;
  respondentInstruction: string;
  rightsNotice: string;
  printNotice: string;
  citation: string;
};

/**
 * Rights and administration metadata are intentionally centralized. UI cards,
 * paper sheets, result printouts and the sources page must not drift into
 * contradictory licensing claims.
 */
export const ASSESSMENT_CATALOG: Record<AssessmentKey, AssessmentCatalogEntry> = {
  bdi: {
    key: 'bdi',
    code: 'BDI',
    title: 'Beck Depresyon Envanteri',
    registeredName: 'Beck Depression Inventory / BDI',
    access: 'licensed',
    accessLabel: 'Lisanslı materyal',
    period: 'Uygulanan formun yönergesindeki zaman aralığını esas alın.',
    respondentInstruction: 'Her madde için lisanslı resmî formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'Beck envanterleri telif ve marka koruması altındaki ticari değerlendirme araçlarıdır. Bu çalışma alanı kullanım veya çoğaltma lisansı sağlamaz; uygulayıcı güncel, resmî formu ve gerekli kullanım hakkını ayrıca temin etmelidir.',
    printNotice: 'Bu çıktı test kitapçığı değildir. Madde metni içermez; yalnız lisanslı resmî form yanında kullanılabilecek yanıt aktarım sayfasıdır.',
    citation: 'Beck, Ward, Mendelson, Mock & Erbaugh (1961); Türkçe uyarlama: Hisli (1989).',
  },
  bai: {
    key: 'bai',
    code: 'BAI',
    title: 'Beck Anksiyete Envanteri',
    registeredName: 'Beck Anxiety Inventory / BAI',
    access: 'licensed',
    accessLabel: 'Lisanslı materyal',
    period: 'Uygulanan formun yönergesindeki zaman aralığını esas alın.',
    respondentInstruction: 'Her belirti için lisanslı resmî formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'Beck envanterleri telif ve marka koruması altındaki ticari değerlendirme araçlarıdır. Bu çalışma alanı kullanım veya çoğaltma lisansı sağlamaz; uygulayıcı güncel, resmî formu ve gerekli kullanım hakkını ayrıca temin etmelidir.',
    printNotice: 'Bu çıktı test kitapçığı değildir. Madde metni içermez; yalnız lisanslı resmî form yanında kullanılabilecek yanıt aktarım sayfasıdır.',
    citation: 'Beck, Epstein, Brown & Steer (1988); Türkçe uyarlama: Ulusoy, Şahin & Erkmen (1998).',
  },
  scl90: {
    key: 'scl90',
    code: 'SCL-90-R',
    title: 'SCL-90-R Belirti Tarama Listesi',
    registeredName: 'SCL-90-R®',
    access: 'licensed',
    accessLabel: 'Lisanslı materyal',
    period: 'Uygulanan formun yönergesindeki zaman aralığını esas alın.',
    respondentInstruction: 'Her madde için lisanslı resmî formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'SCL-90-R® telif, marka ve test güvenliği koruması altındaki ticari bir değerlendirme aracıdır. Bu çalışma alanı kullanım veya çoğaltma lisansı sağlamaz; resmî form ve gerekli kullanım hakkı ayrıca temin edilmelidir.',
    printNotice: 'Bu çıktı SCL-90-R® test kitapçığı değildir. Madde metni içermez; yalnız lisanslı resmî form yanında kullanılabilecek yanıt aktarım sayfasıdır.',
    citation: 'Derogatis (1994); Türkçe uyarlama: Dağ (1991).',
  },
  gad7: {
    key: 'gad7',
    code: 'GAD-7',
    title: 'Yaygın Anksiyete Bozukluğu-7',
    registeredName: 'Generalized Anxiety Disorder-7 / GAD-7',
    access: 'free-reproduction',
    accessLabel: 'Çoğaltıma açık',
    period: 'Son 2 hafta',
    respondentInstruction: 'Son 2 hafta içinde her sorunun sizi ne sıklıkla rahatsız ettiğini işaretleyin.',
    rightsNotice: 'GAD-7, Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke ve çalışma arkadaşları tarafından Pfizer Inc. eğitim desteğiyle geliştirilmiştir. Çoğaltmak, çevirmek, göstermek veya dağıtmak için izin gerekmez.',
    printNotice: 'Danışanın elle doldurabilmesi için tam madde ve yanıt seçenekleri bu çıktıda yer alır. Sonuç tek başına tanı değildir.',
    citation: 'Spitzer, Kroenke, Williams & Löwe (2006).',
  },
  phq9: {
    key: 'phq9',
    code: 'PHQ-9',
    title: 'Hasta Sağlık Anketi-9',
    registeredName: 'Patient Health Questionnaire-9 / PHQ-9',
    access: 'free-reproduction',
    accessLabel: 'Çoğaltıma açık',
    period: 'Son 2 hafta',
    respondentInstruction: 'Son 2 hafta içinde her sorunun sizi ne sıklıkla rahatsız ettiğini işaretleyin.',
    rightsNotice: 'PHQ-9, Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke ve çalışma arkadaşları tarafından Pfizer Inc. eğitim desteğiyle geliştirilmiştir. Çoğaltmak, çevirmek, göstermek veya dağıtmak için izin gerekmez.',
    printNotice: 'Danışanın elle doldurabilmesi için tam madde ve yanıt seçenekleri bu çıktıda yer alır. Madde 9 yanıtı toplam puandan bağımsız olarak klinisyen tarafından değerlendirilmelidir.',
    citation: 'Kroenke, Spitzer & Williams (2001).',
  },
};

export function assessmentMeta(key: AssessmentKey): AssessmentCatalogEntry {
  return ASSESSMENT_CATALOG[key];
}
