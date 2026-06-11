# 🎯 NutriBoard — Product Action Plan

**From the desk of the Product Manager → to the Full-Stack (BE / FE / API / DB) team.**

## The one sentence that drives every decision

> **The winner isn't the biggest database — it's the lowest-friction path to a visible result. We win when the user feels like they're winning *every single day*.**

Everything below is prioritized against that insight. We do *not* chase feature parity. We chase **time-to-first-win** and **daily return**.

### North-star & guardrail metrics
- **North star:** Daily Active Loggers who hit ≥1 goal (DAL-G).
- **Activation:** % of new users who log their first meal within 5 minutes of signup. Target ≥ 60%.
- **Retention:** D1 / D7 / D30. Watch the streak-breakage curve.
- **Monetization (later):** free→premium conversion of *engaged* users (7+ logged days).

### Where we stand today (honest baseline)
✅ Already shipped: goal-based targets (Mifflin-St Jeor), meal/water/weight/habit logging, calorie ring + macro bars, rule-based + AI coach, meal suggestions, change-history audit, profile, typed REST API, Postgres/Prisma, JWT auth, CI, live demo.

❌ Biggest gaps vs. category leaders: **fast food database + barcode**, **guided onboarding**, **streaks/daily-win loop**, **AI quick-entry (text/photo/voice)**, **monetization**, **food-quality coaching**, **wearable sync**, **community**.

---

## Priority matrix (do these in this order)

| # | Pattern | Priority | Effort | Impact | Phase |
|---|---------|----------|--------|--------|-------|
| 2 | Personalized onboarding | **P0** | S | High | 1 |
| 4 | Visible daily progress (streaks/rings) | **P0** | S | High | 1 |
| 1 | Massive fast food database + barcode | **P0** | L | Very High | 1 |
| 8 | Behavioral psychology (food-quality color system) | **P1** | M | High | 1–2 |
| 6 | AI & automation (text/photo/voice entry) | **P1** | M | High | 2 |
| 3 | Freemium monetization | **P1** | M | High ($) | 3 |
| 5 | Ecosystem sync (wearables/health) | **P2** | L | Medium | 4 |
| 7 | Community & social accountability | **P2** | L | Medium | 4 |

**Rule of thumb:** ship the cheap retention wins (2, 4) *first* — they cost days and lift D7 immediately. The food database (1) is the heaviest P0 but it's the friction-killer that makes everything else stick.

---

## The 8 patterns → concrete engineering tasks

### Pattern 2 — Personalized onboarding `P0 · Phase 1`
*Generic advice kills retention. Show the user "their plan" in the first 90 seconds.*
- **DB:** add `Profile.onboardingCompleted` (bool), `Profile.targetSnapshot` (json of first computed plan).
- **API:** `POST /onboarding` (accepts goal, stats, activity, diet prefs → returns computed targets + marks complete); gate first-run UX on the flag.
- **FE:** multi-step wizard (Goal → Body stats → Activity → Diet prefs → **"Your Plan" reveal moment** with the calorie/macro targets animating in). Skippable, resumable, < 6 taps.
- **Done = ** new user reaches a personalized dashboard without typing into an empty form.

### Pattern 4 — Visible daily progress `P0 · Phase 1`
*Rings, streaks, charts = the feedback loop that brings them back.*
- **DB:** `Profile.logStreak`, `Profile.bestStreak`, `Profile.lastLogDate`; optional `DailySummary` rollup table for fast charts.
- **API:** `GET /stats/streaks`, `GET /stats/weekly` (7-day rolling calories, protein, weight, adherence %).
- **FE:** streak counter in the header, animated progress rings, weekly trend charts, and a **"Today's Wins"** strip (see Design section — already prototyped). Fire a celebratory micro-animation when a goal is hit.
- **Done = ** the app answers "did I win today?" above the fold.

### Pattern 1 — Massive fast food database + barcode `P0 · Phase 1`
*Every top player competes here; logging must take seconds.*
- **DB:** `Food(id, name, brand, barcode, servingSize, unit, kcal, protein, carbs, fat, fiber, sugar, sodium, densityClass, source, verified)`, `FoodPortion`, `UserFavoriteFood`, `RecentFood`. Add a **full-text search index** (Postgres `tsvector`) on name+brand.
- **API:** integrate **Open Food Facts** (free, open, barcode-rich) as the seed source + nightly cache/ingest job. Endpoints: `GET /foods/search?q=`, `GET /foods/barcode/:code`, `POST /foods` (user-created), `GET /foods/recent`, `POST /favorites`.
- **FE:** type-ahead food search in the meal log; **barcode scanner** via the browser `BarcodeDetector` API / `html5-qrcode` fallback (camera); one-tap re-log of recents & favorites; portion picker.
- **Done = ** logging a packaged food = scan → confirm → done (under 5 seconds).

### Pattern 8 — Behavioral psychology: food-quality system `P1 · Phase 1–2`
*Teach nutritional density, not just calories (Noom's edge).*
- **DB:** `Food.densityClass` enum (green / yellow / red — by caloric *and* nutrient density). Classification rules table.
- **API:** classification service run at ingest; expose class in food search + a daily **"food quality score."**
- **FE:** color-coded badges on every food, a daily quality meter, and gentle nudges ("swap red → green for similar calories").
- **Done = ** users see *why* a food is a smart choice, in color, at the moment of logging.

### Pattern 6 — AI & automation (text / photo / voice) `P1 · Phase 2`
*"Large coffee with oat milk" → structured nutrition the user verifies.*
- **API:** `POST /parse/text` (NL → candidate food + macros via LLM, returns editable draft), `POST /parse/photo` (vision model → meal estimate), reuse existing coach plumbing. Always return a **verify/edit** step — never auto-commit.
- **FE:** "Describe your meal" box, 🎤 mic button (browser `SpeechRecognition` → text → parse), 📷 photo upload; a confirm screen before it hits the log.
- **Done = ** the slowest user can log a meal by talking to the app.

### Pattern 3 — Freemium monetization `P1 · Phase 3`
*Free to enter, premium converts the engaged. Don't gate the core loop.*
- **DB:** `Subscription(userId, plan, status, currentPeriodEnd, stripeCustomerId)`, `User.tier` (free/premium).
- **API:** Stripe Checkout session + webhook handler; entitlement middleware; `/billing/portal`. Gate *advanced* features (AI photo entry, deep analytics, custom plans) — **keep logging + streaks free forever.**
- **FE:** non-blocking upgrade CTAs, premium badges, paywall on advanced surfaces, manage-subscription screen.
- **Done = ** an engaged 7-day user is offered a clear, fair upgrade.

### Pattern 5 — Ecosystem sync (wearables / health) `P2 · Phase 4`
*Fitbit / Apple Health / Google Fit close the energy-balance loop.*
- **DB:** `Integration(userId, provider, accessToken, refreshToken, scopes)`, `ImportedMetric(steps, activeKcal, weight, source, date)`.
- **API:** OAuth flows for **Google Fit** (REST, web-friendly first) and **Fitbit**; Apple Health via a future native/iOS wrapper. Adjust TDEE from imported activity.
- **FE:** "Connect" buttons, sync status, source attribution on metrics.

### Pattern 7 — Community & social accountability `P2 · Phase 4`
*Peer support + challenges drive long-term adherence.*
- **DB:** `Follow`, `Post`, `Comment`, `Challenge`, `ChallengeMember`, `Leaderboard`. Strict privacy defaults.
- **API:** feed, challenges, accountability-partner pairing, opt-in leaderboards.
- **FE:** progress-share cards, challenge join/track, a lightweight feed. Privacy-first (nothing public by default).

---

## Sequenced delivery plan

**Phase 1 — "Lowest friction to a visible win" (Weeks 1–3)**
Onboarding wizard · Food DB + search + barcode (Open Food Facts) · Streaks + Today's Wins · food-quality color badges. → *Moves activation & D7 the most.*

**Phase 2 — "Effortless logging" (Weeks 4–6)**
AI text/photo/voice entry with verify step. → *Removes the last logging friction.*

**Phase 3 — "Monetize the engaged" (Weeks 7–9)**
Stripe freemium, entitlement gating, paywall, billing portal. → *Turns retention into revenue.*

**Phase 4 — "Stickiness moat" (Weeks 10+)**
Wearable sync · community & challenges. → *Defensibility & long-term adherence.*

---

## What to build *this sprint* (the only thing that matters right now)
1. **Onboarding wizard** (FE) + `onboardingCompleted` (DB/API) — 2–3 days.
2. **Today's Wins + streaks** (FE/API) — 2 days. *(Design already prototyped — see the live board.)*
3. **Food search MVP** against Open Food Facts (API/DB/FE type-ahead) — the big rock; start now, parallelize barcode after search works.

If we only ship those three, every user gets a personalized plan, logs in seconds, and sees themselves winning daily. That is the whole game.
