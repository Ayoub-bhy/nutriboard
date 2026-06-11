# NutriBoard — Backend (REST API)

Express + TypeScript + Prisma + PostgreSQL.

## Layers
- `routes/` → HTTP wiring
- `controllers/` → request parsing + response shaping (thin)
- `services/` → business logic (BMR/TDEE, adaptive water, coach, audit)
- `lib/prisma.ts` → DB client
- `utils/nutrition.ts` → pure domain math (unit-tested)
- `middleware/` → auth (JWT), error handling
- `validators/` → Zod request schemas

## Quick start
```bash
cp ../.env.example ../.env        # or set DATABASE_URL etc.
docker compose -f ../docker-compose.yml up -d   # start Postgres
npm install
npm run prisma:generate
npm run prisma:migrate            # creates tables
npm run db:seed                   # optional demo user (demo@nutriboard.app / demodemo)
npm run dev                       # http://localhost:4000
```

## Scripts
`dev`, `build`, `start`, `typecheck`, `test`, `prisma:migrate`, `db:seed`.

## API (all under `/api`, JWT bearer except auth)
| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT |
| GET | /auth/me | Current user |
| GET/PATCH | /profile | Read/update profile (audited) |
| GET/POST | /meals, DELETE /meals/:id | Meal log |
| GET/PUT | /water | Adaptive hydration |
| GET/POST | /weights | Weight trend (audited) |
| GET/POST | /habits, DELETE/:id, PUT /:id/log | Habits |
| GET | /suggestions | Meal suggestions |
| GET/POST | /coach | Nutritionist chat (rule-based or AI) |
| GET | /history | Change-history audit trail |
