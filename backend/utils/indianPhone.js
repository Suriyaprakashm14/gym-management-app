/**
 * Normalize Indian mobile numbers to 10 digits (local part, first digit 6–9).
 * Accepts: 9876543210, +91 98765 43210, 09876543210, 919876543210
 * @param {string|number} input
 * @returns {string|null} 10-digit string or null if invalid
 */
function normalizeIndianMobile(input) {
  if (input == null) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return normalizeIndianMobile(digits.slice(2));
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return normalizeIndianMobile(digits.slice(1));
  }
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

function isValidIndianMobile(input) {
  return normalizeIndianMobile(input) != null;
}

module.exports = {
  normalizeIndianMobile,
  isValidIndianMobile,
};
