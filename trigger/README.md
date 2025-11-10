# Trigger.dev Background Jobs

This directory contains background job definitions for Zapta using Trigger.dev v3.

## Overview

Trigger.dev handles scheduled tasks and background jobs for:
- **Daily Summary Emails** - Sent every day at 8 AM UTC
- **Weekly Summary Emails** - Sent every Monday at 8 AM UTC

## Setup Instructions

### 1. Create a Trigger.dev Account

1. Visit [https://trigger.dev/](https://trigger.dev/)
2. Sign up for a free account
3. Create a new project

### 2. Get Your API Credentials

1. In your Trigger.dev project dashboard, navigate to the "API Keys" section
2. Copy your **Project ID** and **Secret Key**
3. Add them to your `.env.local` file:

```bash
TRIGGER_PROJECT_ID=your-project-id
TRIGGER_SECRET_KEY=your-secret-key
```

### 3. Install Trigger.dev CLI

```bash
npm install -g @trigger.dev/cli
```

### 4. Deploy Your Jobs

```bash
# Development
npx trigger.dev@latest dev

# Production
npx trigger.dev@latest deploy
```

## Available Jobs

### Daily Summary (`trigger/daily-summary.ts`)

**Schedule**: Every day at 8:00 AM UTC
**Cron**: `0 8 * * *`

Sends daily activity summaries to users who have enabled daily notifications in their settings.

**What it does**:
- Aggregates yesterday's activity (conversations, leads)
- Breaks down activity by agent
- Sends personalized emails to users with `dailySummary: true` in notification preferences

**Manual trigger** (for testing):
```typescript
await dailySummaryTask.trigger({
  date: "2025-01-15" // Optional - defaults to yesterday
});
```

### Weekly Summary (`trigger/weekly-summary.ts`)

**Schedule**: Every Monday at 8:00 AM UTC
**Cron**: `0 8 * * 1`

Sends weekly activity summaries to users who have enabled weekly notifications in their settings.

**What it does**:
- Aggregates last week's activity (Monday to Sunday)
- Breaks down activity by agent
- Sends personalized emails to users with `weeklySummary: true` in notification preferences

**Manual trigger** (for testing):
```typescript
await weeklySummaryTask.trigger({
  weekStart: "2025-01-06", // Optional
  weekEnd: "2025-01-12"    // Optional
});
```

## Testing Locally

### Step 1: Enable Notification Preferences

Before testing, you need to enable summary notifications for your test user.

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor > `profiles` table
3. Find your user record
4. Edit the `notification_preferences` column (JSON):
```json
{
  "email": {
    "newLeads": true,
    "newConversations": true,
    "dailySummary": true,
    "weeklySummary": true
  }
}
```
5. Save the changes

**Option B: Using SQL**
```sql
UPDATE profiles
SET notification_preferences = jsonb_set(
  COALESCE(notification_preferences, '{}'::jsonb),
  '{email}',
  '{"newLeads": true, "newConversations": true, "dailySummary": true, "weeklySummary": true}'::jsonb
)
WHERE email = 'your-email@example.com';
```

### Step 2: Ensure You Have Activity Data

Make sure you have some test data in your database:
- Create at least one agent
- Have some conversations or leads from the past day/week

If you don't have test data, you can create some through the widget or dashboard.

### Step 3: Start the Trigger.dev Dev Server

In a new terminal window, start the Trigger.dev development server:

```bash
npx trigger.dev@latest dev
```

This will:
- Connect to your Trigger.dev project
- Register your jobs
- Start listening for triggers
- Display logs in real-time

You should see output like:
```
✓ Connected to Trigger.dev
✓ Registered tasks:
  - daily-summary
  - weekly-summary
```

### Step 4: Trigger a Test Run

**Option A: Using Trigger.dev Dashboard** (Recommended)

1. Go to [https://cloud.trigger.dev/](https://cloud.trigger.dev/)
2. Select your project (proj_fvxetetzovxqgnoydlit)
3. Click on "Tasks" in the sidebar
4. Select the task you want to test (e.g., "daily-summary")
5. Click "Test" or "Trigger"
6. Optionally provide payload:
   ```json
   {
     "date": "2025-01-15"
   }
   ```
7. Click "Run Test"

**Option B: Using the CLI**

```bash
# Test daily summary (yesterday's data)
npx trigger.dev@latest test --task daily-summary

# Test daily summary for a specific date
npx trigger.dev@latest test --task daily-summary --payload '{"date":"2025-01-15"}'

# Test weekly summary
npx trigger.dev@latest test --task weekly-summary

# Test weekly summary for specific dates
npx trigger.dev@latest test --task weekly-summary --payload '{"weekStart":"2025-01-06","weekEnd":"2025-01-12"}'
```

**Option C: Programmatically (Create a test file)**

Create `test-trigger.ts` in your project root:
```typescript
import { dailySummaryTask } from "./trigger/daily-summary";

async function testDailySummary() {
  const result = await dailySummaryTask.trigger({
    date: "2025-01-15" // Optional
  });

  console.log("Job triggered:", result);
}

testDailySummary();
```

Run it:
```bash
npx tsx test-trigger.ts
```

### Step 5: Verify Email Delivery

1. **Check Console Logs**: Watch the Trigger.dev dev server terminal for logs:
   ```
   Processing daily summary for January 15, 2025
   Sent daily summary to user@example.com
   ✓ Job completed: sent=1, failed=0
   ```

2. **Check Your Email**: Look for the summary email in your inbox
   - Subject: "Your Daily Summary - January 15, 2025"
   - Contains metrics for conversations and leads
   - Shows agent activity breakdown

3. **Check Resend Dashboard**:
   - Go to [https://resend.com/emails](https://resend.com/emails)
   - View sent emails and delivery status

### Step 6: Check Job Results in Trigger.dev Dashboard

1. Go to your Trigger.dev dashboard
2. Click on "Runs" in the sidebar
3. Find your test run
4. Click to view detailed logs and results:
   ```json
   {
     "success": true,
     "date": "January 15, 2025",
     "sent": 1,
     "failed": 0
   }
   ```

### Common Test Scenarios

**Test with no activity:**
- Use a date when you had no conversations or leads
- Should receive email with "No activity" message

**Test with multiple users:**
- Create multiple user accounts in the same tenant
- Enable summary preferences for all
- Verify all users receive emails

**Test error handling:**
- Temporarily use invalid RESEND_API_KEY
- Verify job logs the error but doesn't crash
- Check that failed count increments

### Expected Output

**Successful Daily Summary:**
```
Processing daily summary for January 15, 2025
Sent daily summary to user1@example.com
Sent daily summary to user2@example.com
✓ Job completed successfully
  Date: January 15, 2025
  Sent: 2
  Failed: 0
```

**Successful Weekly Summary:**
```
Processing weekly summary for Jan 8, 2025 - Jan 14, 2025
Sent weekly summary to user1@example.com
✓ Job completed successfully
  Week: Jan 8, 2025 - Jan 14, 2025
  Sent: 1
  Failed: 0
```

## Environment Variables Required

Make sure these are set in your environment:

- `TRIGGER_PROJECT_ID` - Your Trigger.dev project ID
- `TRIGGER_SECRET_KEY` - Your Trigger.dev secret key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for background jobs)
- `RESEND_API_KEY` - Resend API key for sending emails
- `RESEND_FROM_EMAIL` - From email address
- `NEXT_PUBLIC_APP_URL` - Your app URL for email links

## User Notification Preferences

Users can control which emails they receive in their profile settings:

```typescript
notification_preferences: {
  email: {
    newLeads: true,           // New lead notifications
    newConversations: true,   // New conversation notifications
    dailySummary: false,      // Daily summary emails
    weeklySummary: false      // Weekly summary emails
  }
}
```

By default, daily and weekly summaries are **disabled** - users must opt-in.

## Monitoring

View job runs and logs in your Trigger.dev dashboard:
1. Go to [https://cloud.trigger.dev/](https://cloud.trigger.dev/)
2. Select your project
3. View "Runs" to see job execution history

## Troubleshooting

**Jobs not running?**
- Check that your `TRIGGER_PROJECT_ID` and `TRIGGER_SECRET_KEY` are set correctly
- Verify the jobs are deployed: `npx trigger.dev@latest list`
- Check the Trigger.dev dashboard for error logs

**Emails not sending?**
- Verify `RESEND_API_KEY` is set in your production environment
- Check user notification preferences in the database
- Review Trigger.dev job logs for error details

**Testing in development?**
- Run `npx trigger.dev@latest dev` to start the local dev server
- Trigger jobs manually using the Trigger.dev dashboard or API
