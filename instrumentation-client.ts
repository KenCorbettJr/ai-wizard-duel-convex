import posthog from "posthog-js"

// crypto.randomUUID only exists on secure pages (HTTPS or localhost), so it is
// missing when the dev server is opened from a phone at http://192.168.x.x.
// Our code and @convex-dev/presence call it, so fill it in from
// getRandomValues, which works everywhere.
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = () => {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40 // version 4
    b[8] = (b[8] & 0x3f) | 0x80 // RFC 4122 variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
  }
}

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: "2026-08-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
    // Signed-out visitors (who may be under 13) are tracked without cookies
    // or browser storage and never recorded. Signed-in players opt in once
    // their account loads, which turns on cookies and session replay. Until
    // then nothing is captured. See PostHogUserIdentifier in ClerkProvider.
    cookieless_mode: "on_reject",
    session_recording: {
      maskAllInputs: true,
      // Clerk's account UI shows emails; anything marked data-ph-mask is private.
      maskTextSelector: '[class^="cl-"], [class*=" cl-"], [data-ph-mask]',
    },
  })
} else if (process.env.NODE_ENV === "development") {
  const missingVariable = token
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"

  console.error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}
