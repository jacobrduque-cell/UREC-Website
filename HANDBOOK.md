# UREC Platform — Leadership Handbook

**The complete, plain-English guide to the UREC platform:** what it is, how to use it day to day, how to change it, how to run the whole club on it, and how to hand it cleanly to next year's board. No coding background needed.

_Last updated: July 22, 2026._

---

## How to use this guide

- **Brand new?** Read **Part 1** and **Part 2** (10 minutes). That's enough to understand the whole thing and start using it.
- **Need to do a specific task?** Jump to **Part 3 — "How do I…" recipes.** Each is a short, numbered walkthrough.
- **Taking over as co-president?** Read **Part 6 — Handing it off.**
- Three companion files go deeper when you need them: `PROJECT_STATE.md` (everything that's built), `OWNERSHIP.md` (the logins), `TOOLKIT.md` (the tools).

**Contents**
1. The basics — what this is
2. Getting in — signing in & roles
3. "How do I…" recipes (the everyday tasks)
4. Changing the software itself
5. Running the whole club on it (by VP team)
6. Handing it off — succession
7. The tools behind it
8. Troubleshooting & FAQ
9. Glossary of terms

---

# Part 1 — The basics

## What this is
The UREC platform is **our own private version of bCourses, built for the club.** Members sign in with
their Berkeley Google account and use it to run the Analyst Program:

- **Courses** (like "UREC Analyst Program, Fall 2026") with weekly **modules**, a **syllabus**, and **pages**.
- **Assignments** — post them, members submit text/links/files, you grade with rubrics.
- **Quizzes** — multiple question types, optional "integrity mode," auto-grading.
- **Grades** — a full gradebook with **editable category weights** (Homework %, Quizzes %, Attendance %, …).
- **Attendance** — take it at any event; it can even count toward grades.
- **Glossary & flashcards** — the CRE 101 vocabulary, studyable.
- **Announcements, messaging, a member directory,** and a **calendar**.
- A **Deal Library ("The Model")** — an interactive underwriting tool.

It replaces scattered Google Drive folders with **one place, tied to each member's identity.** It's real
and live — not a prototype — and it's built and maintained with **AI (Claude Code)**, so you don't need
an engineering team to keep it going.

## The one rule that keeps it alive
**Every account, login, and domain is owned by the shared UREC Google account — never a personal one.**
This is the entire reason the platform survives when a co-president graduates. Anything new you set up,
put it under the shared account.

---

# Part 2 — Getting in

## Signing in
1. Go to the site (your Vercel URL — e.g. `urec-website.vercel.app`; confirm the exact link with the current board).
2. Click **Sign in with Google** and use your **@berkeley.edu** account. Only Berkeley accounts can get in.
3. First time you sign in, you appear as a member. An exec grants you a bigger role if you need one (below).

## Roles, explained simply
There are **two kinds of roles**, and they do different things:

**Staff roles (what you can *run*)** — set at **People → Manage Roles**:
- **President / Exec** — full power. Everything: content, grading, roles, grade weights, settings.
- **Director** — can grade, take attendance, and see submissions, but can't manage roles, restructure
  courses, or change grade weights. Great for the people helping a VP run their function.
- **(no staff role)** — a regular member; can only do what their course enrollment allows.

**Membership roles (what *materials* you can see)** — set at **People → Add people**:
- **Analyst** — full access to that semester's analyst training and resources.
- **DeCal Member** — the DeCal course only.
- **General Member** — limited access to the course(s) you're put in.

Someone can be both — e.g. a **Director** (staff) who is also an **Analyst** (member).

---

# Part 3 — "How do I…" recipes

> Each recipe is exec/Director-only unless noted. Everything is live the moment you save.

### Give someone access
- **Make them an Analyst / member:** People → **Add people** → paste their `@berkeley.edu` email → pick a
  role (Analyst / DeCal / General) → add. If they haven't signed in yet, it activates on their first login.
- **Make them staff (Director / Exec / President):** People → **Manage Roles** → search their name → pick
  the role from the dropdown. (You can't change your own role — ask another exec.)

### Add a new course or term
- **Admin** (gear icon in the left rail) → Courses → **New course** (or **New term** for a new semester).
- To reuse last semester's setup, use **Copy / clone course** — it brings over the structure so you're not
  rebuilding from scratch.

### Post an announcement
- Announcements → **New announcement** → write it → post now, or **schedule** it for later. You can lock
  replies if you don't want a thread.

### Create and grade an assignment
1. Assignments → **New assignment** → title, description (supports formatting & images), points, due date,
   submission type (text / link / file), and its **category** (e.g. Homework). Optionally attach a **rubric**.
2. When members submit, open the assignment → **Grade** → score each one (or use the rubric). Use the
   **Gradebook** (Grades → Gradebook) to see everyone at once.

### Set or change grade weights (the category %s)
- Grades → **Grade weights** → set each category's weight (e.g. Attendance 20 / Quizzes 25 / Projects 15 /
  Final 25 / Homework 15). Add **+ Attendance** to make attendance count. Change it any time — everyone's
  grade recomputes instantly.

### Make a quiz
- Quizzes → **New quiz** → add questions (multiple choice, numeric, short answer, essay, matching…).
- In the quiz's **Settings**, pick a **Grade category** so its score counts, and optionally turn on
  **Integrity mode** (fullscreen + flags if someone leaves the tab).

### Take attendance
- Calendar → open the **event** → **Take attendance** → mark each member present / late / excused / absent.
  If you added an Attendance category, this feeds their grade.

### Add glossary terms / let members study flashcards
- Glossary → **+ Add term** (term, category, formula, definition). Members open **Study flashcards** to
  review with spaced repetition. 25 CRE terms are seeded already.

### Build weekly content (modules, pages, syllabus)
- Modules → add a week → add items (pages, assignments, quizzes, files). Pages and the Syllabus use simple
  formatting (Markdown) — no HTML needed.

### See exactly what a member sees
- In the left rail, click **Student view.** You'll experience the app as a member — and can even submit.
  Click **Return to exec** to switch back. Nothing locks you out.

---

# Part 4 — Changing the software itself

This is for changing *how the app works* (new features, fixes) — not day-to-day content. Two paths:

**A) Claude Code — recommended, no engineering team needed.**
1. Open the GitHub repo (`UREC-Website`) in Claude Code.
2. Describe the change in plain English ("add a dues tracker for the finance VP").
3. Review what it built, then it deploys to the live site in ~1–2 minutes.

**B) A technical member.**
Clone the code → `npm install` → `npm run dev` to run it locally → make a branch → open a **pull request**
→ once merged to `main`, Vercel deploys it automatically. Full steps in `TOOLKIT.md`.

> **Tip:** most changes never need a database step. When one does (a brand-new feature that stores new
> data), it comes with a short SQL snippet to paste into Supabase once. Whoever makes the change will flag it.

---

# Part 5 — Running the whole club on it (by VP team)

The platform isn't just for the Analyst Program — it can be the club's operating system. What each team
can do here:

- **Professional Development (Analyst Program):** this is the core — trainings, homework, quizzes, grading,
  attendance, modules, glossary. Already fully built.
- **Membership:** enroll and manage members and roles today; a **recruitment pipeline** (applications →
  coffee chats → interviews → decisions → one-click enroll) is the top thing to build next.
- **Finance:** dues tracking, reimbursement requests, and a budget ledger are strong fits to build.
- **Internal:** event RSVPs + QR check-in (ties into attendance), driver/carpool sign-ups, and an
  engagement dashboard.
- **External:** a sponsor/partner record (CRM), a speaker-series hub with a recording archive, and a public
  sponsor wall. (Outreach itself stays in Gmail — the platform keeps the record.)
- **Co-Presidents:** oversight dashboards, announcements, role management, and these succession docs.

**Rule of thumb:** the platform shines for **structured, recurring, per-member record-keeping.** Leave
one-off logistics, actual payments, and email to Sheets / Zelle / Gmail.

---

# Part 6 — Handing it off (do this every transition)

- [ ] Give the **shared UREC Google account** login to both incoming co-presidents.
- [ ] Confirm they can log into **Supabase, Vercel, and GitHub** with it.
- [ ] In the app, set them to **President** (People → Manage Roles).
- [ ] **Rotate the secrets** (Supabase + email keys) and update them in Vercel (see `OWNERSHIP.md`).
- [ ] Update `OWNERSHIP.md` with the new names and date.
- [ ] Walk them through **this handbook**.
- [ ] In the app: roll returning members forward, graduate seniors to alumni, start the new term.

The **shared Google account is the master key** — whoever holds it can recover everything. Protect it and
pass it on deliberately.

---

# Part 7 — The tools behind it

You rarely touch these directly. Full detail in `TOOLKIT.md`.

| Tool | What it does | Cost |
|---|---|---|
| **GitHub** | Stores the code and its full history. | Free |
| **Vercel** | Hosts the live site; auto-updates when the code changes. | Free |
| **Supabase** | Database + sign-in + file storage (members, grades, uploads). | Free |
| **Google Cloud** | Runs "Sign in with Google," locked to @berkeley.edu. | Free |
| **Resend** | Sends email notifications (optional). | Free |
| **Claude Code** | How changes to the software get made. | — |

**How they connect:** a member's browser loads the site from **Vercel**, which runs on data from
**Supabase**; **Google** handles login; **GitHub → Vercel** deploys every change automatically.

---

# Part 8 — Troubleshooting & FAQ

- **The site is down.** Open the **Vercel** dashboard (Deployments) with the shared account — the latest
  deployment shows any error.
- **A member can't sign in.** It's **Google sign-in / Supabase** — confirm they used their `@berkeley.edu`
  account (personal Gmail won't work).
- **I want a change made.** Use **Claude Code**, or ask your tech-lead Director.
- **Someone graduated and we lost a login.** The **shared Google account** recovers everything — that's why
  everything lives under it.
- **Do we have to pay for anything?** No — every service is on a free tier. A custom domain (optional) is ~$12/yr.
- **Can we attach this to our main (Wix) site?** Yes — add a "Member Portal" button linking to it, or point a
  subdomain like `portal.urecberkeley.com` at it. See `TOOLKIT.md`.
- **Is member data safe?** Access is locked to Berkeley accounts and enforced per-role at the database
  level, so members only see what they should.

---

# Part 9 — Glossary of terms

- **Repo (repository):** the folder of code, stored on GitHub.
- **Deploy:** publishing a change so it's live on the real site (Vercel does this automatically).
- **Branch / Pull request:** a safe copy of the code where a change is made and reviewed before going live.
- **Supabase:** the database that holds all the club's data.
- **Vercel:** the service that runs the live website.
- **Role (staff vs. membership):** staff = what you can run (President/Exec/Director); membership = what
  materials you can see (Analyst/DeCal/General).
- **Integrity mode:** an optional quiz setting that runs fullscreen and flags if someone leaves the tab.

---

_That's the whole platform. Keep this handbook and `OWNERSHIP.md` current, and it hands off cleanly, board to board, forever._
