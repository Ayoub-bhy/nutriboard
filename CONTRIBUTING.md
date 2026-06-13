# Contributing to NutriBoard

## Prerequisites
- Node 20 (`.nvmrc`)
- Docker (for local Postgres via `docker-compose up -d`)

## Backend
```bash
cd backend
cp .env.example .env            # then set strong JWT_SECRET / ENCRYPTION_KEY
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates the FIRST migration (commit prisma/migrations/)
npm run dev
npm test                        # unit tests (node:test, zero-install)
```

### Database migrations (important)
We deploy with `prisma migrate deploy`, which requires **committed** migration files.
Never ship schema changes with `prisma db push` to production — generate a migration:
```bash
npx prisma migrate dev --name <change>
git add backend/prisma/migrations
```

## Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
npm run typecheck
```

## Pull requests
- Keep PRs focused; add/extend tests for new logic.
- CI must pass (typecheck + tests, both apps). Lint with Prettier (`npx prettier --check .`).
- Don't commit secrets. `.env` is gitignored; rotate any secret that touches a shared machine.
