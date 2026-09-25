import assert from 'node:assert/strict';
import test from 'node:test';
import { canCreateMmpiAdministration, MMPI_TEST_DEFINITION_ID } from '../src/clinical/mmpiAdministration.ts';

test('MMPI administration helper requires cloud session and canonical client UUID', () => {
  assert.equal(canCreateMmpiAdministration('cli_local'), false);
  assert.equal(canCreateMmpiAdministration('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false);
  assert.match(MMPI_TEST_DEFINITION_ID, /^00000000-0000-4000-8000-000000000006$/);
});
