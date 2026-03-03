const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export function setTokenCookie(token: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearTokenCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0';
}
