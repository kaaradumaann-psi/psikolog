import { describe, it } from 'node:test';
import {
  codeInterpretation,
  KNOWN_CODES,
  KNOWN_BLOCK_CODES,
  activeCodeConditions,
  resolveCodeInterpretation,
  type CodeScaleKey,
} from '../src/scoring/mmpiSourceCodes';
import assert from 'node:assert/strict';
import { SCORING_KEYS, isGendered, K_CORRECTION, TURKISH_NORMS, type ScaleRule, type ScoringRule } from '../src/scoring/mmpiKeys';
import { SC_T_BANDS, MA_T_BANDS, SI_T_BANDS } from '../src/scoring/mmpiSource';
import { trIndex, fkIndexAnalysis, TR_PAIRS, CARELESS_PAIRS } from '../src/scoring/mmpiConsistency';
import { detectValidityConfig } from '../src/scoring/mmpiValidityConfigs';
import { CRITICAL_ITEMS } from '../src/scoring/mmpiCritical';
import type { ResponseMap } from '../src/scoring/mmpiScoring';
import {
  PERSONALITY_KEYS,
  ADDICTION_KEYS,
  WIGGINS_KEYS,
  SPECIAL_KEYS,
} from '../src/scoring/mmpiDerived';

/**
 * MMPI madde anahtarı bütünlük testi.
 *
 * Beklenen madde sayıları, kaynak kitabın **Ek 9** (kitap s.244-256) başlıklarından
 * alınmıştır: "… alt testi: X (Madde sayısı: NN)".
 * Künye: Ceyhun & Oral (2003), Minnesota Çok Yönlü Kişilik Envanteri —
 * Değerlendirme Kitabı, 2. Baskı. Ölçek sürümü: MMPI (orijinal) / 566 madde.
 * Kalıcı denetim kaydı: docs/mmpi-audit/
 *
 * Bu test neden var:
 * Denetimde HST (başlıkta 20, anahtarda 13) ve AVD (başlıkta 38, anahtarda 25)
 * ölçeklerinin **eksik madde** ile tanımlandığı bulundu (CONFLICT-011/012).
 * Başlıktaki madde sayısı ile anahtar uzunluğunu karşılaştıran bir test
 * bulunmadığı için hata yıllarca görünmez kaldı. Bu test o boşluğu kapatır.
 *
 * Kapsam notu: Bu test **madde içeriğini** doğrulamaz (o, kaynak Ek 9 ile
 * `scripts/mmpi-audit/compare-keys.py` tarafından denetlenir). Yalnızca
 * yapısal tutarlılığı ve kaynakta belgelenen madde sayısını doğrular.
 */

/** Ek 9 başlıklarındaki madde sayıları. */
const EXPECTED_COUNTS: Record<string, { toplam: number; page: string }> = {
  // Klinik ve geçerlik ölçekleri (kitap s.244-247)
  L: { toplam: 15, page: '244' },
  F: { toplam: 64, page: '244' },
  K: { toplam: 30, page: '244' },
  Hs: { toplam: 33, page: '244' },
  D: { toplam: 60, page: '245' },
  Hy: { toplam: 60, page: '245' },
  Pd: { toplam: 50, page: '245' },
  Pa: { toplam: 40, page: '246' },
  Pt: { toplam: 48, page: '246' },
  Sc: { toplam: 78, page: '246' },
  Ma: { toplam: 46, page: '247' },
  Si: { toplam: 70, page: '247' },
};

/** Mf cinsiyete özel; iki anahtarın da madde sayısı aynıdır (kitap s.245). */
const EXPECTED_MF = { toplam: 60, page: '245' };

const EXPECTED_PERSONALITY: Record<string, number> = {
  PAR: 22, SZD: 22, STY: 36, ANT: 25, BDL: 22,
  HST: 20, NAR: 31, AVD: 38, DEP: 20, CPS: 15, PAG: 14,
};

const EXPECTED_ADDICTION: Record<string, number> = {
  // MAC: kitap s.251 dipnotu "#215 ve #460 çıkarılmıştır, madde sayısı 49"
  MAC: 49,
  ICAS: 8,
};

const EXPECTED_WIGGINS: Record<string, number> = {
  SOC: 27, DEP_W: 33, FEM: 30, MOR: 23, REL: 12, AUT: 20, PSY: 48,
  ORG: 36, FAM: 16, HOS: 27, PHO: 27, HYP: 25, HEA: 28,
};

const EXPECTED_SPECIAL: Record<string, number> = {
  // OH: kitap s.255 başlığı "Madde sayısı: 33" der; ancak tablo 10 Doğru +
  // 21 Yanlış = 31 madde listeler. Kod TABLOYU izler (31). Kaynağın kendi
  // başlığı ile tablosu çelişir → bkz. SOURCE-INTERNAL-OH-001.
  OH: 31,
  Es: 68, A: 39, R: 40, Do: 28, Dy: 57,
};

/** MMPI-1 kitap formu madde aralığı. */
const MIN_ITEM = 1;
const MAX_ITEM = 566;

/**
 * İki anahtar biçimi vardır:
 * - `SCORING_KEYS` (mmpiKeys)  → `trueItems` / `falseItems`
 * - türetilmiş ölçekler (mmpiDerived) → `dogru` / `yanlis`
 * Bu yardımcı ikisini de `dogru` / `yanlis` biçimine indirger.
 */
function normalize(key: any): { dogru: readonly number[]; yanlis: readonly number[] } {
  if (key && Array.isArray(key.dogru) && Array.isArray(key.yanlis)) return key;
  return { dogru: key.trueItems ?? [], yanlis: key.falseItems ?? [] };
}

function checkStructure(
  label: string,
  rawKey: any,
  expected: number,
  page: string,
) {
  const key = normalize(rawKey);
  const total = key.dogru.length + key.yanlis.length;

  assert.equal(
    total,
    expected,
    `${label}: madde sayısı kaynak Ek 9 (s.${page}) başlığıyla uyuşmuyor ` +
      `(beklenen ${expected}, anahtarda ${total}: ${key.dogru.length} doğru + ${key.yanlis.length} yanlış)`,
  );

  const all = [...key.dogru, ...key.yanlis];

  // Aynı madde bir anahtarda iki kez geçemez.
  assert.equal(
    new Set(all).size,
    all.length,
    `${label}: anahtarda tekrarlanan madde var`,
  );

  // Doğru ve Yanlış kümeleri ayrık olmalı.
  const kesisim = key.dogru.filter(n => key.yanlis.includes(n));
  assert.deepEqual(kesisim, [], `${label}: madde hem Doğru hem Yanlış tarafında: ${kesisim}`);

  // Maddeler geçerli aralıkta olmalı.
  const gecersiz = all.filter(n => !Number.isInteger(n) || n < MIN_ITEM || n > MAX_ITEM);
  assert.deepEqual(
    gecersiz,
    [],
    `${label}: madde numarası ${MIN_ITEM}-${MAX_ITEM} dışında: ${gecersiz}`,
  );
}

describe('MMPI anahtar bütünlüğü — Ek 9 madde sayıları (kitap s.244-256)', () => {
  it('geçerlik ve klinik ölçekler kaynakta belgelenen madde sayısını taşır', () => {
    for (const [id, meta] of Object.entries(EXPECTED_COUNTS)) {
      const rule = SCORING_KEYS[id as keyof typeof SCORING_KEYS];
      assert.ok(rule, `${id} anahtarı tanımlı değil`);
      assert.ok(!isGendered(rule), `${id} cinsiyete özel olmamalı`);
      checkStructure(id, rule as ScaleRule, meta.toplam, meta.page);
    }
  });

  it('Mf cinsiyete özel anahtar çiftidir ve iki anahtar da 60 madde taşır', () => {
    const mf = SCORING_KEYS.Mf;
    assert.ok(isGendered(mf), 'Mf cinsiyete özel anahtar olmalı');
    checkStructure('Mf (erkek)', mf.male, EXPECTED_MF.toplam, EXPECTED_MF.page);
    checkStructure('Mf (kadın)', mf.female, EXPECTED_MF.toplam, EXPECTED_MF.page);
    // Aynı madde kümesi, yalnızca 5 maddede yön farklı olmalı (Ek 9 dipnotu).
    const m = new Set([...mf.male.trueItems, ...mf.male.falseItems]);
    const f = new Set([...mf.female.trueItems, ...mf.female.falseItems]);
    assert.deepEqual(
      [...m].sort((a, b) => a - b),
      [...f].sort((a, b) => a - b),
      'Mf erkek ve kadın anahtarları aynı madde kümesini kullanmalı (yalnızca yön değişir)',
    );
  });

  it('kişilik bozuklukları ölçekleri kaynak madde sayısını taşır (s.248-250)', () => {
    for (const [id, expected] of Object.entries(EXPECTED_PERSONALITY)) {
      const key = PERSONALITY_KEYS[id as keyof typeof PERSONALITY_KEYS];
      assert.ok(key, `${id} anahtarı tanımlı değil`);
      checkStructure(id, key, expected, '248-250');
    }
  });

  it('alkol ölçekleri kaynak madde sayısını taşır (s.251)', () => {
    for (const [id, expected] of Object.entries(EXPECTED_ADDICTION)) {
      const key = ADDICTION_KEYS[id as keyof typeof ADDICTION_KEYS];
      assert.ok(key, `${id} anahtarı tanımlı değil`);
      checkStructure(id, key, expected, '251');
    }
  });

  it('Wiggins içerik skalaları kaynak madde sayısını taşır (s.252-255)', () => {
    for (const [id, expected] of Object.entries(EXPECTED_WIGGINS)) {
      const key = WIGGINS_KEYS[id as keyof typeof WIGGINS_KEYS];
      assert.ok(key, `${id} anahtarı tanımlı değil`);
      checkStructure(id, key, expected, '252-255');
    }
  });

  it('özel ölçekler kaynak madde sayısını taşır (s.255-256)', () => {
    for (const [id, expected] of Object.entries(EXPECTED_SPECIAL)) {
      const key = SPECIAL_KEYS[id as keyof typeof SPECIAL_KEYS];
      assert.ok(key, `${id} anahtarı tanımlı değil`);
      checkStructure(id, key, expected, '255-256');
    }
  });

  it('denetimde bulunan 5 anahtar hatası düzeltilmiş kalır (CONFLICT-008..012)', () => {
    // CONFLICT-008: F anahtarı 69 değil 169 içerir (kitap s.244).
    const f = SCORING_KEYS.F as ScaleRule;
    assert.ok(f.falseItems.includes(169), 'F yanlış anahtarında 169 bulunmalı');
    assert.ok(!f.falseItems.includes(69), 'F yanlış anahtarında 69 bulunmamalı');

    // CONFLICT-009: Es'te bu 13 madde Yanlış yönündedir (kitap s.255).
    const es = SPECIAL_KEYS.Es;
    const esYanlisOlmalı = [483, 488, 489, 494, 510, 525, 541, 544, 548, 554, 555, 559, 561];
    for (const n of esYanlisOlmalı) {
      assert.ok(es.yanlis.includes(n), `Es: ${n} Yanlış yönünde olmalı`);
      assert.ok(!es.dogru.includes(n), `Es: ${n} Doğru tarafında olmamalı`);
    }

    // CONFLICT-010: W_FEM'de 126 ve 463 Doğru yönündedir (kitap s.252).
    const fem = WIGGINS_KEYS.FEM;
    for (const n of [126, 463]) {
      assert.ok(fem.dogru.includes(n), `FEM: ${n} Doğru yönünde olmalı`);
      assert.ok(!fem.yanlis.includes(n), `FEM: ${n} Yanlış tarafında olmamalı`);
    }

    // CONFLICT-011: AVD 38 madde (kitap s.249).
    const avd = PERSONALITY_KEYS.AVD;
    for (const n of [52, 142, 171, 180, 267, 278, 292, 304, 317, 357, 377, 418, 473]) {
      assert.ok(avd.dogru.includes(n), `AVD: ${n} Doğru tarafında olmalı`);
    }

    // CONFLICT-012: HST 20 madde (kitap s.249).
    const hst = PERSONALITY_KEYS.HST;
    for (const n of [353, 391, 449, 450, 547]) {
      assert.ok(hst.dogru.includes(n), `HST: ${n} Doğru tarafında olmalı`);
    }
    for (const n of [171, 286]) {
      assert.ok(hst.yanlis.includes(n), `HST: ${n} Yanlış tarafında olmalı`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Türk normları — Tablo 30 (kitap s.195)                              */
/* ------------------------------------------------------------------ */

import { TURKISH_NORMS, K_CORRECTION } from '../src/scoring/mmpiKeys';

/**
 * Tablo 30: "Normal Türk, Erkek ve Kadınların MMPI Alt Testlerindeki Ortalama
 * ve Standart Sapmaları" — kitap s.195 (PDF p105 R).
 *
 * Değerler tam sayfa yüksek çözünürlüklü GÖRSEL okumayla alınmıştır; OCR bu
 * sayfayı boş döndürmüştü. Örneklem: 1003 erkek / 663 kadın normal kişi
 * (Bölüm 8 standardizasyon çalışması, kitap s.191).
 *
 * ÖNEMLİ: Tablo 30, K düzeltmesi UYGULANMIŞ ve UYGULANMAMIŞ satırları ayrı
 * ayrı verir. Kod T dönüşümünden önce K düzeltmesini uyguladığı için burada
 * **K eklenmiş** satırlar esas alınır (Hs+.5K, Pd+.4K, Pt+1K, Sc+1K, Ma+.2K).
 *
 * Bu test neden var:
 * Denetimde, kitabın geçerlik bölümündeki (s.34 / s.38) F ve K norm
 * dipnotlarının Tablo 30 ile ÇELİŞTİĞİ bulundu (CONFLICT-001/002). Kod
 * Tablo 30'u izlediği için doğruydu. Bu test, norm katmanının Tablo 30'a
 * bağlı kalmasını garanti eder — geçerlik bölümünün tutarsız dipnotlarına
 * göre "düzeltme" yapılmasını engeller.
 */
const TABLE30: Record<'Erkek' | 'Kadın', Record<string, [number, number]>> = {
  Erkek: {
    L: [6.45, 2.74], F: [8.3, 4.62], K: [13.98, 4.65],
    Hs: [13.19, 4.07], D: [20.63, 4.76], Hy: [19.31, 4.71],
    Pd: [22.22, 4.45], Mf: [29.21, 3.82], Pa: [11.12, 4.03],
    Pt: [27.9, 6.3], Sc: [29.82, 9.05], Ma: [19.96, 4.4],
    Si: [23.86, 7.97],
  },
  Kadın: {
    L: [6.0, 2.25], F: [9.38, 5.16], K: [11.82, 3.8],
    Hs: [15.89, 4.88], D: [23.86, 5.08], Hy: [18.12, 5.31],
    Pd: [22.84, 4.51], Mf: [32.98, 3.67], Pa: [11.93, 4.17],
    Pt: [29.2, 6.59], Sc: [31.06, 8.2], Ma: [19.72, 4.36],
    Si: [29.88, 7.52],
  },
};

describe('Türk normları — Tablo 30 (kitap s.195)', () => {
  it('26 norm hücresinin tamamı kaynak Tablo 30 ile birebir aynıdır', () => {
    let checked = 0;
    for (const gender of ['Erkek', 'Kadın'] as const) {
      for (const [scale, [mean, sd]] of Object.entries(TABLE30[gender])) {
        const norm = TURKISH_NORMS[gender][scale as keyof (typeof TURKISH_NORMS)[typeof gender]];
        assert.ok(norm, `${gender}/${scale} normu tanımlı değil`);
        assert.equal(norm.mean, mean, `${gender}/${scale} ortalaması (Tablo 30)`);
        assert.equal(norm.sd, sd, `${gender}/${scale} standart sapması (Tablo 30)`);
        checked++;
      }
    }
    assert.equal(checked, 26, 'karşılaştırılan hücre sayısı 26 olmalı');
  });

  it('K düzeltmesi uygulanan ölçekler Tablo 30 K-eklenmiş satırlarını kullanır', () => {
    // Kod K düzeltmesini T dönüşümünden önce uygular → normlar K-eklenmiş
    // satırlardan alınmalıdır. K-eklenmemiş satırlarla karıştırılmamalıdır.
    const naiveHam: Record<string, number> = { Hs: 6.20, Pd: 16.62, Pt: 13.91, Sc: 13.83, Ma: 17.16 };
    for (const [scale, hamMean] of Object.entries(naiveHam)) {
      assert.ok(
        K_CORRECTION[scale] > 0,
        `${scale} K düzeltmesi bekleniyor`,
      );
      assert.notEqual(
        TURKISH_NORMS.Erkek[scale as 'Hs'].mean,
        hamMean,
        `${scale} normu K-eklenmemiş ham satırı kullanmamalı`,
      );
    }
  });

  it('geçerlik bölümü dipnotlarındaki tutarsız değerler koda sızmamıştır (CONFLICT-001/002)', () => {
    // Bu üç değer kitaptaki geçerlik bölümünde geçer ama Tablo 30 ile çelişir.
    // Kod Tablo 30'u izlemelidir.
    assert.equal(TURKISH_NORMS.Kadın.F.mean, 9.38, 'F kadın: Tablo 30 (9.38), s.34 dipnotu (10.11) değil');
    assert.equal(TURKISH_NORMS.Erkek.K.mean, 13.98, 'K erkek: Tablo 30 (13.98), s.38 dipnotu (13.90) değil');
    assert.equal(TURKISH_NORMS.Kadın.K.mean, 11.82, 'K kadın: Tablo 30 (11.82), s.38 dipnotu (13.54) değil');
  });
});

/**
 * PHASE 4 — Tutarlılık endeksleri (kitap s.59-61).
 *
 * Kaynak: "TR endeksi üzerinde 3 puan ya da daha fazla bir puanın, geçersiz
 * profil olasılığını arttırdığı ileri sürülmüştür (Dahlstrom 1972)." (s.59)
 * ve F-K Endeksi bantları (s.58-59) + Tablo 6/7 (s.60-61).
 */
function responseMap(patch: Record<number, 1 | 0 | -1> = {}): ResponseMap {
  const map: ResponseMap = {};
  for (let i = 1; i <= 566; i++) map[i] = 1; // hepsi D
  Object.assign(map, patch);
  return map;
}

describe('PHASE 4 — tutarlılık endeksleri kaynak uyumu', () => {
  it('TR endeksi 3 puanda uyarı verir (kaynak: 3 ya da daha fazla → geçersizlik riski)', () => {
    const patch: Record<number, 1 | 0> = {};
    TR_PAIRS.slice(0, 3).forEach(([x, y]) => {
      patch[x] = 1;
      patch[y] = 0;
    });
    const three = trIndex(responseMap(patch));
    assert.equal(three.score, 3, '3 tutarsız çift');
    assert.equal(
      three.isWarning,
      true,
      'kaynak s.59: "3 puan ya da daha fazla" → 3 uyarı olmalı (eski kod 3\'ü tutarlı sayıyordu)',
    );
    assert.match(three.interpretation, /3 puan ya da daha fazla/);

    // 2 puan hâlâ tutarlı olmalı (sınırın altı)
    const patch2: Record<number, 1 | 0> = {};
    TR_PAIRS.slice(0, 2).forEach(([x, y]) => {
      patch2[x] = 1;
      patch2[y] = 0;
    });
    const two = trIndex(responseMap(patch2));
    assert.equal(two.score, 2);
    assert.equal(two.isWarning, false, '2 puan tutarlı kabul edilmeli');
  });

  it('Tablo 6 tekrarlanmış madde çiftleri koda birebir geçmiştir', () => {
    const tableSix = [
      [8, 318], [13, 290], [15, 314], [16, 315], [20, 310], [21, 308],
      [22, 326], [23, 288], [24, 333], [32, 328], [33, 323], [35, 331],
      [37, 302], [38, 311], [305, 366], [317, 362],
    ];
    assert.equal(TR_PAIRS.length, 16, 'Tablo 6: toplam 16 madde');
    tableSix.forEach(([a, b], i) => {
      assert.deepEqual([...TR_PAIRS[i]!], [a, b], `Tablo 6 ${i + 1}. çift`);
    });
  });

  it('Tablo 7 dikkatsizlik çiftleri ve yönleri koda birebir geçmiştir', () => {
    const tableSeven: Array<[number, number, 'same' | 'different']> = [
      [10, 405, 'same'], [17, 65, 'different'], [18, 63, 'different'],
      [49, 113, 'same'], [76, 107, 'same'], [88, 526, 'same'],
      [137, 216, 'same'], [177, 220, 'different'], [178, 342, 'same'],
      [286, 312, 'different'], [329, 425, 'same'], [388, 480, 'different'],
    ];
    assert.equal(CARELESS_PAIRS.length, 12, 'Tablo 7: 12 madde çifti');
    tableSeven.forEach(([a, b, cond], i) => {
      const entry = CARELESS_PAIRS[i]!;
      assert.deepEqual([...entry.pair], [a, b], `Tablo 7 ${i + 1}. çift`);
      assert.equal(entry.condition, cond, `Tablo 7 ${i + 1}. yön`);
    });
  });

  it('F-K endeksi bantları kaynağa uyar (0-9 geçerli, >9 sahte-kötülük, >16 kritik)', () => {
    assert.equal(fkIndexAnalysis(20, 11).value, 9, 'F-K = 9');
    assert.equal(fkIndexAnalysis(20, 11).isWarning, false, '9 geçerli');
    assert.equal(fkIndexAnalysis(21, 11).isWarning, true, '10 sahte-kötülük');
    assert.match(fkIndexAnalysis(21, 11).level, /Sahte-Kötülük/);
    assert.equal(fkIndexAnalysis(20, 3).isWarning, true, '17 kritik');
    assert.match(fkIndexAnalysis(20, 3).level, /Kritik/);
    // 8-11 aralığı her iki dalda da "abartma" notunu taşır (kaynak s.59)
    assert.match(fkIndexAnalysis(18, 10).interpretation, /8-11 aralığı/, '8-9 dalı');
    assert.match(fkIndexAnalysis(20, 10).interpretation, /8-11 aralığı/, '10-11 dalı');
  });
});

/**
 * PHASE 4 batch 3 — Geçerlik konfigürasyonları kaynak uyumu (kitap s.43-55).
 *
 * Kaynak, 15 konfigürasyonun eşiklerini açık sayılarla verir:
 * "L ve K alt testinin 35 T puanını aşmasını" (s.49), "L, F ve K testlerinin
 * tümü 80 T puanının üzerindedir" (s.50), "F alt testi ise 100 T puanına yakın
 * ya da altındadır" (s.51), "F alt testi 45-55 T" (s.46),
 * "K alt testi 40-45 T puanı arasındadır" (s.47).
 */
describe('PHASE 4 batch 3 — konfigürasyon eşikleri kaynağa uyar', () => {
  it('Konf. 7 (tümüne doğru): L ve K 35 T puanını aşmaz', () => {
    const ok = detectValidityConfig(30, 125, 30);
    assert.match(ok!.name, /Doğru/);
    const bos = detectValidityConfig(38, 125, 38);
    assert.ok(!bos || !/Doğru/.test(bos.name), 'L,K=38 kaynağın 35 sınırını aşar');
  });

  it('Konf. 9 (yardım isteği): F 100 ve altı; 101 bu örüntü değil', () => {
    const ok = detectValidityConfig(65, 100, 65);
    assert.match(ok!.name, /Yardım İsteği/);
    const ustu = detectValidityConfig(65, 101, 65);
    assert.ok(!ustu || !/Yardım İsteği/.test(ustu.name), 'F=101 kaynak üst sınırını aşar');
  });

  it('Konf. 4 (yükselen): F 45-55 aralığı zorunlu', () => {
    const ok = detectValidityConfig(40, 50, 60);
    assert.match(ok!.name, /Yükselen/);
    const disi = detectValidityConfig(40, 62, 65);
    assert.ok(!disi || !/Yükselen/.test(disi.name), 'F=62 kaynağın 45-55 aralığı dışında');
  });

  it('Konf. 5 (azalan): K 40-45 aralığı zorunlu', () => {
    const ok = detectValidityConfig(60, 50, 42);
    assert.match(ok!.name, /Azalan/);
    const disi = detectValidityConfig(60, 50, 35);
    assert.ok(!disi || !/Azalan/.test(disi.name), 'K=35 kaynağın 40-45 aralığı dışında');
  });

  it('Konf. 7 kırpma farkındalığı: F = 120 (üst sınır) bu örüntüyü tetikler', () => {
    // Kaynak F > 120 der; T puanı [20,120] kırpıldığı için tek temsil F = 120.
    // End-to-end: 566 maddenin tamamına "Doğru" → L 26.5 / F 120 / K 22.1.
    assert.match(detectValidityConfig(26.5, 120, 22.1)!.name, /Doğru/);
  });

  it('Konf. 12: kaynakta olmayan K üst sınırı kaldırıldı (K = 70 artık eşleşir)', () => {
    // Kaynak s.54 yalnızca "K, T 50'nin üstünde" der → K=70 de Konfigürasyon 12.
    const c = detectValidityConfig(50, 65, 70);
    assert.ok(c, 'K=70 hiçbir konfigürasyona girmiyordu (eski kod)');
    assert.match(c!.name, /Güvenilir/);
  });

  it('Konf. 10 (geleneksel olmayan) birebir: L<66 ∧ F>69 ∧ K>65', () => {
    assert.match(detectValidityConfig(60, 70, 66)!.name, /Geleneksel Olmayan/);
    assert.ok(!detectValidityConfig(60, 69, 66) || !/Geleneksel Olmayan/.test(detectValidityConfig(60, 69, 66)!.name));
  });

  it('Konf. 13 (akut/süreğen): L>50 ∧ F,K>55 ∧ |F−K|≤6', () => {
    assert.match(detectValidityConfig(58, 60, 62)!.name, /Akut/);
    const uzak = detectValidityConfig(58, 60, 70);
    assert.ok(!uzak || !/Akut/.test(uzak.name), '|F−K|=10 > 6 → akut/süreğen değil');
  });
});

/**
 * PHASE 2/5 — Kritik madde etiketleri kaynak madde metinleriyle uyumlu olmalı.
 *
 * Kaynak kitapta "kritik madde" listesi yoktur (Ek 1 = madde metni,
 * Ek 9 = ölçek anahtarı). Bu liste kaynak dışı klinik derlemedir; ancak
 * etiketler, işaret ettikleri maddenin GERÇEK metnini yansıtmak zorundadır.
 * Görsel doğrulama (300-350 dpi): kitap s.216-226.
 * Ayrıntı: CONFLICTS.md → CONFLICT-023 · DECISION-026
 */
describe('PHASE 2/5 — kritik madde etiketleri madde metniyle uyumlu', () => {
  const etiket = (id: number, gender?: 'Erkek' | 'Kadın') =>
    CRITICAL_ITEMS.find(i => i.id === id && (gender === undefined || i.gender === gender))?.label ?? '';

  it('düzeltilen 14 etiket kaynak metnini yansıtır (s.216-226)', () => {
    // Kaynak metinleri (görsel doğrulandı) — etiket metnin konusunu içermeli
    assert.equal(etiket(20), 'Cinsel Doyumsuzluk');          // "Cinsel yaşamımdan memnunum"
    assert.equal(etiket(27), 'Etkilenme / Sanrısal Deneyim'); // "kötü ruhların beni etkileri altına aldığını"
    assert.equal(etiket(33), 'Tuhaf/Bizar Yaşantı');          // "Başımdan çok garip ve tuhaf şeyler geçti"
    assert.equal(etiket(37), 'Cinsel Sorunlar');              // "Cinsel yaşamım yüzünden başım hiç derde girmedi"
    assert.equal(etiket(69), 'Bedensel Ağrı');                // "Ensemde nadiren ağrı hissederim"
    assert.equal(etiket(85), 'Dürtü Kontrolü / Aşırma İsteği'); // "dokunmak ve aşırmak isterim"
    assert.equal(etiket(133), 'Cinsel Uyumsuzluk');           // "normal olmayan cinsel ilişkilere girişmedim"
    assert.equal(etiket(146), 'Sosyal Aktivite İhtiyacı');    // "Seyahat edip gezip tozmadıkça mutlu olamam"
    assert.equal(etiket(151), 'Zehirlenme Sanrısı / Şüphecilik'); // "Biri beni zehirlemeye çalışıyor"
    assert.equal(etiket(168), 'Bilişsel Karmaşa');            // "Zihnimde bir gariplik var"
    assert.equal(etiket(179), 'Cinsel Sıkıntı');              // "Cinsel konularda sıkıntım vardır"
    assert.equal(etiket(334), 'Algı Bozukluğu (Koku)');       // "Bazen tuhaf kokular duyarım"
    assert.equal(etiket(337), 'Huzursuzluk / Anksiyete');     // "meraklanıp huzursuzlaşırım"
    assert.equal(etiket(354), 'Kesici Alet Korkusu (Fobi)');  // "keskin ve sivri şeyler kullanmaktan korkarım"
  });

  it('eski yanlış etiketlerden hiçbiri kalmaz', () => {
    const yanlis = [
      [33, 'Sosyal Çekilme'], [151, 'Sosyal Çekilme / Yabancılaşma'],
      [337, 'Depresif Çökkünlük'], [334, 'Depresif Çökkünlük'],
      [20, 'Alkol/Madde Sorunları'], [69, 'Sosyal/Ailevi Huzursuzluk'],
      [168, 'Bağımlılık Potansiyeli'], [85, 'Ruhsal Sıkıntı / Kaygı'],
      [354, 'Bedensel / Nörolojik Belirti'], [179, 'Bedensel/Organik Belirti'],
      [133, 'Ailevi Sorunlar'], [146, 'Sosyal Uyumsuzluk'],
      [37, 'Ruhsal Sıkıntı'], [27, 'Ruhsal/Bilişsel Karmaşa'],
    ] as const;
    for (const [id, kotu] of yanlis) {
      assert.notEqual(etiket(id), kotu, `#${id} eski (kaynakla uyuşmayan) etiketi taşımamalı`);
    }
  });

  it('74. madde cinsiyete göre yön ayrımı korunur (kaynak koşullu metin)', () => {
    const e = CRITICAL_ITEMS.find(i => i.id === 74 && i.gender === 'Erkek');
    const k = CRITICAL_ITEMS.find(i => i.id === 74 && i.gender === 'Kadın');
    assert.equal(e?.expected, 1);
    assert.equal(k?.expected, 0);
  });

  it('doğru kalan 24 kayıt değişmedi (örneklem)', () => {
    assert.equal(etiket(66), 'Gerçek Dışılık / Sanrısal Düşünce');
    assert.equal(etiket(139), 'Kendine/Başkasına Zarar Verme');
    assert.equal(etiket(215), 'Alkol/Madde Sorunları');
    assert.equal(etiket(339), 'İntihar Riski / Depresyon');
    assert.equal(etiket(350), 'Sanrısal Düşünce / Ruhsal Kayıp');
  });
});

/**
 * PHASE 9/10 batch 13 — 40/04 (Pd) kodu tıbbi terim uyumu.
 *
 * Kaynak (kitap s.120, 400 dpi görsel): "gerçek psikomotor retardasyon ya da
 * VEGETATİF depresyon belirtileri yerine depresif düşünce ve duygulara
 * ilişkindir". Kod bu terimi "negatifik" olarak aktarmıştı → DECISION-027,
 * CHANGE-012 ile düzeltildi.
 */
describe('PHASE 9/10 batch 13 — 40/04 kodu kaynak terimine uyar', () => {
  it('40/04 metni kaynağın "vegetatif depresyon" terimini taşır', () => {
    const e = codeInterpretation('40');
    assert.ok(e, '40/04 kaydı bulunmalı');
    assert.match(e!.text, /vegetatif depresyon/i);
  });

  it('40/04 metni kaynakta olmayan "negatifik" terimini taşımaz', () => {
    const e = codeInterpretation('04');
    assert.ok(e);
    assert.ok(!/negatifik/i.test(e!.text), 'kaynakta "negatifik" terimi yok');
  });

  it('40/04 gövdesinin kalanı kaynakla uyumlu kalır (regresyon)', () => {
    const e = codeInterpretation('40')!;
    assert.match(e.text, /kızgın/);
    assert.match(e.text, /geri çekilmiş/);
    assert.match(e.text, /pasif olarak direnme/);
    assert.match(e.text, /psikomotor retardasyon/);
  });
});

/**
 * PHASE 9/10 batch 18 — Sc (8) anahtarı (Tablo 15) + T bandı kaynak terimi.
 *
 * Kaynak (kitap s.144, 400 dpi iki bindirmeli kırpma `tbl15_L`/`tbl15_R`):
 * "Tablo 15. Şizofreni alt testi: Madde numaraları ve puanlama yönü
 * (Madde Sayısı: 78)" → Doğru 59 + Yanlış 19 = 78; dipnotta norm
 * "Erkeklerde ortalama: 29.82, kadınlarda ortalama: 31.06 (Savaşır 1981)".
 * s.146 (300 dpi görsel): "21-44 T puanı: Pratik ve gelenekseldirler,
 * davranışları ve yaşama bakış açıları **konformaldir**."
 */
const SC_KAYNAK_DORU = [
  15, 16, 21, 22, 24, 32, 33, 35, 38, 40, 41, 47, 52, 76, 97, 104, 121, 156, 157, 159, 168, 179, 182, 194,
  202, 210, 212, 238, 241, 251, 259, 266, 273, 282, 291, 297, 301, 303, 305, 307, 312, 320, 324, 325, 332,
  334, 335, 339, 341, 345, 349, 350, 352, 354, 355, 356, 360, 363, 364,
];
const SC_KAYNAK_YANLIS = [
  8, 17, 20, 37, 65, 103, 119, 177, 178, 187, 192, 196, 220, 276, 281, 306, 309, 322, 330,
];

describe('PHASE 9/10 batch 18 — Sc (8) Tablo 15 anahtarı kaynağa birebir bağlıdır', () => {
  it('Sc madde sayısı kitabın başlığıyla uyumlu: 59 + 19 = 78', () => {
    const sc = SCORING_KEYS.Sc as ScoringRule;
    assert.equal(sc.trueItems.length, 59);
    assert.equal(sc.falseItems.length, 19);
  });

  it('Sc Doğru listesi Tablo 15 ile birebir aynıdır (fazla/eksik yok)', () => {
    const sc = SCORING_KEYS.Sc as ScoringRule;
    const k = new Set(SC_KAYNAK_DORU);
    const c = new Set(sc.trueItems);
    assert.deepEqual(sc.trueItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(SC_KAYNAK_DORU.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
  });

  it('Sc Yanlış listesi Tablo 15 ile birebir aynıdır (fazla/eksik yok)', () => {
    const sc = SCORING_KEYS.Sc as ScoringRule;
    const k = new Set(SC_KAYNAK_YANLIS);
    const c = new Set(sc.falseItems);
    assert.deepEqual(sc.falseItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(SC_KAYNAK_YANLIS.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
  });

  it('Sc K düzeltmesi alır (Tablo 15 "K Eklemeli") ve norm çifti dipnotla eşittir', () => {
    assert.equal(K_CORRECTION.Sc, 1);
    assert.equal(TURKISH_NORMS.Erkek.Sc.mean, 29.82);
    assert.equal(TURKISH_NORMS.Kadın.Sc.mean, 31.06);
  });
});

describe('PHASE 9/10 batch 18 — Sc 21-44 bandı kaynak terimine uyar', () => {
  const band = SC_T_BANDS.find((b) => b.rangeLabel === 'T 21-44')!;

  it('bant metni kaynağın "konformaldir" terimini taşır', () => {
    assert.ok(band, 'T 21-44 bandı bulunmalı');
    assert.match(band.text, /bakış açıları konformaldir/i);
  });

  it('bant metni kaynakta olmayan "konservatiftir" terimini taşımaz', () => {
    assert.ok(!/konservatif/i.test(band.text), 'kaynak s.146 "konformaldir" der');
  });

  it('bandın kalanı kaynakla uyumlu kalır (regresyon)', () => {
    assert.match(band.text, /Pratik ve gelenekseldirler/);
    assert.match(band.text, /hayal güçleri yoktur/);
    assert.match(band.text, /oldukça katıdırlar/);
    assert.match(band.text, /rekabet etmek istemeyen/);
  });

  it('Sc bant sınırı kaynakla birebir: 100+ / 75+ / 60-74 / 45-59 / 21-44', () => {
    assert.deepEqual(SC_T_BANDS.map((b) => [b.min, b.max === Infinity ? null : b.max]), [
      [100, null],
      [75, 99],
      [60, 74],
      [45, 59],
      [0, 44],
    ]);
    assert.match(SC_T_BANDS[0].text, /95/);
  });
});

/**
 * PHASE 9/10 batch 19 — Ma (9) anahtarı (Tablo 16) + Sc (8) bloğu kapanışı.
 *
 * Kaynak (kitap s.150, 430 dpi bindirmeli iki kırpma `tbl16_L`/`tbl16_R`):
 * "Tablo 16. Hipomani alt testi: Madde numaraları ve puanlama yönü
 * (Madde Sayısı: 46)" → Doğru 35 + Yanlış 11; "(K Eklemeli)";
 * "Erkeklerde ortalama: 19.96, kadınlarda ortalama: 19.72 (Savaşır,1981)".
 * Dikiş çizgisi 64·181·251·148 sütunundan geçiyor (DECISION-003 kontrolü).
 */
const MA_KAYNAK_DORU = [
  11, 13, 21, 22, 59, 64, 73, 97, 100, 109, 127, 134, 143, 156, 157, 167, 181, 194, 212, 222, 226, 228,
  232, 233, 238, 240, 250, 251, 263, 266, 268, 271, 277, 279, 298,
];
const MA_KAYNAK_YANLIS = [101, 105, 111, 119, 120, 148, 166, 171, 180, 267, 289];

describe('PHASE 9/10 batch 19 — Ma (9) Tablo 16 anahtarı kaynağa birebir bağlıdır', () => {
  it('Ma madde sayısı kitabın başlığıyla uyumlu: 35 + 11 = 46', () => {
    const ma = SCORING_KEYS.Ma as ScoringRule;
    assert.equal(ma.trueItems.length, 35);
    assert.equal(ma.falseItems.length, 11);
  });

  it('Ma Doğru listesi Tablo 16 ile birebir aynıdır (fazla/eksik yok)', () => {
    const ma = SCORING_KEYS.Ma as ScoringRule;
    const k = new Set(MA_KAYNAK_DORU);
    const c = new Set(ma.trueItems);
    assert.deepEqual(ma.trueItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(MA_KAYNAK_DORU.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
  });

  it('Ma Yanlış listesi Tablo 16 ile birebir aynıdır (dikiş sütunu 148 dahil)', () => {
    const ma = SCORING_KEYS.Ma as ScoringRule;
    const k = new Set(MA_KAYNAK_YANLIS);
    const c = new Set(ma.falseItems);
    assert.deepEqual(ma.falseItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(MA_KAYNAK_YANLIS.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
    assert.ok(ma.falseItems.includes(148), 'dikiş hattındaki 148 eksik okunmuş olamaz');
  });

  it('Ma K eklemeli ve norm çifti Tablo 16 dipnotuyla eşittir', () => {
    assert.equal(K_CORRECTION.Ma, 0.2);
    assert.equal(TURKISH_NORMS.Erkek.Ma.mean, 19.96);
    assert.equal(TURKISH_NORMS.Kadın.Ma.mean, 19.72);
  });
});

describe('PHASE 9/10 batch 19 — Sc (8) bloğu kapanışı (s.147-148) regresyonu', () => {
  it('89/98 gövdesi kaynakla uyumlu kaldığı kadarıyla durur (Olası Tanılar dahil)', () => {
    const e = codeInterpretation('89')!;
    assert.match(e.text, /ergenlerde ve yetişkinlerde ciddi psikopatoloji/);
    assert.match(e.text, /fikir uçuşmaları/);
    assert.match(e.text, /Stres altında dağılma/);
    assert.deepEqual(e.diagnosis, ['Şizofreni', 'Madde kullanımına bağlı psikoz']);
  });

  it('80/08 gövdesi kaynakla uyumlu ve Şizoid Kişilik tanısını taşır', () => {
    const e = codeInterpretation('80')!;
    assert.match(e.text, /kendi ailelerinden bile uzaklaşırlar/);
    assert.match(e.text, /danışmanlık görüşmelerinde genellikle konuşmazlar/);
    assert.deepEqual(e.diagnosis, ['Şizoid Kişilik']);
  });
});

/**
 * PHASE 9/10 batch 20 — Si (0) anahtarı (Tablo 17) + Ma (9) bant/kod bloğu.
 *
 * Kaynak (kitap s.156, 500 dpi bindirmeli iki kırpma `b20_t17_L`/`b20_t17_R`):
 * "Tablo 17. Sosyal içedönüklük alt testi: Madde numaraları ve puanlama yönü
 * (Madde Sayısı: 70)" → Doğru 34 + Yanlış 36; dipnot "Erkeklerde ortalama:26.86,
 * kadınlarda ortalama: 29.88 (Savaşır 1981)". Yırtık (scan) çizgisi
 * 124·304·427 / 119·309·451 sütunundan geçiyor.
 * Tablo 30 (s.195, 250 dpi görselden yeniden okundu): Si X̄ 23.86 / 29.88, SD 7.97 / 7.52.
 */
const SI_KAYNAK_DORU = [
  32, 67, 82, 111, 117, 124, 138, 147, 171, 172, 180, 201, 236, 267, 278, 292, 304, 316, 321, 332, 336, 342,
  357, 377, 383, 398, 411, 427, 436, 455, 473, 487, 549, 564,
];
const SI_KAYNAK_YANLIS = [
  25, 33, 57, 91, 99, 119, 126, 143, 193, 208, 229, 231, 254, 262, 281, 296, 309, 353, 359, 371, 391, 400,
  415, 440, 446, 449, 450, 451, 462, 469, 479, 481, 482, 505, 521, 547,
];

describe('PHASE 9/10 batch 20 — Si (0) Tablo 17 anahtarı kaynağa birebir bağlıdır (PHASE 5 kapanışı)', () => {
  it('Si madde sayısı kitabın başlığıyla uyumlu: 34 + 36 = 70', () => {
    const si = SCORING_KEYS.Si as ScoringRule;
    assert.equal(si.trueItems.length, 34);
    assert.equal(si.falseItems.length, 36);
  });

  it('Si Doğru listesi Tablo 17 ile birebir aynıdır (fazla/eksik yok)', () => {
    const si = SCORING_KEYS.Si as ScoringRule;
    const k = new Set(SI_KAYNAK_DORU);
    const c = new Set(si.trueItems);
    assert.deepEqual(si.trueItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(SI_KAYNAK_DORU.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
  });

  it('Si Yanlış listesi Tablo 17 ile birebir aynıdır (yırtık hattı 119/309/451 + OCRın düştüğü 99 dahil)', () => {
    const si = SCORING_KEYS.Si as ScoringRule;
    const k = new Set(SI_KAYNAK_YANLIS);
    const c = new Set(si.falseItems);
    assert.deepEqual(si.falseItems.filter((x) => !k.has(x)), [], 'kodda fazladan madde var');
    assert.deepEqual(SI_KAYNAK_YANLIS.filter((x) => !c.has(x)), [], 'koddan eksik madde var');
    for (const n of [119, 309, 451, 99]) assert.ok(si.falseItems.includes(n), `${n} yırtık/OCR hattında düşmüş olamaz`);
    assert.equal(new Set([...si.trueItems, ...si.falseItems]).size, 70, '70 benzersiz madde olmalı');
  });

  it('Si normları Tablo 30u izler; Tablo 17 dipnotundaki 26.86 kaynak içi çelişkidir (CONFLICT-037 emsali)', () => {
    assert.equal(TURKISH_NORMS.Erkek.Si.mean, 23.86);
    assert.equal(TURKISH_NORMS.Kadın.Si.mean, 29.88);
    assert.equal(TURKISH_NORMS.Erkek.Si.sd, 7.97);
    assert.equal(TURKISH_NORMS.Kadın.Si.sd, 7.52);
    assert.ok(!('Si' in K_CORRECTION), 'Tablo 17 "(K Eklemeli)" taşımaz → K_CORRECTION.Si de olmamalı');
  });
});

describe('PHASE 9/10 batch 20 — Ma (9) T bantları ve kod bloğu (s.151-153)', () => {
  it('Ma bant kapsamı kaynakla birebir: 85+ / 70-84 / 60-69 / 45-59 / 21-44', () => {
    assert.deepEqual(MA_T_BANDS.map((b) => [b.min, b.max === Infinity ? null : b.max]), [
      [85, null],
      [70, 84],
      [60, 69],
      [45, 59],
      [0, 44],
    ]);
    const all = MA_T_BANDS.map((b) => b.text).join(' ');
    // 60-69 bandı kaynaktaki İKİ paragrafı taşır ("60- 75 T" + "60- 69 T")
    assert.match(all, /enerjik, dışadönük ve aktif bireyleri gösterir/i);
    assert.match(all, /Hoş, enerjik, meraklı, sosyal, kolay ilişki kuran/);
    assert.match(all, /büyüklük sanrıları ve hiperaktivite gibi/);
    assert.match(all, /Özellikle 2 alt testinin yükselmediği durumlarda depresyon düşünülmelidir/);
    assert.match(all, /45 yaşın altında düşük/);
  });

  it('BİLİNEN EKSİK (CONFLICT-026/025): s.152 "Yalnızca alt test 9u kullanarak…" paragrafı kodda yoktur', () => {
    const all = MA_T_BANDS.map((b) => b.text).join(' ') + JSON.stringify(MA_T_BANDS);
    assert.doesNotMatch(all, /Yalnızca alt test 9/);
    assert.doesNotMatch(all, /diğer alt testlerle ilişkisi/);
  });

  it('90/09 gövdesi sadık; 91/19 gövdesi ARTIK blok-yerel kayıtta (CHANGE-014, CONFLICT-031/036)', () => {
    const e90 = codeInterpretation('90')!;
    assert.equal(e90.code, '90/09');
    assert.match(e90.text, /Kod oldukça nadirdir, özellikle erkeklerde çok az görülür/);
    assert.match(e90.text, /Si alt testinin yükselmesi bırakılarak yorum/);
    // kitap s.153 "91/19 Kodu (Ayrıca 19/91 Koduna da Bakınız)" AYRI bir gövdeydi;
    // kanonikleştirme ("91" → "19") onu s.77deki Hs bloğu metniyle çarpıştırıyordu.
    // CHANGE-014 (DECISION-029/A) kodun İLK RAKAMINI blok sayarak ayrıştırır:
    const e91 = codeInterpretation('91')!;
    assert.equal(e91.code, '91/19');
    assert.equal(e91.block, 'Ma');
    assert.match(e91.text, /Ender görülmektedir/);
    assert.match(e91.text, /hipomanik durumdadırlar, ancak gergindirler ve yerlerinde duramazlar/);
    assert.match(e91.text, /Başarısızlıkla engellenmişlerdir/);
    assert.match(e91.seeAlso ?? '', /19\/91/);
    // Hs bloğunun 19/91 gövdesi bundan ETKİLENMEZ (çapraz bulaşma yok):
    const e19 = codeInterpretation('19')!;
    assert.equal(e19.code, '19/91');
    assert.doesNotMatch(e19.text, /Ender görülmektedir/);
  });
});

describe('PHASE 9/10 batch 21 — Si (0) T bantları + Bakınız listesi + 049/027(8) (s.157-158)', () => {
  // Kaynak: Ceyhun & Oral (2003) s.157 (PDF p86 R) — 150 dpi tam sayfa görselinden okundu.
  // s.158 (p87 L) BOŞ SAYFA (koyu piksel %0.62 vs dolu sayfa %4.36) → Bölüm 5 s.157de biter.
  // Kanıt aracı: scripts/mmpi-audit/cmp-si-batch21.ts

  it('Si bant kapsamı kaynakla birebir: 70+ / 60-69 / 45-59 / 25-44 (4 bant, 4 eşik)', () => {
    assert.deepEqual(SI_T_BANDS.map((b) => [b.min, b.max === Infinity ? null : b.max]), [
      [70, null],
      [60, 69],
      [45, 59],
      [0, 44],
    ], 'kaynak 4 bant veriyor: "70 T puanı ve üstü" · "60-69 T puanı" · "45-59 T puanı" · "25-44 T puanı" (kod en alt bandı 0a genişletir, etiket korunur)');
    assert.deepEqual(SI_T_BANDS.map((b) => b.rangeLabel), ['T ≥ 70', 'T 60-69', 'T 45-59', 'T 25-44']);
  });

  it('Si bant metinleri sadık: 60-69, 45-59 ve 25-44 kaynak cümlelerinin tamamını taşıyor', () => {
    const band = (label: string) => SI_T_BANDS.find((b) => b.rangeLabel.includes(label))!;
    assert.match(band('60-69').text, /kendini ortaya koymak istemeyen, yakın aile çevresinde rahat olan bireylerin profilidir/);
    assert.match(band('60-69').text, /Çekingen, utangaç kişilerdir/);
    assert.match(band('45-59').text, /Sosyal ilişki kurmada başarılı olan bireylere işaret etmektedir/);
    assert.match(band('25-44').text, /İyimser, manipülatif, yüzeysel ve hatta biraz uçuk bireylerdir/);
    assert.match(band('25-44').text, /Dürtü kontrol sorunları vardır/);
    assert.match(band('25-44').text, /yalnız kalamayan bireyleri gösterir/);
    assert.match(band('25-44').text, /onaylanma konusunda gereksinimleri çok fazla olan bireylerdir/);
  });

  it('BİLİNEN EKSİK (CONFLICT-025/033): 70+ bandındaki nevrotik üçlü + 2/7/8 atfı kodda yoktur', () => {
    const hi = SI_T_BANDS[0];
    assert.match(hi.text, /Sosyal açıdan beceriksiz olan kişilerdir/);
    assert.match(hi.text, /Sosyal ilişkilerde anksiyete yaşar ve ilişki kurmaktan kaçınırlar/);
    // kaynak: "…kaçınırlar. Nevrotik üçlüde yükselme görülebilir. (Ayrıca bakınız, 2, 7 ve 8
    // alt testlerinin yükselmesi.)" → iki cümle bandın METNİNDE yok (örüntü altyapısı yok → 033)
    assert.doesNotMatch(hi.text, /Nevrotik üçlüde yükselme/);
    assert.doesNotMatch(JSON.stringify(SI_T_BANDS), /Ayrıca bakınız, 2, 7 ve 8/);
  });

  it('s.157 Bakınız listesi uyumlu: 01/10…09/90 kanonik kayıtları VAR ve etiketler birebir', () => {
    for (const [pair, label] of [['01/10', '10/01'], ['02/20', '20/02'], ['03/30', '30/03'], ['04/40', '40/04'], ['05/50', '50/05'], ['06/60', '60/06'], ['07/70', '70/07'], ['08/80', '80/08'], ['09/90', '90/09']] as const) {
      const rec = codeInterpretation(pair)!;
      assert.equal(rec.code, label, `${pair} hedefi eksik/yanlış etiketli`);
    }
  });

  it('049 ve 027(8) gövdeleri blok-yerel kayıtta; KIRPMA YOK (CONFLICT-030 → CHANGE-014)', () => {
    // kitap s.157: "049 Kodu — Psikiyatrik olgularda eyleme vurukluğun bastırılması" ve
    // "027(8) Kodu — Bireyde güçlü ruminatif davranışlar görülebilir."
    // ESKİ davranış: slice(0,2) + canonicalCode → '049' → 40/04 metni, '027(8)' → 20/02 metni
    // (kullanıcıya İLGİSİZ kod yorumu gösteriliyordu). CHANGE-014 bunu kaldırdı.
    const e049 = codeInterpretation('049')!;
    assert.equal(e049.code, '049');
    assert.equal(e049.block, 'Si');
    assert.match(e049.text, /Psikiyatrik olgularda eyleme vurukluğun bastırılması/);
    const e027 = codeInterpretation('027(8)')!;
    assert.equal(e027.code, '027(8)');
    assert.equal(e027.rawCode, '027(8)');
    assert.match(e027.text, /Bireyde güçlü ruminatif davranışlar görülebilir/);
    // kırpmanın gittiğinin negatif kanıtı: eşleşmeyen 3+ haneli kodlar artık undefined (79'a kırpılmaz)
    assert.equal(codeInterpretation('314'), undefined);
    assert.equal(codeInterpretation('412'), undefined);
    assert.equal(codeInterpretation('931'), undefined);
    // D bloğu göçüyle 273/723 ve 213/231 artık kendi gövdelerine çözümlenir (CHANGE-019)
    assert.equal(codeInterpretation('273/723')?.code, '273/723');
    assert.equal(codeInterpretation('213/231')?.code, '213/231');
    // Pt bloğu göçüyle 794 ve 782 artık kendi gövdelerine çözümlenir (CHANGE-023)
    assert.equal(codeInterpretation('794')?.code, '794');
    assert.equal(codeInterpretation('782')?.code, '782');
    // Sc bloğu göçüyle 8726 artık kendi gövdesine çözümlenir (CHANGE-024)
    assert.equal(codeInterpretation('8726')?.code, '8726 / Yüksek 9');
    // ortak iki-haneli kayıtlar ESKİSİ GİBİ çalışır (geriye dönük uyum)
    assert.equal(codeInterpretation('04')!.code, '40/04');
    assert.doesNotMatch(codeInterpretation('04')!.text, /eyleme vurukluğun bastırılması/);
    assert.doesNotMatch(codeInterpretation('02')!.text, /güçlü ruminatif davranışlar/);
    // blok kayıtları CODES'a karışmaz
    assert.ok(KNOWN_CODES.every((k) => /^\d{2}$/.test(k)), 'CODES anahtarları iki haneli kalır');
    const expectedBlockCodes = [
      'D:027', 'D:207', 'D:213', 'D:231', 'D:243', 'D:247', 'D:248', 'D:248_highF',
      'D:270', 'D:273', 'D:274', 'D:275', 'D:278', 'D:281', 'D:284', 'D:287',
      'Hs:120', 'Hs:123', 'Hs:1234', 'Hs:1236', 'Hs:1237', 'Hs:12378', 'Hs:1270',
      'Hs:128', 'Hs:129', 'Hs:132', 'Hs:134', 'Hs:1342', 'Hs:136', 'Hs:137',
      'Hs:138', 'Hs:1382', 'Hs:139', 'Hs:146', 'Hs:1469', 'Hs:14_low4',
      'Hy:32', 'Hy:321', 'Hy:345', 'Hy:346', 'Hy:34_low4', 'Hy:3_highK',
      'Hy:435', 'Hy:436', 'Hy:534',
      'Ma:049', 'Ma:19', 'Ma:694', 'Ma:698', 'Ma:789', 'Ma:794', 'Ma:8726', 'Ma:879', 'Ma:943', 'Ma:945', 'Ma:946', 'Ma:948',
      'Ma:964', 'Ma:968', 'Ma:974', 'Ma:9K', 'Ma:9_highK', 'Ma:9_lowK', 'Ma:high9_highK', 'Ma:high9_lowK',
      'Pa:456_scarlett', 'Pa:46', 'Pa:642', 'Pa:643', 'Pa:648', 'Pa:678',
      'Pa:679', 'Pa:680', 'Pa:694', 'Pa:698', 'Pa:86', 'Pa:860', 'Pa:876', 'Pa:964',
      'Pa:968', 'Pa:paranoid_valley', 'Pa:psychotic_v',
      'Pd:049', 'Pd:456', 'Pd:462', 'Pd:463', 'Pd:468', 'Pd:469', 'Pd:482', 'Pd:489',
      'Pd:48_highF_low2', 'Pd:493', 'Pd:495', 'Pd:496', 'Pd:498', 'Pd:4_low5',
      'Pd:642', 'Pd:643', 'Pd:648', 'Pd:784', 'Pd:794', 'Pd:824', 'Pd:842', 'Pd:849', 'Pd:874', 'Pd:943',
      'Pd:945', 'Pd:946', 'Pd:948',
      'Pt:027', 'Pt:47', 'Pt:67', 'Pt:74', 'Pt:76', 'Pt:782', 'Pt:784', 'Pt:789', 'Pt:794', 'Pt:87', 'Pt:872', 'Pt:8726', 'Pt:874', 'Pt:879',
      'Sc:027', 'Sc:678', 'Sc:68', 'Sc:680', 'Sc:698', 'Sc:78', 'Sc:784', 'Sc:789', 'Sc:824', 'Sc:842', 'Sc:849', 'Sc:86', 'Sc:860',
      'Sc:87', 'Sc:872', 'Sc:8726', 'Sc:8726_high9', 'Sc:874', 'Sc:876', 'Sc:879', 'Sc:968',
      'Sc:paranoid_valley', 'Sc:psychotic_v',
      'Si:027', 'Si:0278', 'Si:049', 'Si:068', 'Si:086',
    ].sort();
    assert.deepEqual([...KNOWN_BLOCK_CODES].sort(), expectedBlockCodes);
  });

  it('s.157 giriş paragrafı (Si 20 puan fark / eyleme vurukluk / ruminatif) kodda yok → CONFLICT-025/026 kilidi', () => {
    const src = [SI_T_BANDS.map((b) => b.text).join(' '), codeInterpretation('09')!.text, codeInterpretation('04')!.text].join(' ');
    assert.doesNotMatch(src, /20 puanlık bir farklılık/);
    assert.doesNotMatch(src, /eyleme vurukluğun bastırıldığı düşünülmelidir/);
    assert.doesNotMatch(src, /ruminatif davranışların kuvvetlendiği/);
  });
});

describe('CHANGE-014 (DECISION-029/A) — blok kimliği, kırpmasız çözümleme, koşullu yorumlar', () => {
  /** Sahte profil bağlamı: yalnızca koşulun baktığı ölçekler verilir. */
  const ctx = (over: Partial<Record<CodeScaleKey, number>>, third?: CodeScaleKey) => ({
    t: (id: CodeScaleKey) => over[id],
    third,
  });

  it('Pa bloğunun 64/46 gövdesi kaynak metni birebir taşır (s.130-131)', () => {
    const e = resolveCodeInterpretation('64')!;
    assert.equal(e.code, '64/46');
    assert.equal(e.block, 'Pa');
    assert.match(e.text, /immatür, narsisistik, pasif- bağımlı kişilerdir/);
    assert.match(e.text, /Diğerlerine öfke duyarlar ancak bunu kontrol edebilirler/);
    assert.match(e.text, /psikolojik yardım için uygun kişiler değillerdir/);
    assert.match(e.text, /karşısındakilerin kendi belirtilerine uygun bir şekilde davranış değiştirmesidir/);
    assert.match(e.seeAlso ?? '', /462\/642/);
    // Pd bloğunun 46/64 gövdesi ayrışmış kalır:
    assert.equal(resolveCodeInterpretation('46')!.code, '46/64');
    assert.doesNotMatch(resolveCodeInterpretation('46')!.text, /immatür, narsisistik, pasif- bağımlı/);
  });

  it('eş kodlar aynı nesneyi döndürür (12 ↔ 21), kodun bloğu gövdeyi seçer', () => {
    assert.equal(resolveCodeInterpretation('12'), resolveCodeInterpretation('21'));
    assert.equal(resolveCodeInterpretation('91')!.block, 'Ma');
    assert.equal(resolveCodeInterpretation('19')!.block, undefined, 'ortak kayıtta blok alanı yok');
    assert.equal(resolveCodeInterpretation('049')!.block, 'Si');
  });

  it('koşullu ek yorumlar yalnız profil karşılık verdiğinde devreye girer (CONFLICT-027)', () => {
    const kodsuz = activeCodeConditions(resolveCodeInterpretation('49'), ctx({ K: 20, Si: 60 }));
    assert.deepEqual(kodsuz, [], 'K düşük + Si yüksek → hiçbir 49/94 koşulu aktif değil');
    const aktif = activeCodeConditions(resolveCodeInterpretation('49'), ctx({ K: 60, Si: 40 }));
    assert.equal(aktif.length, 2, 'K > 50 ve Si < 50 koşullarının ikisi de devrede');
    assert.match(aktif[0].quote, /K testi 50 T puanının üzerinde/);
    assert.match(aktif[1].quote, /Si 50 T puanının altında/);
  });

  it('yaş gibi profil dışı veri isteyen koşullar her zaman "elle değerlendirilir" olarak gelir', () => {
    const list = activeCodeConditions(resolveCodeInterpretation('89'), ctx({ Sc: 90, Ma: 90 }, 'Pt'));
    assert.ok(list.some(c => c.manual), "89/98 'Yaşı 27'den küçük' koşulu manuel işaretli olmalı");
    assert.ok(list.some(c => /üçüncü yükselen alt test 4, 7 ya da 6/.test(c.quote)), 'Pt üçüncü yükselen → üçüncü-test koşulu aktif');
    const thirdOlmayan = activeCodeConditions(resolveCodeInterpretation('89'), ctx({ Sc: 90, Ma: 90 }, 'Si'));
    assert.equal(thirdOlmayan.length, 1, 'üçüncü yükselen Si ise sayısal koşul susar, yalnız manuel not kalır');
  });

  it('13/31 Yüksek-K ve 12/21 5-T-farkı koşulları kaynak eşiğiyle çalışır', () => {
    assert.equal(activeCodeConditions(resolveCodeInterpretation('13'), ctx({ D: 65, Pt: 66, Sc: 60, F: 40 })).length, 1);
    assert.deepEqual(activeCodeConditions(resolveCodeInterpretation('13'), ctx({ D: 80, Pt: 66, Sc: 60, F: 40 })), []);
    assert.equal(activeCodeConditions(resolveCodeInterpretation('12'), ctx({ Hs: 80, D: 78 })).length, 1, 'fark ≤ 5 T → 21’e bakılır');
    assert.deepEqual(activeCodeConditions(resolveCodeInterpretation('12'), ctx({ Hs: 95, D: 70 })), []);
  });

  it('koşul tablosunda ölü anahtar yoktur: ortak iki haneli kayıtlar her iki sıralamadan koşul taşır', () => {
    const kosullu = ['12', '13', '26', '27', '49', '07', '89', '08', '09'];
    for (const k of kosullu) {
      assert.ok(resolveCodeInterpretation(k)?.conditions?.length, `${k} koşullu kayıt taşımalı`);
      const ters = [...k].reverse().join('');
      assert.equal(resolveCodeInterpretation(ters)?.conditions, resolveCodeInterpretation(k)?.conditions, `${k} ↔ ${ters} aynı kayda inmeli`);
    }
    // 68/86 ve 78/87 blok göçleriyle Pa/Pt ve Sc blokları arasında özelleştirilmiştir (DECISION-031/A)
    assert.ok(resolveCodeInterpretation('68')?.conditions?.length, '68 (Pa) koşullu kayıt taşımalı');
    assert.ok(resolveCodeInterpretation('86')?.conditions?.length, '86 (Sc) koşullu kayıt taşımalı');
    assert.ok(resolveCodeInterpretation('78')?.conditions?.length, '78 (Pt) koşullu kayıt taşımalı');
    assert.ok(resolveCodeInterpretation('87')?.conditions?.length, '87 (Sc) koşullu kayıt taşımalı');
  });

  it('64/46 kaydındaki "8 yükselmişse süreç daha kötü olur" notu koşula bağlandı (s.131)', () => {
    assert.equal(activeCodeConditions(resolveCodeInterpretation('64'), ctx({ Sc: 75 })).length, 1);
    assert.deepEqual(activeCodeConditions(resolveCodeInterpretation('64'), ctx({ Sc: 60 })), []);
  });
});
