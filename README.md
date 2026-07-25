# SyncPM

AI-powered tool for Program Managers that turns cross-functional meeting transcripts into tracked action items, owners, blockers, real Jira tickets, and drafted Slack follow-ups. See [`prd.md`](./prd.md), [`architecture.md`](./architecture.md), [`rules.md`](./rules.md), [`phases.md`](./phases.md), and [`design.md`](./design.md) for the full spec.

Currently at **Phase 0** (scaffolding + deploy skeleton) — see `phases.md` for the build roadmap.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL (Supabase), GEMINI_API_KEY, JIRA_* as phases require them
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Prisma, Supabase Postgres, Google Gemini, Jira Cloud REST API v3, deployed on Vercel. Full rationale in `architecture.md`.
