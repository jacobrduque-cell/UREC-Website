# UREC Platform

Digital platform for the UC Berkeley Undergraduate Real Estate Club (UREC).

Two products under one roof:

- **Deal Library** — interactive commercial real estate case studies with underwriting models and deep-dive walkthroughs.
- **Member Workspace** — a course-style hub modeled on Canvas/bCourses for assignments, rubrics, and grading.

The goal is a real, succession-proof platform that survives leadership transitions, with a proper backend replacing the current browser-only prototypes.

## Repo layout

- `CLAUDE.md` — project context, governance rules, design system, and the phased build plan. Read this first.
- `urec_deal_library_prototype.html` — Deal Library prototype (single self-contained HTML file).
- `urec_workspace_v2.html` — Member Workspace prototype (single self-contained HTML file).
- `UREC_Platform_Decision_Log.md` — source of truth for scaffolding decisions across the Canvas feature areas.

## Running the prototypes

Each prototype is a single self-contained HTML file with assets embedded inline. Open the file directly in a browser, no build step or server required.

## Continuity

Every account, service, and login is owned by the shared UREC Gmail, never a personal account. Anything a future officer needs to run the platform lives in this repo, not in one person's head.
