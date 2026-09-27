# Product Requirements Document

## Product Overview

Product: HackStop
One-line: A self-hostable hackathon submission and judging platform that runs with one command.
Vision: Replace every spreadsheet, manual CSV export, and duct-taped judging workflow that hackathon organizers currently rely on. The winning build gets forked and put into production by Hackathon Raptors for their events.

This is our submission to the Dogfood 2026 hackathon (Sept 25-28, 72 hours). We are building the platform that will judge us.

---

## Problem

Hackathon organizers have no modern, open-source, self-hostable platform that handles the full lifecycle: registration, team formation, submissions, judge assignment, scoring, normalization, results, and export. The commercial platforms (Devpost, Devfolio, HackerEarth, Unstop, DoraHacks) all converge on the same 9 features and then stop. None of them can weight judging criteria. None document their normalization. None have a public API. Pricing is sales-gated. Community voting is treated as an unsolvable abuse surface.

The open-source alternatives (Gavel, JunctionApp, Dribdat, Quill, Hibiscus) solve pieces but none assemble a complete, production-ready whole.

---

## Goal

Ship a working hackathon portal that:

1. Starts with `docker compose up` on a laptop with the network off.
2. Seeds itself with provided fixture data (40 projects, 30 judges, 8 tracks, 126 score entries).
3. Passes all 7 checks in the official acceptance suite (`run.py`).
4. Handles judge assignment, weighted scoring rubrics, cross-judge z-score normalization, and backend-enforced role isolation.
5. Exports results as CSV.
6. Is documented well enough that a stranger can run it, understand the architecture, and trust the judging math.

Our target: a clean, correct, fully documented T1 + T2. The spec says "a clean T2 beats a broken T4."

---

## Target Users

Three personas use the platform:

**Organizer.** Creates events, configures tracks and prizes, sets up the judging rubric, invites and assigns judges, monitors judging progress, runs normalization, and exports CSV. Has full visibility into judging data. Participant result publication is deferred beyond the listed T2 scope.

**Judge.** Receives project assignments within their designated tracks. Scores each project against the rubric criteria. Can see only their own scores. Cannot see other judges' scores, other tracks, aggregates, or audit logs. This isolation is enforced at the API level.

**Participant.** Forms or joins a team via invite link. Submits a project with all required fields (title, tagline, description, thumbnail URL, image gallery URLs, demo video URL, repo URL, live link, tech tags, track, custom answers). Can edit until the submission deadline. Cannot access any judging routes.

**Visitor.** Unauthenticated. Can browse the public project gallery. Cannot access anything else.

**Admin.** Same access as organizer. Reserved for platform-level operations.

---

## Core Features

### T1 -- Core (mandatory, must complete)

- Authentication and sessions (custom, no third-party provider)
- Role model: visitor, participant, judge, organizer, admin
- Event creation with configurable dates, tracks, prizes
- Team formation via invite links (max 4 members)
- Project submission with draft-and-edit until deadline
- Deadline enforcement (hard cutoff based on event.submissions_close)
- Public gallery with search and filter by track, team, tech tags
- Submission fields: name, tagline, long description, thumbnail URL, image gallery URLs, demo video URL, repo URL, live link, tech tags, track, organizer-defined custom questions

### T2 -- Judging (mandatory, must complete)

- Judge invitation and assignment (batch or algorithmic round-robin)
- Scoring against a weighted, organizer-configurable rubric
- Backend-enforced role isolation (see role matrix below)
- Judge progress dashboard for organizers
- Cross-judge z-score normalization with documented edge case handling
- CSV export at every stage

### T3 -- Public (only if T1+T2 are done with real time to spare)

- Community voting (open link / email-gated / authenticated)
- Comments on gallery projects
- Results hidden during voting window
- Randomized project ordering on ballots
- Anti-abuse: rate limits, duplicate detection, audit trail

### T4 -- Stretch (only if way ahead of schedule)

- REST API + webhooks
- Certificate generation
- Signed judge participation records
- Embeddable gallery widget
- Bulk import and export

---

## Role Isolation Matrix

This is published by the organizers. We implement it exactly.

| Actor       | Own scores | Peer scores | Other track | Aggregate | Audit log |
|-------------|------------|-------------|-------------|-----------|-----------|
| Visitor     | denied     | denied      | denied      | denied    | denied    |
| Participant | denied     | denied      | denied      | denied    | denied    |
| Judge       | allowed    | denied      | denied      | denied    | denied    |
| Organizer   | allowed    | allowed     | allowed     | allowed   | allowed   |
| Admin       | allowed    | allowed     | allowed     | allowed   | allowed   |

Every "denied" is enforced at the API level, not by hiding UI elements. The acceptance suite tests this directly by sending Judge B's session token to a route that returns Judge A's scores and expecting 401 or 403.

---

## User Flows

### Flow 1: Organizer creates an event

1. Organizer logs in.
2. Creates a new event with name, dates (submissions_open, submissions_close, judging_open, judging_close).
3. Adds tracks (e.g., Developer tools, Security, Health).
4. Adds prizes (optional display data).
5. Configures the judging rubric: criteria names, weights, max score per criterion.
6. Invites judges by email. Each judge is assigned to one or more tracks.

### Flow 2: Participant submits a project

1. Participant registers and logs in.
2. Creates or joins a team using an invite link.
3. Starts a new project submission (status = draft).
4. Fills in all fields: title, tagline, description, URLs, track, tech tags, custom answers.
5. Saves as draft (can return and edit).
6. Submits (status = submitted). Can still edit until deadline.
7. After deadline, all submission endpoints return 403.

### Flow 3: Judge scores projects

1. Judge logs in.
2. Sees their assigned projects (only projects in their assigned tracks).
3. Opens a project, sees the rubric criteria.
4. Scores each criterion (integer, 1 to max_score).
5. Optionally writes a comment.
6. Saves. Can return and update scores until judging closes.
7. Cannot see any other judge's scores at any point.

### Flow 4: Organizer reviews results

1. Organizer opens the progress dashboard. Sees which judges have completed scoring.
2. Triggers normalization. Sees raw vs. normalized rankings side by side.
3. Reviews results.
4. Exports CSV at any point. Participant result publication is outside the listed T2 scope.

---

## Requirements

### Functional

- `docker compose up` produces a working, seeded portal.
- Fixture data (fixtures.json) is loaded automati cally on first boot.
- Four deterministic session tokens are printed at startup for the acceptance suite.
- All 7 acceptance suite checks pass (3 for T1, 4 for T2).
- Submissions are refused after the deadline (fixture close date is 2026-03-01T18:00:00Z, in the past).
- Gallery is publicly accessible without authentication.
- Gallery response body contains at least one fixture project title as plain text.
- CSV export returns HTTP 200 with a comma in the first line.

### UX

- The judge scoring interface should be fast. A judge scoring 30 projects should not fight the UI.
- The gallery should load all 40 fixture projects without pagination issues.
- Forms should validate before submission and show clear error messages.

### Performance

- Gallery page loads in under 2 seconds with 40 projects.
- Normalization runs in under 1 second for 40 projects and 126 score entries.
- CSV export generates in under 1 second.

### Platform

- Runs on any machine with Docker and Docker Compose.
- No external network calls at runtime.
- No cloud accounts, hosted databases, auth providers, or external APIs.
- PostgreSQL 16 as the database (inside Docker).
- Node.js / Next.js runtime.

---

## Success Metrics

- All 7 acceptance suite checks PASS.
- `docker compose up` works with network adapter disabled.
- A stranger can clone the repo, run one command, and have a working portal.
- ARCHITECTURE.md, DATA-MODEL.md, and JUDGING.md are clear enough that a judge understands the system without reading code.
- Normalization produces correct rankings (verified against fixture data analysis).
- Role isolation survives curl testing (Judge B cannot get Judge A's scores).

---

## Out of Scope

- Email notifications
- Real-time WebSocket updates
- File upload (we store URLs, not files)
- Multi-event dashboards beyond what the fixture data requires
- Mobile-native app
- Payment processing
- SSO / OAuth / SAML
- Any third-party auth provider
- Any hosted database or cloud service
- Design mockups or Figma files with no backend
- LLM-generated code nobody can explain

---

## Fixture Data Summary

The seed data we must load correctly:

| Entity   | Count | Notes                                              |
|----------|------:|----------------------------------------------------|
| Event    |     1 | "Sample Hack 2026", closes 2026-03-01T18:00:00Z    |
| Tracks   |     8 | Developer tools through Open hardware               |
| Judges   |    30 | 1-2 track assignments each                          |
| Teams    |    40 | 1-4 members each, some duplicate team names          |
| Projects |    41 | 40 unique + 1 duplicate (prj_41 = prj_07 by tm_07)  |
| Scores   |   126 | 3 criteria each = 378 individual score values        |

Edge cases baked in: constant-score judges (jdg_01, jdg_07), incomplete batches (1-11 scores per judge), duplicate submission (prj_07/prj_41), duplicate team names, empty comments, uneven review counts (2-5 per project).

---

## Acceptance Suite Checks

These are the 7 HTTP requests `run.py` makes:

| # | Tier | Check                          | Method | Auth        | Expected |
|---|------|--------------------------------|--------|-------------|----------|
| 1 | T1   | Gallery is public              | GET    | none        | 200      |
| 2 | T1   | Project from fixtures shown    | GET    | none        | body contains fixture title |
| 3 | T1   | Closed event refuses submissions | POST | participant | 4xx      |
| 4 | T2   | Judge sees own scores          | GET    | judge_a     | 200      |
| 5 | T2   | Judge cannot see peer scores   | GET    | judge_b     | 401/403  |
| 6 | T2   | Participant blocked            | GET    | participant | 401/403  |
| 7 | T2   | CSV export works               | GET    | organizer   | 200 + CSV |

---

## Bonus Targets (if time permits)

Note that per the spec, bonus points do not add to the actual score; they are only used to break ties and decide the Best Judging Engine prize.

- Normalization Proof (+5): We are building the normalization anyway for T2. The bonus is strong documentation with worked examples showing raw vs normalized rankings. We have already computed this from the fixture data.
- Threat Model (+3): A written document covering Sybil votes, ballot stuffing, submission scraping, judge collusion, deadline gaming. No extra code needed but requires genuine thought.
