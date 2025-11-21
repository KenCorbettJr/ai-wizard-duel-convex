import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, screen, cleanup } from "@testing-library/react";
import { WaitlistGuard } from "./WaitlistGuard";
import * as useWaitlistStatusModule from "@/hooks/useWaitlistStatus";

/**
 * Feature: clerk-waitlist, Property 3: Approved user full access
 * Validates: Requirements 2.3, 5.1
 *
 * Property: For any application feature, when an approved user attempts to access it,
 * the system should grant access without waitlist restrictions.
 *
 * This property ensures that:
 * 1. Approved users can always see protected content
 * 2. No waitlist messages are shown to approved users
 * 3. Access is granted regardless of the specific feature being accessed
 */
describe("Property-Based Tests: Approved User Full Access", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    cleanup();
  });

  // Arbitrary for generating random content
  const contentArbitrary = fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constant(<div>Test Content</div>),
    fc.constant(<button>Action Button</button>),
    fc.constant(<span>Protected Feature</span>)
  );

  it("Property 3.1: Approved users always see protected content", () => {
    fc.assert(
      fc.property(contentArbitrary, (content) => {
        // Clean up before each property test run
        cleanup();

        // Mock approved user status
        vi.spyOn(useWaitlistStatusModule, "useWaitlistStatus").mockReturnValue({
          isApproved: true,
          isPending: false,
          isLoading: false,
          status: "approved",
          user: { id: "user_test" } as any,
        });

        // For any content wrapped in WaitlistGuard
        const { container } = render(<WaitlistGuard>{content}</WaitlistGuard>);

        // The content should be rendered
        if (typeof content === "string") {
          expect(container.textContent).toContain(content);
        } else {
          expect(container.innerHTML).not.toBe("");
        }

        // No waitlist-related messages should be present
        expect(screen.queryByText(/waitlist/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/approval/i)).not.toBeInTheDocument();
      }),
      { numRuns: 50 }
    );
  });

  it("Property 3.2: Approved users never see waitlist restrictions", () => {
    fc.assert(
      fc.property(
        contentArbitrary,
        fc.option(contentArbitrary, { nil: undefined }),
        (children, fallback) => {
          // Clean up before each property test run
          cleanup();

          // Mock approved user status
          vi.spyOn(
            useWaitlistStatusModule,
            "useWaitlistStatus"
          ).mockReturnValue({
            isApproved: true,
            isPending: false,
            isLoading: false,
            status: "approved",
            user: { id: "user_test" } as any,
          });

          // For any content and fallback combination
          const { container } = render(
            <WaitlistGuard fallback={fallback}>{children}</WaitlistGuard>
          );

          // The fallback should never be rendered for approved users
          if (fallback && typeof fallback === "string") {
            expect(container.textContent).not.toContain(fallback);
          }

          // Children should be rendered
          if (typeof children === "string") {
            expect(container.textContent).toContain(children);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Property 3.3: Loading state is temporary and resolves to access", () => {
    fc.assert(
      fc.property(contentArbitrary, (content) => {
        // Clean up before each property test run
        cleanup();

        // Mock loading state
        const mockStatus = vi
          .spyOn(useWaitlistStatusModule, "useWaitlistStatus")
          .mockReturnValue({
            isApproved: false,
            isPending: false,
            isLoading: true,
            status: "none",
            user: null,
          });

        // For any content during loading
        const { container, rerender } = render(
          <WaitlistGuard>{content}</WaitlistGuard>
        );

        // Should show loading indicator
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();

        // Then resolve to approved state
        mockStatus.mockReturnValue({
          isApproved: true,
          isPending: false,
          isLoading: false,
          status: "approved",
          user: { id: "user_test" } as any,
        });

        rerender(<WaitlistGuard>{content}</WaitlistGuard>);

        // Content should now be visible
        if (typeof content === "string") {
          expect(container.textContent).toContain(content);
        }

        // Loading indicator should be gone
        expect(
          container.querySelector(".animate-spin")
        ).not.toBeInTheDocument();
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * Feature: clerk-waitlist, Property 4: Approved user UI consistency
 * Validates: Requirements 5.2
 *
 * Property: For any route that an approved user navigates to, the system should not
 * display waitlist-related messages or restrictions.
 *
 * This property ensures that:
 * 1. No waitlist badges or warnings appear for approved users
 * 2. UI remains consistent across all routes
 * 3. No conditional rendering based on waitlist status for approved users
 */
describe("Property-Based Tests: Approved User UI Consistency", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    cleanup();
  });

  // Arbitrary for generating random content
  const contentArbitrary = fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constant(<div>Test Content</div>),
    fc.constant(<button>Action Button</button>),
    fc.constant(<span>Protected Feature</span>)
  );

  // Arbitrary for generating different UI scenarios
  const uiScenarioArbitrary = fc.record({
    hasCustomFallback: fc.boolean(),
    fallbackText: fc.string({ minLength: 5, maxLength: 30 }),
    childrenText: fc.string({ minLength: 5, maxLength: 30 }),
  });

  it("Property 4.1: No waitlist UI elements for approved users", () => {
    fc.assert(
      fc.property(uiScenarioArbitrary, (scenario) => {
        // Clean up before each property test run
        cleanup();

        // Mock approved user status
        vi.spyOn(useWaitlistStatusModule, "useWaitlistStatus").mockReturnValue({
          isApproved: true,
          isPending: false,
          isLoading: false,
          status: "approved",
          user: { id: "user_test" } as any,
        });

        // For any UI scenario - use unique test IDs
        const testId = `test-${Math.random().toString(36).substring(7)}`;
        const fallback = scenario.hasCustomFallback ? (
          <div data-testid={`${testId}-fallback`}>{scenario.fallbackText}</div>
        ) : undefined;

        const { container } = render(
          <WaitlistGuard fallback={fallback}>
            <div data-testid={`${testId}-content`}>{scenario.childrenText}</div>
          </WaitlistGuard>
        );

        // Content should be visible
        const contentElement = screen.getByTestId(`${testId}-content`);
        expect(contentElement).toBeInTheDocument();
        // Check that the content contains the expected text (accounting for whitespace normalization)
        if (scenario.childrenText.trim().length > 0) {
          expect(contentElement.textContent).toContain(
            scenario.childrenText.trim()
          );
        }

        // Fallback should never be visible
        expect(
          screen.queryByTestId(`${testId}-fallback`)
        ).not.toBeInTheDocument();

        // No waitlist-related UI elements
        expect(
          container.querySelector('[class*="yellow"]')
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByText(/waitlist/i)).not.toBeInTheDocument();
      }),
      { numRuns: 50 }
    );
  });

  it("Property 4.2: Consistent rendering across multiple guard instances", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), {
          minLength: 2,
          maxLength: 5,
        }),
        (contentArray) => {
          // Clean up before each property test run
          cleanup();

          // Mock approved user status
          vi.spyOn(
            useWaitlistStatusModule,
            "useWaitlistStatus"
          ).mockReturnValue({
            isApproved: true,
            isPending: false,
            isLoading: false,
            status: "approved",
            user: { id: "user_test" } as any,
          });

          // For any array of content items - use unique test IDs
          const testId = `test-${Math.random().toString(36).substring(7)}`;
          const { container } = render(
            <div>
              {contentArray.map((content, index) => (
                <WaitlistGuard key={index}>
                  <div data-testid={`${testId}-content-${index}`}>
                    {content}
                  </div>
                </WaitlistGuard>
              ))}
            </div>
          );

          // All content should be rendered
          contentArray.forEach((content, index) => {
            const contentElement = screen.getByTestId(
              `${testId}-content-${index}`
            );
            expect(contentElement).toBeInTheDocument();
            // Check that the content contains the expected text (accounting for whitespace normalization)
            if (content.trim().length > 0) {
              expect(contentElement.textContent).toContain(content.trim());
            }
          });

          // No waitlist messages anywhere
          expect(screen.queryAllByText(/waitlist/i)).toHaveLength(0);
          expect(screen.queryAllByText(/pending/i)).toHaveLength(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("Property 4.3: Pending users see consistent restrictions", () => {
    fc.assert(
      fc.property(uiScenarioArbitrary, (scenario) => {
        // Clean up before each property test run
        cleanup();

        // Mock pending user status
        vi.spyOn(useWaitlistStatusModule, "useWaitlistStatus").mockReturnValue({
          isApproved: false,
          isPending: true,
          isLoading: false,
          status: "pending",
          user: { id: "user_test" } as unknown,
        });

        // For any UI scenario with pending user - use unique test IDs
        const testId = `test-${Math.random().toString(36).substring(7)}`;
        const fallback = scenario.hasCustomFallback ? (
          <div data-testid={`${testId}-fallback`}>{scenario.fallbackText}</div>
        ) : undefined;

        const { container } = render(
          <WaitlistGuard fallback={fallback}>
            <div data-testid={`${testId}-content`}>{scenario.childrenText}</div>
          </WaitlistGuard>
        );

        // Content should NOT be visible
        expect(
          screen.queryByTestId(`${testId}-content`)
        ).not.toBeInTheDocument();

        // Either custom fallback or default waitlist message should be shown
        if (scenario.hasCustomFallback) {
          expect(screen.getByTestId(`${testId}-fallback`)).toBeInTheDocument();
        } else {
          // Default waitlist message should be present
          const waitlistElements = screen.queryAllByText(/waitlist/i);
          expect(waitlistElements.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 50 }
    );
  });

  it("Property 4.4: Unauthenticated users see appropriate messaging", () => {
    fc.assert(
      fc.property(contentArbitrary, (content) => {
        // Clean up before each property test run
        cleanup();

        // Mock unauthenticated status
        vi.spyOn(useWaitlistStatusModule, "useWaitlistStatus").mockReturnValue({
          isApproved: false,
          isPending: false,
          isLoading: false,
          status: "none",
          user: null,
        });

        // For any content with unauthenticated user
        const { container } = render(<WaitlistGuard>{content}</WaitlistGuard>);

        // Content should NOT be visible
        if (typeof content === "string") {
          expect(container.textContent).not.toContain(content);
        }

        // Should show authentication or waitlist message
        const hasAuthMessage = screen.queryByText(/sign in/i) !== null;
        const hasWaitlistMessage = screen.queryByText(/waitlist/i) !== null;

        expect(hasAuthMessage || hasWaitlistMessage).toBe(true);
      }),
      { numRuns: 50 }
    );
  });
});
