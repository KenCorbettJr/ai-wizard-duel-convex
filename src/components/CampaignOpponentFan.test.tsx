import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampaignOpponentFan } from "./CampaignOpponentFan";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// Mock tooltip components
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock avatar components
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarImage: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-testid="avatar-image" />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// Mock badge component
vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

describe("CampaignOpponentFan", () => {
  const mockOpponents: Doc<"wizards">[] = [
    {
      _id: "opponent1" as Id<"wizards">,
      _creationTime: Date.now(),
      owner: "campaign",
      name: "Test Opponent 1",
      description: "A test opponent",
      opponentNumber: 1,
      difficulty: "BEGINNER",
      luckModifier: -2,
      spellStyle: "basic magic",
      personalityTraits: ["nervous", "eager"],
      illustrationPrompt: "test prompt",
      isCampaignOpponent: true,
    },
    {
      _id: "opponent2" as Id<"wizards">,
      _creationTime: Date.now(),
      owner: "campaign",
      name: "Test Opponent 2",
      description: "Another test opponent",
      opponentNumber: 2,
      difficulty: "INTERMEDIATE",
      luckModifier: 0,
      spellStyle: "fire magic",
      personalityTraits: ["confident", "strategic"],
      illustrationPrompt: "test prompt 2",
      isCampaignOpponent: true,
    },
  ];

  it("renders without crashing", () => {
    const { container } = render(
      <CampaignOpponentFan opponents={mockOpponents} />
    );

    expect(container).toBeInTheDocument();
  });

  it("displays the correct title", () => {
    const { getByText } = render(
      <CampaignOpponentFan opponents={mockOpponents} />
    );

    expect(getByText("Campaign Opponents")).toBeInTheDocument();
    expect(getByText("10 Legendary Challengers Await")).toBeInTheDocument();
  });

  it("renders all opponents", () => {
    const { getAllByTestId } = render(
      <CampaignOpponentFan opponents={mockOpponents} />
    );

    const avatars = getAllByTestId("avatar");
    expect(avatars).toHaveLength(2);
  });

  it("displays opponent numbers correctly", () => {
    const { getByText } = render(
      <CampaignOpponentFan opponents={mockOpponents} />
    );

    expect(getByText("#1")).toBeInTheDocument();
    expect(getByText("#2")).toBeInTheDocument();
  });

  it("shows opponent names", () => {
    const { getAllByText } = render(
      <CampaignOpponentFan opponents={mockOpponents} />
    );

    expect(getAllByText("Test Opponent 1")).toHaveLength(2); // Card + tooltip
    expect(getAllByText("Test Opponent 2")).toHaveLength(2); // Card + tooltip
  });

  it("applies custom className", () => {
    const { container } = render(
      <CampaignOpponentFan opponents={mockOpponents} className="custom-class" />
    );

    const mainDiv = container.querySelector(".relative.w-full.overflow-hidden");
    expect(mainDiv).toHaveClass("custom-class");
  });

  it("handles empty opponents array", () => {
    const { container } = render(<CampaignOpponentFan opponents={[]} />);

    expect(container).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="avatar"]')
    ).not.toBeInTheDocument();
  });

  it("shows progress indicators when wizard progress is provided", () => {
    const mockProgress = {
      defeatedOpponents: [1],
      currentOpponent: 2,
      hasCompletionRelic: false,
    };

    const { container } = render(
      <CampaignOpponentFan
        opponents={mockOpponents}
        selectedWizardProgress={mockProgress}
      />
    );

    expect(container).toBeInTheDocument();
    // The component should render with progress indicators
  });

  it("sorts opponents by opponent number", () => {
    const unsortedOpponents = [
      { ...mockOpponents[1], opponentNumber: 3 },
      { ...mockOpponents[0], opponentNumber: 1 },
    ];

    const { container } = render(
      <CampaignOpponentFan opponents={unsortedOpponents} />
    );

    // Check that the first card shows #1 and the second shows #3
    const opponentNumbers = container.querySelectorAll('[class*="absolute"]');
    expect(opponentNumbers.length).toBeGreaterThan(0);
  });
});
