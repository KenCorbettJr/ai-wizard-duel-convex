import { isValidConvexId, safeConvexId } from "./utils";

describe("Convex ID validation", () => {
  describe("isValidConvexId", () => {
    it("should return false for invalid IDs", () => {
      expect(isValidConvexId("")).toBe(false);
      expect(isValidConvexId("123")).toBe(false);
      expect(isValidConvexId("jfewiofjwef")).toBe(false);
      expect(isValidConvexId("68970789")).toBe(false);
      expect(isValidConvexId("invalid-id")).toBe(false);
    });

    it("should return true for valid-looking IDs", () => {
      // These are example valid-looking Convex IDs (base64url encoded, 16+ chars)
      expect(isValidConvexId("k123456789abcdef")).toBe(true);
      expect(isValidConvexId("jd123456789abcdef_xyz")).toBe(true);
      expect(isValidConvexId("abc123def456ghi789jkl")).toBe(true);
    });

    it("should handle null and undefined", () => {
      expect(isValidConvexId(null as unknown as string)).toBe(false);
      expect(isValidConvexId(undefined as unknown as string)).toBe(false);
    });
  });

  describe("safeConvexId", () => {
    it("should return null for invalid IDs", () => {
      expect(safeConvexId("invalid")).toBe(null);
      expect(safeConvexId("123")).toBe(null);
      expect(safeConvexId("")).toBe(null);
    });

    it("should return the ID for valid-looking IDs", () => {
      const validId = "k123456789abcdef";
      expect(safeConvexId(validId)).toBe(validId);
      expect(safeConvexId(validId)).toBe(validId);
    });
  });
});
