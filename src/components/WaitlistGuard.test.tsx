/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaitlistGuard } from "./WaitlistGuard";
import * as useWaitlistStatusModule from "@/hooks/useWaitlistStatus";
import "@testing-library/jest-dom/vitest";

// Mock the useWaitlistStatus hook
vi.mock("@/hooks/useWaitlistStatus", () => ({
  useWaitlistStatus: vi.fn(),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("WaitlistGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("children render for approved users", () => {
    it("should render children when user is approved", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as ReturnType<
          typeof useWaitlistStatusModule.useWaitlistStatus
        >["user"],
      });

      render(
        <WaitlistGuard>
          <div data-testid="protected-content">Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("should render children without fallback message for approved users", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as any,
      });

      render(
        <WaitlistGuard>
          <button>Create Wizard</button>
        </WaitlistGuard>
      );

      expect(
        screen.getByRole("button", { name: "Create Wizard" })
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Waitlist Approval Required/i)
      ).not.toBeInTheDocument();
    });

    it("should render multiple children for approved users", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as any,
      });

      render(
        <WaitlistGuard>
          <div>First Child</div>
          <div>Second Child</div>
        </WaitlistGuard>
      );

      expect(screen.getByText("First Child")).toBeInTheDocument();
      expect(screen.getByText("Second Child")).toBeInTheDocument();
    });
  });

  describe("fallback renders for pending users", () => {
    it("should render default fallback message when user is pending", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: true,
        isLoading: false,
        status: "pending",
        user: { id: "user_pending" } as any,
      });

      render(
        <WaitlistGuard>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      expect(
        screen.getByText(/Waitlist Approval Required/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/This feature requires waitlist approval/i)
      ).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should render link to waitlist page in default fallback", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: true,
        isLoading: false,
        status: "pending",
        user: { id: "user_pending" } as any,
      });

      render(
        <WaitlistGuard>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      const link = screen.getByRole("link", { name: /waitlist status/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/waitlist");
    });

    it("should render custom fallback when provided for pending users", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: true,
        isLoading: false,
        status: "pending",
        user: { id: "user_pending" } as any,
      });

      render(
        <WaitlistGuard
          fallback={<div data-testid="custom-fallback">Custom Message</div>}
        >
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Custom Message")).toBeInTheDocument();
      expect(
        screen.queryByText(/Waitlist Approval Required/i)
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should not render children when user is pending", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: true,
        isLoading: false,
        status: "pending",
        user: { id: "user_pending" } as any,
      });

      render(
        <WaitlistGuard>
          <button data-testid="protected-button">Create Wizard</button>
        </WaitlistGuard>
      );

      expect(screen.queryByTestId("protected-button")).not.toBeInTheDocument();
    });
  });

  describe("loading state handling", () => {
    it("should render loading spinner when isLoading is true", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: true,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      // Check for loading spinner (Loader2 icon with animate-spin class)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should not render children during loading", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: true,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard>
          <div data-testid="protected-content">Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    });

    it("should not render fallback during loading", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: true,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard fallback={<div>Custom Fallback</div>}>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.queryByText("Custom Fallback")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Waitlist Approval Required/i)
      ).not.toBeInTheDocument();
    });

    it("should transition from loading to approved state", () => {
      const { rerender } = render(
        <WaitlistGuard>
          <div data-testid="protected-content">Protected Content</div>
        </WaitlistGuard>
      );

      // Initially loading
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: true,
        status: "none",
        user: null,
      });

      rerender(
        <WaitlistGuard>
          <div data-testid="protected-content">Protected Content</div>
        </WaitlistGuard>
      );

      expect(document.querySelector(".animate-spin")).toBeInTheDocument();

      // Then approved
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as any,
      });

      rerender(
        <WaitlistGuard>
          <div data-testid="protected-content">Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });
  });

  describe("with unauthenticated users", () => {
    it("should render default fallback when user is null and not approved", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: false,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should render custom fallback for unauthenticated users when provided", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: false,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard
          fallback={<div data-testid="auth-required">Please sign in</div>}
        >
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      expect(screen.getByTestId("auth-required")).toBeInTheDocument();
      expect(screen.getByText("Please sign in")).toBeInTheDocument();
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("should not render children for unauthenticated users", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: false,
        isLoading: false,
        status: "none",
        user: null,
      });

      render(
        <WaitlistGuard>
          <button data-testid="protected-button">Create Wizard</button>
        </WaitlistGuard>
      );

      expect(screen.queryByTestId("protected-button")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle empty children gracefully", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as any,
      });

      const { container } = render(<WaitlistGuard>{null}</WaitlistGuard>);

      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it("should handle complex children components", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: true,
        isPending: false,
        isLoading: false,
        status: "approved",
        user: { id: "user_123" } as any,
      });

      render(
        <WaitlistGuard>
          <div>
            <h1>Title</h1>
            <p>Description</p>
            <button>Action</button>
          </div>
        </WaitlistGuard>
      );

      expect(
        screen.getByRole("heading", { name: "Title" })
      ).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action" })
      ).toBeInTheDocument();
    });

    it("should handle null fallback gracefully", () => {
      vi.mocked(useWaitlistStatusModule.useWaitlistStatus).mockReturnValue({
        isApproved: false,
        isPending: true,
        isLoading: false,
        status: "pending",
        user: { id: "user_pending" } as any,
      });

      render(
        <WaitlistGuard fallback={null}>
          <div>Protected Content</div>
        </WaitlistGuard>
      );

      // Should render nothing for null fallback
      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Waitlist Approval Required/i)
      ).not.toBeInTheDocument();
    });
  });
});
