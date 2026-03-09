/**
 * Shared frontend validation: email, mobile, date of birth.
 */

/** Strong email: local part + @ + domain (RFC 5322–style, practical). */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Indian mobile: 10 digits starting 6–9, optional +91 or 0 prefix. Intl: + and 10–15 digits. */
export const MOBILE_REGEX =
  /^(\+91[\s-]?)?(0)?[6-9]\d{9}$|^\+[1-9]\d{6,14}$/;

/** Normalize phone for validation: digits only; leading 91 stripped for Indian 10-digit. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

export function isValidEmail(value: string | undefined | null): boolean {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_REGEX.test(trimmed);
}

export function isValidMobile(value: string | undefined | null): boolean {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = normalizePhone(trimmed);
  if (normalized.length === 10 && /^[6-9]/.test(normalized)) return true;
  if (/^\+[1-9]\d{6,14}$/.test(trimmed.replace(/\s/g, ''))) return true;
  return MOBILE_REGEX.test(trimmed);
}

/** Min/max age in years. DOB must be in the past and within age range. */
export function validateDateOfBirth(
  value: string | Date | undefined | null,
  options?: { minAge?: number; maxAge?: number }
): { valid: boolean; message?: string } {
  if (value == null || value === '') return { valid: true };
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return { valid: false, message: 'Invalid date' };
  const now = new Date();
  if (d.getTime() > now.getTime()) return { valid: false, message: 'Date of birth cannot be in the future' };
  const minAge = options?.minAge ?? 5;
  const maxAge = options?.maxAge ?? 120;
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < minAge) return { valid: false, message: `Age must be at least ${minAge} years` };
  if (age > maxAge) return { valid: false, message: `Age must be at most ${maxAge} years` };
  return { valid: true };
}

/** Antd Form rule for email (strong regex). */
export const emailRule = {
  required: true,
  message: 'Please enter email',
} as const;

export function emailPatternRule(message = 'Please enter a valid email address') {
  return {
    pattern: EMAIL_REGEX,
    message,
  } as const;
}

/** Antd Form rule for mobile (strong regex). */
export const mobileRequiredRule = {
  required: true,
  message: 'Please enter phone number',
} as const;

export function mobilePatternRule(message = 'Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210)') {
  return {
    validator(_: unknown, value: string) {
      if (value == null || value === '') return Promise.resolve();
      return isValidMobile(value) ? Promise.resolve() : Promise.reject(new Error(message));
    },
  };
}

/** Antd Form validator for date of birth. */
export function dobValidator(options?: { minAge?: number; maxAge?: number }) {
  return (_: any, value: string | Date | undefined | null) => {
    const result = validateDateOfBirth(value, options);
    if (result.valid) return Promise.resolve();
    return Promise.reject(new Error(result.message));
  };
}
