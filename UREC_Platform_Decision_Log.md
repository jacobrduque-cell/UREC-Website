# UREC Platform — Design & Build Decision Log

Last updated: Tuesday, July 7, 2026
Owner: Jacob Duque
Co-owner: Lauren Chen (once onboarded)
Purpose: Track every architectural decision made during platform build so future co-presidents can understand why things are the way they are.

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

Decision: All accounts (Google Cloud, Vercel, Supabase, domain registrar) owned by a shared UREC Gmail (urecberkeley@gmail.com or similar). Jacob and Lauren both have credentials. Credentials stored in exec-only Google Drive doc. Rotated on each co-president handoff.

Reasoning: Prevents platform from dying when a co-president graduates. Standard practice for institutional continuity.

Status: Pending Phase 0 setup.

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

### Phase 0 — Foundation (~2 hours of Jacob's time)

- Create shared UREC Gmail
- Buy domain (urecberkeley.com or similar)
- Create Supabase project
- Create Vercel account
- Configure Google Cloud OAuth
- All under shared Gmail account

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
- Milestone: Ready to announce to full club

Total realistic time: ~30 hours of Jacob's time over 4-6 weeks.

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
