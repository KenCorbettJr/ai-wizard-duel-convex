import posthog from "posthog-js"

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
