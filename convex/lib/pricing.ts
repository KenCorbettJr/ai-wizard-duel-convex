/**
 * The single source of truth for what things cost in AI Wizard Duel.
 *
 * Shared by the Convex backend (charging, Stripe checkout) and the Next.js
 * app (marketing page, tokens page). Keep this file free of server imports so
 * both sides can use it.
 *
 * Arcade model: one token is one duel, whatever its length. Packs give a
 * bulk discount. Prices are set to cover the AI cost of a duel (about $0.20
 * on average, roughly $0.25 to $0.30 for a 5-round campaign battle) after
 * card fees, and can be raised here later.
 */

/** Tokens a player pays to enter a PvP duel or start a campaign battle. */
export const DUEL_TOKEN_COST = 1;

/** Tokens a player pays to redo a wizard's illustration. */
export const WIZARD_IMAGE_TOKEN_COST = 1;

/** Free tokens every new account starts with. */
export const STARTING_TOKENS = 3;

/**
 * Bonus tokens a referred player and their referrer each get once the new
 * player finishes their first duel.
 */
export const REFERRAL_BONUS_TOKENS = 5;

/**
 * Invite bonuses are a thank-you for players who have bought tokens. Each can
 * earn the referrer bonus this many times per calendar month (UTC)...
 */
export const REFERRAL_MONTHLY_CAP = 10;
/** ...and this many times in total. */
export const REFERRAL_LIFETIME_CAP = 50;

/**
 * "To the Death" duels end after this many rounds even if both wizards are
 * still standing (winner by points), so one token always has a known cost.
 */
export const TO_THE_DEATH_MAX_ROUNDS = 10;

export interface TokenPack {
  id: "pouch" | "satchel" | "chest";
  name: string;
  tokens: number;
  /** Price in US cents */
  priceCents: number;
  badge?: string;
}

export const TOKEN_PACKS: readonly TokenPack[] = [
  { id: "pouch", name: "Pouch of Tokens", tokens: 15, priceCents: 500 },
  {
    id: "satchel",
    name: "Satchel of Tokens",
    tokens: 33,
    priceCents: 1000,
    badge: "Most popular",
  },
  {
    id: "chest",
    name: "Chest of Tokens",
    tokens: 70,
    priceCents: 2000,
    badge: "Best value",
  },
] as const;

export type TokenPackId = TokenPack["id"];

export function getTokenPack(id: string): TokenPack | undefined {
  return TOKEN_PACKS.find((pack) => pack.id === id);
}

/** "$5", "$10.50" */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** Price of one duel in a pack, in cents, rounded to the nearest cent. */
export function centsPerDuel(pack: TokenPack): number {
  return Math.round(pack.priceCents / pack.tokens);
}

/** "33¢" */
export function formatCentsPerDuel(pack: TokenPack): string {
  return `${centsPerDuel(pack)}¢`;
}

/** Bonus tokens compared with buying at the smallest pack's rate. */
export function bonusTokens(pack: TokenPack): number {
  const base = TOKEN_PACKS[0];
  const atBaseRate = Math.floor(
    (pack.priceCents / base.priceCents) * base.tokens,
  );
  return Math.max(0, pack.tokens - atBaseRate);
}
