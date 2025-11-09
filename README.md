# Zapta - AI Agent Platform

Create AI agents without the technical complexity of traditional workflow tools.

## Overview

Zapta is a serverless, TypeScript-first platform that allows business owners to create and manage AI agents using natural language. No need to understand complex workflow builders like n8n - just describe what you want your agent to do.

## Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router) with TypeScript
- **Database & Auth**: Supabase (PostgreSQL + Auth + Realtime)
- **UI**: TailwindCSS + shadcn/ui (HubSpot-inspired design)
- **LLM**: Vercel AI SDK (Anthropic Claude, OpenAI GPT)
- **Background Jobs**: Trigger.dev
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- API keys for Anthropic and/or OpenAI

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Fill in your environment variables in `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
zapta/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utilities and integrations
├── types/               # TypeScript type definitions
├── supabase/            # Database migrations
└── trigger/             # Background jobs
```

## Documentation

See `IMPLEMENTATION_PLAN.md` for the complete implementation roadmap and technical details.

## Features (Planned)

- ✅ Natural language agent creation
- ✅ Pre-built agent templates
- ✅ Email, Slack, SMS, CRM integrations
- ✅ Real-time monitoring and analytics
- ✅ Usage-based billing
- ✅ Knowledge base with RAG
- ✅ Multi-tenant architecture

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Lint code
npm run lint
```

## License

MIT
