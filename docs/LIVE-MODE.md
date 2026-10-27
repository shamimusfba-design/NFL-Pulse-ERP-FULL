# Running NOS against the real database (live mode)

1. Start PostgreSQL/Redis: `docker compose up -d`
2. Copy `.env.example` to `.env`, fill DATABASE_URL and JWT secrets (32+ chars in production).
3. API: `cd apps/api && npx prisma db push && npm run prisma:seed && npm run dev` (port 4000)
4. Web: set `NOS_API_MODE=live` and `API_INTERNAL_URL=http://127.0.0.1:4000`, then `npm run dev`.
5. Log in with a seeded user (e.g. `admin@nfl.local`) and its real password.

Check any response header `x-nos-data-source`:
`live` = PostgreSQL, `demo` = mock (not yet migrated), `live-unreachable` = API down.
