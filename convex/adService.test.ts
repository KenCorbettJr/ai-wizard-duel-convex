import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("ad service functionality", async () => {
  const t = convexTest(schema);

  // Test shouldShowAds for anonymous user
  const shouldShowForAnonymous = await t.query(api.adService.shouldShowAds, {});
  expect(shouldShowForAnonymous).toBe(true);

  // Test shouldShowAds for logged-in user
  const shouldShowForUser = await t.query(api.adService.shouldShowAds, {
    userId: "user_123",
  });
  expect(shouldShowForUser).toBe(false);

  // Test ad configuration for anonymous user
  const adConfig = await t.query(api.adService.getAdConfiguration, {
    placement: "WIZARD_PAGE",
  });
  expect(adConfig.shouldShow).toBe(true);
  expect(adConfig.adType).toBe("DISPLAY_BANNER");
  expect(adConfig.placement).toBe("WIZARD_PAGE");

  // Test ad configuration for logged-in user
  const adConfigUser = await t.query(api.adService.getAdConfiguration, {
    placement: "WIZARD_PAGE",
    userId: "user_123",
  });
  expect(adConfigUser.shouldShow).toBe(false);

  // Test tracking ad interaction
  const interactionId = await t.mutation(api.adService.trackAdInteraction, {
    sessionId: "test_session_123",
    adType: "DISPLAY_BANNER",
    placement: "WIZARD_PAGE",
    action: "IMPRESSION",
    adNetworkId: "google-adsense",
  });
  expect(interactionId).toBeDefined();

  // Test ad performance metrics
  const metrics = await t.query(api.adService.getAdPerformanceMetrics, {
    placement: "WIZARD_PAGE",
    timeframe: 7,
  });
  expect(metrics.impressions).toBe(1);
  expect(metrics.clicks).toBe(0);
  expect(metrics.completions).toBe(0);
  expect(metrics.revenue).toBe(0);
});

test("session service functionality", async () => {
  const t = convexTest(schema);

  // Test session creation
  const sessionId = await t.mutation(
    api.sessionService.createAnonymousSession,
    {
      userAgent: "test-agent",
      referrer: "https://example.com",
    }
  );
  expect(sessionId).toMatch(/^anon_\d+_[a-z0-9]+$/);

  // Test session validation
  const isValid = await t.query(api.sessionService.validateSessionId, {
    sessionId,
  });
  expect(isValid).toBe(true);

  const isInvalid = await t.query(api.sessionService.validateSessionId, {
    sessionId: "invalid_session",
  });
  expect(isInvalid).toBe(false);

  // Test session analytics
  const analytics = await t.query(api.sessionService.getSessionAnalytics, {
    sessionId,
  });
  expect(analytics.sessionId).toBe(sessionId);
  expect(analytics.adInteractions).toBe(0);
  expect(analytics.totalRevenue).toBe(0);
});
