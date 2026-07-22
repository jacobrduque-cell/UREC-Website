# UREC Platform — Ownership & Credentials

_Last updated: 2026-07-22_

This is the succession record: **who owns the accounts and where each credential lives.**
It deliberately contains **no secret values** — secrets are never committed to git.
Anyone taking over the platform uses this to find the accounts and reset/rotate access.

## Owning account

Everything is owned by the **UREC Berkeley Google account** (confirm exact address — `urec@berkeley.edu`),
**not** a personal account. This is the whole succession model. On each co-president handoff,
confirm both incoming co-presidents have access and rotate any personal sessions out.

> Action item: verify the exact owning email and that both current co-presidents
> (Jacob Duque, Lauren Chee) can log in.

## Accounts & where to manage them

| Service | What it's for | Owned by | Where to manage |
|---|---|---|---|
| **Supabase** | Postgres database, auth, storage buckets | UREC Berkeley Google account | supabase.com dashboard → project ref `srbzcyhvbahrinievddd` |
| **Vercel** | Hosting / deployment (deploys from `main`) | UREC Berkeley Google account | vercel.com dashboard → the UREC-Website project |
| **Google Cloud** | OAuth consent + client (Google SSO gated to `@berkeley.edu`) | UREC Berkeley Google account | console.cloud.google.com → the UREC project |
| **GitHub** | Source code | `jacobrduque-cell` | github.com/jacobrduque-cell/UREC-Website |
| **Domain** | _Not set up yet_ — app runs on its Vercel URL | — | (open item) |

## Where the actual secrets live (NOT in git)

The app needs these environment variables. Their **values** live only in:
1. **Vercel → Project → Settings → Environment Variables** (production), and
2. a local **`.env.local`** file on a developer's machine (git-ignored; see `.env.example` for the shape).

| Variable | What it is | Sensitivity |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://srbzcyhvbahrinievddd.supabase.co`) | Public (shipped to browser) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | Public (browser-safe) |
| `SUPABASE_SECRET_KEY` | Supabase **service-role** key | **SECRET — never commit, never share in chat** |
| `CRON_SECRET` | Bearer token the Vercel cron must present | **SECRET** |
| `APP_URL` | Base URL used in email links | Public |

To recover/rotate secrets: log into the Supabase dashboard (API settings) and Vercel
(env vars) with the owning Google account. Never paste `SUPABASE_SECRET_KEY` or
`CRON_SECRET` into a document, chat, commit, or the decision log.

## Handoff checklist (each co-president transition)

- [ ] Confirm the owning Google account password is known to both incoming co-presidents.
- [ ] Confirm both can log into Supabase, Vercel, and Google Cloud with it.
- [ ] Rotate the Supabase service-role key and `CRON_SECRET`; update them in Vercel env vars.
- [ ] Update this file's "Last updated" date and the co-president names.
- [ ] Remove the departing officers' personal device sessions / access.
