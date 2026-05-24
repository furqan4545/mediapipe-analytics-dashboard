# Analytics Dashboard

Per-user analytics frontend that reads from the shared `analytics_*` Postgres
tables populated by the mediapipe analytics worker. No writes — UI only.

## Architecture

- **Auth**: shared Supabase session with the main mediapipe SaaS at
  `app.kodeui.com`. Cookies are scoped to `.kodeui.com` in production so the
  user stays signed in across both domains. Unauthenticated requests bounce to
  `${NEXT_PUBLIC_MAIN_SAAS_URL}/login`.
- **Data**: Drizzle reads from the same Supabase Postgres the SaaS and worker
  use. Every query is scoped to `auth.uid()`.
- **Worker**: `POST /api/sync` and `POST /api/onboard` proxy to the worker at
  `${NEXT_PUBLIC_WORKER_URL}` with the user's Supabase access token attached.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

`npm run typecheck` runs the strict TS check used in CI.

The cookie domain (`.kodeui.com`) is only set in production, so local sign-in
needs a separate flow — for now, sign in via the main SaaS first, then visit
this app locally with the cookies still present.

## Deploy (Vercel)

1. Push to GitHub.
2. Import the repo into Vercel.
3. Set the env vars from `.env.example` in the Vercel project settings.
4. Add a custom domain (e.g. `analytics.kodeui.com`) and point its DNS at
   Vercel.

After the first deploy, sign in at `app.kodeui.com` and visit
`analytics.kodeui.com` — the session cookie will be shared.

## Env vars

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Shared with the main SaaS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Shared with the main SaaS. |
| `DATABASE_URL` | Drizzle reads from the same Supabase pool. `prepare: false` is required for the Supabase pooler. |
| `NEXT_PUBLIC_WORKER_URL` | Default `https://analytics.kodeui.com`. |
| `NEXT_PUBLIC_MAIN_SAAS_URL` | Default `https://app.kodeui.com`. Where unauthenticated users are sent to sign in. |
