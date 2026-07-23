# UREC Platform — Toolkit (the programs we use & how)

_Last updated: 2026-07-22_

Everything the UREC platform runs on, what each piece does, and who needs access.
For account ownership/credentials see `OWNERSHIP.md`; for what's built see `PROJECT_STATE.md`.

---

## Where the sites live (important)

There are **two separate sites** — don't confuse them:

| Site | What it is | Where |
|---|---|---|
| **Main / marketing site** | The public club website (about, events, join). Built on **Wix**. | `urecberkeley.com` (and the Berkeley page `urec.berkeley.edu`) — confirm which is canonical |
| **The platform** (this repo) | The member workspace + Deal Library — the app we've been building. | Hosted on **Vercel**: `https://urec-website.vercel.app` (no custom domain yet) |

**Attaching the platform to the main site** (your plan) — three options, easiest first:
1. **Link button** — add a "Member Portal / bCourses" button on the Wix site that links to the Vercel URL. Zero setup.
2. **Subdomain** — point something like `portal.urecberkeley.com` at Vercel (add the domain in Vercel → Settings → Domains, then a CNAME at your registrar). Cleanest look.
3. **Custom domain** — give the platform its own domain and link both ways. (This is the open "domain" item in `PROJECT_STATE.md`.)

---

## Services you log into (accounts — all under the shared UREC Google account)

| Service | What it does for us | Who needs access | Cost |
|---|---|---|---|
| **GitHub** | Stores the code + full history; every change is a branch → pull request → merge. Repo: `jacobrduque-cell/UREC-Website` (should move to a UREC org for succession). | Code contributors + co-presidents | Free |
| **Vercel** | Hosts the live site. Auto-deploys the `main` branch in ~1–2 min; builds a preview URL for every pull request. | Co-presidents (owner); tech lead | Free (Hobby) tier |
| **Supabase** | The backend: Postgres **database** (all members, courses, grades…), **auth** (sign-in), and **file storage** (submissions, uploads). Project ref `srbzcyhvbahrinievddd`. | Co-presidents; tech lead | Free tier (upgrade if it grows) |
| **Google Cloud** | Runs **Google sign-in**, locked to `@berkeley.edu` so only Berkeley students can log in. | Co-presidents; tech lead | Free |
| **Resend** | Sends **email notifications** (assignment due, graded, announcements). Optional — the app runs on in-app notifications without it. | Tech lead | Free tier |
| **Domain registrar** | (Future) the custom domain for the platform. Not set up yet. | Co-presidents | ~$12/yr |

---

## What the code is built with (you don't "log in" to these — they're the ingredients)

| Tool | Role |
|---|---|
| **Next.js 16** (React 19, TypeScript) | The app framework — every page, form, and server action. |
| **Tailwind CSS** | Styling / the visual design system (UREC blues, layout). |
| **Supabase client libraries** | How the app talks to the database, auth, and storage. |
| **marked** | Renders markdown (wiki pages, assignment descriptions) into HTML. |
| **lucide-react** | The icon set in the nav and UI. |
| **Node.js + npm** | The runtime + package manager used to run and build the app locally. |

---

## How you actually change the site (two paths)

- **Claude Code (recommended for the club).** Connect the GitHub repo, describe the change in plain English; it edits the code, tests it, and deploys. This is how the platform is maintained today — no standing engineering team required.
- **Hands-on dev (for a technical contributor).** `git clone` → add a `.env.local` with the Supabase keys (from `OWNERSHIP.md`, never committed) → `npm install` → `npm run dev` to run it locally → branch → open a pull request → Vercel builds a preview → review → merge to `main`.

---

## How the pieces connect (the 30-second mental model)

```
Member's browser
      │  (signs in with Google, @berkeley.edu only)
      ▼
  Vercel  ──────────────  runs the Next.js app (this repo)
      │
      ▼
 Supabase  ────────────  database + auth + file storage
                          (Resend sends emails on the side)

GitHub  ──►  Vercel        every merge to `main` auto-deploys
Claude Code ──►  GitHub    how code changes get made
```

---

## Access map (who should hold what)

- **Co-Presidents:** the shared Google account (owns Supabase, Vercel, Google Cloud, GitHub). Everything flows from this — it's the succession key.
- **Tech lead / Webmaster (a Director role):** GitHub write access + can run it locally.
- **Everyone else who "helps with the website":** an **Exec or Director role in the app** — they manage content (courses, assignments, glossary, announcements, grading) with no code and no accounts.

See `OWNERSHIP.md` for exactly where each credential lives.
