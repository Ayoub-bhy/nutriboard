# 🥗 NutriBoard

A full-stack **nutrition coach & habit tracker**. Set a goal, log meals/water/weight/habits, get goal-aware targets (Mifflin-St Jeor), meal suggestions tailored to your remaining macros, an adaptive hydration goal, a built-in (or AI-powered) nutritionist chat, and a timestamped audit trail of every change.

## ▶️ Live demo

**Instant-use board (no install, runs entirely in your browser):**
👉 **https://ayoub-bhy.github.io/nutriboard/**

This is the self-contained client-side tracker — it saves your data privately in your browser via `localStorage`, so nothing is uploaded. The full-stack version below (with accounts and a shared database) is what you run locally or deploy.

## Architecture

```
nutriboard/
├── backend/      Express + TypeScript REST API, Prisma ORM, JWT auth, Zod validation
├── frontend/     React + Vite + TypeScript SPA (typed API client, auth context)
├── docs/         Static client-side demo served on GitHub Pages
├── docker-compose.yml   PostgreSQL 16
└── .github/workflows/ci.yml   CI: typecheck + tests + build
```

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 18, Vite, TypeScript | Fast DX, typed UI, dev proxy to API |
| API | Express, TypeScript | Thin **routes → controllers → services** separation |
| Validation | Zod | Runtime + compile-time request safety |
| Auth | JWT (bcrypt-hashed passwords) | Stateless, standard |
| ORM/DB | Prisma + PostgreSQL | Type-safe queries, migrations |
| Domain logic | Pure `utils/nutrition.ts` | Unit-tested, framework-free |
| Tests/CI | Node built-in test runner, GitHub Actions | Zero-dependency tests; math + build verified on every push |

## Quick start

Prerequisites: Node 18+, Docker.

```bash
# 1. Database
cp .env.example .env
npm run db:up                       # Postgres on :5432

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init  # create tables
npm run db:seed                     # optional demo user: demo@nutriboard.app / demodemo
npm run dev                         # API on http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                         # app on http://localhost:5173
```

Open http://localhost:5173, register, and start tracking. The Vite dev server proxies `/api` to the backend.

## Features

- **Goal-aware targets** — BMR/TDEE via Mifflin-St Jeor; per-goal protein/fat per kg, carbs balance the budget.
- **Meal log** with live calorie ring + macro bars and per-entry timestamps.
- **Adaptive hydration** — ~35 ml/kg base (+350 on training days), streaks, and progressive target increases after consistent weeks.
- **Suggested meals** computed from remaining calories/protein and your diet type, allergies, and dislikes.
- **Nutritionist coach chat** — reads your live data; logs weight from chat; suggests meals; optional **live Claude** via `ANTHROPIC_API_KEY` with automatic fallback. In-sync / out-of-sync indicator.
- **Profile & routine** — body stats, diet preferences, meal times, training days.
- **Audit trail** — every edit to weight, goal, profile, diet, and water target is timestamped in change history.
- **Insights** — best-practice tracking guidance and a "genius coach ideas" backlog.

## Optional configuration

| Env var | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | backend | Upgrade coach to a live Claude model |
| `ANTHROPIC_MODEL` | backend | Default `claude-haiku-4-5-20251001` |
| `JWT_SECRET` | backend | **Set a strong value in production** |
| `CORS_ORIGIN` | backend | Allowed frontend origin |
| `VITE_API_BASE` | frontend | API base (default `/api` via dev proxy) |

## Scripts (root)
`npm run db:up` · `npm run dev:backend` · `npm run dev:frontend` · `npm test` · `npm run typecheck` · `npm run build`

## License
MIT — see [LICENSE](./LICENSE).
