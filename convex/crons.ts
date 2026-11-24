import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Season statuses are managed manually through admin controls.

// Daily duel teaser for YouTube Shorts, drafted in time for a morning review
// (13:00 UTC is 8am US Eastern). Does nothing unless TEASERS_ENABLED is "true".
crons.daily(
  "draft daily duel teaser",
  { hourUTC: 13, minuteUTC: 0 },
  internal.teasers.pickDailyDuel,
  {},
);

export default crons;
