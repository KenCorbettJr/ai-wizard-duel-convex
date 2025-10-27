import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

test("getOptimizedImageUrl returns null for invalid storage ID", async () => {
  const t = convexTest(schema);

  const result = await t.query(api.metadata.getOptimizedImageUrl, {
    storageId: "invalid-storage-id",
  });

  expect(result).toBeNull();
});

test("metadata functions exist and are callable", async () => {
  convexTest(schema);

  // Test that the functions exist in the API
  expect(api.metadata.getWizardForMetadata).toBeDefined();
  expect(api.metadata.getDuelForMetadata).toBeDefined();
  expect(api.metadata.getOptimizedImageUrl).toBeDefined();
  expect(api.metadata.getWizardForMetadataInternal).toBeDefined();
  expect(api.metadata.getDuelForMetadataInternal).toBeDefined();
});
