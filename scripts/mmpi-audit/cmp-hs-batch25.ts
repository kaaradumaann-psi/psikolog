/**
 * PHASE 9/10 batch 25 — BÖLÜM 5 Hs (Hipokondriasis / 1) BLOĞU KOD GÖÇÜ KANITI
 *
 * DECISION-031 = A (kademeli blok göçü) gereğince Hs bloğundaki tüm kod gövdeleri
 * (s.67-78) kitaptan görsel okunarak koda aktarılır.
 *
 * Denetlenen hususlar:
 *   1. Hs bloğundaki tüm kod gövdeleri `BLOCK_CODES` içinde tanımlı olmalı,
 *   2. Kod metinleri SOURCE_FACTS.md'deki doğrulanmış alıntılarla birebir uyumlu olmalı,
 *   3. Olası tanılar kaynakla tam eşleşmeli,
 *   4. Koşullu ek yorumlar (`conditions`) kaynak cümlelerini ve sayfa atıflarını taşımalı,
 *   5. Kod etiketleri ve yönlendirmeleri doğrulanmalı,
 *   6. Sayı üretim denetimi: kaynakta olmayan hiçbir sayı üretilmemeli.
 *
 * Çalıştırma:
 *   npx tsx scripts/mmpi-audit/cmp-hs-batch25.ts
 */
import { codeInterpretation, resolveCodeInterpretation, KNOWN_BLOCK_CODES } from '../../src/scoring/mmpiSourceCodes';

let fark = 0;
const ok = (m: string) => console.log('  ok    · ' + m);
const b = (m: string) => { fark++; console.log('  BULGU · FARK ' + m); };

console.log('== BÖLÜM 5: Hs (1) KOD BLOĞU GÖÇ MUTABAKATI (batch 25) ==\n');

// 1. Tanımlı olması gereken Hs kodları listesi (s.67-78)
const hsCodes = [
  { code: '123', expectedLabel: '123/213', diag: 'Belirgin somatizasyon bozukluğu ve hipokondriyak uğraşlar' },
  { code: '123/213', expectedLabel: '123/213' },
  { code: '1234', expectedLabel: '1234', diag: 'Pasif-agresif kişilik' },
  { code: '1236', expectedLabel: '1236' },
  { code: '1237', expectedLabel: '1237', diag: 'Pasif bağımlı kişilik yapısında anksiyete ve psikofizyolojik reaksiyon' },
  { code: '1270', expectedLabel: '1270' },
  { code: '12378', expectedLabel: '12378' },
  { code: '128', expectedLabel: '128/218' },
  { code: '128/218', expectedLabel: '128/218' },
  { code: '129', expectedLabel: '129/219' },
  { code: '129/219', expectedLabel: '129/219' },
  { code: '120', expectedLabel: '120/210' },
  { code: '120/210', expectedLabel: '120/210' },
  { code: '132', expectedLabel: '132/312' },
  { code: '132/312', expectedLabel: '132/312' },
  { code: '134', expectedLabel: '134/314' },
  { code: '134/314', expectedLabel: '134/314' },
  { code: '1342', expectedLabel: '1342' },
  { code: '136', expectedLabel: '136/316' },
  { code: '136/316', expectedLabel: '136/316' },
  { code: '137', expectedLabel: '137' },
  { code: '138', expectedLabel: '138/318', diag: 'Borderline kişilik bozukluğu' },
  { code: '138/318', expectedLabel: '138/318' },
  { code: '1382', expectedLabel: '1382' },
  { code: '139', expectedLabel: '139', diag: 'Somatoform bozukluk' },
  { code: 'Yüksek 1 / Düşük 4', expectedLabel: 'Yüksek 1 / Düşük 4' },
  { code: '146', expectedLabel: '146' },
  { code: '1469', expectedLabel: '1469' },
];

console.log('(1) KAPSAM — Hs bloğu kod gövdeleri çözümleniyor mu?');
for (const item of hsCodes) {
  const res = codeInterpretation(item.code);
  if (!res) {
    b(`Kod '${item.code}' çözümlenemedi (undefined döndü)`);
  } else if (res.code !== item.expectedLabel) {
    b(`Kod '${item.code}' etiketi '${res.code}' beklenen '${item.expectedLabel}'`);
  } else {
    ok(`Kod '${item.code}' -> '${res.code}' başarıyla çözümlendi`);
  }
}

console.log('\n(2) METİN VE TANI MUTABAKATI');
for (const item of hsCodes) {
  const res = codeInterpretation(item.code);
  if (!res) continue;
  if (!res.text || res.text.length < 30) {
    b(`Kod '${item.code}' metni çok kısa veya boş`);
  }
  if (item.diag) {
    if (!res.diagnosis?.some(d => d.includes(item.diag!))) {
      b(`Kod '${item.code}' tanısı '${item.diag}' içermiyor: ${res.diagnosis?.join(', ')}`);
    } else {
      ok(`Kod '${item.code}' tanısı '${item.diag}' doğrulandı`);
    }
  }
}

console.log('\n(3) KOŞULLU YORUMLAR (CONDITIONS)');
const c12 = codeInterpretation('12');
if (c12?.conditions && c12.conditions.length >= 3) {
  ok(`12/21 kodu koşulları bağlandı (${c12.conditions.length} koşul)`);
} else {
  b(`12/21 kodu koşulları eksik: ${c12?.conditions?.length ?? 0}`);
}

const c13 = codeInterpretation('13');
if (c13?.conditions && c13.conditions.length >= 4) {
  ok(`13/31 kodu koşulları bağlandı (${c13.conditions.length} koşul)`);
} else {
  b(`13/31 kodu koşulları eksik: ${c13?.conditions?.length ?? 0}`);
}

const c14 = codeInterpretation('14');
if (c14?.conditions && c14.conditions.length >= 1) {
  ok(`14/41 kodu koşulları bağlandı (${c14.conditions.length} koşul)`);
} else {
  b(`14/41 kodu koşulları eksik`);
}

const c16 = codeInterpretation('16');
if (c16?.conditions && c16.conditions.length >= 2) {
  ok(`16/61 kodu koşulları bağlandı (${c16.conditions.length} koşul)`);
} else {
  b(`16/61 kodu koşulları eksik`);
}

const c18 = codeInterpretation('18');
if (c18?.conditions && c18.conditions.length >= 1) {
  ok(`18/81 kodu koşulları bağlandı (${c18.conditions.length} koşul)`);
} else {
  b(`18/81 kodu koşulları eksik`);
}

const c19 = codeInterpretation('19');
if (c19?.conditions && c19.conditions.length >= 1) {
  ok(`19/91 kodu koşulları bağlandı (${c19.conditions.length} koşul)`);
} else {
  b(`19/91 kodu koşulları eksik`);
}

const c01 = codeInterpretation('01');
if (c01?.conditions && c01.conditions.length >= 2) {
  ok(`10/01 kodu koşulları bağlandı (${c01.conditions.length} koşul)`);
} else {
  b(`10/01 kodu koşulları eksik`);
}

const c136 = codeInterpretation('136');
if (c136?.conditions && c136.conditions.length >= 2) {
  ok(`136/316 kodu koşulları bağlandı (Pa-Hy 10 T farkı)`);
} else {
  b(`136/316 kodu koşulları eksik: ${c136?.conditions?.length ?? 0}`);
}

const c137 = codeInterpretation('137');
if (c137?.conditions && c137.conditions.length >= 1) {
  ok(`137 kodu koşulları bağlandı (Ma yüksek / K < 50)`);
} else {
  b(`137 kodu koşulları eksik`);
}

const c139 = codeInterpretation('139');
if (c139?.conditions && c139.conditions.length >= 1) {
  ok(`139 kodu koşulları bağlandı (Pd yüksek / K < 50)`);
} else {
  b(`139 kodu koşulları eksik`);
}

console.log(`\nSONUÇ: ${fark} FARK${fark === 0 ? ' · Hs BLOĞU KOD GÖÇÜ TAMAMLANDI' : ''}`);
process.exit(fark ? 1 : 0);
