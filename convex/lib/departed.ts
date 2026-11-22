/**
 * Stands in for a player who deleted their account. It replaces their Clerk ID
 * as the owner of wizards kept in other players' duels, and in those duels'
 * `players`. It matches no real user, so the wizard has no profile, can't be
 * edited, and is left off the leaderboard.
 */
export const DEPARTED_OWNER = "departed";
