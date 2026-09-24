import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileFromAnswers, buildProfileFromRawScoresObject, type ValidityFinding } from '../src/scoring/mmpiScoring';
import {
  clinicalBandFor,
  codeInterpretationForProfile,
  MMPI_PATTERN_CAVEATS,
  codePointInterpretation,
  detectPatterns,
  detectSingleElevations,
} from '../src/scoring/mmpiInterpretation';
import { canonicalCode, resolveCodeInterpretation } from '../src/scoring/mmpiSourceCodes';
import type { ItemAnswer, RawScores } from '../src/workspace/caseTypes';

const baseRaw: RawScores = {
  blank: 0, L: 5, F: 6, K: 12, Hs: 13, D: 21, Hy: 19, Pd: 22, Mf: 29, Pa: 11, Pt: 28, Sc: 30, Ma: 20, Si: 24,
};

function profile(raw: Partial<RawScores>, gender: 'Erkek' | 'Kadın' = 'Erkek') {
  return buildProfileFromRawScoresObject({ ...baseRaw, ...raw } as RawScores, gender);
}

function finding(profile_: ReturnType<typeof profile>, id: '?' | 'L' | 'F' | 'K'): ValidityFinding {
  return profile_.validityAnalysis.findings.find(f => f.id === id)!;
}

describe('geçerlik analizleri kaynak ham puan tablolarına dayanır', () => {
  it('normal ham puanlar tüm skalaları Normal/Düşük-olumlu bantta tutar ve profil geçerlidir', () => {
    const p = profile({});
    assert.equal(p.validityAnalysis.isValid, true);
    assert.equal(p.validityAnalysis.warnings.length, 0);
    assert.equal(p.validityAnalysis.fMinusKNote, null);
    assert.deepEqual(p.validityAnalysis.findings.map(f => f.id), ['?', 'L', 'F', 'K']);
    assert.equal(finding(p, '?').band, 'Düşük');
    assert.equal(finding(p, 'L').band, 'Normal');
    assert.equal(finding(p, 'F').band, 'Normal');
    assert.equal(finding(p, 'K').band, 'Normal');
  });

  it('boş madde bandları: 1-5 Normal, 6-30 Orta, 31+ Belirgin ve geçersiz', () => {
    assert.equal(profile({ blank: 3 }).validityAnalysis.isValid, true);
    assert.equal(finding(profile({ blank: 3 }), '?').band, 'Normal');
    const mid = profile({ blank: 12 });
    assert.equal(finding(mid, '?').band, 'Orta');
    assert.equal(mid.validityAnalysis.isValid, true);
    assert.ok(mid.validityAnalysis.warnings.some(w => w.includes('boş bırakılan maddelere yeniden bakılması')));
    const invalid = profile({ blank: 31 });
    assert.equal(finding(invalid, '?').band, 'Belirgin');
    assert.equal(invalid.validityAnalysis.isValid, false);
  });

  it('F bandları: 8-15 Orta, 16-22 Belirgin (geçerli), 23+ Aşırı Belirgin (geçersiz)', () => {
    assert.equal(finding(profile({ F: 10 }), 'F').band, 'Orta');
    const suspect = profile({ F: 18 });
    assert.equal(finding(suspect, 'F').band, 'Belirgin');
    assert.equal(suspect.validityAnalysis.isValid, true);
    assert.ok(suspect.validityAnalysis.warnings.some(w => w.includes('profil geçersiz olabilir')));
    const invalid = profile({ F: 23 });
    assert.equal(finding(invalid, 'F').band, 'Aşırı Belirgin');
    assert.equal(invalid.validityAnalysis.isValid, false);
  });

  it('üç durumlu geçerlik sınıfı: GECERLI / SUPHELI / GECERSIZ belgelenmiş eşiklere göre', () => {
    // Temiz profil → GEÇERLİ
    assert.equal(profile({}).validityAnalysis.status, 'GECERLI');
    // F ham 16-22 → ŞÜPHELİ (kaynak: "profil geçersiz olabilir")
    assert.equal(profile({ F: 16 }).validityAnalysis.status, 'SUPHELI');
    assert.equal(profile({ F: 18 }).validityAnalysis.status, 'SUPHELI');
    assert.equal(profile({ F: 22 }).validityAnalysis.status, 'SUPHELI');
    // F ham ≥ 23 → GEÇERSİZ
    assert.equal(profile({ F: 23 }).validityAnalysis.status, 'GECERSIZ');
    // Boş ≥ 31 → GEÇERSİZ (F normal olsa bile)
    assert.equal(profile({ blank: 31 }).validityAnalysis.status, 'GECERSIZ');
    // Boş 30 ve F normal → GEÇERLİ (uyarı olabilir ama sınıf düşmez)
    assert.equal(profile({ blank: 30 }).validityAnalysis.status, 'GECERLI');
    // status, isValid ile tutarlı: yalnızca GECERSIZ isValid=false yapar
    assert.equal(profile({ F: 18 }).validityAnalysis.isValid, true);
    assert.equal(profile({ F: 23 }).validityAnalysis.isValid, false);
  });

  it('L bandları: 0-2 Düşük, 3-5 Normal, 6-7 Orta, 8-15 Belirgin', () => {
    assert.equal(finding(profile({ L: 1 }), 'L').band, 'Düşük');
    assert.equal(finding(profile({ L: 5 }), 'L').band, 'Normal');
    assert.equal(finding(profile({ L: 7 }), 'L').band, 'Orta');
    const marked = profile({ L: 15 });
    assert.equal(finding(marked, 'L').band, 'Belirgin');
    assert.ok(marked.validityAnalysis.warnings.some(w => w.startsWith('L ham 15')));
  });

  it('K bandları: 0-4 Düşük (Belirgin), 5-9 Düşük, 10-15 Normal, 16-20 Orta, 21+ Belirgin', () => {
    assert.equal(finding(profile({ K: 2 }), 'K').band, 'Düşük (Belirgin)');
    assert.equal(finding(profile({ K: 9 }), 'K').band, 'Düşük');
    assert.equal(finding(profile({ K: 12 }), 'K').band, 'Normal');
    assert.equal(finding(profile({ K: 18 }), 'K').band, 'Orta');
    assert.equal(finding(profile({ K: 25 }), 'K').band, 'Belirgin');
  });

  it('F-K endeksi kaynağa göre yalnızca 16 nın üstünde uyarır', () => {
    const below = profile({ F: 20, K: 6 }); // F-K = 14
    assert.equal(below.validityAnalysis.fMinusKNote, null);
    const above = profile({ F: 22, K: 2 }); // F-K = 20
    assert.ok(above.validityAnalysis.fMinusKNote);
    assert.match(above.validityAnalysis.fMinusKNote!, /16’nın üstünde/);
    const negative = profile({ F: 2, K: 22 }); // F-K = -20: kaynakta karşılığı yok, K bandı uyarır
    assert.equal(negative.validityAnalysis.fMinusKNote, null);
    assert.ok(negative.validityAnalysis.warnings.some(w => w.startsWith('K ham 22')));
  });

  it('hepsi-Y formu: L 15 Belirgin, F 20 Belirgin, K 29 Belirgin ama profil geçerli', () => {
    const answers: ItemAnswer[] = new Array(566).fill('Y');
    const p = buildProfileFromAnswers(answers, 'Erkek');
    assert.equal(finding(p, 'L').raw, 15);
    assert.equal(finding(p, 'L').band, 'Belirgin');
    assert.equal(finding(p, 'F').raw, 20);
    assert.equal(finding(p, 'F').band, 'Belirgin');
    assert.equal(finding(p, 'K').raw, 29);
    assert.equal(finding(p, 'K').band, 'Belirgin');
    assert.equal(p.validityAnalysis.isValid, true);
  });

  it('hepsi-D formu: F ham 44 → profil geçersiz ve F-K notu var', () => {
    const answers: ItemAnswer[] = new Array(566).fill('D');
    const p = buildProfileFromAnswers(answers, 'Erkek');
    assert.equal(finding(p, 'F').raw, 44);
    assert.equal(finding(p, 'F').band, 'Aşırı Belirgin');
    assert.equal(p.validityAnalysis.isValid, false);
    assert.ok(p.validityAnalysis.fMinusKNote);
  });

  it('L/F/K bulgularında kaynağın T bandı yorumu da taşınır', () => {
    const p = profile({ L: 15, K: 2, F: 18 });
    for (const id of ['L', 'F', 'K'] as const) {
      const f = finding(p, id);
      assert.ok(f.t !== null);
      assert.ok(typeof f.tDetail === 'string' && f.tDetail.length > 20, `${id} T detayı`);
      assert.ok(f.tRange?.startsWith('T '), `${id} T aralığı`);
    }
  });
});

describe('klinik ölçek bandları kaynak T tablolarına dayanır', () => {
  it('Hs bandları: 84 üstü, 75-84, 60-74, 50-59, 21-49', () => {
    assert.equal(clinicalBandFor('Hs', 'Erkek', 90)?.rangeLabel, 'T > 84');
    assert.equal(clinicalBandFor('Hs', 'Erkek', 80)?.rangeLabel, 'T 75-84');
    assert.equal(clinicalBandFor('Hs', 'Erkek', 66.7)?.rangeLabel, 'T 60-74');
    assert.equal(clinicalBandFor('Hs', 'Erkek', 55)?.rangeLabel, 'T 50-59');
    assert.equal(clinicalBandFor('Hs', 'Erkek', 40)?.rangeLabel, 'T 21-49');
  });

  it('D bandları: 85+, 79+, 70-78 ayrımı', () => {
    assert.equal(clinicalBandFor('D', 'Kadın', 90)?.rangeLabel, 'T ≥ 85');
    assert.equal(clinicalBandFor('D', 'Kadın', 79)?.rangeLabel, 'T ≥ 79');
    assert.equal(clinicalBandFor('D', 'Kadın', 75)?.rangeLabel, 'T 70-78');
    assert.equal(clinicalBandFor('D', 'Kadın', 50)?.rangeLabel, 'T 45-59');
  });

  it('Mf bandları cinsiyete göre değişir', () => {
    assert.equal(clinicalBandFor('Mf', 'Erkek', 75)?.rangeLabel, 'T 70-79');
    assert.equal(clinicalBandFor('Mf', 'Kadın', 75)?.rangeLabel, 'T > 65');
    assert.equal(clinicalBandFor('Mf', 'Kadın', 60)?.rangeLabel, 'T 56-65');
    assert.equal(clinicalBandFor('Mf', 'Erkek', 35)?.rangeLabel, 'T 26-40');
    assert.equal(clinicalBandFor('Mf', 'Kadın', 35)?.rangeLabel, 'T 26-40');
  });

  it('Sc 100+ ve Pt 84+ özel üst bantları', () => {
    assert.equal(clinicalBandFor('Sc', 'Erkek', 105)?.rangeLabel, 'T ≥ 100');
    assert.equal(clinicalBandFor('Sc', 'Erkek', 80)?.rangeLabel, 'T ≥ 75');
    assert.equal(clinicalBandFor('Pt', 'Kadın', 84)?.rangeLabel, 'T ≥ 84');
    assert.equal(clinicalBandFor('Pt', 'Kadın', 80)?.rangeLabel, 'T 75-83');
  });

  it('profil üzerindeki band etiketi ölçeğin T puanıyla eşleşir (ör. Hs ~71.7 → 75-84 değil 60-74)', () => {
    const p = profile({ K: 0, Hs: 22 });
    const hs = p.clinical.find(s => s.id === 'Hs')!;
    const band = clinicalBandFor('Hs', 'Erkek', hs.tScore)!;
    assert.ok(hs.tScore >= 70 && hs.tScore < 75);
    assert.equal(band.rangeLabel, 'T 60-74');
  });
});

describe('tek ölçek yükselmeleri kaynak kurallarıyla bulunur', () => {
  it('sadece D 70 üzerindeyse tek D yükselmesi raporlanır', () => {
    const p = profile({ D: 31 });
    const hits = detectSingleElevations(p);
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.scale, 'D');
    assert.match(hits[0]!.entry.rule, /70 T/);
  });

  it('Pd diğerlerinden en az 10 T yüksekse tek Pd yükselmesi raporlanır', () => {
    const p = profile({ K: 0, Pd: 33 });
    const pd = p.clinical.find(s => s.id === 'Pd')!;
    assert.ok(pd.tScore >= 70);
    const hits = detectSingleElevations(p);
    assert.deepEqual(hits.map(h => h.scale), ['Pd']);
  });

  it('çoklu yükselmelerde tek ölçek yorumu verilmez', () => {
    const p = profile({ D: 31, Pt: 40 });
    assert.equal(detectSingleElevations(p).length, 0);
  });
});

describe('kod analizleri kaynak kod tablolarına dayanır', () => {
  it('kanonikleştirme iki sıralamayı aynı koda indirir', () => {
    assert.equal(canonicalCode('21'), '12');
    assert.equal(canonicalCode('86'), '68');
  });

  it('12 ve 21 aynı kaynak yorumunu verir; olası tanılar korunur', () => {
    const a = codePointInterpretation('12');
    const b = codePointInterpretation('21');
    assert.ok(a && b);
    assert.equal(a, b);
    assert.equal(a!.code, '12/21');
    assert.ok(a!.diagnosis!.includes('Somatizasyon bozukluğu'));
  });

  it('68/86 paranoid vadi yorumunu ve 89/98 şizofreni tanısını içerir', () => {
    assert.match(codePointInterpretation('68')!.text, /Paranoid vadi/i);
    assert.ok(codePointInterpretation('98')!.diagnosis!.includes('Şizofreni'));
  });

  it('kaynakta olmayan kodlar undefined döner', () => {
    assert.equal(codePointInterpretation('11'), undefined);
    assert.equal(codePointInterpretation(undefined), undefined);
  });
});

describe('desen göstergeleri kaynak konfigürasyonlarını kullanır', () => {
  it('konversiyon vadisi: Hs ve Hy ≥ 70 T, D’den ≥ 10 T yüksek (s.160)', () => {
    // CHANGE-015 öncesi bu test profile({ K: 0, Hs: 22, Hy: 27, D: 23 }) =
    // 66.7/66.3/59.2 üzerinden vuruğu doğruluyordu — o eşik (65/5) kaynakta yoktu
    // (CONFLICT-041 #1). Artık aynı profil **vurmuyor**; aşağıdaki kaynak-uyumlu vuru.
    const kaynakDisi = profile({ K: 0, Hs: 22, Hy: 27, D: 23 });
    assert.equal(detectPatterns(kaynakDisi).find(pt => pt.id === 'conversion-v')!.hit, false);
    const p = profile({ K: 0, Hs: 23, Hy: 31, D: 21 });
    const hit = detectPatterns(p).find(pt => pt.id === 'conversion-v')!;
    assert.equal(hit.hit, true);
  });

  it('yardım çağrısı profili: F yüksek, 2 ve 7; 6, 8, 9 dan yüksek', () => {
    const p = profile({ F: 18, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 });
    const hit = detectPatterns(p).find(pt => pt.id === 'cry-for-help')!;
    assert.equal(hit.hit, true);
  });

  it('psikotik V: Pa ve Sc ≥ 80 T, Pt ≥ 70 T (s.161)', () => {
    // CHANGE-015 öncesi: Pa 74.5 / Sc 74.5 bandı da vuruyordu (eşik 70 idi) —
    // CONFLICT-041 #2. Kaynağın düzeyi 80 T → aralık artık vurmuyor.
    const aralikta = profile({ Pa: 21, Sc: 52, Pt: 34, K: 0 });
    assert.equal(detectPatterns(aralikta).find(pt => pt.id === 'psychotic-v')!.hit, false);
    const p = profile({ Pa: 24, Sc: 58, Pt: 43, K: 0 });
    const hit = detectPatterns(p).find(pt => pt.id === 'psychotic-v')!;
    assert.equal(hit.hit, true);
  });

  it('normal profilde hiçbir kritik desen görülmez', () => {
    const p = profile({});
    const hits = detectPatterns(p).filter(pt => pt.hit);
    assert.deepEqual(hits, []);
  });

  // CHANGE-014 (DECISION-029/A) — kaynağın nevrotik üçlü konfigürasyonları
  // (s.103-106, Şekil 18-20). Eşikler kitap metninden: "üç alt test de 70 T puanın
  // üzerinde", "Hs 70 T puanının altındayken 2 ve 3 70 T'nin üzerinde" vb.
  it('basamak orantısı: üçü de > 70 T ve Hs > D > Hy (Şekil 18)', () => {
    const p = profile({ K: 0, Hs: 26, D: 32, Hy: 29 });
    const hit = detectPatterns(p).find(pt => pt.id === 'neurotic-step')!;
    assert.equal(hit.hit, true);
    assert.equal(hit.source, 's.103-104 · Şekil 18');
    assert.equal(detectPatterns(p).find(pt => pt.id === 'neurotic-rising')!.hit, false);
  });

  it('şapka: Hs < 70 T iken D ve Hy > 70 T ve en yüksek D (Şekil 19)', () => {
    const p = profile({ K: 0, Hs: 18, D: 34, Hy: 30 });
    assert.equal(detectPatterns(p).find(pt => pt.id === 'neurotic-hat')!.hit, true);
    assert.equal(detectPatterns(p).find(pt => pt.id === 'neurotic-step')!.hit, false);
    // Hs de 70 üzerine çıkarsa şapka bozulur:
    const notHat = profile({ K: 0, Hs: 24, D: 34, Hy: 30 });
    assert.equal(detectPatterns(notHat).find(pt => pt.id === 'neurotic-hat')!.hit, false);
  });

  it('yükselen eğilim: üçü de > 70 T ve Hs < D < Hy (Şekil 20)', () => {
    const p = profile({ K: 0, Hs: 22, D: 33, Hy: 32 });
    const hit = detectPatterns(p).find(pt => pt.id === 'neurotic-rising')!;
    assert.equal(hit.hit, true);
    assert.match(hit.source ?? '', /\u015eekil 20/);
  });
});

describe('CHANGE-014 (DECISION-029/A) — profil bağlamlı kod yorumu', () => {
  it('blok-yerel kodlar yorumu doğru gövdeyle gelir; kırpma yoktur', () => {
    const p = profile({});
    const si = codeInterpretationForProfile('049', p)!;
    assert.equal(si.entry.code, '049');
    assert.equal(si.entry.block, 'Si');
    // kaynakta ayrı başlık olan üç haneli kod artık BAŞKA koda düşmüyor:
    // Pt bloğu göçüyle (CHANGE-023) 794 kendi gövdesiyle çözümlenir (79'a kırpılmaz)
    assert.equal(codeInterpretationForProfile('794', p)?.entry.code, '794');
    // Sc bloğu göçüyle (CHANGE-024) 8726 kendi gövdesiyle çözümlenir
    assert.equal(codeInterpretationForProfile('8726', p)?.entry.code, '8726 / Yüksek 9');
    assert.equal(codeInterpretationForProfile('931', p), undefined);
    assert.equal(codeInterpretationForProfile('314', p), undefined);
  });

  it('koşullu ek yorumlar yalnız profil karşılık verdiğinde listelenir', () => {
    const dusuk = profile({ K: 0 });
    assert.deepEqual(codeInterpretationForProfile('27', dusuk)!.activeConditions, [], 'D ve Pt 85 T altında → koşul susar');
    const yuksek = profile({ K: 0, D: 40 });
    const hit = codeInterpretationForProfile('27', yuksek)!.activeConditions;
    assert.equal(hit.length, 1);
    assert.match(hit[0].quote, /85 T puanının üstünde/);
    assert.equal(hit[0].source, 's.87');
  });

  it('64/46 kaydındaki 8-yükselmesi notu koşul olarak devreye giriyor', () => {
    const yuksekSc = profile({ K: 0, Sc: 54 });
    assert.equal((yuksekSc.scales.find(x => x.id === 'Sc')!.tScore) > 70, true, 'test profili Sc > 70 T üretmeli');
    assert.equal(codeInterpretationForProfile('64', yuksekSc)!.activeConditions.length, 1);
    const dusukSc = profile({ K: 0 });
    assert.deepEqual(codeInterpretationForProfile('64', dusukSc)!.activeConditions, []);
  });
});

describe('rapor sekmeleri kaynak metinlerini uçtan uca render eder', () => {
  it('geçerlik, klinik, kod ve ek sekmeler kaynak içerikle sunucuda render olur', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIValidityTab } = await import('../src/components/results/MMPIValidityTab');
    const { MMPIClinicalTab } = await import('../src/components/results/MMPIClinicalTab');
    const { MMPICodeTab } = await import('../src/components/results/MMPICodeTab');
    const { MMPIExtraTab } = await import('../src/components/results/MMPIExtraTab');

    const answers: ItemAnswer[] = new Array(566).fill('Y');
    const p = buildProfileFromAnswers(answers, 'Erkek');

    const validity = renderToStaticMarkup(createElement(MMPIValidityTab, { profile: p }));
    assert.match(validity, /F-K Endeksi/);
    // hepsi-Y: L ham 15, F ham 20, K ham 29 → üçü de kaynak tablosunda "Belirgin"
    assert.match(validity, /Ham 8-15/);
    assert.match(validity, /Ham 16-22/);
    assert.match(validity, /Ham 21 ve üstü/);
    // Yeni göstergeler: TR, Dikkatsizlik ve geçerlik konfigürasyonu kartları
    assert.match(validity, /TR Endeksi/);
    assert.match(validity, /Dikkatsizlik Endeksi/);
    assert.match(validity, /L \/ F \/ K Konfigürasyonu/);

    const clinical = renderToStaticMarkup(createElement(MMPIClinicalTab, { profile: p }));
    // Ölçek Bazlı Detaylı Klinik Rapor (Graham 1987) kartları
    assert.match(clinical, /T-skoru 70 ve üzeri veya 40 ve altı olan ölçekler klinik olarak anlamlı kabul edilir/);
    assert.match(clinical, /Hipokondriazis/);
    assert.match(clinical, /KLİNİK YÜKSEKLİK/);
    assert.match(clinical, /KLİNİK AÇIKLAMA VE ANALİZ/);
    assert.match(clinical, /\(GRAHAM 1987\)/);
    assert.match(clinical, /Demografik ve Klinik Notlar/);
    assert.match(clinical, /EK KLİNİK BİLGİLER/);
    assert.match(clinical, /Tablo 8:/);
    assert.match(clinical, /K Eklemeli bir alt testtir\./);
    assert.match(clinical, /\(Savaşır, 1981\)/);
    assert.match(clinical, /Kaynak: Graham \(1987\)/);
    // Satır içi sayfa referansı yok; kaynak yalnız kart altlığında (footer'da sayfa aralığı serbest)
    const clinicalBody = clinical.replace(/<footer class="dossier-source">[\s\S]*?<\/footer>/g, '');
    assert.doesNotMatch(clinicalBody, /s\.\d/);
    // Uzun kaynak listeleri (Graham 1987, demografik notlar, madde tabloları)
    // kendi açılır-kapanır bölümündedir; diğer sekmelerle AYNI bileşen
    // (DisclosureRow) kullanıldığı için davranış sekmeden sekmeye değişmez.
    assert.match(clinical, /aria-expanded="true"/, 'en belirgin ölçeğin Graham listesi açık gelir');
    assert.match(clinical, /aria-expanded="false"/, 'diğer uzun listeler kapalı gelir');
    assert.match(clinical, /aria-controls="/);
    assert.match(clinical, /Tümünü aç/);
    // İçerik DOM'dan çıkarılmaz (hidden ile gizlenir): kapalı bölüm de metnini
    // korur, böylece ekran okuyucu ve yazdırma çıktısı eksik kalmaz.
    assert.match(clinical, /hidden=""/);
    assert.match(clinicalBody, /Aşırı bedensel uğraşları vardır/);

    const code = renderToStaticMarkup(createElement(MMPICodeTab, { profile: p }));
    // Arayüzde dosya adı (kaynak.pdf) asla görünmez; başlık yalnızca kod yorumunu anar.
    assert.match(code, /Kod Yorumu/);
    assert.doesNotMatch(code, /kaynak\.pdf/);

    const extra = renderToStaticMarkup(createElement(MMPIExtraTab, { profile: p }));
    assert.match(extra, /Konversiyon Vadisi/);
    assert.match(extra, /Yardım Çağrısı Profili/);
    assert.match(extra, /Paranoid Vadi/);
  });
});

describe('yeni analiz bölümleri uçtan uca render olur', () => {
  it('sekmeli panel ve yazdırma raporu, türetilmiş ölçekler ve kritik bulgular kaynak içerikle render olur', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIResultsPanel } = await import('../src/components/results/MMPIResultsPanel');
    const { MMPIPrintReport } = await import('../src/components/results/MMPIPrintReport');
    const { MMPIDerivedSection } = await import('../src/components/results/MMPIDerivedSection');
    const { MMPICriticalSection } = await import('../src/components/results/MMPICriticalSection');

    // İntihar maddesini tetikleyen karışık bir cevap seti
    const answers: ItemAnswer[] = new Array(566).fill('D');
    answers[201] = 'D'; // madde 202
    answers[138] = 'D'; // madde 139
    const p = buildProfileFromAnswers(answers, 'Erkek');

    // Sekmeli çalışma görünümü: bölüm başlıkları sekme etiketi olarak bir arada
    const panel = renderToStaticMarkup(createElement(MMPIResultsPanel, { profile: p, clientName: 'Denek A', answers }));
    assert.match(panel, /Genel Bakış/);
    assert.match(panel, /Geçerlik Analizleri/);
    assert.match(panel, /Klinik Ölçekler/);
    assert.match(panel, /Kod Analizleri/);
    assert.match(panel, /Türetilmiş Ölçekler/);
    assert.match(panel, /Kritik Bulgular/);
    assert.match(panel, /Soru Yanıtları/);
    // Sözleşme: "Yapay Zekâ Yorumu" sekme şeridinin EN SON sekmesidir.
    assert.match(panel, /Yapay Zekâ Yorumu/);
    assert.ok(
      panel.indexOf('Soru Yanıtları') < panel.indexOf('Yapay Zekâ Yorumu'),
      'Yapay Zekâ Yorumu sekmesi Soru Yanıtları sekmesinden sonra (en sonda) görünmeli',
    );
    // Profil özeti şeridi
    assert.match(panel, /Geçerli Profil|Şüpheli Profil|Geçersiz Profil/);
    // Dosya adı sayfalarda asla görünmez
    assert.doesNotMatch(panel, /kaynak\.pdf/i);

    // Yazdırma/PDF raporu: gerekli MMPI bölümleri profesyonel düzende
    const print = renderToStaticMarkup(
      createElement(MMPIPrintReport, {
        profile: p,
        meta: {
          fullName: 'Denek A',
          testDate: '2026-09-18',
          reportDate: '2026-09-18',
          psychologist: 'Uzman',
          gender: 'Erkek',
          age: '24',
          occupation: '',
          education: '',
          method: '',
          duration: '',
          reason: '',
          followUp: '',
          marital: '',
          expertNotes: 'Bulgular klinik görüşmeyle birlikte değerlendirildi; izlem önerildi.',
          notesUpdatedAt: '2026-09-19T10:00:00.000Z',
        },
      }),
    );
    assert.match(print, /MMPI Klinik Raporu/);
    // B4: uzman notu rapora aktarılır; not boşken bölüm basılmaz (alttaki ayrı render).
    assert.match(print, /Uzman Değerlendirme Notu/);
    assert.match(print, /izlem önerildi/);
    assert.match(print, /Profil Grafiği/);
    assert.match(print, /Klinik Ölçekler/);
    assert.match(print, /Geçerlik Analizi/);
    assert.match(print, /Türetilmiş Ölçekler/);
    assert.match(print, /Kritik Bulgular/);
    assert.match(print, /GEÇERLİ|ŞÜPHELİ|GEÇERSİZ/);
    assert.doesNotMatch(print, /kaynak\.pdf/i);

    // Not boş bırakılınca "Uzman Değerlendirme Notu" bölümü hiç basılmaz.
    const printNoNotes = renderToStaticMarkup(
      createElement(MMPIPrintReport, {
        profile: p,
        meta: {
          fullName: 'Denek A', testDate: '2026-09-18', reportDate: '2026-09-18',
          psychologist: 'Uzman', gender: 'Erkek', age: '24', occupation: '', education: '',
          method: '', duration: '', reason: '', followUp: '', marital: '', expertNotes: '',
        },
      }),
    );
    assert.doesNotMatch(printNoNotes, /Uzman Değerlendirme Notu/);

    const derived = renderToStaticMarkup(createElement(MMPIDerivedSection, { profile: p }));
    assert.match(derived, /Goldberg Ayrım Endeksi/);
    assert.match(derived, /Taulbee İndeksi/);
    assert.match(derived, /Peterson İndeksi/);
    assert.match(derived, /MacAndrew Alkolizm Ölçeği/);
    assert.match(derived, /Barron Ego Gücü/);
    assert.match(derived, /Welsh Anksiyete/);
    assert.match(derived, /Wiggins/);
    assert.match(derived, /Narsisistik Kişilik Özellikleri/);
    assert.match(derived, /Sınır \(Borderline\) Kişilik Özellikleri/);
    // Wiggins içerik ölçekleri varsayılan olarak kapalıdır (istenince açılır).
    const wiggins = /<span class="mmpi-disc-title">Wiggins İçerik Ölçekleri<\/span>([\s\S]*?)$/.exec(derived);
    assert.ok(wiggins, 'Wiggins bölümü render edilmeli');
    assert.match(wiggins![1]!.slice(0, 4000), /class="mmpi-disc-body" hidden=""/);

    const critical = renderToStaticMarkup(createElement(MMPICriticalSection, { profile: p }));
    assert.match(critical, /Klinik İzlenimler/);
    assert.match(critical, /Kritik Patolojik Maddeler/);
    assert.match(critical, /İntihar Riski \/ Depresyon/);
    assert.match(critical, /Kendine\/Başkasına Zarar Verme/);
    assert.doesNotMatch(critical, /kaynak\.pdf/i);
  });

  it('ham puan kaydında madde düzeyi bölümler açıklayıcı not gösterir', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIDerivedSection } = await import('../src/components/results/MMPIDerivedSection');
    const { MMPICriticalSection } = await import('../src/components/results/MMPICriticalSection');
    const { MMPIValidityTab } = await import('../src/components/results/MMPIValidityTab');
    const p = profile({});
    const derived = renderToStaticMarkup(createElement(MMPIDerivedSection, { profile: p }));
    assert.match(derived, /ham puan yöntemiyle girildiği için hesaplanamıyorlar/);
    const critical = renderToStaticMarkup(createElement(MMPICriticalSection, { profile: p }));
    assert.match(critical, /ham puan yöntemiyle girildiği için kritik maddeler listelenemiyor/);
    const validity = renderToStaticMarkup(createElement(MMPIValidityTab, { profile: p }));
    assert.match(validity, /TR, dikkatsizlik ve konfigürasyon analizleri madde düzeyinde/);
  });
});

describe('CHANGE-014 (DECISION-029/A) — kod sekmesi blok-yerel gövdeyi ve koşullu notu render eder', () => {
  /** Ham puan profili: Pa en yüksek, Pd ikinci → profil kodu 64 (Pa bloğu). */
  const codeProfile = (over: Record<string, number> = {}) =>
    buildProfileFromRawScoresObject(
      { blank: 0, L: 5, F: 6, K: 0, Hs: 5, D: 11, Hy: 13, Pd: 30, Mf: 29, Pa: 110, Pt: 28, Sc: 30, Ma: 20, Si: 24, ...over } as never,
      'Erkek',
    );

  it('64/46 Pa gövdesi ve blok etiketi görünür; Sc yükselmediyse koşul kutusu gelmez', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPICodeTab } = await import('../src/components/results/MMPICodeTab');
    const html = renderToStaticMarkup(createElement(MMPICodeTab, { profile: codeProfile() }));
    assert.match(html, /64\/46/);
    assert.match(html, /immat\u00fcr, narsisistik, pasif- ba\u011f\u0131ml\u0131 ki\u015filerdir/);
    assert.match(html, /Paranoya \(6\)/, 'blok etiketi alt testin tam ad\u0131ndan gelir');
    assert.doesNotMatch(html, /Ko\u015fullu ek yorum/);
  });

  it('Sc 70 T üzerine ç\u0131k\u0131nca "8 alt testi yükselmişse" notu koşullu kutuda görünür', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPICodeTab } = await import('../src/components/results/MMPICodeTab');
    const html = renderToStaticMarkup(createElement(MMPICodeTab, { profile: codeProfile({ Pd: 38, Sc: 48 }) }));
    assert.match(html, /Ko\u015fullu ek yorum/);
    assert.match(html, /8 alt testi de yükselmişse süreç daha kötü olur/);
    // Metin içinde sayfa referansı gösterilmez (kullanıcı kuralı); kaynak veri katmanında kalır
    assert.doesNotMatch(html, /s\.\d/);
  });

  it('yazdırma raporu da blok-yerel kaydı kullanır', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIPrintReport } = await import('../src/components/results/MMPIPrintReport');
    const html = renderToStaticMarkup(
      createElement(MMPIPrintReport, {
        profile: codeProfile(),
        meta: { fullName: 'Denek A', testDate: '2026-09-22', reportDate: '2026-09-22', gender: 'Erkek', age: '24' },
      }),
    );
    assert.match(html, /64\/46/);
    assert.match(html, /immat\u00fcr, narsisistik/);
  });
});

describe('PHASE 10 batch 22 → DECISION-030/A (CHANGE-015) — BÖLÜM 6 profil örüntüleri (kitap s.159-169)', () => {
  // BÖLÜM 6 “MMPI’ı Yorumlama Yaklaşımı” 10 numaralı örüntü veriyor (Şekil 23-32,
  // s.160-169). Eşikler **görsel okumalı** (150 dpi tam sayfa, .audit/pages/p088_*…
  // p092_*; docs/mmpi-audit/SOURCE_FACTS.md → SOURCE-B6-001). Batch 22 bu satırları
  // “kodda YOK / sapma var” kilidi olarak yazdı; DECISION-030/A (kullanıcı onayı
  // “A’dan devam et”) eşikleri kaynağa çekti ve 7 örüntüyü ekledi → kilitlerin yönü
  // bilinçli olarak çevrildi (TEST_AUDIT.md · CHANGE-015).
  // PHASE 16 (MISSING-KPLUS-001): k-plus (Mark & Seeman 1963, s.57 · Şekil 16) eklendi → 19 kayıt.
  const kitapIds = [
    'k-plus',
    'conversion-v', 'cry-for-help', 'psychotic-v', 'depressive-27', '49', '89',
    'neurotic-triad', 'neurotic-step', 'neurotic-hat', 'neurotic-rising',
    'kus-kanadi', 'pasif-agresif-v', 'pozitif-egim', 'negatif-egim', 'yuzen-profil',
    'batik-profil', 'sinir-profil', 'multi-high',
  ];
  const byId = (p: ReturnType<typeof profile>, id: string) => {
    const found = detectPatterns(p).find(x => x.id === id);
    assert.ok(found, `desen kaydı olmalı: ${id}`);
    return found!;
  };

  it('#0 K+ Profili (Mark & Seeman 1963, s.57 · Şekil 16 · MISSING-KPLUS-001): K ve L > F, K-F ≥ 5, klinik < 70, ≥6 klinik ≤ 60', () => {
    const kp = byId(profile({ K: 0 }), 'k-plus');
    assert.equal(kp.rule, 'K > F ∧ L > F ∧ K − F ≥ 5 T ∧ klinik T < 70 ∧ en az 6 klinik T ≤ 60');
    assert.match(kp.quote ?? '', /Mark ve Seeman \(1963\) bu tür profilleri K\+ profili olarak adlandırmaktadır/);
    assert.equal(kp.source, 's.57 · Şekil 16');

    // Pozitif vuru örneği: L=55 T, F=45 T, K=58 T (K-F=13 ≥ 5, K>F, L>F), tüm klinik testler < 70 T ve ≥ 6 tanesi ≤ 60 T
    const pozitif = profile({ L: 8, F: 4, K: 18, Hs: 10, D: 18, Hy: 18, Pd: 14, Mf: 22, Pa: 8, Pt: 12, Sc: 14, Ma: 14, Si: 20 });
    assert.equal(byId(pozitif, 'k-plus').hit, true);

    // Negatif sınır kontrolleri:
    // 1) K - F < 5 T (K=50 T, F=48 T, fark=2) → vurmaz
    const kFarkAz = profile({ L: 7, F: 5, K: 12, Hs: 10, D: 18, Hy: 18, Pd: 14, Mf: 22, Pa: 8, Pt: 12, Sc: 14, Ma: 14, Si: 20 });
    // 2) Bir klinik ölçek ≥ 70 T (Hs=75 T) → vurmaz
    const klinikYuksek = profile({ L: 8, F: 4, K: 18, Hs: 25, D: 18, Hy: 18, Pd: 14, Mf: 22, Pa: 8, Pt: 12, Sc: 14, Ma: 14, Si: 20 });
    assert.equal(byId(klinikYuksek, 'k-plus').hit, false);
    // 3) 6'dan az klinik ölçek ≤ 60 T (5 ölçek 65 T) → vurmaz
    const besOlcekDusuk = profile({ L: 8, F: 4, K: 18, Hs: 19, D: 28, Hy: 27, Pd: 28, Mf: 30, Pa: 8, Pt: 12, Sc: 14, Ma: 14, Si: 20 });
    assert.equal(byId(besOlcekDusuk, 'k-plus').hit, false);
  });

  it('#1 Konversiyon V: kaynak eşiği 70 T / 10 T koda çekildi (eski 65/5 sapması kapandı)', () => {
    // s.160 (Şekil 23): “Test Hs ve Hy, D alt testinden 10 ya da daha fazla T puanı
    // yüksektir ve Hs ve Hy en az 70 T puanındadır.”
    const cv = byId(profile({ K: 0 }), 'conversion-v');
    assert.equal(
      cv.rule,
      'Hs ≥ 70 T ∧ Hy ≥ 70 T ∧ ikisinin en düşüğü D’den en az 10 T yüksek',
    );
    assert.match(cv.quote ?? '', /en az 70 T puanındadır/);
    assert.equal(cv.source, 's.160 · Şekil 23');

    // Eski **yanlış pozitif** artık vurmuyor (66.7 / 66.3 / 59.2):
    const kaynakDisi = profile({ K: 0, Hs: 20, Hy: 27, D: 25 });
    assert.equal(byId(kaynakDisi, 'conversion-v').hit, false);
    // Kaynak tanımını karşılayan profil vurmaya devam ediyor (yanlış negatif yok):
    assert.equal(byId(profile({ K: 0, Hs: 23, Hy: 31, D: 21 }), 'conversion-v').hit, true);

    // Kural ↔ davranış kilidi: eşiğin tam üzerinden ve altından geçen profiller.
    for (const raw of [{}, { Hs: 23 }, { Hy: 31 }, { Hs: 23, Hy: 31 }, { Hs: 23, Hy: 31, D: 30 }, { D: 30 }]) {
      const p = profile({ K: 0, ...raw });
      const t = (id: string) => p.scales.find(s => s.id === id)!.tScore;
      const beklenen = t('Hs') >= 70 && t('Hy') >= 70 && Math.min(t('Hs'), t('Hy')) - t('D') >= 10;
      assert.equal(byId(p, 'conversion-v').hit, beklenen, `ham ${JSON.stringify(raw)} → ${beklenen}`);
    }
  });

  it('#2 Paranoid V: kaynak 80/80 T (+ Pt 70 T) koda çekildi (eski 70/70 sapması kapandı)', () => {
    // s.161 (Şekil 24): “Pa ve Sc alt testleri 80 T puanında, Pt alt ölçeği ise 70 T
    // puanındadır.”
    const pv = byId(profile({ K: 0 }), 'psychotic-v');
    assert.equal(pv.rule, 'Pa ≥ 80 T ∧ Sc ≥ 80 T ∧ Pt ≥ 70 T ∧ Pa ve Sc, Pt’den yüksek');
    assert.match(pv.quote ?? '', /80 T puanında/);
    assert.equal(pv.source, 's.161 · Şekil 24');

    // Eski **yanlış pozitif** (Pa 74.5 / Sc 74.5 / Pt 59.7) artık vurmuyor:
    assert.equal(byId(profile({ K: 0, Pa: 21, Sc: 52, Pt: 34 }), 'psychotic-v').hit, false);
    // Kaynak düzeylerini karşılayan profil vuruyor:
    assert.equal(byId(profile({ K: 0, Pa: 24, Sc: 58, Pt: 43 }), 'psychotic-v').hit, true);
    // Pt eşiği (kullanıcı onayındaki üçüncü koşul): Pt 69.2 → vurmaz.
    assert.equal(byId(profile({ K: 0, Pa: 24, Sc: 58, Pt: 40 }), 'psychotic-v').hit, false);

    for (const raw of [{}, { Pa: 24 }, { Sc: 58 }, { Pa: 24, Sc: 58 }, { Pa: 24, Sc: 58, Pt: 43 }, { Pa: 24, Sc: 58, Pt: 47 }]) {
      const p = profile({ K: 0, ...raw });
      const t = (id: string) => p.scales.find(s => s.id === id)!.tScore;
      const beklenen = t('Pa') >= 80 && t('Sc') >= 80 && t('Pt') >= 70 && Math.min(t('Pa'), t('Sc')) > t('Pt');
      assert.equal(byId(p, 'psychotic-v').hit, beklenen, `ham ${JSON.stringify(raw)} → ${beklenen}`);
    }
  });

  it('#3 “Pd Yükselliği” Profili BİREBİR kodda (s.162, Şekil 25 ↔ SINGLE_PD)', () => {
    // s.162: “Pd alt testi 70 T puanının üstündedir ve bütün alt testlerden en az
    // 10 T puanı yüksektir.” (s.111’deki “Sadece Pd yükselmesi” kuralıyla çapraz teyit)
    // CHANGE-015 bu desene **dokunmadı** (zaten kaynakla birebir).
    assert.ok(detectSingleElevations(profile({ K: 0, Pd: 32 })).some(x => x.scale === 'Pd'), 'Pd 72.0 T, en yüksek öteki 50.8 T');
    assert.ok(!detectSingleElevations(profile({ K: 0, Pd: 32, Sc: 52 })).some(x => x.scale === 'Pd'), 'Sc (74.5 T) farkı 10’un altına düşürür');
    assert.ok(!detectSingleElevations(profile({ K: 0, Pd: 30 })).some(x => x.scale === 'Pd'), 'Pd 67.5 T → eşik altı');
  });

  it('#4-#10 yedi örüntü DECISION-030/A ile kodda (eski “YOK” kilidi bilinçli kırıldı)', () => {
    const ids = detectPatterns(profile({ K: 0 })).map(x => x.id);
    assert.deepEqual(ids, kitapIds, 'desen seti 18 → 19 kayıt (K+ profili eklendi)');

    // #4 Kuş Kanadı (s.163): Hs/D/Hy/Pd ≥ 70 T + kadınlarda Mf = 50 T
    const kus = profile({ K: 0, Hs: 26, D: 35, Hy: 29, Pd: 33, Mf: 33 }, 'Kadın');
    assert.ok(['Hs', 'D', 'Hy', 'Pd'].every(id => kus.clinical.find(s => s.id === id)!.tScore >= 70), 'kaynak eşiği gerçekten karşılanıyor');
    assert.equal(byId(kus, 'kus-kanadi').hit, true);
    // Mf 50 T değilse (58.1) kadın profili deseni taşımıyor:
    assert.equal(byId(profile({ K: 0, Hs: 26, D: 35, Hy: 29, Pd: 33, Mf: 30 }, 'Kadın'), 'kus-kanadi').hit, false);
    // Kaynak Mf koşulunu yalnız “kadınlarda” veriyor → erkek profilinde Mf aranmaz:
    assert.equal(byId(profile({ K: 0, Hs: 26, D: 35, Hy: 29, Pd: 33, Mf: 20 }), 'kus-kanadi').hit, true);

    // #5 Pasif-Agresif V (s.164): 4 ve 6 ≥ 70 T, Mf < 50 T, başlık “(Kadınlarda)”
    const pa = profile({ K: 0, Pd: 33, Pa: 24, Mf: 40 }, 'Kadın');
    assert.equal(byId(pa, 'pasif-agresif-v').hit, true);
    assert.equal(byId(profile({ K: 0, Pd: 33, Pa: 24, Mf: 40 }), 'pasif-agresif-v').hit, false, 'cinsiyet kapısı: erkek profilde desen aranmaz');

    // #6 Pozitif eğim (s.165): psikotik taraf > 70 T, nevrotik taraf < 70 T
    const poz = profile({ K: 0, Pa: 24, Pt: 43, Sc: 52, Ma: 29, Si: 40 });
    assert.equal(byId(poz, 'pozitif-egim').hit, true);
    assert.ok(['Hs', 'D', 'Hy', 'Pd'].every(id => poz.clinical.find(s => s.id === id)!.tScore < 70), 'nevrotik taraf 70 T altında kalmalı');
    assert.equal(byId(profile({ K: 0, Pa: 24, Pt: 43, Sc: 52, Ma: 29 }), 'pozitif-egim').hit, false, 'Si (50.2) > 70 T değil → desen bozuk');

    // #8 “Yüzen” Profil (s.167): Hs → Ma tamamı > 70 T (Si dışarıda)
    const yuzen = profile({ K: 0, Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 });
    assert.ok(yuzen.clinical.filter(s => s.id !== 'Si').every(s => s.tScore > 70), 'kaynak tanımı: “Hs’den Ma’ya kadar olan bütün değerler 70 T puanının üstündedir”');
    assert.ok(yuzen.scales.find(s => s.id === 'Si')!.tScore < 70, 'Si dışarıda bırakılmalı (kaynak Hs→Ma der)');
    assert.equal(byId(yuzen, 'yuzen-profil').hit, true);
    assert.equal(byId(yuzen, 'yuzen-profil').caveat, 'Bu profil tipiyle bağlantılı bir kod tipi verilemez.');

    // #9 Batık Profil (s.168): bütün klinik ölçekler 45-54 T
    const batik = profile({ K: 0 });
    assert.ok(batik.clinical.every(s => s.tScore >= 45 && s.tScore <= 54), 'düz profil 45-54 bandında');
    assert.equal(byId(batik, 'batik-profil').hit, true);
    assert.equal(byId(batik, 'sinir-profil').hit, false, 'bantlar ayrışıyor: 45-54 ≠ 60-70');

    // #10 Sınır Profil (s.169): bütün klinik ölçekler 60-70 T
    const sinir = profile({ K: 0, Hs: 19, D: 28, Hy: 26, Pd: 29, Mf: 34, Pa: 16, Pt: 37, Sc: 39, Ma: 26, Si: 32, F: 14 });
    assert.ok(sinir.clinical.every(s => s.tScore >= 60 && s.tScore <= 70), 'kaynak bandı gerçekten karşılanıyor');
    assert.equal(byId(sinir, 'sinir-profil').hit, true);
    assert.equal(byId(sinir, 'batik-profil').hit, false, 'bantlar ayrışıyor: 60-70 ≠ 45-54');
    assert.equal(byId(profile({}), 'batik-profil').hit, false, 'Hs 64.3/Pt 69.2 → bant dışı');
  });

  it('#7 Negatif eğim: kaynakta nicel eşik yok → manual, otomatik vurmez (DECISION-028)', () => {
    const neg = profile({ K: 0, Hs: 26, D: 35, Hy: 29, Pd: 33, Pa: 5, Pt: 10, Sc: 10, Ma: 5 });
    const p = byId(neg, 'negatif-egim');
    assert.equal(p.manual, true, 'kaynak “belirgin düşüklük” diyor, sayı vermiyor');
    assert.equal(p.hit, false, 'manual desen hiçbir profilde otomatik vurmaz');
    assert.match(p.rule, /Kaynakta nicel eşik yok/);
    assert.match(p.quote ?? '', /belirgin düşüklük/);
    assert.equal(p.source, 's.166 · Şekil 29');
    // manual kayıt “görülmeyenler” gibi davranmaz: vuran listesinde de değildir
    assert.ok(!detectPatterns(neg).some(x => x.hit && x.id === 'negatif-egim'));
  });

  it('#8 “Yüzen” Profil ≠ kodun multi-high’ı (3+ ≥65 ayrı kalmaya devam ediyor)', () => {
    const yuzen = profile({ K: 0, Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 });
    const mh = byId(yuzen, 'multi-high');
    assert.equal(mh.rule, '3 veya daha fazla klinik ölçek T ≥ 65');
    assert.equal(mh.source, undefined, 'multi-high kodun kendi göstergesidir; kaynak deseni #8 ayrı kayıttır');
    // Batch 22 notu: borderline cümlesi multi-high.detail’de **yoktu**; CHANGE-015 onu
    // kaynağın kendi kaydına (yuzen-profil) taşıdı.
    assert.match(byId(yuzen, 'yuzen-profil').quote ?? '', /borderline kişilik bozukluğu/);
  });

  it('BÖLÜM 6’dan gelen 9 desen kaynağı kartta taşır (source + quote)', () => {
    const p = profile({ K: 0 });
    for (const id of ['conversion-v', 'psychotic-v', 'kus-kanadi', 'pasif-agresif-v', 'pozitif-egim', 'negatif-egim', 'yuzen-profil', 'batik-profil', 'sinir-profil']) {
      const rec = byId(p, id);
      assert.match(rec.source ?? '', /^s\.1[0-9][0-9] · Şekil (1[89]|2[0-9]|3[0-2])$/, `${id} · source`);
      assert.ok((rec.quote ?? '').length > 40, `${id} · birebir kaynak cümlesi`);
    }
  });

  it('BÖLÜM 6 çekinceleri desen kartılarında ve MMPI_PATTERN_CAVEATS’ta (CONFLICT-042 kapandı)', () => {
    // Batch 22 bu dört ifadeyi **yok** diye kilitlemişti (doesNotMatch); DECISION-030/A
    // ile arayüze taşındı → kilit bilinçli olarak **var** yönüne çevrildi.
    const all = detectPatterns(profile({ K: 0 }))
      .map(h => [h.name, h.rule, h.detail, h.quote ?? '', h.caveat ?? '', h.manualNote ?? ''].join(' '))
      .join(' ');
    assert.match(all, /kod tipi verilemez/);                    // s.167
    assert.match(all, /tan[ıi]s[ıi]n[ıi]n konulmas[ıi] do[ğg]ru de[ğg]il/); // s.166
    assert.match(all, /en d[üu][şs][üu]k oldu[ğg]u alt testlere/);          // s.168

    const notlar = MMPI_PATTERN_CAVEATS.map(c => `${c.source} ${c.text}`).join(' ');
    assert.match(notlar, /zek[âa] d[üu]zeyleri 80/);                        // s.159
    assert.match(notlar, /k[öo]rlemesine bir değerlendirme yapılmamalıdır/); // s.159
    assert.match(notlar, /Yaş, cinsiyet, eğitim, medenî durum, meslek/);     // s.159
    assert.match(notlar, /Butcher 1984/);                                    // s.169
    assert.match(notlar, /Hs ve D alt testlerde yaşın ilerlemesi/);          // s.159
    assert.match(notlar, /testi veren kişinin deneyimi/);                     // s.160
    for (const c of MMPI_PATTERN_CAVEATS) {
      assert.match(c.source, /^s\.1[0-9][0-9]/, 'her çekince kaynak sayfalı olmalı');
      assert.ok(c.text.length > 20);
    }
  });

  it('Ek sekme desen kartlarını kaynak ve çekinceyle render eder (UI)', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIExtraTab } = await import('../src/components/results/MMPIExtraTab');

    const yuzen = profile({ K: 0, Hs: 23, D: 32, Hy: 31, Pd: 32, Mf: 38, Pa: 25, Pt: 45, Sc: 60, Ma: 30, F: 20 });
    const html = renderToStaticMarkup(createElement(MMPIExtraTab, { profile: yuzen }));
    assert.match(html, /Kaynak: s\.167 · Şekil 30/);
    assert.match(html, /Kaynak çekincesi:/);
    assert.match(html, /kod tipi verilemez/);
    assert.match(html, /Yorum Çekinceleri \(BÖLÜM 6\)/);
    assert.match(html, /Elle değerlendirilir/);            // negatif-egim satırı
    assert.match(html, /Butcher 1984/);
    assert.doesNotMatch(html, /\*\*/, 'desen kartlarında ham markdown kalıntısı yok');
  });
});

describe('PHASE 10 batch 24 · DECISION-030/A 5. madde devamı — kalan desen kartlarında kaynak atfı', () => {
  // CHANGE-015 BÖLÜM 6 kartlarını kaynaklandırmıştı; bu turda BÖLÜM 5 kod gövdelerine
  // dayanan dört desen kartı (cry-for-help, depressive-27, 49, 89) sayfa atfı aldı.
  // Kural: yalnız SOURCE_FACTS’ta **birebir ve sayfalanmış** satır taşınır; kaynakta
  // olmayan sayı üretilmez/eşiğe dokunulmaz (CONFLICT-043 → DECISION-032 adayı).
  const rec = (raw: Parameters<typeof profile>[0], id: string) => {
    const found = detectPatterns(profile(raw)).find(x => x.id === id);
    assert.ok(found, `${id} kaydı olmalı`);
    return found!;
  };

  it('dört kart sayfa atfı taşır (s.36 / s.87 / s.118 / s.147)', () => {
    const want: Record<string, string> = {
      'cry-for-help': 's.36 · F yükselme nedenleri (4. madde)',
      'depressive-27': 's.87 · 27/72 + s.89 · 278/728 (CODE)',
      '49': 's.118-119 · 49/94 Kodu (CODE)',
      '89': 's.147-148 · 89/98 Kodu (CODE)',
    };
    for (const [id, src] of Object.entries(want)) {
      assert.equal(rec({ K: 0 }, id).source, src, `${id} · source`);
    }
  });

  it('cry-for-help alıntısı s.36’daki 4. maddeyle birebir (Visual: CONFIRMED)', () => {
    const r = rec({ K: 0 }, 'cry-for-help');
    assert.equal(r.quote, 'Yardım çağrısı profili. 2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir.');
    assert.match(r.manualNote ?? '', /CONFLICT-043/);
    assert.match(r.manualNote ?? '', /DECISION-032/);
    assert.match(r.manualNote ?? '', /80 ve üstü T puan[ıi]/, 'bant başlığı kartta belirtilir');
  });

  it('DECISION-032 (B): F ≥ 70 otomatik eşiği korundu (F 68,8 T vurmuyor, F 71 T vuruyor)', () => {
    const under = rec({ F: 17, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 }, 'cry-for-help');
    const over = rec({ F: 18, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 }, 'cry-for-help');
    assert.equal(under.hit, false, 'F 68.8 T · kodun eşiği 70');
    assert.equal(over.hit, true, 'F 71 T · kodun eşiği 70');
  });

  it('depressive-27 · s.89 intihar riski koşulu karta taşındı (eşik kod tarafı, elle)', () => {
    const r = rec({ K: 0 }, 'depressive-27');
    assert.match(r.quote ?? '', /K ve Hs, 50 T puan[ıi]n[ıi]n altında oldu[ğg]unda/);
    assert.match(r.quote ?? '', /intihar olas[ıi]l[ıi][ğg][ıi] dikkatle de[ğg]erlendirilmelidir/);
    assert.match(r.quote ?? '', /de[ğg]erlendirilmelidir\.\s*$/, 'alıntı s.89 cümlesiyle bitmeli');
    assert.match(r.manualNote ?? '', /Pt . 70/, 'eşiğin kod tarafı olduğu açıkça yazılı');
  });

  it('49 · 89 kartlarının dayandığı kod gövdeleriyle uyumu (kod katmanı çapraz kontrolü)', () => {
    // '49'un alıntısı BÖLÜM 5 gövdesiyle aynı cümledir (CODES['49'] gövdesi virgülleri
    // düşürdüğü için noktalama duyarsız karşılaştırılır); '89'da birebir okuma kısaltmalı
    // olduğu için KASITLI olarak quote yok — yalnız sayfa atfı taşınır.
    const q49 = rec({ K: 0 }, '49').quote ?? '';
    assert.ok(q49.length > 40);
    const body49 = resolveCodeInterpretation('49')!.text;
    const strip = (t: string) => t.replace(/[,.]/g, '').toLowerCase();
    assert.ok(strip(body49).includes(strip(q49)), "CODES['49'] gövdesi alıntıyı içermeli");
    assert.equal(rec({ K: 0 }, '89').quote, undefined, '89 · kısaltmalı alıntı UI’a taşınmadı');
  });

  it('kaynaksız bırakılan kartlar bilinçli: neurotic-triad ve multi-high (kod tarafı eşikler)', () => {
    assert.equal(rec({ K: 0 }, 'neurotic-triad').source, undefined, '≥ 65 eşiğinin kaynakta sayısı yok');
    assert.equal(rec({ K: 0 }, 'multi-high').source, undefined, 'kodun kendi göstergesi (#8 ayrı kayıt)');
    const ids = detectPatterns(profile({ K: 0 })).map(x => x.id);
    assert.equal(ids.length, 19);
    assert.deepEqual(ids.filter(id => !rec({ K: 0 }, id).source), ['neurotic-triad', 'multi-high']);
  });

  it('UI: sayfa atfı olan dört kart da “Kaynak:” satırıyla render edilir', async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { MMPIExtraTab } = await import('../src/components/results/MMPIExtraTab');
    const p = profile({ F: 18, K: 0, D: 31, Pt: 40, Pa: 5, Sc: 10, Ma: 5 });
    const html = renderToStaticMarkup(createElement(MMPIExtraTab, { profile: p }));
    assert.match(html, /Kaynak: s\.36 · F yükselme nedenleri \(4\. madde\)/);
    assert.match(html, /2 ve 7 testleri 6, 8 ve 9 testlerinden yüksektir\./);
  });
});
