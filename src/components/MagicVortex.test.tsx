import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MagicVortex from "./MagicVortex";

// Mock the simplex-noise module
vi.mock("simplex-noise", () => ({
  createNoise3D: () => () => 0.5,
}));

describe("MagicVortex", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MagicVortex>
        <div>Test content</div>
      </MagicVortex>
    );

    expect(container.querySelector("canvas")).toBeInTheDocument();
    expect(container).toHaveTextContent("Test content");
  });

  it("applies custom className", () => {
    const { container } = render(
      <MagicVortex className="custom-class">
        <div>Test content</div>
      </MagicVortex>
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders children in the foreground", () => {
    const { getByText } = render(
      <MagicVortex>
        <div>Foreground content</div>
      </MagicVortex>
    );

    expect(getByText("Foreground content")).toBeInTheDocument();
  });
});
