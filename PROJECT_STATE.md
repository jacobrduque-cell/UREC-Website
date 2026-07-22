# UREC Platform — Project State (source of truth)

_Last updated: 2026-07-22_

This file is the **current, accurate snapshot** of the platform: what it is, what's built,
what's live, what's in flight, and what's next. When this conflicts with older docs
(`CLAUDE.md` design section, `UREC_Platform_Decision_Log.md`), **this file wins** — those
predate the build.

---

## 1. What it is

A Canvas/bCourses-style **learning platform for UREC** (~100–115 members), plus a
**Deal Library**. Members sign in with Berkeley Google SSO and use it to run the Analyst
Program: assignments, quizzes, modules, grades, calendar, announcements, messaging, etc.

**It is real and live** — not a prototype. The `*_prototype.html` files in the repo are
historical; the product is the Next.js app.

## 2. Status at a glance

| Thing | Status |
|---|---|
| Backend (Supabase Postgres + RLS + Storage) | ✅ Live (project ref `srbzcyhvbahrinievddd`) |
| Hosting (Vercel) | ✅ Live, deploys from `main` |
| Auth (Google SSO gated to `@berkeley.edu`) | ✅ Live |
| Accounts/ownership (Phase 0) | ✅ Done — see `OWNERSHIP.md` |
| Feature build (Phases 1–10) | ✅ Done |
| Custom domain | ⬜ Open — runs on Vercel URL for now |
| Commits | 65+ on `main` |

## 3. Tech stack & architecture

- **Next.js 16** (App Router, Server Components, Server Actions, `useActionState`, `next/image`).
- **Supabase**: Postgres + Row-Level Security, Auth, Storage buckets (`submissions`,
  `course-files`, `content-images`). 37 SQL migrations in `supabase/migrations/`.
- **Tailwind v4** with `@theme inline` tokens in `app/globals.css`.
- **Vercel** hosting; one cron (`/api/cron/assignment-reminders`, daily) in `vercel.json`.
- **Roles**: exec / grader / member, enforced by SQL RPCs `is_exec()`, `is_enrolled()`,
  `is_grader()` used both in RLS policies and in the app via `lib/data/queries.ts`
  (one source of truth for role checks).
- **Data Access Layer**: role/permission checks live close to the data (`lib/data/queries.ts`),
  re-checked in server components even though middleware also gates routes.

## 4. Feature inventory (what's built)

**Core LMS**
- Courses + Terms (multi-course, multi-semester, archiving), publish/draft lifecycle, course
  clone for succession, course/term creation UI, enrollment UI.
- Assignments: create/edit, text/url/file submissions, resubmission/attempt versioning,
  grading flow, rubrics (multi-level, wired into grading), submission comments, late/missing flags.
- Quizzes: multiple question types (multiple-choice, numeric, multiple-answer, matching,
  short answer, essay), answer explanations, quiz settings, **Integrity Mode** (fullscreen
  gate, tab-focus-loss detection, copy/paste/right-click blocking, shuffled options, flagged
  to exec).
- Grades page + **Gradebook grid** (exec/grader).
- Modules (weekly containers), Syllabus, Wiki/Pages (markdown), Discussions (threaded),
  Announcements (scheduled/draft, lock/disable-replies), Inbox/Conversations (DMs).
- Calendar + iCal export, Files + storage, Directory + member profiles, Sections,
  Groups (case-comp teams), Attendance tracking.

**Cross-cutting**
- Notifications (in-app) + email delivery + notification preferences.
- Global search, Analyst-Program progress tracker.
- Exec **"View as Student"** mode (cookie softens app-layer role checks; RLS unchanged so
  exec can submit and always return — no lock-out).
- Rich text + images in assignments/quizzes; inline form validation everywhere;
  sort/filter/bulk-publish controls; breadcrumbs; quick-create.
- **UREC brand pass**: real UREC blue palette + exact diamond logo + favicon.
- Course cover images with a color-film overlay.
- Checked-in RLS test suite (41 tests) + CI.

**Deal Library** — see §6 (currently being reworked).

## 5. Design system (CURRENT — supersedes CLAUDE.md's old palette)

Brand tokens in `app/globals.css` `:root` (UREC blues):
`--navy:#0E3C6E · --navy-deep:#0A2F57 · --navy-darker:#08243F · --blue:#1663AE ·
--sky:#146CB2 · --cyan:#2E9BD6 · --pale:#E6F1FB · --gold:#E8A400 · --paper:#F1F5F9 ·
--text:#13202B · --muted:#5C7183 · --hair:#E2E8F0 · --pos:#03893D · --neg:#E62429`.
Logo: `public/urec-logo.png` (exact diamond mark); favicon regenerated from it.
Fonts in the app follow the bCourses-style UI; the standalone Deal Library uses
Fraunces / Inter / JetBrains Mono via Google Fonts CDN.

## 6. In flight — Deal Library → "The Model"

- The old browser reimplementation of the Excel model was **deprecated** (a browser model
  competes with Excel and loses).
- Rebuilt `public/deal-library.html` as **"The Model"** — an interactive underwriting studio
  based on **Jacob's real UREC teaching pro forma** (Ashburn, VA industrial deal). Validated
  against the source workbook: entry cap, equity ($57M), loan ($97.5M), monthly payment
  ($656,547), month-1 NOI ($736,816) match exactly; levered IRR ~13.9%. Four loadable deal
  presets. Linked from the dashboard at `/deal-library.html`.
- **This work lives on branch `claude/greeting-me4aie`, not yet merged to `main`.** It won't
  appear on the live site until merged. (Jacob is iterating on it before merging.)

## 7. Repo, branches, deploy

- Repo: `github.com/jacobrduque-cell/UREC-Website` (this checkout: `/workspace/urec-website`).
- `main` → auto-deploys to Vercel (production).
- `claude/greeting-me4aie` → the Deal Library "The Model" rework + these docs (unmerged).
- `.env.local` is git-ignored; a fresh clone won't have credentials (that's expected — see
  `OWNERSHIP.md`, not a sign Phase 0 is undone).

## 8. Verify gate (run before committing nontrivial changes)

```
npx tsc --noEmit
npx eslint .
npx next build
PGUSER=postgres PGHOST=localhost PGPASSWORD=postgres npm run test:rls   # 41 RLS tests
# if RLS tests hit ECONNREFUSED: sudo service postgresql start; sleep 3
```

## 9. Open items / what's next

- **Merge the Deal Library "The Model"** to `main` once Jacob signs off (makes it live).
- **Custom domain** (still open; app runs on its Vercel URL).
- **Ideas backlog**: a 15-agent research pass produced 34 prioritized ideas + a phased
  roadmap for the club website & LMS. Top strategic finding: the whole platform is gated,
  so the club has **no public front door** — the #1 recommendation is a public
  **recruitment showpiece (`/join`)** + a live placement wall, then an exec **Recruitment
  ATS** before rush, then retention/teaching tools, then the alumni/career network.
  (Real UREC content for the showpiece was gathered from Drive and is staged.)
- **Succession hygiene**: confirm both co-presidents can log into the owning account;
  rotate secrets on handoff (see `OWNERSHIP.md`).

## 10. Notes for the next session (avoid these traps)

- Don't conclude "it's just prototypes" or "Phase 0 isn't done" from the old docs or a
  missing `.env.local`. It's built and live.
- Don't rebuild the Excel model in the browser — that path was tried and rejected.
- Every new feature must clear the bar: **a website does this better than Excel / Drive /
  Instagram.** That's why the browser deal-model was dropped.
