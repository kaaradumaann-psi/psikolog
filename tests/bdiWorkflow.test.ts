import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BDI_DRAFT_SCHEMA,
  bdiDraftIdentity,
  bdiDraftStorageKey,
  emptyBdiDraft,
  parseBdiDraft,
} from '../src/clinical/bdiDraft';
import { BDI_INSTRUMENT_VERSION } from '../src/clinical/beckDepression';
import { ageFromBirthDate, formatClinicDate, isIsoCalendarDate, isValidClinicDate } from '../src/clinical/recordRules';

function validDraft(identityKey = 'client:client-a') {
  return {
    schema: BDI_DRAFT_SCHEMA,
    instrumentVersion: BDI_INSTRUMENT_VERSION,
    identityKey,
    administrationId: 'administration:one',
    clientId: 'client-a',
    manualName: '',
    manualGender: '' as const,
    manualAge: '',
    testDate: '2026-09-20',
    answers: Array.from({ length: 21 }, () => null),
    expertNote: '',
    updatedAt: '2026-09-20T10:00:00.000Z',
  };
}

test('draft identities and storage keys are entity-bound', () => {
  assert.equal(bdiDraftIdentity('client-a'), 'client:client-a');
  assert.equal(bdiDraftIdentity('client-b'), 'client:client-b');
  assert.equal(bdiDraftIdentity(''), 'manual');
  assert.notEqual(bdiDraftStorageKey(bdiDraftIdentity('client-a'), 'administration:one'), bdiDraftStorageKey(bdiDraftIdentity('client-b'), 'administration:one'));
  assert.notEqual(bdiDraftStorageKey(bdiDraftIdentity('client-a'), 'administration:one'), bdiDraftStorageKey(bdiDraftIdentity('client-a'), 'administration:two'));
  assert.notEqual(bdiDraftStorageKey(bdiDraftIdentity('client-a'), 'administration:one'), bdiDraftStorageKey(bdiDraftIdentity(''), 'administration:one'));
});

test('draft parser refuses another client identity to prevent cross-client leakage', () => {
  const encoded = JSON.stringify(validDraft('client:client-a'));
  assert.ok(parseBdiDraft(encoded, 'client:client-a'));
  assert.equal(parseBdiDraft(encoded, 'client:client-b'), null);
  assert.equal(parseBdiDraft(encoded, 'manual'), null);
  assert.equal(parseBdiDraft(encoded, 'client:client-a', 'administration:two'), null);
});

test('draft parser binds data to the exact BDI instrument version', () => {
  const draft = validDraft();
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, instrumentVersion: 'BDI-II' }), draft.identityKey), null);
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, schema: 99 }), draft.identityKey), null);
});

test('draft parser rejects malformed, partial, invalid-date and invalid-score payloads', () => {
  const draft = validDraft();
  assert.equal(parseBdiDraft('{bad json', draft.identityKey), null);
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, answers: draft.answers.slice(0, 20) }), draft.identityKey), null);
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, testDate: '2026-02-31' }), draft.identityKey), null);
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, answers: [4, ...draft.answers.slice(1)] }), draft.identityKey), null);
  assert.equal(parseBdiDraft(JSON.stringify({ ...draft, answers: ['0', ...draft.answers.slice(1)] }), draft.identityKey), null);
});

test('empty drafts always have exactly 21 blank score slots', () => {
  const draft = emptyBdiDraft('client:client-a', 'client-a');
  assert.equal(draft.answers.length, 21);
  assert.ok(draft.answers.every((answer) => answer === null));
  assert.equal(draft.identityKey, 'client:client-a');
  assert.equal(draft.clientId, 'client-a');
  assert.match(draft.administrationId, /^administration:/);
});

test('date-only validation catches impossible dates without timezone conversion', () => {
  assert.equal(isIsoCalendarDate('2024-02-29'), true);
  assert.equal(isIsoCalendarDate('2023-02-29'), false);
  assert.equal(isIsoCalendarDate('2026-02-31'), false);
  assert.equal(isIsoCalendarDate('26-09-20'), false);
  assert.equal(isValidClinicDate('2026-09-20', '2026-09-26'), true);
  assert.equal(isValidClinicDate('2026-09-27', '2026-09-26'), false);
  assert.equal(formatClinicDate('2026-09-20'), '20.09.2026');
  assert.equal(formatClinicDate('bad'), '—');
});

test('age is derived against administration date, including birthday boundary', () => {
  assert.equal(ageFromBirthDate('2000-09-20', '2026-09-20'), 26);
  assert.equal(ageFromBirthDate('2000-09-21', '2026-09-20'), 25);
  assert.equal(ageFromBirthDate('2026-09-21', '2026-09-20'), null);
  assert.equal(ageFromBirthDate('2026-02-31', '2026-09-20'), null);
});
