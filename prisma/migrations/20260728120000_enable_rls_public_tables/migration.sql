-- Enable Row Level Security on every table in the public schema (rules.md
-- section 2/RLS rule). Supabase auto-exposes every public table through its
-- PostgREST REST API regardless of whether the app uses it; this app only
-- connects via Prisma with a direct Postgres connection, so no table should
-- be reachable through that REST layer.
--
-- No policies are created, which is a deliberate deny-all: with RLS enabled
-- and no permissive policy, the anon/authenticated roles PostgREST uses can
-- see zero rows. Prisma connects as the "postgres" role, which both OWNS
-- these tables and has the BYPASSRLS attribute, so it is unaffected — that is
-- why plain ENABLE (never FORCE) is correct here: FORCE would subject the
-- owner to RLS, which we explicitly do not want.

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transcripts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "action_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jira_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jira_sync_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fathom_connections" ENABLE ROW LEVEL SECURITY;
