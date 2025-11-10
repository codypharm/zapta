/**
 * Trigger.dev Configuration
 * Serverless background jobs and scheduled tasks
 */

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID || "proj_fvxetetzovxqgnoydlit",
  // Maximum duration for tasks (in seconds)
  maxDuration: 300, // 5 minutes
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
});
