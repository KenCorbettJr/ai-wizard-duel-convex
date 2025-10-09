import { render, screen } from "@testing-library/react";
import { D20Die } from "./d20-die";

describe("D20Die", () => {
  it("renders the correct value", () => {
    render(<D20Die value={15} />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("shows correct title attribute", () => {
    render(<D20Die value={8} />);
    const die = screen.getByTitle("Luck Roll: 8/20");
    expect(die).toBeInTheDocument();
  });

  it("applies correct color classes for different luck ranges", () => {
    const { rerender } = render(<D20Die value={1} />);
    let container = screen.getByTitle("Luck Roll: 1/20");
    expect(container).toHaveClass("from-red-400", "to-red-600");

    rerender(<D20Die value={8} />);
    container = screen.getByTitle("Luck Roll: 8/20");
    expect(container).toHaveClass("from-orange-400", "to-orange-600");

    rerender(<D20Die value={13} />);
    container = screen.getByTitle("Luck Roll: 13/20");
    expect(container).toHaveClass("from-blue-400", "to-blue-600");

    rerender(<D20Die value={17} />);
    container = screen.getByTitle("Luck Roll: 17/20");
    expect(container).toHaveClass("from-green-400", "to-green-600");

    rerender(<D20Die value={20} />);
    container = screen.getByTitle("Luck Roll: 20/20");
    expect(container).toHaveClass("from-yellow-400", "to-yellow-600");
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<D20Die value={10} size="sm" />);
    let container = screen.getByTitle("Luck Roll: 10/20");
    expect(container).toHaveClass("w-8", "h-8", "text-xs");

    rerender(<D20Die value={10} size="md" />);
    container = screen.getByTitle("Luck Roll: 10/20");
    expect(container).toHaveClass("w-12", "h-12", "text-sm");

    rerender(<D20Die value={10} size="lg" />);
    container = screen.getByTitle("Luck Roll: 10/20");
    expect(container).toHaveClass("w-16", "h-16", "text-base");
  });
});
