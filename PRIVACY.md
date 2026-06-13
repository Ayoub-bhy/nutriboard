# NutriBoard — Privacy Notice (plain-language)

NutriBoard tracks personal health-adjacent data (weight, meals, water, habits, optional
country/city and connected-device activity). This notice explains how that data is handled.

## Where your data lives
- **Static board / PWA (`docs/app`)**: all data stays **in your browser** (localStorage),
  separated per signed-in account and per guest profile. It is never sent to our servers.
  Weather lookups send only your city/country to Open-Meteo; we store no copy.
- **Full-stack app (`backend`)**: data is stored in your account's PostgreSQL records,
  scoped to your user id. OAuth device tokens are encrypted at rest.

## Your rights / controls
- **Export**: download all your data as JSON from Settings → Privacy & Data (board) or
  `GET /api/profile`/related endpoints (API).
- **Delete**: erase your data from Settings → Privacy & Data (board), or delete your account.
- **No ads, no selling**: we don't sell personal data or show third-party ads.

## Sensitive data
NutriBoard is **not** a medical device and gives educational estimates, not medical advice.
Do not use it to diagnose or treat any condition. If you have a medical condition, consult a
qualified professional.

## Contact
Privacy questions: **a.youssef@salla.sa**.
