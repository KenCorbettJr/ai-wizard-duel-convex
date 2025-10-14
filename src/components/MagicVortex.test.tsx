import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MagicVortex from "./MagicVortex";

// Mock the simplex-noise module
vi.mock("simplex-noise", () => ({
  createNoise3D: () => () => 0.5,
}));

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

Object.defineProperty(window, "requestAnimationFrame", {
  writable: true,
  value: mockRequestAnimationFrame,
});

Object.defineProperty(window, "cancelAnimationFrame", {
  writable: true,
  value: mockCancelAnimationFrame,
});

// Mock HTMLCanvasElement.getContext
const mockGetContext = vi.fn();
HTMLCanvasElement.prototype.getContext = mockGetContext;

describe("MagicVortex", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock canvas context
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      drawImage: vi.fn(),
      set fillStyle(value) {},
      set strokeStyle(value) {},
      set lineWidth(value) {},
      set lineCap(value) {},
      set filter(value) {},
      set globalCompositeOperation(value) {},
    };

    mockGetContext.mockReturnValue(mockContext);
    mockRequestAnimationFrame.mockImplementation(() => {
      // Don't actually call the callback to prevent infinite loops in tests
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MagicVortex>
        <div>Test content</div>
      </MagicVortex>,
    );

    expect(container.querySelector("canvas")).toBeInTheDocument();
    expect(container).toHaveTextContent("Test content");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MagicVortex className="custom-class">
        <div>Test content</div>
      </MagicVortex>,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders children in the foreground", () => {
    const { getByText } = render(
      <MagicVortex>
        <div>Foreground content</div>
      </MagicVortex>,
    );

    expect(getByText("Foreground content")).toBeInTheDocument();
  });

  it("accepts custom particle configuration props", () => {
    const { container } = render(
      <MagicVortex
        baseHue={150}
        baseSpeed={0.5}
        rangeSpeed={2.0}
        baseRadius={2}
        rangeRadius={3}
        backgroundColor="#111111"
      >
        <div>Test content</div>
      </MagicVortex>,
    );

    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("initializes canvas context", () => {
    render(
      <MagicVortex>
        <div>Test content</div>
      </MagicVortex>,
    );

    // Verify canvas context was requested
    expect(mockGetContext).toHaveBeenCalledWith("2d");
  });

  it("cleans up on unmount", () => {
    const { unmount } = render(
      <MagicVortex>
        <div>Test content</div>
      </MagicVortex>,
    );

    // Component should unmount without errors
    expect(() => unmount()).not.toThrow();
  });

  it("handles window resize events", () => {
    const { container, unmount } = render(
      <MagicVortex>
        <div>Test content</div>
      </MagicVortex>,
    );

    // Simulate window resize
    const resizeEvent = new Event("resize");
    window.dispatchEvent(resizeEvent);

    // Component should handle resize without errors
    expect(container.querySelector("canvas")).toBeInTheDocument();

    unmount();
  });
});
