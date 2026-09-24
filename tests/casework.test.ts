import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAttention,
  buildSessionPreps,
  measurementNote,
  progressSections,
  readScale,
} from '../src/clinical/casework.ts';
import type { CaseSnapshot } from '../src/clinical/casework.ts';

const snapshot: CaseSnapshot = {
  today: '2026-09-24',
  clients: [{ id: 'c1', firstName: 'Candan', lastName: 'Yılmaz' }],
  sessions: [
    {
      id: 's1',
      clientId: 'c1',
      clientName: 'Candan Yılmaz',
      sessionNumber: 2,
      date: '2026-08-22',
      startTime: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      subjective: '',
      objective: '',
      assessment: 'Otomatik düşünce tanımlandı.',
      plan: 'Düşünce kaydı sürdürülecek.',
      riskLevel: 'none',
      homework: 'Günde bir düşünce kaydı.',
      paymentStatus: 'paid',
      createdAt: '2026-08-22T00:00:00.000Z',
      updatedAt: '2026-08-22T00:00:00.000Z',
    },
  ],
  appointments: [
    {
      id: 'a1',
      clientId: 'c1',
      clientName: 'Candan Yılmaz',
      date: '2026-09-24',
      time: '14:00',
      durationMinutes: 50,
      sessionType: 'Bireysel Terapi',
      location: 'Klinik (Yüz Yüze)',
      status: 'scheduled',
      paymentStatus: 'pending',
      createdAt: '2026-09-20T00:00:00.000Z',
    },
  ],
  bdi: [],
  bai: [],
  scl: [],
  screenings: [
    {
      id: 'p1',
      type: 'phq9',
      clientId: 'c1',
      clientName: 'Candan Yılmaz',
      testDate: '2026-09-18',
      answers: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      totalScore: 9,
      severity: 'Hafif',
      suicideRisk: true,
      clinicalNote: 'Madde 9',
      createdAt: '2026-09-18T00:00:00.000Z',
    },
  ],
  tasks: [
    {
      id: 't1',
      clientId: 'c1',
      clientName: 'Candan Yılmaz',
      title: 'Güvenlik planını aç',
      dueDate: '2026-09-24',
      status: 'todo',
      priority: 'high',
    },
  ],
  formulations: [],
  safetyPlans: [],
};

test('readScale reports a rise without inventing a diagnosis', () => {
  const reading = readScale('BDI', [
    { date: '2026-07-01', score: 12, band: 'Hafif' },
    { date: '2026-09-01', score: 20, band: 'Orta' },
  ]);
  assert.ok(reading);
  assert.equal(reading?.direction, 'up');
  assert.equal(reading?.delta, 8);
  assert.equal(reading?.band, 'Orta');
});

test('session prep names the homework and an empty safety plan', () => {
  const [prep] = buildSessionPreps(snapshot);
  assert.equal(prep?.time, '14:00');
  assert.match(prep?.checks.join(' ') ?? '', /düşünce kaydı/);
  assert.match(prep?.checks.join(' ') ?? '', /Güvenlik planı boş/);
  assert.equal(prep?.scores.some((score) => score.flag), true);
});

test('attention queue puts a safety flag ahead of a task', () => {
  const items = buildAttention(snapshot);
  assert.equal(items[0]?.severity, 'danger');
  assert.match(items[0]?.detail ?? '', /PHQ-9/);
  assert.ok(items.some((item) => item.title === 'Bugünkü görev'));
});

test('progress text stays a screening note', () => {
  const note = measurementNote(buildSessionPreps(snapshot)[0]?.scores ?? []);
  assert.match(note, /tanı koymaz/);
  const sections = progressSections({
    clientName: 'Candan Yılmaz',
    sessions: snapshot.sessions,
    readings: [],
    formulation: undefined,
  });
  assert.equal(sections.length, 4);
  assert.match(sections[0]?.content ?? '', /#2/);
});
