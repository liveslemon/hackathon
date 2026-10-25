# CLAUDE.md

## Database migrations (Supabase project `rvbheqkxighnibpfroya`)

- Migrations live in `frontend/pau-interconnect-app/supabase/migrations/` and must be named `<YYYYMMDDHHMMSS>_name.sql` with a unique timestamp (otherwise the CLI skips or collides them).
- Create: `supabase migration new <name>` (run from `frontend/pau-interconnect-app`).
- Check status: `supabase migration list --linked`
- Apply: `supabase db push --linked --dry-run` first, then `supabase db push --linked`.
- The CLI is already linked and authenticates via `supabase login` (no DB password needed).
- Alternative: the `supabase` MCP server in `.mcp.json` (`apply_migration`, `list_migrations`, `execute_sql`). If you apply via MCP, still commit the same SQL as a migration file.
- Never apply schema changes with ad-hoc SQL only; every change must be a migration file so remote history stays in sync.
