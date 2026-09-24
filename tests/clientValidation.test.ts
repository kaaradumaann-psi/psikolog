import assert from 'node:assert/strict';
import test from 'node:test';
import { clientSchema } from '../src/features/clients/clientValidation.ts';
import { generateFileNumber } from '../src/features/clients/clientTypes.ts';

test('clientSchema validates required fields', () => {
  const valid = clientSchema.safeParse({
    firstName: 'Ali',
    lastName: 'Veli',
    birthDate: '1990-01-15',
    phone: '05xx',
    email: 'ali@example.com',
    profession: 'Mühendis',
    education: 'Lisans',
    status: 'active',
  });
  assert.equal(valid.success, true);
});

test('clientSchema rejects empty firstName', () => {
  const result = clientSchema.safeParse({
    firstName: '',
    lastName: 'Veli',
  });
  assert.equal(result.success, false);
});

test('clientSchema rejects long firstName', () => {
  const result = clientSchema.safeParse({
    firstName: 'a'.repeat(81),
    lastName: 'Veli',
  });
  assert.equal(result.success, false);
});

test('clientSchema rejects control char', () => {
  const result = clientSchema.safeParse({
    firstName: 'Ali\u0000',
    lastName: 'Veli',
  });
  assert.equal(result.success, false);
});

test('clientSchema rejects invalid email', () => {
  const result = clientSchema.safeParse({
    firstName: 'Ali',
    lastName: 'Veli',
    email: 'invalid',
  });
  assert.equal(result.success, false);
});

test('clientSchema rejects future birth date', () => {
  const future = '2099-01-01';
  const result = clientSchema.safeParse({
    firstName: 'Ali',
    lastName: 'Veli',
    birthDate: future,
  });
  assert.equal(result.success, false);
});

test('clientSchema accepts empty optional fields', () => {
  const result = clientSchema.safeParse({
    firstName: 'Ali',
    lastName: 'Veli',
    birthDate: '',
    phone: '',
    email: '',
    profession: '',
    education: '',
  });
  assert.equal(result.success, true);
});

test('generateFileNumber produces unique format', () => {
  const fn1 = generateFileNumber();
  const fn2 = generateFileNumber();
  assert.match(fn1, /^F-\d{4}-[A-Z0-9]{6,8}$/);
  assert.notEqual(fn1, fn2);
  assert.ok(fn1.length >= 8 && fn1.length <= 32);
});
