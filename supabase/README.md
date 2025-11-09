# Supabase Database Setup

This directory contains database migrations and seed data for the Zapta platform.

## Quick Start

### Option 1: Run Migration via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire content of `migrations/20250108_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned" message

### Option 2: Run Migration via Supabase CLI

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref zctbagwhyumjfmaidbst

# Run migrations
supabase db push
```

## Verify Migration

After running the migration, verify it worked:

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `tenants`
   - `profiles`
   - `agents`
   - `integrations`
   - `conversations`
   - `agent_executions`
   - `usage_metrics`
   - `documents`

## Seed Data (Optional)

For development, you can load sample data:

1. First, create a user account via the app's signup page
2. Get your user ID from Supabase Auth users table
3. Edit `seed.sql` and replace `YOUR_USER_ID_HERE` with your actual user ID
4. Run the seed file in SQL Editor (same process as migration)

## Database Schema

### Tables Overview

| Table | Purpose |
|-------|---------|
| `tenants` | Organizations/workspaces for multi-tenancy |
| `profiles` | User profiles (extends auth.users) |
| `agents` | AI agent configurations |
| `integrations` | OAuth credentials for third-party services |
| `conversations` | Chat history between users and agents |
| `agent_executions` | Audit log of agent runs |
| `usage_metrics` | Usage tracking for billing |
| `documents` | Knowledge base documents (for RAG) |

### Security

- **Row-Level Security (RLS)** is enabled on all tables
- Users can only access data from their own tenant
- Policies enforce multi-tenant isolation

## Troubleshooting

### Error: "extension vector does not exist"

If you get this error, enable the pgvector extension:

1. Go to **Database** > **Extensions** in Supabase dashboard
2. Search for `vector`
3. Enable the extension
4. Re-run the migration

### Error: "relation already exists"

This means the migration was already run. You can either:
- Skip it (tables already exist)
- Drop all tables and re-run (destructive!)

To drop all tables (⚠️ **WARNING: This deletes all data!**):

```sql
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.usage_metrics CASCADE;
DROP TABLE IF EXISTS public.agent_executions CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
```

Then re-run the migration.

## Next Steps

After setting up the database:

1. ✅ Restart your Next.js dev server (Cmd+C then `npm run dev`)
2. ✅ Try creating an account via the signup page
3. ✅ Your first user will automatically get a tenant created
4. ✅ Start building agents!

## Files

- `migrations/20250108_initial_schema.sql` - Complete database schema with RLS
- `seed.sql` - Sample data for development (optional)
- `README.md` - This file
