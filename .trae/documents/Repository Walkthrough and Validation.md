## Goals
- Confirm understanding of architecture and critical flows
- Validate the chat/RAG pipeline and widget endpoints end-to-end
- Identify any configuration or reliability gaps before changes

## Scope
- Next.js app router UI and middleware
- API routes and server actions for chat and knowledge base
- Supabase clients, RPC `match_documents`, and usage tracking
- Public widget and Trigger.dev jobs

## Steps
### Environment & Run
- Review `.env.local.example` and prepare `.env.local` with required keys
- Start dev server via `npm run dev` and confirm `app/page.tsx` renders

### Chat Flow Trace
- Exercise `app/api/chat/[agentId]/route.ts` POST handler (public widget path)
- Validate agent config load, RAG context from `lib/knowledge/actions.ts:searchDocuments`, and AI model selection
- Cross-check server-side `lib/ai/chat.ts:sendMessage` path for authenticated dashboard usage

### Knowledge Base
- Verify embeddings generation via `lib/embeddings/providers.ts` and chunking logic in `lib/knowledge/actions.ts:chunkDocument`
- Confirm Supabase RPC `match_documents` works as expected and analytics tracking

### Widget Endpoint & UI
- Test `public/zapta-widget.js` fetching agent config and posting chat, ensure lead collection gating
- Use `public/widget-demo.html` to validate integration

### Background Jobs
- Inspect `trigger/daily-summary.ts` and `trigger/weekly-summary.ts` tasks and schedules
- Confirm service-role client usage and email sending paths

### Quick Health Checks (no code changes yet)
- Verify middleware matchers in `middleware.ts` do not block APIs
- Confirm type safety (`types/database.ts`) across core modules

### Optional Next Step (upon approval)
- Add minimal smoke tests for chat, knowledge search, and widget API
- Add a local test harness for `match_documents` RPC inputs/outputs

## Deliverables
- A short report of validations, any issues found, and recommended fixes