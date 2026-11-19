/**
 * Single source of truth for how campaign progress is interpreted in the UI.
 * Every campaign screen should use these helpers so counts and states agree.
 */

export const CAMPAIGN_TOTAL_OPPONENTS = 10;

export type OpponentStatus = "locked" | "current" | "defeated";

export interface CampaignProgressLike {
  currentOpponent: number;
  defeatedOpponents: number[];
  hasCompletionRelic: boolean;
  lastBattleAt?: number;
}

export interface CampaignSummary {
  defeatedCount: number;
  total: number;
  /** Opponent number the wizard fights next, or null once the campaign is done. */
  nextOpponent: number | null;
  isCompleted: boolean;
  hasRelic: boolean;
  percent: number;
  /** True when no battle has been fought yet. */
  isFresh: boolean;
}

export function getCampaignSummary(
  progress: CampaignProgressLike | null | undefined,
): CampaignSummary {
  const total = CAMPAIGN_TOTAL_OPPONENTS;
  const defeated = new Set(progress?.defeatedOpponents ?? []);
  const defeatedCount = defeated.size;
  const isCompleted =
    defeatedCount >= total || (progress?.currentOpponent ?? 1) > total;
  const nextOpponent = isCompleted ? null : (progress?.currentOpponent ?? 1);
  return {
    defeatedCount,
    total,
    nextOpponent,
    isCompleted,
    hasRelic: progress?.hasCompletionRelic ?? false,
    percent: Math.min(100, Math.round((defeatedCount / total) * 100)),
    isFresh: defeatedCount === 0 && !progress?.lastBattleAt,
  };
}

export function getOpponentStatus(
  opponentNumber: number,
  progress: CampaignProgressLike | null | undefined,
): OpponentStatus {
  if (progress?.defeatedOpponents.includes(opponentNumber)) return "defeated";
  const next = progress?.currentOpponent ?? 1;
  return opponentNumber === next ? "current" : "locked";
}

export function difficultyLabel(difficulty?: string): string {
  switch (difficulty) {
    case "BEGINNER":
      return "Beginner";
    case "INTERMEDIATE":
      return "Intermediate";
    case "ADVANCED":
      return "Advanced";
    default:
      return "Unknown";
  }
}

/** "3 days ago" style label for a timestamp. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.round((timestamp - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
