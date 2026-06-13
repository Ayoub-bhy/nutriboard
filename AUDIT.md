# NutriBoard — Investor Due-Diligence Audit (honest revision)

_Independent A-Z review: technical, security, data, nutrition-science, product & market. This revision deliberately strips the optimism out of the first draft. Severity: **Critical / High / Medium / Low**. Status: **[Fixed]** done in code, **[Planned]** needs a larger change, **[Action]** needs a human/account decision._

---

## 0. Reality check (read this first)

Plainly, so there is no misunderstanding for an investor:

- **There is no product in production.** The only thing actually running is a single ~130 KB HTML file (the "board") that stores everything in the visitor's browser (`localStorage`). Close the tab on another device and the data isn't there. There is **no server, no shared database, no real accounts** behind the live site.
- **The "full-stack backend" has never run in production.** It exists as code with unit tests. It has not been deployed, has never served a real request against a managed database, and has zero real users. All my security hardening below is correct code that protects a system **which does not yet exist live** — so it is unverifiable in production today.
- **The food "database" is not CIQUAL.** It is ~65 per-100 g values I (an AI assistant) hand-compiled. I spot-checked several against authoritative sources: chicken breast 163 vs ~165 kcal, white rice 130 vs 130, Greek yogurt 60 vs ~61 (non-fat) — i.e. they're in the right ballpark, but they are generic USDA-style figures, **not** the official ANSES-CIQUAL dataset the app claimed to use "exclusively." That claim was false. I have now corrected the wording throughout the app to say "approximate reference values, not the official CIQUAL dataset."
- **The "AI nutrition coach" is not AI.** The built-in coach is keyword/regex matching with canned responses. Real AI only works if the user pastes their own Anthropic API key into a browser field. The persona claimed to be a "professional registered nutritionist" — it is not, and I have removed that claim.
- **"Connect your watch / device sync" is theater in the live app.** The provider buttons (Fitbit, Garmin, Oura, etc.) just toggle a cosmetic badge; they sync nothing. The OAuth backend that would make them real isn't deployed. I have relabeled them "Demo" and added a blunt note. (The phone/laptop sensors — Bluetooth HR, motion steps, GPS — are real browser APIs and do work, though lightly tested.)
- **"39/39 tests passing" is a weak signal.** Those tests cover pure arithmetic helpers plus the new crypto/state/email utilities. **No test touches** the real API routes, the database, auth end-to-end, or a single line of the 130 KB board. Realistically this is ~5% of the surface that matters.

None of this means the work is bad — the engineering is clean and the person clearly ships. But as an **asset**, this is an early prototype with a compelling demo, not a product with traction. Fund the team and the direction; don't underwrite a "live app with device sync and an AI nutritionist," because that isn't what exists.

---

## 1. Honest grades (revised down from my first draft)

| Dimension | Grade | Why |
|---|---|---|
| Engineering craft | **B / B−** | Clean layering, ownership scoping, no SQLi/IDOR. But undeployed, no integration tests, a hand-typed "database." |
| Security (as code) | **B−** | Token encryption, signed OAuth state, prod env guard now in place. Cookie-auth, Redis limiter, real pen-testing still missing — and none of it runs in prod. |
| Production readiness | **D+** | Nothing deployed. No committed migrations. No real CI/CD (GitHub Pages auto-serves the static demo; that's it). Deploy configs only added this pass. |
| Test depth | **D** | Unit-only, ~5% coverage of what matters. Zero route/DB/UI tests. |
| Nutrition credibility | **C** | Method (Mifflin-St Jeor, cooked/raw yields, allergen filtering) is sound; the data source claim was false (now corrected). Values are approximate, not authoritative. |
| Product / market | **C−** | Crowded category, thin wedge, no monetization, no users, no retention data. |
| Honesty of marketing vs. reality | **was D, improving** | Landing + app oversold AI/devices/CIQUAL. Corrected in-app this pass; the landing page still needs the same treatment. |

First draft said "B+ engineering." That was too generous for something that has never run in production. Corrected.

---

## 2. Security & technical findings

### Critical
- **C1 — Live secrets sat in a local `backend/.env`** (real JWT secret + Google client secret). Not in git history, but real. **[Action]** Rotate both; they've touched a shared machine.
- **C2 — OAuth callback had no CSRF protection** (state = raw userId → account-injection). **[Fixed]** HMAC-signed, 10-min-expiry, timing-safe-verified state.
- **C3 — Web client stores its JWT in `localStorage`** (XSS token theft, 7-day token). **[Planned]** HttpOnly cookie + CSRF token. Not started — it's an auth-flow change across client + API.

### High
- **H1 — No prod env validation; insecure JWT fallback.** **[Fixed]** Boot now hard-fails on weak/missing secrets.
- **H2 — OAuth tokens stored in plaintext.** **[Fixed]** AES-256-GCM at rest.
- **H3 — 7-day stateless JWT, no revocation/refresh.** **[Planned]** Not started.
- **H4 — In-memory rate limiter, hard-coded `trust proxy`.** **[Fixed-partial]** `trust proxy` is now env-driven; **[Planned]** Redis limiter before any scaling.
- **H5 — No committed Prisma migrations (schema via `db push`).** Real risk of silent column drops. **[Action]** Generate + commit the initial migration. Documented, not done (no DB available in this environment).
- **H6 — Frontend has zero tests, missing error/loading states, no input validation.** Garbage numeric inputs become 0/NaN; failed fetches blank the screen. **[Planned]** Not started; CI now at least runs frontend typecheck.

### Medium / Low (condensed)
- **[Fixed]** email normalization; Google `email_verified` enforcement; bcrypt 10→12; `/ready` DB readiness; crash handlers + shutdown timeout; Dockerfile/`render.yaml`/`vercel.json`; CI caching + typecheck + Prettier; `SECURITY.md`/`CONTRIBUTING.md`/`PRIVACY.md`.
- **[Planned]** fetch timeouts/size caps (SSRF-ish DoS surface); query-param date validation + free-text length caps; N+1 in `/stats/weekly`; landing-page SEO (no OG/sitemap/robots); accessibility (clickable `<div>`s, no roles/keyboard, unlabeled SVG); no dependency lockfiles / `npm ci`; remove dead `vitest.config.ts` and the duplicate root HTML file.
- **Done well (genuinely):** consistent per-user ownership scoping (no IDOR), parameterized Prisma (no SQLi), audience-checked Google verification, helmet/CORS/body caps, clean routes→controllers→services layering.

---

## 3. Nutrition science — the credibility issue
The maths is fine. The **data provenance was the problem**: the app asserted exclusive ANSES-CIQUAL sourcing while using hand-entered approximations. An actual nutritionist would catch that the numbers don't match CIQUAL entries exactly. **[Fixed-wording]** every "from CIQUAL / official CIQUAL / exclusive source" claim is now "approximate reference values, not the official CIQUAL dataset — verify on ciqual.fr or the label." **[Planned, the real fix]** import the official CIQUAL table so the numbers are authoritative and the claim becomes literally true. Allergen filtering is real and was verified (nuts/fish/vegan exclusions work).

## 4. Product / business — the uncomfortable part
- **No moat.** MyFitnessPal/Cronometer/Yazio/MacroFactor have millions of foods, barcode scanning, brand data, and distribution. "Raw vs cooked grams + Arabic RTL + weather hydration" is a feature set, not a wedge.
- **No monetization, no users, no retention data, no validation.** There is nothing to underwrite financially.
- **The one plausible angle** is MENA-first: Arabic + halal + local/regional foods + a real regional food database. That's a positioning decision, not built.

## 5. What it would take to be "real" (in order)
1. Rotate the exposed secrets (C1).
2. Deploy the backend with committed migrations; point the landing CTA at the actual accounted app, not the localStorage demo (H5, configs provided).
3. Replace the hand-typed food table with the real CIQUAL (or USDA) dataset + barcode lookup.
4. JWT → HttpOnly cookie; Redis rate limiter (C3/H3/H4).
5. Integration tests (auth, routes, DB) + at least smoke tests on the board (test depth D → C).
6. Decide monetization and the market wedge; instrument analytics to learn retention.
7. Apply the same honesty pass to the landing page that I just applied to the app.

## 6. What this pass actually changed
**Security (code, tested):** AES-256-GCM token encryption; signed/expiring OAuth state; prod env guard; email normalize + `email_verified`; bcrypt 12; `/ready`, crash handlers, env-driven trust-proxy. 8 new unit tests; suite 39/39.
**Ops/docs:** Dockerfile, render.yaml, vercel.json, SECURITY/CONTRIBUTING/PRIVACY, CI improvements.
**Honesty (live in the app):** removed the false "exclusive CIQUAL" claim everywhere; relabeled the coach as a rule-based assistant (not AI, not a dietitian); relabeled device buttons as "Demo" with a blunt note that real sync needs the hosted backend; added a plain-language honesty note in the footer; corrected a mislabeled food value.
**Still true and unfixed:** nothing is deployed; the data isn't authoritative; tests are shallow; there are no users or revenue. Those are the things that actually gate a raise.
