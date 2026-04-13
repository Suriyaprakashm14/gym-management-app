const { normalizeIndianMobile, isValidIndianMobile } = require('../utils/indianPhone');

describe('indianPhone', () => {
  it('normalizes +91 prefix', () => {
    expect(normalizeIndianMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobile('919876543210')).toBe('9876543210');
  });

  it('strips leading 0', () => {
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
  });

  it('accepts plain 10 digits', () => {
    expect(normalizeIndianMobile('8123456789')).toBe('8123456789');
  });

  it('rejects invalid first digit', () => {
    expect(normalizeIndianMobile('5123456789')).toBeNull();
  });

  it('rejects too short', () => {
    expect(normalizeIndianMobile('98765')).toBeNull();
  });

  it('isValidIndianMobile matches normalize', () => {
    expect(isValidIndianMobile('+91 7000000000')).toBe(true);
    expect(isValidIndianMobile('123')).toBe(false);
  });
});
