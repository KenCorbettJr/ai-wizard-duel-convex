import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWaitlistStatus } from "./useWaitlistStatus";
import * as clerkNextjs from "@clerk/nextjs";

// Mock the Clerk module
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

// Store original env values
const originalEnv = { ...process.env };

describe("useWaitlistStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";
  });

  describe("with approved user", () => {
    it("should return approved status for user with waitlistApproved=true", () => {
      const mockUser = {
        id: "user_123",
        publicMetadata: {
          waitlistApproved: true,
        },
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("approved");
      expect(result.current.user).toBe(mockUser);
    });

    it("should return approved status for admin user", () => {
      const mockUser = {
        id: "user_admin",
        publicMetadata: {
          role: "admin",
        },
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("approved");
    });

    it("should return approved status for super_admin user", () => {
      const mockUser = {
        id: "user_super_admin",
        publicMetadata: {
          role: "super_admin",
        },
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("approved");
    });
  });

  describe("with pending user", () => {
    it("should return pending status for user without waitlistApproved", () => {
      const mockUser = {
        id: "user_pending",
        publicMetadata: {},
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("pending");
      expect(result.current.user).toBe(mockUser);
    });

    it("should return pending status for user with waitlistApproved=false", () => {
      const mockUser = {
        id: "user_pending_2",
        publicMetadata: {
          waitlistApproved: false,
        },
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("pending");
    });
  });

  describe("with unauthenticated user", () => {
    it("should return none status when user is null", () => {
      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("none");
      expect(result.current.user).toBe(null);
    });

    it("should return none status when user is undefined", () => {
      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: undefined,
        isLoaded: true,
        isSignedIn: false,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBe("none");
      expect(result.current.user).toBe(undefined);
    });
  });

  describe("loading states", () => {
    it("should return loading=true when Clerk is not loaded", () => {
      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: undefined,
        isLoaded: false,
        isSignedIn: false,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.status).toBe("none");
    });

    it("should return loading=false when Clerk is loaded", () => {
      const mockUser = {
        id: "user_123",
        publicMetadata: {
          waitlistApproved: true,
        },
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle user with missing publicMetadata", () => {
      const mockUser = {
        id: "user_no_metadata",
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.status).toBe("pending");
    });

    it("should handle user with empty publicMetadata object", () => {
      const mockUser = {
        id: "user_empty_metadata",
        publicMetadata: {},
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.status).toBe("pending");
    });
  });

  describe("development mode bypass", () => {
    it("should bypass waitlist in development when NEXT_PUBLIC_WAITLIST_ENABLED is not true", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "false";

      const mockUser = {
        id: "user_dev",
        publicMetadata: {},
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.status).toBe("approved");
    });

    it("should enforce waitlist in development when NEXT_PUBLIC_WAITLIST_ENABLED is true", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";

      const mockUser = {
        id: "user_dev_enforced",
        publicMetadata: {},
      } as unknown as ReturnType<typeof clerkNextjs.useUser>["user"];

      vi.mocked(clerkNextjs.useUser).mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as unknown as ReturnType<typeof clerkNextjs.useUser>);

      const { result } = renderHook(() => useWaitlistStatus());

      expect(result.current.isApproved).toBe(false);
      expect(result.current.isPending).toBe(true);
      expect(result.current.status).toBe("pending");
    });
  });
});
