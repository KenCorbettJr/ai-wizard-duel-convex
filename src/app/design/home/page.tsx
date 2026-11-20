import { Suspense } from "react";
import { notFound } from "next/navigation";
import DashboardContent, {
  type DashboardPreview,
} from "@/components/DashboardContent";

export const metadata = { title: "Home screen preview" };

const opponents = [
  ["Pip the Apprentice", "BEGINNER"],
  ["Mossbeard the Mild", "BEGINNER"],
  ["Sister Ember", "BEGINNER"],
  ["Gale Warden", "INTERMEDIATE"],
  ["Tidecaller Ysa", "INTERMEDIATE"],
  ["Ironhex", "INTERMEDIATE"],
  ["Nyx the Hollow", "ADVANCED"],
  ["The Gilded Duke", "ADVANCED"],
  ["Archmage Veyra", "ADVANCED"],
  ["The Arcane Arbiter", "ADVANCED"],
].map(([name, difficulty], i) => ({
  _id: `opp${i + 1}`,
  name,
  opponentNumber: i + 1,
  difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
}));

const season = {
  name: "Season of the First Spark",
  completionRelic: { name: "Ember Crown", luckBonus: 1 },
};

const wizard = (id: string, name: string, wins: number, losses: number) => ({
  _id: id,
  name,
  description: "A mischievous spellcaster.",
  wins,
  losses,
});

const day = 86_400_000;

// Mock duels have no wizard ids so the list items render without Convex lookups.
const duel = (id: string, status: string, rounds: number, ago: number) =>
  ({
    _id: id,
    status,
    wizards: [],
    players: [],
    numberOfRounds: 5,
    currentRound: rounds,
    createdAt: Date.now() - ago * day,
    shortcode: status === "WAITING_FOR_PLAYERS" ? "QK7P2" : undefined,
  }) as never;

const STATES: Record<string, DashboardPreview> = {
  // The home screen as it was before the campaign card existed
  baseline: {
    tokens: 7,
    wizards: [
      wizard("w1", "DK Wizard", 9, 3),
      wizard("w2", "Boris the Bumbling", 2, 4),
    ],
    campaign: { season: null, opponents, progress: [] },
  },
  // Signed up, nothing created yet
  new: {
    tokens: 10,
    wizards: [],
    campaign: { season, opponents, progress: [] },
  },
  // One wizard, campaign not started
  fresh: {
    tokens: 10,
    wizards: [wizard("w1", "DK Wizard", 0, 0)],
    campaign: { season, opponents, progress: [] },
  },
  // Mid-campaign, several wizards
  returning: {
    tokens: 6,
    activeDuels: [duel("d1", "IN_PROGRESS", 2, 0)],
    completedDuels: [
      duel("d2", "COMPLETED", 5, 1),
      duel("d3", "COMPLETED", 3, 3),
    ],
    wizards: [
      wizard("w1", "DK Wizard", 9, 3),
      wizard("w2", "Boris the Bumbling", 2, 4),
      wizard("w3", "Lady Quillfeather", 0, 0),
    ],
    campaign: {
      season,
      opponents,
      progress: [
        {
          wizardId: "w1",
          currentOpponent: 4,
          defeatedOpponents: [1, 2, 3],
          hasCompletionRelic: false,
          lastBattleAt: Date.now() - 2 * day,
        },
        {
          wizardId: "w2",
          currentOpponent: 2,
          defeatedOpponents: [1],
          hasCompletionRelic: false,
          lastBattleAt: Date.now() - 9 * day,
        },
      ],
    },
  },
  // Finished the campaign
  complete: {
    tokens: 2,
    completedDuels: [duel("d4", "COMPLETED", 5, 1)],
    wizards: [
      wizard("w1", "DK Wizard", 21, 5),
      wizard("w2", "Boris the Bumbling", 2, 4),
    ],
    campaign: {
      season,
      opponents,
      progress: [
        {
          wizardId: "w1",
          currentOpponent: 11,
          defeatedOpponents: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          hasCompletionRelic: true,
          lastBattleAt: Date.now() - day,
        },
        {
          wizardId: "w2",
          currentOpponent: 2,
          defeatedOpponents: [1],
          hasCompletionRelic: false,
          lastBattleAt: Date.now() - 9 * day,
        },
      ],
    },
  },
};

/** Development-only: renders the signed-in home screen in each user state. */
async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state = "returning" } = await searchParams;
  return <DashboardContent preview={STATES[state] ?? STATES.returning} />;
}

export default function HomePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}
