/**
 * PHASE 9/10 batch 19 — Sc (8) bloğu KAPANIŞI + Ma (9) girişi/Tablo 16
 * (kitap s.147-150).
 *
 * Kaynak okuması (görsel doğrulama, extract.py):
 *   s.147 (PDF p81 R): Şekil 22 **Paranoid Vadi** (Pa/Pt/Sc) + `89/98 Kodu` başlangıcı
 *   s.148 (PDF p82 L): `89/98` kapanışı (yaş 27 + üçüncü yükselen 4/7/6 + Olası tanı)
 *                      + `80/08 Kodu` + Olası tanı: Şizoid Kişilik → **Sc bloğu BİTER**
 *   s.149 (PDF p82 R): **9. Hipomani (Ma) Alt Testi** girişi + Graham yüksek puan 1-25
 *   s.150 (PDF p83 L): 🎯 **Tablo 16 (Ma anahtarı, Madde Sayısı: 46)** + "(K Eklemeli)"
 *                      + norm 19.96/19.72 + Graham 26-42 + düşük puan 1-2
 *
 * Tablo 16, 430 dpi **bindirmeli iki kırpma** ile okundu (`tbl16_L` / `tbl16_R`):
 * dikiş çizgisi `64 · 181 · 251 · 148` sütununun üzerinden geçiyor (DECISION-003).
 */
import { SCORING_KEYS, TURKISH_NORMS, K_CORRECTION } from '../../src/scoring/mmpiKeys';
import { codeInterpretation } from '../../src/scoring/mmpiSourceCodes';

/** Tablo 16 — Doğru (11+11+11+2 = 35). */
const kaynakDogru = [
  11, 13, 21, 22, 59, 64, 73, 97, 100, 109, 127,
  134, 143, 156, 157, 167, 181, 194, 212, 222, 226, 228,
  232, 233, 238, 240, 250, 251, 263, 266, 268, 271, 277,
  279, 298,
];
/** Tablo 16 — Yanlış (11). */
const kaynakYanlis = [101, 105, 111, 119, 120, 148, 166, 171, 180, 267, 289];

console.log(
  `KAYNAK (Tablo 16): Dogru ${kaynakDogru.length} + Yanlis ${kaynakYanlis.length} = ` +
    `${kaynakDogru.length + kaynakYanlis.length}  (kitap başlığı: Madde Sayısı 46)`,
);
const ma = SCORING_KEYS.Ma as { trueItems: number[]; falseItems: number[] };
console.log(`KOD             : Dogru ${ma.trueItems.length} + Yanlış ${ma.falseItems.length} = ${ma.trueItems.length + ma.falseItems.length}`);

function cmp(ad: string, kaynak: number[], kod: number[]) {
  const K = new Set(kaynak), C = new Set(kod);
  const fazla = kod.filter((x) => !K.has(x)).sort((a, b) => a - b);
  const eksik = kaynak.filter((x) => !C.has(x)).sort((a, b) => a - b);
  console.log(
    `${ad}: FAZLA [${fazla.join(', ')}] | EKSIK [${eksik.join(', ')}] -> ` +
      `${fazla.length === 0 && eksik.length === 0 ? 'BİREBİR MATCH ✅' : 'FARK ❌'}`,
  );
}
cmp('Doğru ', kaynakDogru, ma.trueItems);
cmp('Yanlış', kaynakYanlis, ma.falseItems);

console.log(
  `\nNorm KAYNAK: erkek 19.96 / kadın 19.72 (Tablo 16 dipnotu, Savaşır 1981)\n` +
    `Norm KOD   : erkek ${TURKISH_NORMS.Erkek.Ma.mean} (sd ${TURKISH_NORMS.Erkek.Ma.sd}) / ` +
    `kadın ${TURKISH_NORMS.Kadın.Ma.mean} (sd ${TURKISH_NORMS.Kadın.Ma.sd})  → ` +
    `${TURKISH_NORMS.Erkek.Ma.mean === 19.96 && TURKISH_NORMS.Kadın.Ma.mean === 19.72 ? 'MATCH ✅ (sd Tablo 30)' : 'FARK ❌'}`,
);
console.log(
  `K ekleme   : kaynak "(K Eklemeli)" ↔ K_CORRECTION.Ma = ${K_CORRECTION.Ma} ` +
    `(0.2K oranı PHASE 4/K tablosundan doğrulanmıştı)`,
);

/** Sc bloğu kapanışı — s.147-148 gövdeleri ile kod kayıtlarının karşılaştırması. */
const scKapanis: { baslik: string; kanonik: string; beklenen: string[] }[] = [
  {
    baslik: '89/98',
    kanonik: '89',
    beklenen: [
      'ergenlerde ve yetişkinlerde ciddi psikopatoloji',
      'çocuksu beklentileri',
      'fikir uçuşmaları',
      'terapi görüşmelerinde',
      'Stres altında dağılma',
      'psikotik bir tablo',
      'Şizofreni',
      'Madde kullanımına bağlı psikoz',
      'Yaşı 27', // kaynak cümlesi: "Yaşı 27'den küçük olanlarda görülür…"
      'üçüncü yükselen alt test 4, 7 ya da 6',
    ],
  },
  {
    baslik: '80/08',
    kanonik: '08',
    beklenen: [
      'sosyal açıdan çekingen',
      'hata yapmak istemedikleri',
      'Fantezi kurarak',
      'kendi ailelerinden bile',
      'konfüzyonları vardır',
      'Danışmanlık görüşmelerinde',
      'Şizoid Kişilik',
      '7 ve 2 alt testleri en yüksek üçüncü testtir',
    ],
  },
];

console.log('\nSc (8) bloğu KAPANIŞI (s.147-148) — kaynak cümleleri kodda var mı?');
for (const { baslik, kanonik, beklenen } of scKapanis) {
  const rec = codeInterpretation(baslik.split('/')[0]);
  const body = `${rec?.text ?? ''} ${rec?.diagnosis?.join(' ') ?? ''}`.toLowerCase();
  // büyük/küçük harf duyarsız: kaynağın cümle ortası biçimi kodda noktalı virgülden
  // sonra küçük harfle sürüyor ("…danışmanlık görüşmelerinde…") → FALSE-POSITIVE üretmesin
  const varOkuyan = beklenen.filter((b) => body.includes(b.toLowerCase()));
  const yok = beklenen.filter((b) => !body.includes(b.toLowerCase()));
  console.log(
    `  ${baslik.padEnd(7)} → kayıt ${rec ? `"${rec.code}" ✅` : 'YOK ❌'} · ` +
      `kaynak parçaları ${varOkuyan.length}/${beklenen.length}` +
      (yok.length ? ` · KODDA YOK: ${yok.map((y) => `"${y}"`).join(' , ')}` : ' · TAM MATCH ✅'),
  );
}

console.log(
  '\nŞekil 22 (Paranoid Vadi — Pa↑ Pt↓ Sc↑, eksen 30/50/70/90, s.147): ' +
    'üç ölçekli örüntü kodda **hiç yok** → CONFLICT-033 (+1).',
);
console.log(
  'Ma Graham listeleri (yüksek 42 satır s.149-151 · düşük puan s.150+): kodda YOK → CONFLICT-026.',
);
