# Security Policy

## Reporting a vulnerability
Please email **a.youssef@salla.sa** with the details. Do **not** open a public issue for
security problems. We aim to acknowledge within 72 hours and to ship a fix or mitigation
for confirmed high-severity issues within 14 days.

## Scope
- The REST API (`backend/`)
- The React web client (`frontend/`)
- The static board / PWA (`docs/`)

## What we already do
- Passwords hashed with bcrypt (cost 12); JWT auth with audience-checked Google sign-in.
- All provider OAuth tokens are **encrypted at rest** (AES-256-GCM).
- The OAuth `state` parameter is HMAC-signed and time-limited (CSRF / account-injection protection).
- Production boots are blocked if `JWT_SECRET` is missing, default, or weak.
- Helmet security headers, CORS allow-list, request-size cap, and auth rate-limiting.
- Per-user ownership scoping on every record (no IDOR).

## Known limitations (tracked)
- The web client stores its JWT in `localStorage`; migration to an HttpOnly cookie is planned.
- The rate limiter is in-memory per instance; a Redis-backed limiter is required before
  horizontal scaling.
- Database schema is managed; commit Prisma migrations before production (see CONTRIBUTING.md).
