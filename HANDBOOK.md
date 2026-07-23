# UREC Platform — Leadership Handbook

**The one guide: what the platform is, the tools behind it, how to change it, and how to hand it to next year's board.**
Written for whoever is running UREC — no coding background needed. _Last updated: 2026-07-22._

> New here? Read this whole page once (10 minutes). It links to three deeper docs when you need them:
> `PROJECT_STATE.md` (what's built), `OWNERSHIP.md` (accounts & logins), `TOOLKIT.md` (the tools).

---

## 1. What this is

The UREC platform is **our own version of bCourses for the club**. Members sign in with their
**Berkeley Google account** and use it to run the Analyst Program — assignments, quizzes, grades,
attendance, weekly modules, a CRE glossary with flashcards, announcements, and messaging — plus a
**Deal Library ("The Model")**, an interactive underwriting tool.

It replaces the scattered Google Drive folders with **one place, tied to each member's identity**.
It is real and live — not a prototype. It was built and is maintained with AI (Claude Code), so you
don't need an engineering team to keep it running.

---

## 2. The one rule that keeps it alive

**Every account, login, and domain is owned by the shared UREC Google account — never a personal one.**

This is the entire reason the platform survives when a co-president graduates. If you ever set up a new
service, use the shared account. (Where each login lives: `OWNERSHIP.md`.)

---

## 3. The tools behind it (what each does)

You rarely touch these directly — but this is what's running under the hood. Full detail in `TOOLKIT.md`.

| Tool | What it does | Cost |
|---|---|---|
| **GitHub** | Stores the code and its full history. | Free |
| **Vercel** | Hosts the live site; updates automatically when the code changes. | Free |
| **Supabase** | The database + sign-in + file storage (members, grades, uploads). | Free |
| **Google Cloud** | Runs "Sign in with Google," locked to `@berkeley.edu`. | Free |
| **Resend** | Sends email notifications (optional). | Free |

---

## 4. Two ways to work on it

Almost everyone is in the first bucket. Only a small technical circle touches the second.

### A) Manage content — **no code** (this is 99% of "working on the website")
Adding courses, assignments, quizzes, glossary terms, announcements, taking attendance, grading — all
done **inside the app** by anyone with an **Exec** or **Director** role. This is how VPs and directors
help run their piece. No GitHub, no risk.

### B) Change the software itself — **code**
New features or fixes to how the app works. Two sub-paths:
- **Claude Code (recommended).** Open the project in Claude Code, describe the change in plain English;
  it edits the code, tests it, and deploys. This is how the platform is maintained today.
- **A technical member.** Clone the code, run it locally, make a change, open a pull request.

---

## 5. How to actually make a change

**Content (no code):**
1. Sign in → go to the section (e.g. Assignments, Announcements, Glossary).
2. Add or edit. That's it — it's live immediately.
3. To let someone else manage content: **People → Manage Roles → set them Director or Exec.**

**Software (Claude Code):**
1. Open the GitHub repo (`UREC-Website`) in Claude Code.
2. Describe what you want changed.
3. Review the preview, then it deploys to the live site in ~1–2 minutes.

**Software (a developer):** clone → `npm install` → `npm run dev` → branch → pull request → merge. Steps in `TOOLKIT.md`.

---

## 6. Roles — who can do what

- **President / Exec** — full power: everything, including managing roles and grade weights.
- **Director** — can grade, take attendance, and see submissions, but not manage roles or restructure things.
- **Analyst / DeCal / General Member** — access to the course materials they're enrolled in.

Set all of these at **People → Manage Roles** (staff) or **People → Add people** (membership). No database needed.

---

## 7. Handing it to next year's board (do this every transition)

- [ ] Give the **shared UREC Google account** login to both incoming co-presidents.
- [ ] Confirm they can log into **Supabase, Vercel, and GitHub** with it.
- [ ] In the app, set them to **President** (People → Manage Roles).
- [ ] **Rotate the secrets** (Supabase + email keys) and update them in Vercel — see `OWNERSHIP.md`.
- [ ] Update `OWNERSHIP.md` with the new names and date.
- [ ] Walk them through **this handbook**.
- [ ] Point returning members forward and graduate seniors to alumni (in the app).

---

## 8. Where everything lives (the map)

| Thing | Where |
|---|---|
| **This handbook** | `HANDBOOK.md` — start here |
| What's built + what's next | `PROJECT_STATE.md` |
| Accounts + where logins live | `OWNERSHIP.md` |
| The tools, in detail | `TOOLKIT.md` |
| The live app | Your Vercel URL (e.g. `urec-website.vercel.app`) |
| The code | GitHub: `UREC-Website` |

---

## 9. If something breaks / who to ask

- **Site is down** → check the **Vercel** dashboard (Deployments) with the shared account.
- **Someone can't sign in** → it's **Google sign-in / Supabase**; confirm they used their `@berkeley.edu`.
- **You want a change** → **Claude Code**, or your tech-lead Director.
- **You lost access to something** → the **shared Google account recovers everything.** That's the master key — protect it.

_That's the whole platform. Keep this handbook and `OWNERSHIP.md` current, and it hands off cleanly forever._
