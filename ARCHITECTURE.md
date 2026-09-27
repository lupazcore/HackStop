# ARCHITECTURE

## Current delivery: T1–T3

Authentication, events, teams, submissions, the public gallery, and T2 judging are implemented. All judging tables are in the first migration. Fixture assignments and scores are imported on boot; organizers calculate results on demand or by exporting CSV.

Authorization is resolved directly in protected route handlers with `getSession()` and `requireRole()`. No client-supplied identity headers or Edge middleware are trusted. Ownership helpers filter organizer reads by `organizer_id` and participant queries by authenticated team membership. `requireSelf()` provides the identity comparison for T2 to extend. Admin has organizer event API access but no dedicated UI. Serializable transactions protect team capacity, one-team-per-event membership, and duplicate project creation.

T3 adds event voting windows, per-user votes, comments, and an organizer/admin audit log in a second migration. Vote and comment writes lock the authenticated account row while checking the database's rolling hourly count, then insert the action and audit record in one transaction. The vote table has a unique user-project pair. Ballot order is derived from the active session ID, so it survives refreshes without a cache or stored shuffle. Result reads preserve T2 ownership and return an unavailable response to nonorganizers during voting.

Environment setup generates credentials and all ports/URLs come from `.env`. Once images are prepared, Compose starts the two services offline, deploys migrations, idempotently seeds fixtures, and prints all four acceptance session headers on each startup. See README.md for actual commands, dependency versions, and approved schema clarifications.

HackStop is a self-hostable hackathon submission and judging platform. One command starts it. One command seeds it. It runs on a laptop with the network off.

This document explains what we are building, how the pieces connect, and why we made these design decisions.

---

## System Overview

HackStop is a monolithic Next.js application backed by PostgreSQL. The frontend and backend live in a single TypeScript codebase. A Docker Compose file wires the two containers together and runs a seed script on first boot.

```
                 +-------------------+
                 |    Browser        |
                 +--------+----------+
                          |
                    HTTP / HTTPS
                          |
                 +--------v----------+
                 |   Next.js App     |
                 |                   |
                 |  - Pages / UI     |
                 |  - API Routes     |
                 |  - Auth Middleware |
                 +--------+----------+
                          |
                     Prisma ORM
                          |
                 +--------v----------+
                 |   PostgreSQL      |
                 |   (Docker)        |
                 +-------------------+
```

There are exactly two containers in the Compose stack:

1. **app** -- the Next.js server, built from a multi-stage Dockerfile. Serves both the UI and the API on port 8080. Runs the seed script at startup if the database is empty.

2. **db** -- a stock PostgreSQL 16 image with a named volume for persistence. No extensions, no custom configuration.

We are choosing this shape because a monolith is the fastest thing to ship in 72 hours, the easiest thing for a judge to start, and the simplest thing for Hackathon Raptors to adopt on Monday. There is no service mesh, no message queue, no cache layer. The only moving parts are a web server and a database.

---

## Tech Stack

| Layer         | Choice          | Reasoning                                                |
|---------------|-----------------|----------------------------------------------------------|
| Language      | TypeScript      | One language across frontend and backend. AI tools generate fewer bugs in a single-language stack. |
| Framework     | Next.js (App Router) | Server-side rendering, API routes, and static pages in one framework. No separate backend server to configure. |
| Database      | PostgreSQL 16   | Production-grade relational database. Runs in Docker with zero configuration. Handles the relational model for events, teams, submissions, scores, and role isolation without reaching for anything exotic. |
| ORM           | Prisma          | Type-safe queries derived from the schema. Migrations are deterministic and reviewable. The generated client catches shape mismatches at compile time rather than at runtime. |
| Styling       | Tailwind CSS    | Utility classes, no build-time CSS extraction surprises. Fast to iterate on and well-understood by AI tooling. |
| Auth          | Custom sessions | No third-party auth provider. Sessions are stored server-side. Cookies carry a session token. This satisfies the offline constraint and the acceptance suite's header-based auth checks. |
| Containers    | Docker Compose  | The mandatory delivery mechanism. One `docker compose up` starts everything. |

We are locking the stack before kickoff and will not change it. The presentation plan considered alternatives, but once we committed to Next.js + Prisma + PostgreSQL we are staying there. Switching mid-hackathon is how teams lose a day.

---

## Directory Layout

```
hackstop/
  README.md
  ARCHITECTURE.md
  DATA-MODEL.md
  JUDGING.md
  LICENSE
  .dogfood.toml
  acceptance-report.txt
  docker-compose.yml
  Dockerfile
  src/
    app/
      layout.tsx
      page.tsx
      (auth)/
        login/
          page.tsx
        register/
          page.tsx
      (dashboard)/
        organizer/
          events/
            page.tsx
            [eventId]/
              page.tsx
              rubric/
                page.tsx
              judges/
                page.tsx
              progress/
                page.tsx
              results/
                page.tsx
        judge/
          assignments/
            page.tsx
          scoring/
            [projectId]/
              page.tsx
        participant/
          teams/
            page.tsx
          submissions/
            page.tsx
            new/
              page.tsx
            [submissionId]/
              edit/
                page.tsx
      projects/
        page.tsx
        [projectId]/
          page.tsx
      api/
        auth/
          login/
            route.ts
          logout/
            route.ts
          register/
            route.ts
        events/
          route.ts
          [eventId]/
            route.ts
        teams/
          route.ts
          [teamId]/
            route.ts
            invite/
              route.ts
        projects/
          route.ts
          new/
            route.ts
          [projectId]/
            route.ts
        judge/
          assignments/
            route.ts
          scores/
            route.ts
        organizer/
          rubric/
            route.ts
          progress/
            route.ts
          results/
            route.ts
        export.csv/
          route.ts
    lib/
      db.ts
      auth.ts
      session.ts
      permissions.ts
      normalization.ts
      seed.ts
      fixtures.ts
    components/
      ui/
      forms/
      layout/
    middleware.ts
  prisma/
    schema.prisma
    migrations/
    seed.ts
  tests/
  docs/
    AGENTS.md
    DESIGN_SYSTEM.md
    fixtures.json
    PRD.md
    run.py
    spec.md
```

We are following the submission layout specified by the organizers exactly. The required files sit at the repo root. Source code lives under `src/`. Test files live under `tests/`. The fixture data lives under `docs/` and is copied into the Docker image at build time.

---

## Authentication and Sessions

We are building session-based authentication from scratch. No NextAuth, no Clerk, no external provider.

**How it works:**

1. A user registers or logs in via the API. The server validates credentials against a bcrypt hash stored in the database.

2. On success, the server creates a session record in the `Session` table with a cryptographically random token and an expiry timestamp.

3. The token is sent back as a `Set-Cookie` header. The cookie is `HttpOnly`, `SameSite=Lax`, and `Path=/`.

4. Every subsequent request carries the cookie. The middleware reads the token, looks up the session in the database, and attaches the user and their role to the request context. Expired sessions are rejected.

5. Logout deletes the session record.

**Why we did it this way:**

The acceptance suite does not log in. It sends a raw `Cookie: session=<token>` header and expects the backend to recognize it. This means the auth system must work with a static token that can be handed out at seed time. We generate deterministic session tokens during the seed step so the `.dogfood.toml` can reference them.

The four seeded sessions are:

| Role        | Token             | Purpose                             |
|-------------|-------------------|-------------------------------------|
| Organizer   | `org_<hash>`      | Full access. Manages events, judges, rubrics, exports. |
| Judge A     | `jdg_a_<hash>`    | Scores assigned projects. Cannot see other judges. |
| Judge B     | `jdg_b_<hash>`    | Second judge for the peer-score isolation check. |
| Participant | `prt_<hash>`      | Submits projects. Cannot access judging routes. |

---

## Role Model and Permission Enforcement

There are five roles: **visitor** (unauthenticated), **participant**, **judge**, **organizer**, and **admin**. The permission model is enforced entirely in the backend. No route relies on the frontend hiding a button.

### The permission matrix

| Actor       | Own scores | Peer scores | Other track | Aggregate | Audit log |
|-------------|------------|-------------|-------------|-----------|-----------|
| Visitor     | denied     | denied      | denied      | denied    | denied    |
| Participant | denied     | denied      | denied      | denied    | denied    |
| Judge       | allowed    | denied      | denied      | denied    | denied    |
| Organizer   | allowed    | allowed     | allowed     | allowed   | allowed   |
| Admin       | allowed    | allowed     | allowed     | allowed   | allowed   |

### Where enforcement lives

Every API route handler begins by resolving the session and checking the role. The check lives in a shared `permissions.ts` module that exposes functions like `requireRole(context, "organizer")` and `requireSelf(context, judgeId)`. If the check fails, the handler returns `401` (no session) or `403` (wrong role) before touching any data.

We are not using Next.js middleware alone for this. Middleware runs on the Edge runtime and cannot query the database directly in all deployment modes. The role check is duplicated in each API route handler to guarantee it survives regardless of how Next.js routes the request.

The acceptance suite tests this directly. It sends a request for Judge A's scores using Judge B's session token and expects `401` or `403`. If the backend returns `200`, the check is decorative and the test fails. We are building the check into the query layer: the scores query always filters by the authenticated judge's ID, so even if the route somehow skips the permission check, the query itself returns nothing belonging to another judge.

---

## Request Flow

A typical request moves through four stages:

```
Browser/Checker --> Middleware --> API Route Handler --> Database
                                       |
                                       v
                                 Permission Check
                                       |
                                       v
                                 Business Logic
                                       |
                                       v
                                 Prisma Query
                                       |
                                       v
                                  Response
```

1. **Middleware** (`src/middleware.ts`): Reads the session cookie, attaches the user to the request headers. Does not block requests to public routes like the gallery.

2. **Route handler**: Reads the user from the request. Calls the permission module. Returns early with `4xx` if the caller lacks access.

3. **Business logic**: Validates input, applies domain rules (deadline checks, assignment constraints, deduplication).

4. **Prisma query**: Reads or writes to PostgreSQL through the generated client.

For public routes like the project gallery, step 2 is skipped. The gallery is readable by visitors with no authentication header, which is the first thing the acceptance suite checks.

---

## Event Lifecycle

The platform models one complete event lifecycle:

```
Create Event --> Configure Tracks & Prizes
    |
    v
Set Rubric (criteria + weights)
    |
    v
Open Submissions --> Teams form via invite links
    |                     |
    v                     v
Projects submitted  Members join teams
(draft -> final)
    |
    v
Submission Deadline (hard cutoff)
    |
    v
Assign Judges --> Judges score projects
    |
    v
Normalization runs
    |
    v
Organizer reviews rankings --> CSV export available
```

### Deadline enforcement

The event record stores a `submissions_close` timestamp in UTC. When a participant POSTs a new submission or PUTs an edit, the handler compares the current server time against this timestamp. If the deadline has passed, the handler returns `403` with a message. The fixture event's close date is `2026-03-01T18:00:00Z`, which is in the past, so the acceptance suite's late-submission probe is automatically refused.

We use the fixture's own close date rather than inventing our own. The spec says this explicitly: seed with the fixture's close date and the check passes on the first try.

### Submission fields

Every project stores the fields confirmed as standard across the industry by the organizers' own research:

- Name, tagline, long description
- Thumbnail, image gallery
- Hosted demo video URL, repository URL, live link
- Tech tags, track assignment
- Organizer-defined custom question answers
- Status (draft or submitted)
- Submission timestamp

A project in draft status can be edited. Once submitted, it can still be edited until the deadline. After the deadline, no changes are accepted.

---

## Judging System

The judging system is the core of the platform and the largest source of score weight (Judging Integrity at 25% plus the judging-related portion of Tier Completion at 40%).

### Judge assignment

Judges are assigned to projects within their designated tracks. The assignment can be done in two modes:

1. **Batch assignment**: The organizer manually assigns a batch of projects to a judge.

2. **Algorithmic assignment**: The system distributes projects across available judges for a track, balancing load so each judge reviews approximately the same number of projects. The algorithm prioritizes coverage (every project gets at least N reviews) over uniformity.

Judges only see projects in their assigned tracks. A judge assigned to "Security" never sees "Education" projects, even if they visit the URL directly. This is enforced at the query level: the Prisma query joins through the assignment table, so unassigned projects are invisible.

### Scoring rubric

The organizer configures a rubric per event. A rubric is a list of criteria, each with a name and a weight. The fixture data uses three criteria (functionality, quality, innovation), but the platform supports any number with any weight distribution.

When a judge scores a project, they provide a score for each criterion. The scale is configurable by the organizer. Raw scores are stored as-is in the `Score` table alongside the judge ID, project ID, and an optional comment.

### Cross-judge normalization

Raw scores are not directly comparable across judges. A harsh judge who gives mostly 2s and a generous judge who gives mostly 5s are both providing useful signal, but averaging their raw numbers penalizes projects assigned to the harsh judge.

We use z-score normalization per judge, per criterion:

```
z = (raw_score - judge_mean) / judge_stddev
```

For each criterion, we compute the mean and standard deviation of all scores that judge has given for that criterion. Each raw score is converted to a z-score representing how far above or below that judge's personal average the score falls.

The normalized score for a project on a given criterion is the average of the z-scores from all judges who scored it on that criterion.

The final project score is the weighted sum of the normalized per-criterion scores, using the rubric weights.

**Edge cases in the fixture data that we handle:**

1. **Constant judge (zero variance)**: `jdg_01` gave 2 on every criterion in one review. `jdg_07` gave 4 on every criterion in three reviews. Sample standard deviation is undefined or zero, so these distributions contribute z=0. Raw scores remain unchanged in storage; JUDGING.md reports the fixture impact.

2. **Incomplete batches**: Not every judge finished scoring all assigned projects. The fixture data shows judges with as few as 1 score entry and as many as 11. We compute statistics only over the scores a judge actually submitted. Missing scores are not imputed.

3. **Duplicate submission**: Team `tm_07` submitted the same project twice (`prj_07` and `prj_41`, both titled "Dry Harbour" in track Accessibility). The seed script detects duplicate submissions from the same team and flags the later one. Scores for both entries are preserved, but only the earlier submission is counted in rankings.

4. **Uneven review counts**: Projects have between 2 and 5 reviews each. Normalization handles this naturally since z-scores are comparable regardless of sample size, but we document the review count alongside each project's final score so the organizer can see which results rest on thin evidence.

The full normalization method, with worked examples from the fixture data, is documented in JUDGING.md.

---

## Fixture Seeding

The seed script (`prisma/seed.ts`) runs automatically when the app container starts and the database is empty. It performs the following steps in order:

1. Read `fixtures.json` from the data directory.
2. Create the event record with the fixture's close date.
3. Create all tracks.
4. Create user accounts for all judges, team members, and a default organizer and admin. Passwords are set to deterministic values for development.
5. Create all teams and team memberships.
6. Create all projects with their submission timestamps.
7. Create rubric criteria (functionality, quality, innovation) with equal weights.
8. Create judge-to-track assignments based on the fixture's `tracks` array per judge.
9. Create all score records.
10. Detect and flag the duplicate submission.
11. Generate four deterministic session tokens for the acceptance suite roles.
12. Print the session tokens to stdout.

The printed output matches the format the spec expects:

```
seeded. test logins:
  organizer    Cookie: session=org_<hash>
  judge_a      Cookie: session=jdg_a_<hash>
  judge_b      Cookie: session=jdg_b_<hash>
  participant  Cookie: session=prt_<hash>
```

These tokens go directly into `.dogfood.toml`.

---

## The Acceptance Suite Contract

The acceptance suite (`run.py`) makes seven HTTP requests against the running portal. Our API routes are named to match what we declare in `.dogfood.toml`:

| Route key      | Our path                         | Method | Auth          | Expected |
|----------------|----------------------------------|--------|---------------|----------|
| gallery        | `/projects`                      | GET    | none          | 200      |
| gallery        | `/projects`                      | GET    | none          | body contains fixture title |
| submit         | `/projects/new`                  | POST   | participant   | 4xx      |
| judge_scores   | `/api/judge/scores`              | GET    | judge_a       | 200      |
| peer_scores    | `/api/judge/scores?judge=<id>`   | GET    | judge_b       | 401/403  |
| judge_scores   | `/api/judge/scores`              | GET    | participant   | 401/403  |
| csv_export     | `/api/export.csv`                | GET    | organizer     | 200 + CSV |

Every route is designed to be tested against the acceptance suite before submission. The suite does not inspect HTML structure, CSS, framework choice, or database schema. It only cares about HTTP status codes and, in two cases, response body content (a fixture project title in the gallery, and a comma in the first line of the CSV export).

---

## CSV Export

The organizer can export results as CSV at any stage of the workflow. The export endpoint (`/api/export.csv`) calculates missing results and returns a CSV header plus one row per ranked, non-duplicate project. The columns include:

- Project ID, title, team name, track
- Raw averages per criterion from `NormalizedResult`
- Normalized scores per criterion
- Weighted final score
- Rank

The first line of the response body is a comma-separated header row. The acceptance suite checks for `status 200` and a comma in the first line.

---

## Public Gallery

The gallery at `/projects` is the only public-facing page that requires no authentication. It renders all submitted projects with search and filtering by track, team name, and tech tags.

The acceptance suite makes two checks against this route:

1. An unauthenticated GET returns `200`.
2. The response body contains the title of at least one fixture project.

We render project titles in plain text in the HTML so the title-matching check works regardless of how the rest of the page is structured.

---

## Docker and Deployment

### docker-compose.yml

The Compose file defines two services:

- **db**: PostgreSQL 16, exposed on port 5432 internally. Data is persisted in a named volume. No custom `postgresql.conf`. Environment variables set the database name, user, and password.

- **app**: Built from the project Dockerfile. Depends on `db`. Exposes port 8080. The entrypoint runs Prisma migrations, then the seed script (if needed), then starts the Next.js production server.

### Dockerfile

Multi-stage build:

1. **deps stage**: Installs Node.js dependencies from the lockfile.
2. **build stage**: Generates the Prisma client, builds the Next.js production bundle.
3. **run stage**: Copies only the production artifacts and the Prisma client. Runs as a non-root user. Exposes port 8080.

### Offline operation

The Docker image is self-contained. No `npm install` runs at container startup. No external CDN is referenced. All static assets are bundled. The only network traffic is between the app container and the db container on the Docker bridge network.

This is intended to be tested with the host network adapter disabled before submission. `docker compose up` works identically.

---

## How We Split the Work

We are a two-person team: Harsh and Saransh. We both have college during the day, so we work in relay shifts.

Harsh works at night and into the morning. Saransh picks up in the evening and works through the night. When Harsh wakes up, he continues from where Saransh left off. There is always forward progress and there is always someone who can explain what changed in the last shift.

We do not split the work as frontend versus backend. Each person owns a vertical slice of features end-to-end:

**Harsh owns:**
- Auth, roles, and permission enforcement
- Team formation and invite links
- Judge assignment logic
- Rubric configuration
- ARCHITECTURE.md, DATA-MODEL.md

**Saransh owns:**
- Project submission flow (draft, edit, deadline lock)
- Public gallery and search
- Scoring UI and judge dashboard
- Normalization math and CSV export
- JUDGING.md, README.md

Both of us review each other's code. Both of us can explain any part of the system. The vertical split means each person will build something that works alone, test it, and integrate it. The horizontal handoff happens at the data layer, where Prisma's typed client makes mismatches visible at compile time.

---

## AI Tooling

We are using Antigravity with Opus 4.6 and Gemini 3.1 Pro as our primary development tools. AI is intended to generate the majority of the code. We will test, review, catch bugs, and direct what to build next.

This is explicitly allowed and expected by the rules. The organizers stated it directly: they do not score whether AI was used, they score whether the result works, whether the architecture is sound, and whether the team can explain and defend the software in writing.

Every time the AI produced a module, we asked it to explain the design in plain language. Those explanations will become the foundation of this document and the other required documentation files.

---

## What We Will Not Build

T1 and T2 passed the seven acceptance checks before T3 began. T3 community voting, comments, and audit logging are implemented. T4 (public API, webhooks, certificates, and embeddable widget) remains outside this delivery.

The spec is explicit that a clean T2 beats a broken T4. We are taking that at face value.

We also did not build:

- A separate admin panel beyond the organizer dashboard
- Email notifications
- Real-time updates via WebSockets
- Multi-event support beyond what the fixture data requires
- File upload for project thumbnails and image galleries (we store URLs, not files)

These are real features a production platform would need. We do not need them to pass the acceptance suite or to demonstrate a correct T1 + T2 implementation in 72 hours.

---

## Decisions Worth Defending

**Why a monolith instead of microservices.** Seventy-two hours. One command to start. Two people. A monolith ships faster, deploys simpler, and breaks in fewer ways. If Hackathon Raptors adopts this, they can extract services later when they have a reason to. They will not have a reason to at the scale of a dozen events per year.

**Why PostgreSQL instead of SQLite.** SQLite would be simpler for a single-container deployment. We are choosing PostgreSQL because the data model has enough foreign keys and relational constraints that a real database engine earns its keep. PostgreSQL also handles concurrent writes from multiple judges scoring simultaneously, which SQLite handles less gracefully under WAL mode.

**Why custom auth instead of NextAuth.** NextAuth adds a dependency on configuration patterns and provider abstractions we do not need. Our auth is a session table and a cookie. The acceptance suite needs deterministic tokens generated at seed time. NextAuth's session management would have fought us on this.

**Why Prisma instead of raw SQL.** Type safety. The schema is the single source of truth for both the database and the TypeScript types. When we change a column, every query that touches it fails to compile until we fix it. In a 72-hour sprint with two people and AI-generated code, that compile-time safety net catches mistakes before they reach the acceptance suite.

**Why we store URLs for media instead of files.** The spec lists image gallery and demo video as submission fields. Every platform the organizers studied stores URLs, not uploads. Hosting uploaded files requires either a blob store or a filesystem mount, both of which complicate the Docker setup for zero benefit in the acceptance suite. The fixture data has `repo_url` fields, not file payloads.

---

## Verification

The build can be verified in three ways:

1. **Acceptance suite**: `python3 run.py .dogfood.toml` against the running portal. This is designed to pass all seven acceptance suite checks. The output will be committed as `acceptance-report.txt`.

2. **Manual testing**: Every role (visitor, participant, judge, organizer) should be tested through the full workflow: browse gallery, attempt submission after deadline, score a project, view own scores, attempt to view another judge's scores, export CSV.

3. **Offline test**: `docker compose up` with the network adapter disabled on the host machine. The portal should start, seed, and serve requests.
