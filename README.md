# HackStop

A self-hosted hackathon portal built with Next.js, TypeScript, Prisma, PostgreSQL 16, and Tailwind CSS. This delivery implements **T1, T2, and T3**: submissions, judging, normalized rankings, CSV export, authenticated community voting, comments, and an organizer audit log.

The [24-second demo video](demo-video/HackStop-demo.mp4) shows the running public gallery, organizer judging dashboard, and judge review screen.

## Run

From a fresh clone, run one command with Docker Compose. No `.env`, host Node.js install, or setup script is required:

```sh
docker compose up
```

The baseline opens the portal at `http://localhost:8080/projects`. Compose builds the app, starts PostgreSQL, applies migrations, seeds fixtures transactionally, prints four session headers, and starts the production server as a non-root user. The demo credentials and session seed in `docker-compose.yml` are public local defaults; the application port binds to loopback and PostgreSQL has no host port. For a deployment, override the defaults with private values. `npm ci && npm run setup` remains an optional way to create a custom `.env`; set `APP_URL` alongside `APP_PORT` when changing the port.

After the base images and npm build dependencies have been fetched once, Compose reuses cached layers for later offline builds and starts. Internet access may be needed for that first image build on an uncached Docker host, not for portal runtime. Fonts are bundled locally. Fixture media are empty; optional media URLs supplied by participants depend on their hosts being reachable from the browser. The app server does not fetch those URLs or embed remote video players.

The tracked `.dogfood.toml` matches the zero-setup defaults. Run the unmodified official checker directly:

```sh
python docs/run.py .dogfood.toml > acceptance-report.txt
```

For custom `.env` values, run `npm run dogfood:config` after installing the local development dependencies; it reads the effective Compose configuration and regenerates the test tokens. `.dogfood.toml` claims T1 and T2. All seven official acceptance checks pass in `acceptance-report.txt`.

## Accounts and sessions

`SEED_PASSWORD` from Compose, or an optional gitignored `.env`, is the password for the fixture accounts. The four fixed acceptance identities are:

| Account | Email |
|---|---|
| Organizer | `SEED_ORGANIZER_EMAIL` |
| Judge A | `tomas.varga@example.org` (`jdg_01`) |
| Judge B | `wei.lindqvist@example.org` (`jdg_02`) |
| Participant | `priya1@example.org` (first member of `tm_01`) |

The seed also preserves every fixture judge and team member and creates the configured admin. Visitor means no authenticated user. Public registration can only create participants, regardless of a submitted role field. Judges use `/judge/assignments` and `/judge/scoring/[projectId]`. Admin remains API-only and can manage events across owners.

Passwords use bcrypt with cost 12. Normal sessions are random 32-byte hex tokens, expire after seven days, and are revoked on logout. Cookies are HttpOnly, SameSite=Lax, and Secure when `APP_URL` uses HTTPS. Mutating endpoints reject foreign Origin headers and require JSON. Seed tokens are HMAC-derived from `SEED_SESSION_SECRET`, have the documented prefixes, and stay deterministic for that configuration. Restarting renews their expiry and prints them in the exact `spec.md` format. The checked-in test tokens are public and grant access to the local demo; keep custom `.env` files, regenerated tokens, and deployment boot logs private.

## T1 behavior

- Organizer: creates an owned event with all four dates, tracks, display prizes, and custom questions. Organizer reads are filtered by `organizer_id`.
- Participant: creates or joins a team via a random invite link. A team has at most four members and a participant has at most one team in each event. Serializable transactions enforce these rules across simultaneous requests; conflicting requests return 409 and can be retried.
- Submissions: every DATA-MODEL field is editable, including thumbnail, image URLs, video, repository, live link, technology tags, track, and custom answers. A draft needs a title and track. Submission additionally needs a description and answers to required custom questions. Media and links remain optional.
- Only current team members can read or mutate private submissions and retrieve team invite codes. All members have the same submission editing rights. API ownership is applied in Prisma query filters, after session and role checks.
- Submissions open inclusively and close exclusively: `now >= event.submissions_close` returns 403, for creation and every edit. The fixture closes at its actual `2026-03-01T18:00:00Z` timestamp. There is no fixture-only deadline bypass.
- One normal project per team; edit that project instead of creating a second. Both provided duplicate fixtures remain stored. The later `prj_41` is labeled Duplicate in the gallery.
- `/projects` and submitted project detail pages are public and server-rendered. Search covers title, tagline, description, and team name; filters cover track, team name, and exact technology tag. Private drafts never appear in these queries. All 41 fixture records are visible, including the documented duplicate.

## Schema decisions

The initial migration contains all 13 T1/T2 tables, PostgreSQL-generated UUID keys, UTC TIMESTAMPTZ fields, external fixture IDs, relations, constraints, and query indexes. It also contains the approved `Event.organizer_id`, JSONB `prizes`, and JSONB `custom_questions` additions. The normalized table retains the documented name `NormalizedResult`. A second migration adds the T3 voting window, votes, comments, and audit records; no T1/T2 table is rebuilt.

Custom questions are `{ id, label, required }` objects and answers are strings keyed by question ID. The event form creates required text questions; the API also accepts optional questions. Prizes are a list of display strings. Custom answers are public with the project; the form makes this explicit.

As approved, `RubricCriterion.weight` stores positive **relative** weights in DECIMAL(5,2). The seed stores `1, 1, 1`. The effective coefficient is `weight / sum(weights)`, giving exactly equal thirds without pretending 0.33 sums to one. No second migration was needed for T2.

The seed imports one event, 8 tracks, 30 judges, 40 teams, 41 projects, 126 historical judge assignments, and 378 raw criterion scores. It preserves incomplete review coverage and constant-judge values without inventing missing scores. `NormalizedResult` is calculated when the organizer requests results or exports CSV, then invalidated when scores or rubric weights change.

## T2 judging

- Organizers invite judges by email and track, then share a generated password. They can assign selected submissions manually or balance a track automatically to a target review count. The dashboard shows assignments, completed reviews, and percentage complete for each judge.
- Judges see only their own assigned projects in qualified tracks. They can save partial criterion scores, add an optional comment, and update a review until `judging_close`. If `judging_open` is unset, scoring starts at `submissions_close`; if `judging_close` is unset, there is no scheduled judging cutoff.
- Organizers configure criteria, relative weights, and scoring scales. Once scoring starts, the criterion set and scales are fixed to preserve existing scores; names and weights remain editable. Normalization uses sample standard deviation per judge and criterion. Constant and single-score distributions contribute z=0, so raw 1–5 values never enter normalized averages. [JUDGING.md](JUDGING.md) documents the calculation and fixture impact.
- Rankings use only criteria actually scored, without imputing unfinished reviews. Projects missing any criterion retain an unranked result row until scoring is complete. `prj_41` and its scores remain queryable, but the duplicate has no rank and is excluded from CSV and the organizer ranking table. CSV rows come from `NormalizedResult` joined with project and team records. Judge assignment responses omit team invite codes at the database query. Score saves, rubric changes, normalization, and CSV reads use an event-row lock inside their transactions so a concurrent change cannot leave stale exported results. Participant result publication is outside this T2 scope.

## T3 community

- Events may set `voting_opens` and `voting_closes`. The seeded fixture receives an active window on its first T3 boot so voting can be exercised without changing the historical submission deadline. Voting opens inclusively and closes exclusively.
- Authenticated people can rate a submitted, nonduplicate project from 1 to 5 once per project. The database enforces `(user_id, project_id)` uniqueness. An event organizer and judges assigned to that event cannot vote on it. The ballot at `/vote` uses the session ID to derive a stable shuffled order; signing in with another account produces another order.
- Authenticated people can comment on submitted project pages. Comments are publicly readable on those gallery pages, but anonymous posting is rejected. Vote and comment writes each create an audit record in the same transaction. Only an organizer of the event or an admin can read `/api/organizer/community-audit` or the event's Community activity page.
- Vote and comment writes use a per-account database counter over the preceding hour, serialized by locking the account row. Defaults are 20 votes and 10 comments per hour, configured by `VOTE_RATE_LIMIT_PER_HOUR` and `COMMENT_RATE_LIMIT_PER_HOUR`.
- During an active voting window, nonorganizers receive HTTP 423 with a clear unavailable message from the rankings endpoint; event organizers and admins retain live access. After voting closes, the T2 access policy remains: only organizers and admins can read rankings. CSV export retains its organizer/admin restriction.

## T4 REST API and OpenAPI

The platform formalizes all platform functionality into a stable, versioned public REST API under `/api/v1/`.

- Role and ownership isolation: public API access does not mean unauthenticated access. Every endpoint enforces the existing T1/T2/T3 role permissions (visitor, participant, judge, organizer, admin).
- Bearer token authentication: all protected endpoints accept standard `Authorization: Bearer <session_token>` headers in addition to session cookies. The current user profile can be retrieved at `GET /api/v1/auth/me`.
- Formal OpenAPI 3.1.0 specification: the complete API schema is published at `GET /api/v1/openapi.json` and saved in the repository at [docs/openapi.json](docs/openapi.json). It details request payloads, responses, parameters, security schemes, and error models.
- Discovery endpoint: `GET /api/v1` provides a root resource index and pointer to the OpenAPI document.

## Development and verification

To access the database from local tooling, use the development override:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
npm run lint
npm test
```

The override exposes the database on loopback only, using `DB_HOST_PORT`. Integration tests use `.env` and the running portal. They create uniquely named test users/events and clean up only those test records. T1 tests cover fixture counts, auth-first status codes, registration role injection, session expiry/revocation, event ownership, admin API access, draft privacy, cross-team isolation, complete submissions, required custom answers, URL validation, concurrent invite capacity, deadlines, and CSRF origin rejection. T2 tests cover peer-score isolation, invitation, manual and automatic assignment, partial and completed reviews, progress, zero-variance normalization, duplicate exclusion, CSV export, and judging-close enforcement. Unit tests exercise exact deadline boundaries and the shared ownership guard. T3 was verified against the running portal with distinct authenticated accounts, duplicate and rate-limit attempts, ballot refreshes, result access checks, and audit-log reads; the seven official T1/T2 checks still pass.

For local Next.js development, stop the Compose app, keep the database running with the override, and run `npm run dev`. `DATABASE_URL` in `.env` targets that loopback database, and the server uses `APP_PORT`. `npm run build && npm start` runs the local standalone production build.

## Installed direct dependencies

All versions are pinned in `package.json` and transitive versions in `package-lock.json`.

The transitive `deepmerge-ts` dependency is pinned to 8.0.0 through an override to address [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) in Prisma's CLI configuration dependency. Migration, generation, and production startup are verified with this override.

| Runtime dependency | Version | Purpose |
|---|---|---|
| next | 16.3.6 | App Router, SSR, route handlers |
| react / react-dom | 19.3.0 | UI |
| prisma / @prisma/client | 6.19.3 | Migration CLI and typed PostgreSQL access |
| bcryptjs | 3.0.3 | Offline password hashing |
| tsx | 4.23.15 | TypeScript seed at container startup and tests |
| lucide-react | 1.48.0 | Design-system icons |
| @fontsource/inter | 5.3.0 | Locally bundled Inter fonts |

| Development dependency | Version |
|---|---|
| typescript | 6.0.3 |
| @types/node | 26.6.3 |
| @types/react / @types/react-dom | 19.3.0 |
| tailwindcss | 3.4.19 |
| postcss | 8.5.28 |
| autoprefixer | 10.6.1 |
| eslint | 9.39.5 |
| eslint-config-next | 16.3.6 |
| jiti | 2.7.0 |

Prisma and tsx are runtime dependencies because the container applies migrations and executes the TypeScript seed before starting. Prisma 6 follows the schema/client conventions specified by this repository without adding a PostgreSQL driver adapter.
