# UREC Platform — Design & Build Decision Log

Last updated: Wednesday, July 22, 2026
Owner: Jacob Duque
Co-owner: Lauren Chee
Purpose: Track every architectural decision made during platform build so future co-presidents can understand why things are the way they are.

> **Status note (2026-07-22):** The platform is BUILT and LIVE (Phases 0–10 done). This log records the original *decisions*; for current build state see `PROJECT_STATE.md`, and for account ownership/credentials see `OWNERSHIP.md`.

## Decision-making framework

Jacob is following AI recommendation on all scaffolding decisions with a running record. Any decision can be revisited by editing this document and iterating. Nothing is locked in until code is written and deployed.

## Part 1 — Foundational strategy

### D1: Overall architecture approach

Decision: Canvas-modeled schema + UREC-scoped UI. Copy Canvas's structural DNA (30ish core tables from their open-source schema) while only building UI for features UREC actually uses day one.

Reasoning: Gives us maximum flexibility to add Canvas features later without database migrations. Cost of scaffolding all tables upfront is low (maybe ~1 extra hour of setup); cost of retrofitting later is measured in weekends and bug risk.

Alternatives considered:
- Pull Canvas's real schema and directly translate → too much legacy baggage
- Build our own simpler version → risk of hitting walls we didn't anticipate
- Show schema doc before committing → chosen, best of both worlds

Status: Locked in.

### D2: Ownership & succession model

Decision: All accounts (Google Cloud, Vercel, Supabase, domain registrar) owned by the UREC Berkeley Google account, never a personal account. Both co-presidents have credentials. Credentials recorded in `OWNERSHIP.md` (locations only — no secret values in git). Rotated on each co-president handoff.

Reasoning: Prevents platform from dying when a co-president graduates. Standard practice for institutional continuity.

Status: **DONE (2026-07-22).** Supabase project + Vercel deployment + Google Cloud OAuth are live under the UREC Berkeley account (`urec@berkeley.edu` — confirm exact address). See `OWNERSHIP.md`.
- Remaining sub-item: verify both co-presidents (Jacob + Lauren) have login access, and rotate on handoff.
- Still open (tracked separately): a custom domain — the app currently runs on its Vercel URL. See D-domain / PROJECT_STATE.md "Open items."

### D3: Structural questions

- Multi-class support: Yes. Courses table from day one, first course is "UREC Analyst Program Fall 2026"
- Multi-semester: Yes. Terms table with per-term courses, archiving supported
- Group submissions: Both individual and group. Group tables scaffolded, wired into submissions
- User roles: Flexible role system. Starting roles: Analyst, VP, Co-President, Admin. Add more (Senior Analyst, Alumni, Mentor) anytime.

Status: Locked in.

## Part 2 — Feature-by-feature scaffolding decisions

For each Canvas feature area, we decided: Build now, Scaffold + build later, or Skip entirely.

### Feature decision matrix

| # | Feature | Decision | Rationale |
|---|---------|----------|-----------|
| 1 | Quizzes | Scaffold now, build UI later | UREC will genuinely use for module completion checks. Low scaffolding cost. |
| 2 | Discussions | Scaffold now + build announcement replies day one, discussion boards later | Replies are core Canvas pattern (confirmed via inspect). Standalone forums can wait. |
| 3 | Conversations / Inbox | Scaffold only | Slack + email cover this. Tables exist if we ever want it. |
| 4 | Notifications | Include and prioritize (Phase 3-4) | Difference between "cool prototype" and "actually used platform." Start with 4 email triggers: new announcement, new assignment, assignment graded, assignment due tomorrow. |
| 5 | Analytics & Audit Log | Track from day one, dashboard UI later | Impossible to backfill lost tracking data. Cheap to record silently now. |
| 6 | Advanced Rubrics | Scaffold now, basic rubrics in Phase 3, advanced later | Basic rubrics (already in prototype) work fine. Reusable templates + multi-level ratings later. |
| 7 | Groups & Group Assignments | Scaffold now, build UI when case comp needs it | UREC does both individual and group work. Get schema right day one. |
| 8 | Wiki Pages / Editable Content | Scaffold now, simple markdown editor Phase 4-5 | Enables in-platform module content instead of PDFs. Simple markdown is way easier to build than a full WYSIWYG. |
| 9 | Course Sections | Scaffold only | Not needed day one. Ready if UREC grows to 100+ and needs cohort split. |
| 10 | Terms / Semesters | Include and prioritize (Phase 1) | Needs to be wired up initially. Enables archiving. Minimal UI (admin creates new term when needed). |
| 11 | Calendar Events + iCal | Basic calendar in Phase 4, iCal export Phase 5+ | Basic calendar matches prototype. iCal export increases stickiness (events appear on members' phones). |
| 12 | Assignment Groups / Grade Weighting | Build day one (Phase 3) | Not scaffolding, required for total grade calculation. Simple settings UI. |
| 13 | LTI External Tools | Skip entirely | Not needed, high complexity, no value for UREC. |
| 14 | Attachments / Files | Build in Phase 4, simplified from Canvas | Nested folders yes, publishing yes, versioning no, per-file permissions no. |
| 15 | Access Tokens / API | Scaffold only | Year 2+ if we want mobile app or deal library integration. |

## Part 3 — Deliberately excluded (from Canvas's schema)

Canvas has these features. We're not including them at all.

- SIS integrations (student information system syncing)
- Multi-institution support (we're just Berkeley + UREC)
- Outcomes / K-12 standards alignment
- Canvas Catalog (course marketplace product)
- Canvas Studio (video hosting product)
- ePortfolios (portfolio product)
- Blueprint / Master courses (mass-course templating)
- Turnitin integration (plagiarism detection)
- Third-party OAuth beyond Google
- Mobile-specific API endpoints
- Speedgrader (Canvas's grading UI, we build a simpler grade-input flow)

Reasoning: These add complexity for capabilities UREC will never use.

## Part 4 — Build phases

### Phase 0 — Foundation (~2 hours of Jacob's time) — ✅ DONE (2026-07-22)

- ✅ UREC Berkeley Google account owns everything (`urec@berkeley.edu`)
- ⬜ Custom domain — still open; app runs on its Vercel URL for now (tracked in PROJECT_STATE.md "Open items")
- ✅ Supabase project created (project ref `srbzcyhvbahrinievddd`) and schema applied
- ✅ Vercel account + deployment live (deploys from `main`)
- ✅ Google Cloud OAuth configured (Google SSO gated to `@berkeley.edu`)
- ✅ All under the UREC Berkeley account

### Phase 1 — Auth + shell + schema (~4 hours + database setup)

- Full schema deployed to Supabase (all 30+ tables from decisions above)
- Google SSO restricted to @berkeley.edu
- Landing page + protected routes
- Deployed to urecberkeley.com
- Terms + Courses tables populated with "Fall 2026" and "UREC Analyst Program"
- Milestone: Real, live, password-protected UREC site

### Phase 2 — Announcements + Directory + Announcement replies (~6 hours)

- Real users show up in Directory as they sign in
- Exec team can post announcements, everyone sees instantly
- Members can reply to announcements (basic threading)
- User roles enforced (only exec team sees "Post Announcement" button)
- Milestone: Club can use it for basic communication

### Phase 3 — Assignments + Submissions + Grading + Rubrics (~8 hours)

- Assignment groups (weighted categories)
- Basic rubrics per assignment
- Real file uploads to Supabase Storage
- Submission flow (matches Canvas pattern from Chrome inspect)
- Grade-input flow for exec team
- Milestone: HW1 flow works end-to-end for real

### Phase 4 — Calendar + Files + Notifications (~6 hours) — SHIPPED 2026-07-17

- Shared calendar with real events (exec-only creation)
- Files section with folders, uploads, publishing (private `course-files`
  storage bucket, RLS gated on the `published` flag)
- In-app notifications: bell + unread badge, notifications page,
  mark-read/mark-all-read (see change log — email deferred, not built)
- 4 notification triggers live: new announcement, assignment graded,
  assignment due tomorrow (Vercel Cron), and the underlying data layer
  supports new-assignment once the exec "create assignment" UI exists
- Milestone: Members see in-platform notifications and check the bell
  regularly; email nudges are a follow-up, not yet built

### Phase 5 — Deal library integration + Wiki pages + Roles polish (~4 hours) — SHIPPED 2026-07-17

- Deal library moved from an unprotected prototype file into
  `public/deal-library.html`, gated the same way every other route is
  (proxy.ts runs on `/public` requests too, not just app routes) —
  requires @berkeley.edu sign-in like everything else now. Linked from
  the dashboard; kept as its own static self-contained page rather than
  ported into React, since it's genuinely a separate product with its
  own KKR-inspired design system (see CLAUDE.md)
- Modules is now backed by the `wiki_pages` table that was scaffolded
  in Phase 1: list/create/edit/publish, markdown body rendered with
  `marked` through the same `.rich-content` trusted-render pattern as
  assignment descriptions. Exec-write is RLS-enforced
  (`wiki_pages_write_exec`), same "RLS is the real gate" convention used
  everywhere else in this codebase
- Role permissions audit: re-verified every actions.ts file relies on
  RLS as the actual enforcement (not just UI hiding), and found + fixed
  one real gap — the new calendar subscribe feed (below) used the
  admin/service-role client with no session, so it had to re-implement
  the enrollment/exec check by hand instead of getting it from RLS
- iCal: calendar page now has a "Get a calendar subscribe link" button.
  Generates a per-user token (hash stored in the `api_tokens` table
  scaffolded in Phase 1), exposed once, that Google/Apple Calendar can
  poll as a live feed (`/api/calendar/feed/[token]`) rather than a
  one-time download that goes stale
- Milestone: Ready to announce to full club *(revised — see Phase 6;
  this call was premature)*

### Phase 6 — Real Canvas parity audit + fixes (~10 hours) — SHIPPED 2026-07-17

Triggered by cloning the actual open-source Canvas LMS repository
(instructure/canvas-lms — real schema, models, controllers, and
frontend) and diffing our schema/UI against it feature-by-feature,
instead of building from a best-guess of how Canvas works. Found real
gaps, not just missing nice-to-haves:

- **Courses had no publish/draft lifecycle** — every other content
  table (assignments/files/wiki_pages) already gated on `published`;
  courses didn't, inconsistent with our own schema. Added
  `courses.published` + RLS, plus a toggle on the new Terms & Courses
  page.
- **No grader/TA permission tier** — the only way to let someone grade
  was to hand them full exec power. Added a course-scoped `Grader` role
  (`is_grader()`, mirrors Canvas's `TaEnrollment`) that can grade/view
  all submissions without touching announcements, roles, or anything
  else exec-only.
- **No way to lock replies on an announcement**, and **saving an
  announcement always published + notified immediately** — no
  draft/scheduled state. Added `announcements.locked` and made
  `published_at` a real gate (future timestamp = scheduled/hidden until
  then); the daily cron now also sweeps for newly-passed scheduled
  announcements to notify (same-day precision, not exact-time — Vercel
  Hobby only allows a daily cron).
- **No way to create or edit an assignment without hand-writing SQL** —
  the single biggest gap. Built the full form (category, points, due
  date, submission type, rubric attach-or-create, publish toggle),
  reusing a new `/assignments/rubrics` page for reusable rubric
  authoring.
- **Resubmitting an assignment was silently buggy** — a resubmission
  inserted a new row instead of updating, and grade/roster queries had
  no explicit order, so a resubmission could show the wrong grade or
  make a graded assignment look ungraded. Consolidated to one current
  submission per student per assignment (`attempt_number` still
  increments, so "attempt 3" is visible — full Canvas-style version
  history is an intentional simplification, not built), with a
  migration that safely merges any existing duplicate rows in
  production and carries an existing grade forward rather than losing
  it.
- **The rubric was decorative** — it rendered on the assignment page
  but grading only ever wrote one raw point total; the
  `rubric_assessment` jsonb column made for this was never touched.
  Grading page now shows a real per-criterion scoring UI when a rubric
  is attached.
- **No course/term creation UI** — the actual succession-proofing gap:
  every term rollover required raw SQL. New `/courses` page lets any
  exec create a term+course and flip the "current term" pointer.
- **Submission comments table/RLS existed but nothing used it** — wired
  up a comment thread on both the grading page and the student's own
  submission view.
- Confirmed several things were correctly *already* out of scope for a
  15-20 person single-course club and left alone: course sections, SIS
  fields, per-section/per-student due-date overrides, late-policy
  automation, podcasts/cross-listing, a full custom-role admin UI.
- Milestone: the specific, real gaps found in the Phase 5 audit are
  closed. *(Revised — the "15-20 person" scale assumption behind
  several of these calls was wrong; see Phase 7.)*

### Phase 7 — Real Canvas visual system + actual scale (~14 hours) — SHIPPED 2026-07-17

Two corrections surfaced after Phase 6: (1) the platform's visual
identity (navy/gold/Fraunces) never actually resembled Canvas's real
look, just our best guess at "institutional and serious"; (2) the club
has **115 members**, not 15-20 — several Phase 5/6 "correctly out of
scope at this size" calls were wrong at the real scale.

**Visual system, pulled from Canvas's own source** (`brandable_variables.json`,
`base/_variables.scss`), not guessed:
- Palette replaced end to end: dark slate global nav (`#334451`), blue
  primary (`#2B7ABC`), link blue (`#0E68B3`), light grey body background
  (`#F2F4F4`) — CSS variable *names* (`--navy`, `--gold`, etc.) kept the
  same so every existing page kept working; only their *values* changed,
  see `app/globals.css`
- Typography: dropped Fraunces/Inter entirely — Canvas is Lato end to
  end, no serif display face. Headings changed from thin/light to bold
  to match
- Icons: added `lucide-react`, an icon on every nav item and dashboard
  card (Canvas is icon-forward throughout, ours had almost none)
- Shell rebuilt as Canvas's real two-tier nav: a dark icon-only global
  rail (Dashboard/Calendar/Alerts, exec gets Courses) plus a light
  icon-labeled course menu, replacing the single custom header+sidebar
- Buttons swept from rounded-full pill shapes (reads as a marketing
  site) to Canvas's actual small-radius rectangles (`rounded-md`,
  `$ic-border-radius` = 6px) across all ~20 pages; small status pills
  (Pinned/Draft/Locked/badges) correctly kept `rounded-full` since
  Canvas does use pill badges for those
- Dashboard rebuilt as a card grid (icon, colored top bar) instead of a
  welcome message + link list
- Deal Library untouched — separate product, own inline design system,
  not part of this pass

**Real scale (115 members) — features that were wrongly deferred:**
- **Course sections**: built for real. `/directory/sections` (exec:
  create a section) + per-member section assignment on the People page
  + a section filter. `course_sections`/`enrollments.section_id` were
  already scaffolded from Phase 1; this is the first UI that uses them
- **Groups (case-comp teams)**: built for real. `/directory/groups`
  (exec: create a group, assign members) + `allow_group_submission` on
  the assignment form + `submitAssignment` now looks up the student's
  group and submits/grades once per team instead of once per person.
  Fixed the same one-current-attempt logic to work per-group
  (`submissions_one_per_group_per_assignment` already existed from
  Phase 6's fix, just unused until now)
- **Real bug caught by testing this locally**: the `submissions`
  storage bucket only ever let the original uploader (or exec)
  download a file — correct for individual work, but broke the moment
  group submissions existed (a teammate who didn't personally upload
  couldn't see their own team's file) and Graders couldn't either.
  Fixed the storage policy, and separately found + fixed a real miss
  from Phase 6: `submission_files` RLS was never updated for the
  Grader role (only submissions/grades/submission_comments were),
  caught by the same local test coming back empty for a grader
- Milestone: platform now visually reads as a real Canvas-family tool,
  and actually holds up at 115 members instead of the 15-20 assumed
  earlier. Ready to announce to the full club.

### Phase 8 + 9 — Real-bCourses fidelity + missing subsystems (~16 hours) — SHIPPED 2026-07-17

Triggered by a screen recording of Jacob's *actual* live bCourses (not
just the open-source Canvas code), which surfaced gaps the code-only
audit missed. Extracted with ffmpeg and reviewed frame-by-frame.

Fidelity fixes (Phase 8):
- **Course nav is now plain text links, no icons.** The single biggest
  "reads as not-bCourses" miss: real bCourses course menu is plain blue
  text links (active item bold black + left border bar); icons live only
  on the far-left global rail. Phase 7 had wrongly put an icon on every
  course-menu item.
- **Modules rebuilt as real Canvas Modules.** Was a flat list of wiki
  pages; now collapsible containers (one per week/unit) that sequence
  mixed items — assignments, pages, quizzes, external links, and text
  headers — via new `modules` + `module_items` tables. The old flat
  wiki-page list moved to a dedicated **Pages** section (`/pages`), which
  is what module items of type 'page' point at.
- **Syllabus page** added (`/syllabus`), stored as a reserved-slug
  wiki_pages row so it needed no new table.
- **Dashboard right rail** added: To Do (unsubmitted upcoming
  assignments), Coming Up (upcoming events), Recent Feedback (recent
  grades), View Grades — matching bCourses' dashboard column.
- Course nav order matched to bCourses (Home, Announcements, Syllabus,
  Modules, Assignments, Discussions, Quizzes, People, Grades, Files,
  Calendar).

Missing subsystems built (Phase 9):
- **Discussions** — threaded topic boards on the scaffolded
  discussion_topics/discussion_replies tables. Any enrolled member can
  start a topic or reply (unlike exec-only announcements), one level of
  reply nesting.
- **Quizzes** — full quiz-taking on the scaffolded quiz_* tables: exec
  authors a quiz + questions (multiple-choice, true/false, short-answer,
  essay), students take it, objective questions auto-grade server-side
  (via the admin client so answer keys are never trusted from the
  client), written answers left for exec review. Needed one RLS
  migration to let enrolled students read published quizzes/questions/
  answers (was exec-only).
- **Inbox/Conversations** — deliberately deferred to a follow-up; Slack
  still covers club messaging, so it's the lowest-value of the three.

New migrations handed off: `20260717001400_modules.sql`,
`20260717001500_quizzes_student_read.sql`. All 16 migrations verified to
apply clean in sequence, and modules/quizzes RLS functionally tested
(member sees published only, exec sees drafts, outsider sees nothing,
member can't write exec-only tables, member can post discussions + take
quizzes).

Total realistic time: ~70 hours of Jacob's time over 7-10 weeks.

## Part 5 — Change log

Any time a decision changes, add a new row here with date, decision that changed, old → new, and reason.

| Date | Decision | Old | New | Reason |
|------|----------|-----|-----|--------|
| 2026-07-07 | Advanced Rubrics build priority | "Include and prioritize" (reusable templates day 1) | "Scaffold + build basic in Phase 3, advanced later" | Reverting to Claude's original recommendation to keep Phase 3 tight |
| 2026-07-17 | Phase 4 notification delivery | Email (Resend/Postmark) | In-app only (bell + notifications page) | Email service was still an open question (Part 6); building in-app first avoids blocking Phase 4 on a vendor decision. Email can be layered on later by having `notifyUsers()` also send mail. |

## Part 6 — Open questions to revisit

Things we haven't decided yet:

- Email service: Resend vs. Postmark vs. SendGrid (decide in Phase 3-4)
- Domain name: confirm availability of urecberkeley.com or pick alternate
- Access to Berkeley alumni: should alumni get separate role with limited access? (Decide when it comes up)
- Deal library public/private: currently a prototype at the same URL, should it stay bundled with the platform or split into a separate public site?
- Migration from prototype: what content from the current prototype (announcements, module structure, etc.) should we seed the real platform with?

This document is the single source of truth for how the UREC platform is being built. Any co-president can read this and understand every architectural decision that was made and why.
