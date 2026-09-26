export type AssessmentKey = 'bdi' | 'bai' | 'scl90' | 'gad7' | 'phq9';

export type AssessmentCatalogEntry = {
  key: AssessmentKey;
  code: string;
  title: string;
  registeredName: string;
  instrumentVersion: string;
  access: 'licensed' | 'free-reproduction';
  accessLabel: string;
  /** Whether authoritative Turkish wording is verified for embedding in this build. */
  itemContent: 'embedded' | 'transfer-only';
  period: string;
  respondentInstruction: string;
  rightsNotice: string;
  printNotice: string;
  citation: string;
};

/**
 * Rights, identity and administration metadata are centralized so web, print,
 * reports and source notes cannot silently describe different instruments.
 */
export const ASSESSMENT_CATALOG: Record<AssessmentKey, AssessmentCatalogEntry> = {
  bdi: {
    key: 'bdi',
    code: 'BDI',
    title: 'Beck Depresyon Envanteri (BDI; BDI-II değil)',
    registeredName: 'Beck Depression Inventory / BDI — original form family',
    instrumentVersion: 'BDI-original-1961-TR-Hisli-1988/1989',
    access: 'licensed',
    accessLabel: 'Yetkili form gerekli',
    itemContent: 'transfer-only',
    period: 'Uygulanan yetkili Türkçe formun yönergesi',
    respondentInstruction: 'Her madde için yetkili Türkçe formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'Bu depoda resmî Türkçe form için kullanım yetkisi veya doğrulanmış madde bankası belgesi bulunmamaktadır. Çalışma alanı madde metni dağıtmaz; uygulayıcı yetkili formu ve gerekli kullanım hakkını ayrıca sağlamalıdır.',
    printNotice: 'Bu çıktı test kitapçığı değildir. Madde metni içermez; yalnız yetkili Hisli Türkçe BDI formu yanında kullanılabilecek 1–21 puan aktarım çizelgesidir. BDI-II için kullanılamaz.',
    citation: 'Kimlik: Beck, Ward, Mendelson, Mock & Erbaugh (1961). Türkçe çalışmalar: Hisli (1988, 1989).',
  },
  bai: {
    key: 'bai',
    code: 'BAI',
    title: 'Beck Anksiyete Envanteri',
    registeredName: 'Beck Anxiety Inventory / BAI',
    instrumentVersion: 'BAI-1988-TR-Ulusoy-1998',
    access: 'licensed',
    accessLabel: 'Lisans ve yetkili form gerekli',
    itemContent: 'transfer-only',
    period: 'Geçen hafta (bugün dâhil); yetkili form yönergesi esas alınır',
    respondentInstruction: 'Her belirti için lisanslı resmî formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'BAI telif ve marka koruması altındaki ticari bir değerlendirme aracıdır. Depoda form veya dijital uygulama lisansı belgesi yoktur. Madde/yanıt metni dağıtılmaz; uygulayıcı yetkili formu ve gerekli dijital puanlama hakkını ayrıca doğrulamalıdır.',
    printNotice: 'Bu çıktı test kitapçığı değildir. Madde veya yanıt çapası içermez; yalnız lisanslı resmî form yanında kullanılabilecek 1–21 sayısal yanıt aktarım çizelgesidir.',
    citation: 'Beck, Epstein, Brown & Steer (1988); Türkçe uyarlama: Ulusoy, Şahin & Erkmen (1998).',
  },
  scl90: {
    key: 'scl90',
    code: 'SCL-90-R',
    title: 'SCL-90-R Belirti Tarama Listesi',
    registeredName: 'SCL-90-R®',
    instrumentVersion: 'SCL-90-R-1994-TR-Dag-1991',
    access: 'licensed',
    accessLabel: 'Lisans ve yetkili form gerekli',
    itemContent: 'transfer-only',
    period: 'Yetkili Türkçe formun kendi yönergesi esas alınır',
    respondentInstruction: 'Her madde için lisanslı resmî formdaki yönergeye göre tek yanıt işaretleyin.',
    rightsNotice: 'SCL-90-R® ticari test materyalidir; Pearson resmî formları, puanlama anahtarını ve dijital uygulama/rapor kullanımını ücretli sunar. Depoda bu kullanımı yetkilendiren belge yoktur. Uygulayıcı resmî materyali ve gerekli dijital puanlama hakkını ayrıca doğrulamalıdır.',
    printNotice: 'Bu çıktı SCL-90-R® test kitapçığı değildir. Madde veya yanıt çapası içermez; yalnız yetkili form yanında kullanılabilecek 1–90 sayısal yanıt aktarım çizelgesidir.',
    citation: 'Derogatis (1994, 3. baskı); Türkçe üniversite öğrencisi çalışması: Dağ (1991).',
  },
  gad7: {
    key: 'gad7',
    code: 'GAD-7',
    title: 'Yaygın Anksiyete Bozukluğu-7',
    registeredName: 'Generalized Anxiety Disorder-7 / GAD-7',
    instrumentVersion: 'GAD-7-2006-TR-Konkan-2013',
    access: 'free-reproduction',
    accessLabel: 'Çoğaltıma açık · Türkçe metin doğrulaması bekliyor',
    itemContent: 'transfer-only',
    period: 'Son 2 hafta',
    respondentInstruction: 'Son 2 hafta içinde resmî Türkçe formdaki her sorunun sizi ne sıklıkla rahatsız ettiğini işaretleyin.',
    rightsNotice: 'PHQ Screeners, GAD-7 ve çevirilerinin izin almadan çoğaltılabileceğini, çevrilebileceğini, gösterilebileceğini ve dağıtılabileceğini belirtir. Ancak bu depodaki önceki Türkçe ifadelerin resmî/uyarlanmış formla birebir eşliği doğrulanamadığından bu sürüm yalnız sayısal yanıt aktarır.',
    printNotice: 'Bu çıktı madde metni içermez. Konkan ve ark. (2013) Türkçe GAD-7 formundan 1–7 yanıtlarını 0–3 olarak aktarmak için kullanılır; 8 puan yalnız o klinik örneklem için tarama referansıdır ve tanı değildir.',
    citation: 'Spitzer, Kroenke, Williams & Löwe (2006); Türkçe uyarlama: Konkan ve ark. (2013).',
  },
  phq9: {
    key: 'phq9',
    code: 'PHQ-9',
    title: 'Hasta Sağlık Anketi-9',
    registeredName: 'Patient Health Questionnaire-9 / PHQ-9',
    instrumentVersion: 'PHQ-9-2001-TR-Sari-2016',
    access: 'free-reproduction',
    accessLabel: 'Çoğaltıma açık · Türkçe metin doğrulaması bekliyor',
    itemContent: 'transfer-only',
    period: 'Son 2 hafta',
    respondentInstruction: 'Son 2 hafta içinde resmî Türkçe formdaki her sorunun sizi ne sıklıkla rahatsız ettiğini işaretleyin.',
    rightsNotice: 'PHQ Screeners, PHQ-9 ve çevirilerinin izin almadan çoğaltılabileceğini, çevrilebileceğini, gösterilebileceğini ve dağıtılabileceğini belirtir. Ancak bu depodaki önceki Türkçe ifadelerin otoritatif dağıtılmış formla birebir eşliği doğrulanamadığından bu sürüm yalnız sayısal yanıt aktarır.',
    printNotice: 'Bu çıktı madde metni içermez. Sarı ve ark. (2016) çalışmasıyla ilişkili Türkçe PHQ-9 formundan 1–9 yanıtlarını 0–3 olarak aktarmak için kullanılır. İşlevsellik sorusu puana katılmaz; madde 9 toplamdan bağımsız değerlendirilir.',
    citation: 'Kroenke, Spitzer & Williams (2001); Türkçe güvenirlik çalışması: Sarı ve ark. (2016).',
  },
};

export function assessmentMeta(key: AssessmentKey): AssessmentCatalogEntry {
  return ASSESSMENT_CATALOG[key];
}
