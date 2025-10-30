import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update campaign season statuses every hour
crons.interval(
  "update season statuses",
  { hours: 1 },
  internal.campaignSeasons.updateSeasonStatuses,
  {}
);

export default crons;
