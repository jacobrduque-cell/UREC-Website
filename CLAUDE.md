# UREC Platform

Digital platform for the UC Berkeley Undergraduate Real Estate Club (UREC). Two products live under one roof: a **Deal Library** (interactive CRE case studies) and a **Member Workspace** (a course-style hub modeled on Canvas/bCourses). The goal is a real, succession-proof platform that survives leadership transitions, with a real backend replacing the current browser-only prototypes.

## Governance and continuity (important, do not break)

- Every account, service, and login is owned by the **shared UREC Gmail**, never a personal account. This is the whole succession model. When wiring up any third-party service, auth, or API key, assume it belongs to the shared account.
- Leadership: Jacob (Co-President), Lauren Chen (Co-President). VPs: Grant Kim (Professional Development), Madalyn Torres (External), Diego Ramirez (Membership), Elias Wong (Internal), Nate Silva (Finance).
- Anything a future officer would need to run the platform belongs in code, this file, or the decision log, not in one person's head.

## Key files

- `urec_deal_library_prototype.html` — Deal Library. Single HTML file, six landmark CRE deals, interactive underwriting models, accordion deep-dives, KKR-inspired design.
- `urec_workspace_v2.html` — Member Workspace. Single HTML file modeled on Canvas/bCourses: matching sidebar order, status pills, assignment detail pages, rubric tables, grading views. HW1 (Defining CRE and Core Metrics, 8 questions) is fully rendered and submittable.
- `UREC_Platform_Decision_Log.md` — the source of truth for scaffolding decisions across all 15 Canvas feature areas. Read this before making structural choices; it records what was decided and why.

## Design system (always honor these)

Colors:
- Navy `#1B3D7B`
- Medium blue `#2A6DB5`
- Sky `#5DADE2`
- Gold `#C8A24B`

Fonts:
- Fraunces — headlines
- Inter — body
- JetBrains Mono — numbers and financial figures
- Lato — workspace UI

## Frontend conventions

- Prototypes are **single self-contained HTML files** with assets embedded inline.
- External image URLs have failed with 403s (Unsplash, Wikimedia). Do not rely on external asset URLs. Embed assets as **base64 data URIs** instead. The SF skyline background is a Python-generated base64 data URI for exactly this reason.
- Current persistence is **browser local storage** (workspace key: `urec-workspace-v2`). This is a known limitation, not the target state.

## Backend build

Being built by Jacob over the summer with guidance, roughly 30 hours across 4 to 6 weekends. Schema is modeled on the Canvas/bCourses open-source schema, about 30 to 35 core tables. Analytics tracking goes in from day one even though the dashboard UI is deferred.

Phase plan:
- **Phase 0** — shared Gmail and account setup
- **Phase 1** — terms / semesters
- **Phase 2** — announcements with discussion replies
- **Phase 3** — basic rubrics and prioritized notifications
- **Phase 4-5** — markdown wiki editor and analytics dashboard UI

Scaffold but do not fully build yet: quizzes, discussions (replies land in Phase 2), conversations/inbox, groups UI (build when a case comp needs it), wiki pages. LTI tools are skipped entirely.

## Working style

- Write concise, human-sounding prose. No em dashes.
- When a structural decision is unclear, check `UREC_Platform_Decision_Log.md` first, then recommend a default rather than asking a long list of questions.
- Keep the platform succession-proof: prefer boring, well-documented, shared-account-owned solutions over clever personal setups.
