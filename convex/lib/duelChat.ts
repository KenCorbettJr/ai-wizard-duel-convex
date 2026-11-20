/**
 * Rules for duel chat. Pure functions, shared by the server and the duel page.
 *
 * Only the two duelists can write messages, and only when the duel has chat
 * on. Signed-in viewers can read along. Every message records where in the
 * duel it was sent, so a replay shows it only once the viewer reaches that
 * point and never spoils what comes next.
 */

export const MAX_CHAT_LENGTH = 200;
/** Chat stays open this long after a duel ends, for a "GG". */
export const POST_DUEL_CHAT_MS = 30 * 60 * 1000;
/** Minimum gap between one user's messages in a duel. */
export const TEXT_GAP_MS = 2000;
/** Cap per user per duel, so a single duel can't be flooded. */
export const MAX_TEXTS_PER_DUEL = 150;

interface ChatDuel {
  status: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  players: string[];
  currentRound: number;
  completedAt?: number;
  chatEnabled?: boolean;
  isCampaignBattle?: boolean;
}

/** Where in the duel a message sent now belongs. */
export function chatPhase(duel: ChatDuel): {
  afterRound: number;
  postDuel?: true;
} {
  if (duel.status === "COMPLETED") {
    return { afterRound: duel.currentRound, postDuel: true };
  }
  // The round in play hasn't resolved, so everything before it has.
  const afterRound =
    duel.status === "IN_PROGRESS" ? Math.max(0, duel.currentRound - 1) : 0;
  return { afterRound };
}

/** Whether the duel is live, or ended recently enough to still chat. */
function chatOpen(duel: ChatDuel, now: number): boolean {
  if (duel.status === "IN_PROGRESS") return true;
  if (duel.status === "COMPLETED") {
    return (
      duel.completedAt === undefined ||
      now - duel.completedAt <= POST_DUEL_CHAT_MS
    );
  }
  // Both players are in and the introduction is being written.
  return duel.status === "WAITING_FOR_PLAYERS" && duel.players.length >= 2;
}

/** Why this user can't send a chat message right now, or null if they can. */
export function textBlockedReason(
  duel: ChatDuel,
  userId: string,
  now: number,
): string | null {
  if (duel.isCampaignBattle) return "Chat isn't available in campaign battles.";
  if (!duel.players.includes(userId)) return "Only the duelists can chat.";
  if (duel.chatEnabled === false) return "Chat is turned off for this duel.";
  if (duel.status === "CANCELLED") return "This duel was cancelled.";
  if (duel.players.length < 2) {
    return "Chat opens once your opponent joins.";
  }
  if (!chatOpen(duel, now)) return "Chat has closed for this duel.";
  return null;
}

/** Trim and validate a message. Returns the cleaned text or an error. */
export function cleanChatText(
  text: string,
): { ok: true; text: string } | { ok: false; error: string } {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return { ok: false, error: "Write something first." };
  if (cleaned.length > MAX_CHAT_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_CHAT_LENGTH} characters.`,
    };
  }
  return { ok: true, text: cleaned };
}

/**
 * Whether a viewer has reached the point in the duel where this message was
 * sent. `watchedThrough` is the last round they've seen resolve, and
 * `resultShown` whether they've seen how the duel ended.
 */
export function messageReached(
  message: { afterRound: number; postDuel?: boolean },
  watchedThrough: number,
  resultShown: boolean,
): boolean {
  if (message.postDuel) return resultShown;
  return message.afterRound <= watchedThrough;
}
