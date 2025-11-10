/**
 * Trigger.dev Scheduled Tasks Configuration
 * Defines when background jobs should run
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { dailySummaryTask } from "./daily-summary";
import { weeklySummaryTask } from "./weekly-summary";

/**
 * Daily Summary Schedule
 * Runs every day at 8:00 AM UTC
 */
schedules.create({
  task: dailySummaryTask.id,
  cron: "0 8 * * *", // Daily at 8 AM
  deduplicationKey: "daily-summary-{date}",
  externalId: "daily-summary-schedule",
});

/**
 * Weekly Summary Schedule
 * Runs every Monday at 8:00 AM UTC
 */
schedules.create({
  task: weeklySummaryTask.id,
  cron: "0 8 * * 1", // Every Monday at 8 AM
  deduplicationKey: "weekly-summary-{week}",
  externalId: "weekly-summary-schedule",
});
