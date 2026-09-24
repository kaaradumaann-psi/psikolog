import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupRecords, normalizeToken, patientKey, timelineRecords } from '../src/records/patientGrouping';
import type { RecordSummary } from '../src/records/supabaseRecords';

function mk(id: string, first: string, last: string, createdAt: string, appDate: string = '2026-09-20'): RecordSummary {
  return { id, firstName: first, lastName: last, applicationDate: appDate, createdAt } as RecordSummary;
}

describe('patientGrouping — normalizasyon', () => {
  it('trim ve çoklu boşluk temizlenir', () => {
    assert.equal(normalizeToken('  Ayşe   Nur  '), 'ayşe nur');
  });
  it('Türkçe case normalize: İ/I ayrımı', () => {
    // İstanbul — farklı yazımlar aynı anahtara düşmeli
    assert.equal(normalizeToken('İSTANBUL'), 'istanbul');
    assert.equal(normalizeToken('I'), 'ı');
    assert.equal(patientKey('İSMAİL', 'YILMAZ'), patientKey('ismail', 'yılmaz'));
    // I ile İ farklı kalmalı (doğru ayrım)
    assert.notEqual(normalizeToken('I'), normalizeToken('İ'));
  });
  it('ayşe yılmaz varyantları aynı gruba düşer', () => {
    const a = patientKey('Ayşe', 'Yılmaz');
    const b = patientKey('  ayşe  ', ' YILMAZ  ');
    const c = patientKey('Ayşe', 'yılmaz');
    assert.equal(a, b);
    assert.equal(b, c);
  });
  it('farklı kişiler ayrı gruplara düşer', () => {
    assert.notEqual(patientKey('Ayşe', 'Yılmaz'), patientKey('Ayşe', 'Kara'));
    assert.notEqual(patientKey('Ali', 'Yılmaz'), patientKey('Ayşe', 'Yılmaz'));
  });
});

describe('patientGrouping — gruplama', () => {
  it('aynı danışan kayıtları tek grupta toplanır ve tarihe göre sıralanır', () => {
    const records = [
      mk('1', 'Ayşe', 'Yılmaz', '2026-09-20T10:00:00Z', '2026-09-20'),
      mk('2', 'Ayşe', 'Yılmaz', '2026-09-10T10:00:00Z', '2026-09-10'),
      mk('3', 'Mehmet', 'Kara', '2026-09-15T10:00:00Z', '2026-09-15'),
    ];
    const groups = groupRecords(records);
    assert.equal(groups.length, 2);
    const ayse = groups.find(g => g.displayName === 'Ayşe Yılmaz')!;
    assert.equal(ayse.records.length, 2);
    assert.equal(ayse.records[0]!.id, '1'); // en yeni önce
    assert.equal(ayse.records[1]!.id, '2');
  });
  it('normalize edilmiş aynı isimli kayıtlar tek grupta birleşir', () => {
    const records = [
      mk('1', 'Ayşe', 'Yılmaz', '2026-09-20T10:00:00Z'),
      mk('2', '  ayşe ', ' YILMAZ ', '2026-09-21T10:00:00Z'),
    ];
    const groups = groupRecords(records);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.records.length, 2);
  });
  it('aynı isimli farklı kişiler riski: IDOR değil, yalnızca UI gruplaması (dokumante)', () => {
    // İki farklı “Ayşe Yılmaz” gerçekte farklı kişiler olabilir — grouping
    // yalnızca isimden yapıldığı için aynı anahtara düşerler. Sistem bunu
    // “yanlış birleştirme riski” olarak UI uyarısıyla işaretler; veritabanında
    // ayrı kayıtlar olarak kalırlar, RLS’yi bypass etmez.
    const records = [
      mk('1', 'Ayşe', 'Yılmaz', '2026-09-20T10:00:00Z'),
      mk('2', 'Ayşe', 'Yılmaz', '2026-09-21T10:00:00Z'),
    ];
    const groups = groupRecords(records);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.records.length, 2);
    // Her kayıt hâlâ kendi id’sinde — birleştirme yalnızca görünüm katmanı.
    assert.notEqual(groups[0]!.records[0]!.id, groups[0]!.records[1]!.id);
  });
  it('timeline kronolojik (eskiden yeniye) sıralanır', () => {
    const g = groupRecords([
      mk('3', 'A', 'B', '2026-09-23T00:00:00Z', '2026-09-23'),
      mk('1', 'A', 'B', '2026-03-12T00:00:00Z', '2026-03-12'),
      mk('2', 'A', 'B', '2026-06-15T00:00:00Z', '2026-06-15'),
    ])[0]!;
    const tl = timelineRecords(g);
    assert.deepEqual(tl.map(r => r.id), ['1', '2', '3']);
  });
});
