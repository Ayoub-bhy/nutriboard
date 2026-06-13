# NutriBoard — Investor Due-Diligence Audit

_Prepared as an independent A‑Z review (technical, security, data, nutrition‑science, product & market). Severity scale: **Critical / High / Medium / Low**. Each item is tagged **[Fixed]** (done in this pass), **[Planned]** (needs infra or a larger change), or **[Action]** (requires a human/account decision)._

---

## 1. Executive summary

NutriBoard is a well‑built nutrition tracker with three surfaces: a polished **static board / PWA** (the only thing currently live, browser‑only storage), a **React web client**, and a **Node/Express + Prisma/PostgreSQL API**. Code quality is above average for the stage: clean layering, per‑user ownership scoping (no IDOR), parameterized DB access (no SQL injection), audience‑checked Google sign‑in, and real unit tests on the domain logic.

The gap between **what is live** (a single‑file localStorage demo) and **what is marketed** (accounts, shared DB, device sync, "AI nutritionist") is the central diligence risk. The backend that delivers the promised product is not deployed and, until this pass, had several security and operational gaps that would block a production launch.

**Verdict:** strong prototype, credible engineering, but pre‑revenue and pre‑production. Fundable as a team/product bet, not yet as a scaled asset. The fixes in this pass close the most material security/ops gaps; the remaining work is monetization, real deployment, and differentiation.

| Dimension | Grade | Note |
|---|---|---|
| Engineering quality | B+ | Clean architecture, tested core, no IDOR/SQLi |
| Security | B− (was C) | Token encryption, signed OAuth state, prod env guard now in place; cookie‑auth + Redis limiter still open |
| Production readiness | C | No live backend, no migrations committed, deploy configs only added now |
| Nutrition credibility | B− | Sound method; "exclusive Ciqual" claim overstated vs. hand‑entered values (wording fixed) |
| Product / market | C+ | Crowded category, thin differentiation, no monetization |
| Compliance | C | Health data + EU/MENA users; privacy notice added now, no DPA/ToS |

---

## 2. Security & technical findings

### Critical
- **C1 — Live secrets on disk (JWT secret + Google client secret).** Not in git history (correctly gitignored), but real values live in `backend/.env`. **[Action]** Rotate both in Google Cloud Console / your secret store; never reuse a secret that has touched a shared machine. Production now refuses to boot on weak/default secrets (see H1).
- **C2 — OAuth callback had no CSRF protection (state = raw userId).** An attacker could force‑connect a device account into a victim, or leak the userId to the provider. **[Fixed]** `state` is now an HMAC‑signed, 10‑minute‑expiry envelope (`utils/oauthState.ts`), verified timing‑safe in the callback before the userId is trusted.
- **C3 — JWT stored in `localStorage` on the web client (XSS token theft).** **[Planned]** Migrate to an `HttpOnly; Secure; SameSite` cookie with a CSRF token; this is an auth‑flow change across client + API and is scoped as the next security milestone.

### High
- **H1 — No production env validation; insecure JWT fallback baked in.** A prod boot with `JWT_SECRET` unset silently signed tokens with a public string. **[Fixed]** `utils/envValidate.ts` + `config/env.ts` now hard‑fail the boot in production if the secret is missing, default, or under 32 chars, or if `DATABASE_URL` is missing. Unit‑tested.
- **H2 — Integration OAuth tokens stored in plaintext.** A DB/backup leak exposed live Fitbit/Strava/Google tokens. **[Fixed]** Tokens are encrypted at rest with **AES‑256‑GCM** (`utils/crypto.ts`), decrypted only in memory at use. Unit‑tested (round‑trip, tamper‑detection, non‑determinism).
- **H3 — 7‑day stateless JWT, no revocation/refresh.** **[Planned]** Add short‑lived access tokens + refresh rotation + a deny‑list (pairs with C3).
- **H4 — In‑memory rate limiter; `trust proxy` hard‑coded.** Bypassable across instances and spoofable if the hop count is wrong. **[Fixed‑partial]** `trust proxy` is now env‑driven (`TRUST_PROXY`); **[Planned]** move the limiter to Redis before horizontal scaling.
- **H5 — No committed Prisma migrations (schema via `db push`).** No reproducible/rollback‑able schema history; `db push` can silently drop columns. **[Action]** Generate and commit an initial migration (`prisma migrate dev --name init`) — documented in `CONTRIBUTING.md`; the Dockerfile/`render.yaml` already run `migrate deploy`.
- **H6 — Frontend: no tests, missing error/loading states, no client‑side validation.** Failed fetches blank the screen; garbage numeric inputs become 0/NaN. **[Planned]** Add Vitest + React Testing Library, an API‑error boundary/toast, and input guards. CI now runs frontend typecheck (was build‑only).

### Medium
- **M1 — Email not normalized → confusable/duplicate accounts; admin check used different casing.** **[Fixed]** `utils/email.ts` normalizes (trim+lowercase) on register/login/Google; tokens now signed from the stored record.
- **M2 — Google link‑by‑email ignored `email_verified` (account‑takeover vector).** **[Fixed]** Email matching/creation now requires `email_verified === true`.
- **M3 — Outbound fetches (Open Food Facts, Anthropic, Google) have no timeout/size cap.** Cheap DoS. **[Planned]** Add `AbortController` timeouts + response‑size caps.
- **M4 — Query‑param dates unvalidated; profile free‑text unbounded.** **[Planned]** Apply the existing `dateStr`/length schemas to query params and free‑text fields.
- **M5 — N+1 in `/stats/weekly` (14 sequential queries) and streak loads all meals.** **[Planned]** Replace with `groupBy`/`DISTINCT` aggregates.
- **M6 — No deploy configs / Dockerfile.** **[Fixed]** Added `backend/Dockerfile` (+`.dockerignore`, non‑root), `render.yaml` (web + managed Postgres, `/ready` health gate, generated secrets), `frontend/vercel.json` (SPA + security headers).
- **M7 — `/health` didn't check the DB; no readiness split; no process handlers.** **[Fixed]** Added `/ready` (DB ping), `unhandledRejection`/`uncaughtException` handlers, and a 10s forced‑shutdown timeout.

### Low
- **L1 — No dependency lockfiles; CI used `npm install`.** **[Action]** Commit `package-lock.json` and switch CI to `npm ci`. CI now adds npm caching + a Prettier check job.
- **L2 — Security‑relevant layer untested** (auth, requireAdmin, OAuth). **[Planned]** Add integration tests against the Postgres service already running in CI.
- **L3 — bcrypt cost 10 → raised to 12. [Fixed]**
- **L4 — Dead `vitest.config.ts`** (vitest not installed; tests use `node:test`). **[Action]** Remove to avoid confusion.
- **L5 — `.DS_Store` clutter** (ignored, not tracked). Cosmetic.
- **L6 — Landing page SEO**: no OG/Twitter/canonical/JSON‑LD, no `robots.txt`/`sitemap.xml`. **[Planned]** — bare social previews, unguided indexing.
- **L7 — Accessibility**: tabs and clickable `<div>`s lack roles/keyboard handling; SVG ring has no label. **[Planned]**.

---

## 3. Data integrity & privacy
- Schema integrity is **good**: `onDelete: Cascade` on every user relation, correct composite uniqueness (`userId_date`, `habitId_date`, `userId_provider`), sensible indexes.
- **Default profile = 78 kg / 178 cm / male** means a user who skips onboarding gets targets from dummy data. **[Planned]** make these nullable and force onboarding.
- **Privacy controls were absent.** **[Fixed]** The live board now has **Settings → Privacy & your data**: one‑click **Export (JSON)** and **Delete my data**, plus a plain‑language `PRIVACY.md`.

---

## 4. Nutrition‑science accuracy (important for credibility)
- The method is sound: Mifflin‑St Jeor BMR/TDEE, goal‑based macro splits, cooked‑vs‑raw yield factors, and a sensible disclaimer.
- **Overclaim risk:** the app said macros come **exclusively** from ciqual.fr, but the values are **hand‑entered representative figures**, not the official dataset, and a few are rounded approximations. An expert reviewer would flag this. **[Fixed‑wording]** UI and disclaimer now say "**representative entries from the ANSES‑CIQUAL database; may differ slightly from a specific brand or recipe.**" **[Planned]** import the official CIQUAL dataset for exact, searchable values to make the claim literally true.
- Allergen filtering is genuine (ingredient‑key based, verified for nuts/fish/vegan), which is a real safety‑positive.

---

## 5. Product, business & market (investor lens)
- **Crowded category.** MyFitnessPal, Cronometer, Yazio, MacroFactor, Lose It own this space with large food databases and brand. Current differentiation (Ciqual‑grounded raw/cooked weights, multilingual incl. Arabic RTL, weather‑aware hydration) is real but **niche**; needs a sharper wedge (e.g. MENA‑first, Arabic + halal + local foods, or clinician/coach B2B). **[Action]**
- **No monetization.** No pricing, paywall, subscription, or B2B motion. Pre‑revenue with no tested willingness‑to‑pay. **[Action]**
- **Marketing‑vs‑reality gap.** The landing page advertises accounts, AI, and device sync, but the live link is the browser‑only demo; the full‑stack app isn't deployed. This is the most important thing to close for credibility. **[Planned/Action]** deploy the backend (configs now provided) and point the landing CTA at the real app.
- **Retention/growth** rely only on streaks. No notifications‑driven re‑engagement loop server‑side, no referral, no analytics to measure retention. **[Planned]**
- **"Device sync"** is partially real (OAuth backend exists) but not deployed; the board's device cards are cosmetic toggles. Be precise in fundraising materials. **[Action]**

---

## 6. Compliance & legal
- **Health‑adjacent data + EU/MENA users** implies GDPR/PDPL exposure. **[Fixed‑partial]** Added `PRIVACY.md`, `SECURITY.md`, export/delete controls. **[Action]** add Terms of Service, a Data Processing stance, cookie/consent posture, and a named data controller before EU launch.
- Medical disclaimer is present and now strengthened. Good.

---

## 7. What was fixed in this pass (verifiable)
1. **AES‑256‑GCM encryption** of OAuth tokens at rest — `utils/crypto.ts` + wired into `integration.service.ts`.
2. **Signed, expiring OAuth `state`** (CSRF/account‑injection fix) — `utils/oauthState.ts` + callback verification.
3. **Production env guard** — `utils/envValidate.ts` + `config/env.ts` (fails on weak/missing secrets).
4. **Email normalization** + **`email_verified` enforcement** + token from stored record — `auth.service.ts`, `utils/email.ts`.
5. **bcrypt cost 10 → 12.**
6. **Readiness probe `/ready`**, env‑driven `trust proxy`, **process‑crash handlers** + forced‑shutdown timeout.
7. **Deploy/ops**: `backend/Dockerfile` (+`.dockerignore`), `render.yaml`, `frontend/vercel.json`.
8. **CI**: npm caching, frontend typecheck, Prettier check job.
9. **Policy docs**: `SECURITY.md`, `CONTRIBUTING.md`, `PRIVACY.md`.
10. **Live board**: Privacy & Data **export/delete**; honest Ciqual accuracy wording.
11. **8 new security unit tests** (crypto, state, email, env guard) — full suite **39/39 green**.

**Top remaining before a raise:** rotate the exposed secrets (C1), deploy the backend with committed migrations (H5/M6), move JWT to HttpOnly cookies (C3/H3), Redis rate limiter (H4), and decide monetization + a sharper market wedge.
