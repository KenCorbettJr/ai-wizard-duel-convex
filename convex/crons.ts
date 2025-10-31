import { cronJobs } from "convex/server";

const crons = cronJobs();

// No active cron jobs currently
// Season statuses are now managed manually through admin controls

export default crons;
