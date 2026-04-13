const { isDuplicateKeyError, isUserEmailDuplicateKey, isUserPhoneDuplicateKey } = require('../utils/mongoErrors');

describe('mongoErrors', () => {
  it('detects duplicate key by code', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isDuplicateKeyError({ code: '11000' })).toBe(true);
    expect(isDuplicateKeyError({ code: 11001 })).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });

  it('detects user email duplicate from keyPattern', () => {
    expect(
      isUserEmailDuplicateKey({
        code: 11000,
        keyPattern: { email: 1 },
      })
    ).toBe(true);
  });

  it('detects user email duplicate from keyValue', () => {
    expect(
      isUserEmailDuplicateKey({
        code: 11000,
        keyValue: { email: 'a@b.com' },
      })
    ).toBe(true);
  });

  it('detects email duplicate from E11000 message', () => {
    expect(
      isUserEmailDuplicateKey({
        code: 11000,
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key',
      })
    ).toBe(true);
  });

  it('returns false for duplicate on other fields', () => {
    expect(
      isUserEmailDuplicateKey({
        code: 11000,
        keyPattern: { code: 1 },
        message: 'E11000 duplicate key',
      })
    ).toBe(false);
  });

  it('detects user phone duplicate from keyPattern', () => {
    expect(
      isUserPhoneDuplicateKey({
        code: 11000,
        keyPattern: { phone: 1 },
      })
    ).toBe(true);
  });
});
