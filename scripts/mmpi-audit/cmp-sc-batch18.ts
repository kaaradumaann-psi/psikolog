/**
 * PHASE 9/10 batch 18 — Pt (7) bloğu KAPANIŞI + Sc (8) girişi/anahtarı/bantları
 * (kitap s.142-146).
 *
 * Kaynak okuması (GÖRSEL doğrulama, extract.py):
 *   s.142 (PDF p79 L) : 79/97 kapanışı + **794 Kodu** + **70/07 Kodu** → Pt bloğu BİTER
 *   s.143 (PDF p79 R) : **8. Şizofreni (Sc) Alt Testi** girişi + Graham 1987 yüksek puan 1-22
 *   s.144 (PDF p80 L) : **Tablo 15** (Sc anahtarı, Madde Sayısı: 78) + norm + Graham 23-38 + düşük puan 1
 *   s.145 (PDF p80 R) : düşük puan 2-9 + **Sc T bantları** (100+ / 75+ / 60-74)
 *   s.146 (PDF p81 L) : bant 3 madde + Düşük Puanlar T 45 + 45-59 + 21-44 +
 *                       çapraz ref 5 kod + **86/68** + **87/78** + **8726/Yüksek 9**
 *
 * Tablo 15 iki BİNDİRMELİ kırpma ile okundu (400 dpi, `tbl15_L` / `tbl15_R`):
 * dikiş 156/251/320/354 sütununun üzerinden geçiyor → DECISION-003 (SPINE-CLIP).
 */
import { SCORING_KEYS, TURKISH_NORMS } from '../../src/scoring/mmpiKeys';
import { clinicalBands } from '../../src/scoring/mmpiSource';
import { KNOWN_CODES, codeInterpretation } from '../../src/scoring/mmpiSourceCodes';

/** Tablo 15 — Doğru (5 satır: 12+12+12+12+11 = 59). */
const kaynakDogru = [
  15, 16, 21, 22, 24, 32, 33, 35, 38, 40, 41, 47,
  52, 76, 97, 104, 121, 156, 157, 159, 168, 179, 182, 194,
  202, 210, 212, 238, 241, 251, 259, 266, 273, 282, 291, 297,
  301, 303, 305, 307, 312, 320, 324, 325, 332, 334, 335, 339,
  341, 345, 349, 350, 352, 354, 355, 356, 360, 363, 364,
];
/** Tablo 15 — Yanlış (2 satır: 11+8 = 19). */
const kaynakYanlis = [
  8, 17, 20, 37, 65, 103, 119, 177, 178, 187, 192,
  196, 220, 276, 281, 306, 309, 322, 330,
];

console.log(
  `KAYNAK (Tablo 15): Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ` +
    `${kaynakDogru.length + kaynakYanlis.length}  (kitap başlığı: Madde Sayısı 78)`,
);

const sc = SCORING_KEYS.Sc as unknown as { trueItems: number[]; falseItems: number[] };
console.log(
  `KOD              : Dogru ${sc.trueItems.length} + Yanlis ${sc.falseItems.length} = ` +
    `${sc.trueItems.length + sc.falseItems.length}`,
);

function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter((x) => !K.has(x)).sort((a, b) => a - b);
  const eksik = kaynak.filter((x) => !C.has(x)).sort((a, b) => a - b);
  console.log(
    `${ad}: FAZLA [${fazla.join(', ')}] | EKSIK [${eksik.join(', ')}] -> ` +
      `${fazla.length === 0 && eksik.length === 0 ? 'BIREBİR MATCH ✅' : 'FARK ❌'}`,
  );
}
cmp('Doğru ', kaynakDogru, sc.trueItems);
cmp('Yanlış', kaynakYanlis, sc.falseItems);

/** Tablo 15 dipnotu: "Erkeklerde ortalama: 29.82, kadınlarda ortalama: 31.06 (Savaşır 1981)". */
const n = TURKISH_NORMS as any;
console.log(
  `\nNorm KAYNAK: erkek 29.82 / kadın 31.06 (Tablo 15 dipnotu, Savaşır 1981)\n` +
    `Norm KOD   : erkek ${n.Erkek.Sc.mean} (sd ${n.Erkek.Sc.sd}) / kadın ${n.Kadın.Sc.mean} (sd ${n.Kadın.Sc.sd})  ` +
    `→ ${n.Erkek.Sc.mean === 29.82 && n.Kadın.Sc.mean === 31.06 ? 'MATCH ✅ (sd Tablo 30, PHASE 6)' : 'FARK ❌'}`,
);

/** s.145-146 Sc T bantları: 100+ · 75+ · 60-74 · 45-59 · 21-44. */
const kaynakBantlar = [
  '100 T puanı ve üstü',
  '75 T puanı ve üstü',
  '60-74 T puanı',
  '45-59 T puanı  (Düşük Puanlar: T 45)',
  '21-44 T puanı',
];
console.log('\nSc T bantları — KOD (Erkek):');
const kodBantlar = clinicalBands('Sc', 'Erkek');
kodBantlar.forEach((b, i) => {
  console.log(`  ${(kaynakBantlar[i] ?? '?').padEnd(34)} ↔ ${b.rangeLabel.padEnd(9)} (min ${b.min}-max ${b.max})`);
});
console.log(`  bant sayısı: kaynak ${kaynakBantlar.length} / kod ${kodBantlar.length}`);
console.log(
  '  100+ bandının içindeki "T>95" notu kodda: ' +
    (kodBantlar[0].text.includes('95') ? 'VAR ✅' : 'YOK ❌'),
);
console.log(
  '  60-74 bandının 3 maddesi (1 alt sınır+Si, 2 örtük psikoz/F-Pa, 3 psikotik belirtiler): ' +
    ['Si alt testi', 'örtük psikoz', 'şizoid sosyal uyum']
      .map((s) => `${s}=${kodBantlar[2].text.includes(s) ? '✓' : '✗'}`)
      .join(' · '),
);
console.log('  "Sadece Sc yükselmesi" paragrafı: KAYNAK s.143-146 YOK / KOD SINGLE_SC ' + 'YOK ✅ (tutarlı)');

/** s.146 çapraz referans + kod bloğu başlıkları ↔ kod kayıtları. */
const kodBasliklari: { baslik: string; kanonik: string; not: string }[] = [
  { baslik: '81/18', kanonik: '18', not: 'Bakınız 18/81 (Hs bloğu) — çapraz ref' },
  { baslik: '82/28', kanonik: '28', not: 'Bakınız 28/82 (D bloğu) — çapraz ref' },
  { baslik: '83/38', kanonik: '38', not: 'Bakınız 38/83 (Hy bloğu) — çapraz ref' },
  { baslik: '84/48', kanonik: '48', not: 'Bakınız 48/84 (Pd bloğu) — çapraz ref' },
  { baslik: '85/58', kanonik: '58', not: 'Bakınız 58/85 (Mf bloğu) — çapraz ref' },
  { baslik: '86/68', kanonik: '68', not: 'Sc bloğu gövdesi: "6 ve 8 80 üstü, 7 de 70 T" → Pa bloğu kaydına gömülü' },
  { baslik: '87/78', kanonik: '78', not: 'Sc bloğu gövdesi ("Endişeli, kendi kendini tetkik…") → YOK; 78 Pt metnini döndürür' },
  { baslik: '8726/Yüksek 9', kanonik: '78', not: '"Ajite şizofren bir hastayı göstermektedir." → YOK; slice(0,2) → 78' },
];
console.log('\nSc kod bloğu kapsamı (s.146):');
for (const { baslik, kanonik, not } of kodBasliklari) {
  const varMi = KNOWN_CODES.includes(kanonik);
  const cagrilan = codeInterpretation(baslik.split('/')[0])?.code ?? '—';
  console.log(
    `  ${baslik.padEnd(16)} kayıt ${varMi ? 'VAR ✅' : 'YOK ❌'}  (kanonik ${kanonik}) → çağrı "${baslik
      .split('/')[0]
      .padEnd(4)}" ${cagrilan.padEnd(8)} | ${not}`,
  );
}

/** Pt bloğu kapanışı (s.142) — 794 ve 70/07. */
console.log('\nPt (7) bloğu kapanışı (s.142):');
for (const baslik of ['794', '70/07']) {
  const kanonik = baslik.replace(/\//g, '').slice(0, 2).split('').sort().join('');
  const rec = codeInterpretation(baslik.replace('/', ''));
  console.log(
    `  ${baslik.padEnd(6)} → kanonik ${kanonik} · kayıt ${KNOWN_CODES.includes(kanonik) ? 'VAR ✅' : 'YOK ❌'}` +
      (rec ? ` · dönen kayıt "${rec.code}"` : ''),
  );
}
console.log(
  '  70/07 gövdesinde kaynak cümlesi "2 ve 8 alt testleri, en sık görülen üçüncü yüksekliktir." → ' +
    (codeInterpretation('07')?.text.includes('üçüncü yükseklik') ? 'VAR ✅' : 'YOK ❌ (CONFLICT-025)'),
);
console.log(
  '  70/07 kadınlara ilişkin kapanış cümleleri ("Bunlar yoksa … sorunları vardır.") → ' +
    (codeInterpretation('07')?.text.includes('farkındadırlar') ? 'VAR ✅' : 'YOK ❌ (CONFLICT-025)'),
);
console.log('  794 Kodu ("Hastalar kronik olarak kaygılı ve gergindirler…") → ' + (codeInterpretation('794')?.text.includes('kronik olarak kaygılı') ? 'VAR' : 'YOK ❌ (3 haneli → CONFLICT-024)'));
