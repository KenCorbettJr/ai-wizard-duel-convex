/**
 * Remembers which invite link a visitor arrived through, so the handle can
 * be attached to their account when it's created after sign-up.
 */
const COOKIE = "awd_ref";
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const HANDLE_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

export function rememberReferral(handle: string) {
  if (!HANDLE_PATTERN.test(handle)) return;
  document.cookie = `${COOKIE}=${encodeURIComponent(handle.toLowerCase())}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function readReferral(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  const handle = match ? decodeURIComponent(match[1]) : undefined;
  return handle && HANDLE_PATTERN.test(handle) ? handle : undefined;
}

export function clearReferral() {
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** The shareable invite link for a handle, on whatever domain we're served from. */
export function inviteUrl(handle: string) {
  return `${window.location.origin}/r/${encodeURIComponent(handle)}`;
}
