# DATA MODEL

## T1 implementation clarifications

The initial migration adds `Event.organizer_id` (required User foreign key), `Event.prizes` (JSONB list of display strings), and `Event.custom_questions` (JSONB list of `{id, label, required}` definitions). These additions were explicitly approved to support event ownership and the specified T1 fields. `User.external_id` maps fixture judge IDs. `Score` also references `JudgeAssignment` through its existing `(judge_id, project_id)` columns.

The normalized table is named `NormalizedResult`, as approved. Rubric weights remain DECIMAL(5,2) but store relative values; the equal fixture weights are 1, 1, 1. T2 must divide each weight by the sum before use. This resolves the conflict between two decimal places and exact thirds without another migration.

All tables and fixture records are present in T1. Judging routes, calculations, and interfaces below describe the later T2 phase, not implemented T1 functionality.

This document describes every table in the database, how they relate to each other, and how data moves in and out of the platform.

The schema is defined in `prisma/schema.prisma`. Prisma generates the migration files and the TypeScript client from that single source of truth.

---

## Entity Relationship Diagram

```
User 1---* Session
User 1---* TeamMember *---1 Team
Team 1---* Project *---1 Track
Event 1---* Track
Event 1---1 Rubric 1---* RubricCriterion
Judge (User) *---* Track  (via JudgeTrackAssignment)
Judge (User) *---* Project (via JudgeAssignment)
JudgeAssignment 1---* Score
Score *---1 RubricCriterion
Project 1---* Score
Project 1---0..1 NormalizedResult
```

---

## Tables

### User

Stores every person who interacts with the platform. Roles are stored directly on the user record rather than in a join table because the role model is flat and a user holds exactly one role at a time.

| Column        | Type         | Constraints            | Notes                                     |
|---------------|--------------|------------------------|--------------------------------------------|
| id            | UUID         | PK, generated          |                                            |
| email         | VARCHAR(255) | UNIQUE, NOT NULL       | Used as login identifier                   |
| password_hash | VARCHAR(255) | NOT NULL               | bcrypt hash                                |
| name          | VARCHAR(255) | NOT NULL               |                                            |
| role          | ENUM         | NOT NULL               | One of: participant, judge, organizer, admin |
| created_at    | TIMESTAMPTZ  | NOT NULL, default now  |                                            |

We store the role as an enum rather than a string to prevent typos and make permission checks a type-safe comparison. The enum values map directly to the five-role model in the spec (visitor is the absence of a user record, not a stored role).

---

### Session

Server-side session store. Each row represents one active login.

| Column     | Type         | Constraints           | Notes                                |
|------------|--------------|------------------------|---------------------------------------|
| id         | UUID         | PK, generated          |                                       |
| token      | VARCHAR(255) | UNIQUE, NOT NULL       | Random hex string, sent as cookie     |
| user_id    | UUID         | FK -> User.id, NOT NULL|                                       |
| expires_at | TIMESTAMPTZ  | NOT NULL               | Requests after this time are rejected |
| created_at | TIMESTAMPTZ  | NOT NULL, default now  |                                       |

The seed script creates four sessions with deterministic tokens so the acceptance suite can authenticate without logging in. Expired sessions are cleaned up on a best-effort basis; the auth middleware rejects them regardless.

---

### Event

The top-level entity. Everything else hangs off an event.

| Column            | Type         | Constraints           | Notes                                  |
|-------------------|--------------|-----------------------|-----------------------------------------|
| id                | UUID         | PK, generated         |                                         |
| external_id       | VARCHAR(50)  | UNIQUE                | Maps to fixture IDs like `evt_01`       |
| name              | VARCHAR(255) | NOT NULL              |                                         |
| submissions_open  | TIMESTAMPTZ  |                       | Optional. Before this time, submissions are rejected. |
| submissions_close | TIMESTAMPTZ  | NOT NULL              | After this time, all submission endpoints return 403. |
| judging_open      | TIMESTAMPTZ  |                       |                                         |
| judging_close     | TIMESTAMPTZ  |                       |                                         |
| created_at        | TIMESTAMPTZ  | NOT NULL, default now |                                         |

The `submissions_close` field drives deadline enforcement. The fixture sets this to `2026-03-01T18:00:00Z`, which is in the past, so the acceptance suite's late-submission check passes without any clock manipulation.

We keep an `external_id` column on this table and on every other table that maps to a fixture record. This lets the seed script use the fixture's own IDs (`evt_01`, `trk_01`, etc.) for lookups during seeding and for debugging, while the actual primary keys are UUIDs generated by the database.

---

### Track

A category within an event. Projects belong to one track. Judges are assigned to one or more tracks.

| Column      | Type         | Constraints                      | Notes                    |
|-------------|--------------|----------------------------------|--------------------------|
| id          | UUID         | PK, generated                    |                          |
| external_id | VARCHAR(50)  | UNIQUE                           | e.g. `trk_01`           |
| event_id    | UUID         | FK -> Event.id, NOT NULL         |                          |
| name        | VARCHAR(255) | NOT NULL                         |                          |

The fixture data contains 8 tracks: Developer tools, Data and analytics, Accessibility, Security, Climate, Health, Education, Open hardware.

---

### Team

A group of participants. Teams belong to an event and are formed through invite links.

| Column      | Type         | Constraints                      | Notes                    |
|-------------|--------------|----------------------------------|--------------------------|
| id          | UUID         | PK, generated                    |                          |
| external_id | VARCHAR(50)  | UNIQUE                           | e.g. `tm_01`            |
| event_id    | UUID         | FK -> Event.id, NOT NULL         |                          |
| name        | VARCHAR(255) | NOT NULL                         |                          |
| invite_code | VARCHAR(50)  | UNIQUE, NOT NULL                 | Generated at creation    |
| created_at  | TIMESTAMPTZ  | NOT NULL, default now            |                          |

The invite code is a short random string. Anyone with the code can join the team via a `/teams/{teamId}/invite` endpoint, up to a maximum of 4 members.

Note from the fixture data: team names are not unique. There are two teams named "StillTrail" (`tm_03`, `tm_30`, `tm_40`), two named "OpenSignal" (`tm_11`, `tm_16`), and two named "AmberSwitch" (`tm_05`, `tm_34`). We do not enforce uniqueness on team names.

---

### TeamMember

Join table between User and Team.

| Column  | Type | Constraints                               | Notes |
|---------|------|-------------------------------------------|-------|
| id      | UUID | PK, generated                             |       |
| team_id | UUID | FK -> Team.id, NOT NULL                   |       |
| user_id | UUID | FK -> User.id, NOT NULL                   |       |
| role    | ENUM | NOT NULL, default 'member'                | One of: leader, member |

Composite unique constraint on `(team_id, user_id)`. A user can only belong to one team per event, enforced at the application layer.

---

### Project

A hackathon submission. The field set matches the industry standard identified by the organizers across Devpost, Devfolio, and other platforms.

| Column          | Type          | Constraints                      | Notes                                   |
|-----------------|---------------|----------------------------------|-----------------------------------------|
| id              | UUID          | PK, generated                    |                                         |
| external_id     | VARCHAR(50)   | UNIQUE                           | e.g. `prj_01`                           |
| team_id         | UUID          | FK -> Team.id, NOT NULL          |                                         |
| track_id        | UUID          | FK -> Track.id, NOT NULL         |                                         |
| title           | VARCHAR(255)  | NOT NULL                         |                                         |
| tagline         | VARCHAR(500)  |                                  |                                         |
| summary         | TEXT          |                                  | Called `summary` in fixtures, maps to long description |
| thumbnail_url   | VARCHAR(2048) |                                  | URL, not a file upload                  |
| image_urls      | JSONB         |                                  | Array of URL strings                    |
| demo_video_url  | VARCHAR(2048) |                                  |                                         |
| repo_url        | VARCHAR(2048) |                                  |                                         |
| live_url        | VARCHAR(2048) |                                  |                                         |
| tech_tags       | JSONB         |                                  | Array of strings                        |
| custom_answers  | JSONB         |                                  | Key-value pairs for organizer-defined questions |
| status          | ENUM          | NOT NULL, default 'draft'        | One of: draft, submitted                |
| is_duplicate    | BOOLEAN       | NOT NULL, default false          | Flagged by seed script or organizer     |
| submitted_at    | TIMESTAMPTZ   |                                  | Set when status changes to submitted    |
| created_at      | TIMESTAMPTZ   | NOT NULL, default now            |                                         |
| updated_at      | TIMESTAMPTZ   | NOT NULL, auto-updated           |                                         |

We will use JSONB columns for `image_urls`, `tech_tags`, and `custom_answers` because these are variable-length lists that do not benefit from normalization into separate tables. PostgreSQL's JSONB indexing is sufficient for the query patterns we need (filtering by tech tag in the gallery).

The `is_duplicate` flag handles the edge case in the fixture data where team `tm_07` submitted the same project twice (`prj_07` and `prj_41`, both titled "Dry Harbour"). The seed script flags `prj_41` as a duplicate. Duplicate projects are visible in the gallery but excluded from ranking calculations.

---

### Rubric

One rubric per event. Defines how projects are scored.

| Column   | Type | Constraints                      | Notes                    |
|----------|------|----------------------------------|--------------------------|
| id       | UUID | PK, generated                    |                          |
| event_id | UUID | FK -> Event.id, UNIQUE, NOT NULL | One rubric per event     |
| name     | VARCHAR(255) | NOT NULL               | e.g. "Default Rubric"   |

---

### RubricCriterion

Individual scoring criteria within a rubric. Each criterion has a name, a weight, and a maximum score.

| Column    | Type          | Constraints                      | Notes                       |
|-----------|---------------|----------------------------------|-----------------------------|
| id        | UUID          | PK, generated                    |                             |
| rubric_id | UUID          | FK -> Rubric.id, NOT NULL        |                             |
| name      | VARCHAR(255)  | NOT NULL                         | e.g. "functionality"        |
| weight    | DECIMAL(5,2)  | NOT NULL                         | e.g. 0.33 for equal weight  |
| max_score | INTEGER       | NOT NULL, default 5              |                             |
| sort_order| INTEGER       | NOT NULL                         | Display ordering            |

The fixture data uses three criteria: `functionality`, `quality`, `innovation`. We seed them with equal weights (1/3 each). The organizer can change the weights and add or remove criteria through the rubric configuration interface.

Composite unique constraint on `(rubric_id, name)`.

---

### JudgeTrackAssignment

Maps judges to the tracks they are qualified to evaluate.

| Column   | Type | Constraints                                 | Notes          |
|----------|------|---------------------------------------------|----------------|
| id       | UUID | PK, generated                               |                |
| judge_id | UUID | FK -> User.id, NOT NULL                     | Must have role = judge |
| track_id | UUID | FK -> Track.id, NOT NULL                    |                |

Composite unique constraint on `(judge_id, track_id)`.

The fixture data assigns each judge to 1-2 tracks. Some tracks have many judges (Security has 7 judges: `jdg_02`, `jdg_03`, `jdg_08`, `jdg_10`, `jdg_13`, `jdg_20`, `jdg_23`, `jdg_28`). Some tracks have few (Climate has 4: `jdg_03`, `jdg_05`, `jdg_06`, `jdg_11`, `jdg_17`). The assignment algorithm accounts for this imbalance.

---

### JudgeAssignment

Maps individual judges to individual projects they should score.

| Column     | Type | Constraints                                | Notes               |
|------------|------|--------------------------------------------|----------------------|
| id         | UUID | PK, generated                              |                      |
| judge_id   | UUID | FK -> User.id, NOT NULL                    | Must have role = judge |
| project_id | UUID | FK -> Project.id, NOT NULL                 |                      |
| status     | ENUM | NOT NULL, default 'pending'                | One of: pending, in_progress, completed |
| assigned_at| TIMESTAMPTZ | NOT NULL, default now               |                      |

Composite unique constraint on `(judge_id, project_id)`.

This table is the backbone of judge isolation. When a judge requests their assigned projects, the query joins through this table. Projects not in this table are invisible to that judge. When a judge requests scores, the query filters by `judge_id` on the assignment. There is no path through the data layer that returns another judge's assignments.

---

### Score

One row per judge per project per criterion. This is the raw score before normalization.

| Column       | Type          | Constraints                             | Notes               |
|--------------|---------------|-----------------------------------------|----------------------|
| id           | UUID          | PK, generated                           |                      |
| judge_id     | UUID          | FK -> User.id, NOT NULL                 |                      |
| project_id   | UUID          | FK -> Project.id, NOT NULL              |                      |
| criterion_id | UUID          | FK -> RubricCriterion.id, NOT NULL      |                      |
| value        | INTEGER       | NOT NULL                                | Raw score, 1 to max_score |
| comment      | TEXT          |                                         | Optional judge comment |
| created_at   | TIMESTAMPTZ   | NOT NULL, default now                   |                      |
| updated_at   | TIMESTAMPTZ   | NOT NULL, auto-updated                  |                      |

Composite unique constraint on `(judge_id, project_id, criterion_id)`. This prevents a judge from submitting multiple scores for the same criterion on the same project.

The fixture data stores scores as a flat `criteria` object per judge-project pair. During seeding, we expand each fixture score entry into one row per criterion. For example, a fixture entry with `{"functionality": 4, "quality": 5, "innovation": 3}` becomes three rows in this table.

The fixture data contains 126 score entries across 30 judges and 41 projects. The number of scores per project ranges from 2 to 5. The number of scores per judge ranges from 1 to 11. These asymmetries are intentional and the normalization logic handles them.

---

### NormalizedResult

Precomputed normalized scores and final rankings. Populated when the organizer triggers normalization or when results are published.

| Column              | Type          | Constraints                      | Notes                            |
|---------------------|---------------|----------------------------------|----------------------------------|
| id                  | UUID          | PK, generated                    |                                  |
| project_id          | UUID          | FK -> Project.id, UNIQUE, NOT NULL |                                |
| criterion_scores    | JSONB         | NOT NULL                         | Map of criterion name to normalized score |
| weighted_total      | DECIMAL(10,6) | NOT NULL                         | Final weighted score             |
| rank                | INTEGER       |                                  | Position in final ranking        |
| review_count        | INTEGER       | NOT NULL                         | Number of judges who scored this project |
| raw_avg             | JSONB         |                                  | Map of criterion name to raw average (for comparison) |
| computed_at         | TIMESTAMPTZ   | NOT NULL, default now            |                                  |

We store the normalized results in a separate table rather than computing them on every request for two reasons. First, normalization depends on all judges' scores, so recomputing it on every page load would query the entire score table. Second, the organizer needs to be able to review and approve results before publishing them.

The `criterion_scores` JSONB column stores the per-criterion normalized score so the organizer can see how a project performed on each dimension, not just the final number. The `raw_avg` column stores the raw average for comparison in the normalization proof.

---

## Fixture Data Profile

The fixture file (`fixtures.json`) contains a single JSON object with six top-level keys. Here is how each maps to our schema:

| Fixture key | Record count | Maps to table(s)             |
|-------------|--------------|------------------------------|
| event       | 1            | Event                        |
| tracks      | 8            | Track                        |
| judges      | 30           | User (role=judge), JudgeTrackAssignment |
| teams       | 40           | Team, User (role=participant), TeamMember |
| projects    | 41           | Project                      |
| scores      | 126          | Score (expanded to 378 rows: 126 entries x 3 criteria each) |

### Edge cases embedded in the fixture data

**Duplicate submission.** Team `tm_07` has two project entries: `prj_07` and `prj_41`. Both are titled "Dry Harbour", both are in track Accessibility, and they share the same repo URL. `prj_41` was submitted later (17:57 UTC vs 04:29 UTC on March 1). We flag `prj_41` as a duplicate during seeding. Both projects have scores (`prj_07` has 5 reviews, `prj_41` has 4 reviews), so we preserve the score data but exclude the duplicate from rankings.

**Constant-score judges.** `jdg_01` scored one project and gave 2 on every criterion. `jdg_07` scored three projects and gave 4 on every criterion. Both have zero variance across their scores. The normalization formula divides by standard deviation, which is zero for these judges. We handle this by assigning a z-score of 0 for constant judges, which means their scores contribute no relative signal to the ranking. This is documented in JUDGING.md.

**Uneven review counts.** Projects have between 2 and 5 reviews. Judges submitted between 1 and 11 score entries. There is no project with zero scores, but there is significant variance in coverage. We display the review count alongside each project's score so the organizer can identify thin evidence.

**Judges scoring across tracks.** Every judge in the fixture data scored only projects in their assigned tracks. This can be verified programmatically. Our permission layer enforces this constraint going forward.

**Empty comments.** Many score entries have an empty string for the comment field. We treat empty strings and null identically in the UI.

**Duplicate team names.** "StillTrail" appears three times (`tm_03`, `tm_30`, `tm_40`), "OpenSignal" twice (`tm_11`, `tm_16`), and "AmberSwitch" twice (`tm_05`, `tm_34`). Team names are not unique identifiers. We will use UUIDs as primary keys.

---

## Data Import

### Fixture seeding (primary import path)

The seed script (`prisma/seed.ts`) reads `fixtures.json` and populates the database in a single transaction. The order of operations matters because of foreign key constraints:

1. Event
2. Tracks (depends on Event)
3. Users from judge records (creates User with role=judge)
4. Users from team member emails (creates User with role=participant)
5. Organizer and admin users (hardcoded seed accounts)
6. Teams (depends on Event)
7. TeamMembers (depends on Team, User)
8. JudgeTrackAssignments (depends on User, Track)
9. Rubric and RubricCriteria (depends on Event)
10. Projects (depends on Team, Track)
11. JudgeAssignments (derived from scores -- if a judge scored a project, they were assigned to it)
12. Scores (depends on User, Project, RubricCriterion)
13. Duplicate detection and flagging
14. Session creation for acceptance suite roles

The seed script is idempotent. If the database already contains data, the script skips seeding. This prevents double-seeding on container restart.

### Fixture ID mapping

Every fixture record has a string ID like `evt_01`, `trk_01`, `jdg_01`. We store these in the `external_id` column on each table. During seeding, we build an in-memory map from external IDs to generated UUIDs so that foreign key references in the fixture data resolve correctly.

After seeding, the `external_id` column is only used for debugging and for the acceptance suite. The application logic uses UUIDs exclusively.

---

## Data Export

### CSV export

The organizer can export results as a CSV file through the `/api/export.csv` endpoint. The export contains one row per project with the following columns:

```
project_id, title, team_name, track, review_count, functionality_raw_avg, quality_raw_avg, innovation_raw_avg, functionality_normalized, quality_normalized, innovation_normalized, weighted_total, rank
```

The CSV uses a comma delimiter, double-quote escaping for fields containing commas, and UTF-8 encoding. The first line is a header row.

The acceptance suite checks that this endpoint returns HTTP 200 with organizer auth and that the first line contains at least one comma.

### JSON API responses

Every API endpoint returns JSON. The response shape follows a consistent pattern:

```
Success:  { "data": <payload> }
Error:    { "error": "<message>" }
List:     { "data": [<items>], "total": <count> }
```

We will not build a formal REST API with OpenAPI documentation (that is a T4 deliverable). The API routes serve the frontend and the acceptance suite.

---

## Schema Migrations

Prisma manages schema migrations. The `prisma/migrations/` directory contains timestamped SQL migration files generated by `prisma migrate dev`. In the Docker entrypoint, `prisma migrate deploy` runs before the application starts, applying any pending migrations.

We will not use `prisma db push` in production. Migrations are explicit, reviewable, and replayable.

---

## Indexing Strategy

Indexes are planned beyond the primary and foreign keys for the queries that matter most:

| Table              | Column(s)                        | Reason                                       |
|--------------------|----------------------------------|----------------------------------------------|
| Session            | token                            | Every request authenticates by looking up the session token |
| User               | email                            | Login lookups                                |
| Project            | track_id                         | Gallery filtering by track                   |
| Project            | team_id                          | Looking up a team's submissions              |
| Project            | status                           | Filtering drafts from the public gallery     |
| Score              | judge_id                         | Fetching a judge's scores                    |
| Score              | project_id                       | Fetching all scores for a project            |
| Score              | (judge_id, project_id)           | The unique constraint already creates this   |
| JudgeAssignment    | judge_id                         | Fetching a judge's assigned projects         |
| JudgeAssignment    | project_id                       | Checking which judges are assigned to a project |

PostgreSQL creates indexes automatically for primary keys and unique constraints. The above are the additional explicit indexes.

---

## Cascading Deletes

We will use `ON DELETE CASCADE` on foreign keys where the child record has no meaning without the parent:

- Deleting a Team cascades to TeamMember and Project
- Deleting an Event cascades to Track, Team, Rubric
- Deleting a Rubric cascades to RubricCriterion
- Deleting a Project cascades to Score, JudgeAssignment, NormalizedResult

We will use `ON DELETE RESTRICT` where deletion should be blocked:

- Deleting a User who has scores is blocked (scores are audit records)
- Deleting a Track that has projects is blocked

---

## Timestamps and Timezones

All timestamps are stored as `TIMESTAMPTZ` (timestamp with time zone) in UTC. The fixture data uses ISO 8601 format with a `Z` suffix (`2026-03-01T18:00:00Z`). We store and compare in the same format.

The application server does not assume a local timezone. All deadline comparisons use UTC. The frontend converts to the user's local timezone for display only.

---

## Constraints Summary

| Constraint                                       | Enforcement level |
|--------------------------------------------------|-------------------|
| One role per user                                | Database (enum column) |
| One team membership per user per event           | Application layer |
| One rubric per event                             | Database (unique constraint on event_id) |
| One score per judge per project per criterion    | Database (unique composite constraint) |
| One judge assignment per judge-project pair      | Database (unique composite constraint) |
| Team size maximum of 4                           | Application layer |
| Submission deadline                              | Application layer (timestamp comparison) |
| Judge can only see own scores                    | Application layer (query filter + permission check) |
| Judge can only see assigned tracks               | Application layer (join through JudgeTrackAssignment) |

We are pushing constraints into the database wherever possible. The application layer handles constraints that depend on business logic or cross-table conditions that PostgreSQL check constraints cannot express cleanly.
