# HackStop

A self-hosted hackathon portal built with Next.js, TypeScript, Prisma, PostgreSQL 16, and Tailwind CSS. This delivery implements **T1 only**. T2 tables and historical fixture records exist, but there are no judging, rubric management, normalization, or export routes or screens.

## Run

Node.js 24 and Docker Compose are required for initial preparation. Copy `.env.example` to `.env` and fill the three secret values, or generate them:

```sh
npm ci
npm run setup
docker compose up --build
```

The configuration uses the application address in `APP_URL` and port in `APP_PORT`. The example opens the portal at `http://localhost:8080/projects`. Both containers start from Compose; the app applies the single migration, seeds fixtures transactionally, prints four session headers, and starts the production server as a non-root user. PostgreSQL has a persistent named volume and is not published to the host in the default Compose configuration.

After building the app image and pulling PostgreSQL once, `docker compose up` uses the local images without installing dependencies or fetching assets. Internet access is needed for that initial preparation, not for runtime. Fonts are bundled locally. Fixture media are empty; optional media URLs supplied by participants depend on their hosts being reachable from the browser. The app server does not fetch those URLs or embed remote video players.

Generate the local acceptance configuration and run the unmodified official checker:

```sh
npm run dogfood:config
python docs/run.py .dogfood.toml > acceptance-report.txt
```

`.dogfood.toml` claims T1 only. The checker always probes T2 too; its four T2 failures are expected because those routes do not exist. Do not add stub endpoints to make them appear implemented.

## Accounts and sessions

`SEED_PASSWORD` in your gitignored `.env` is the password for the fixture accounts. The four fixed acceptance identities are:

| Account | Email |
|---|---|
| Organizer | `SEED_ORGANIZER_EMAIL` |
| Judge A | `tomas.varga@example.org` (`jdg_01`) |
| Judge B | `wei.lindqvist@example.org` (`jdg_02`) |
| Participant | `priya1@example.org` (first member of `tm_01`) |

The seed also preserves every fixture judge and team member and creates the configured admin. Visitor means no authenticated user. Public registration can only create participants, regardless of a submitted role field. Judge and admin accounts can authenticate but have no dedicated UI in T1. Admin is authorized for the organizer event API across owners.

Passwords use bcrypt with cost 12. Normal sessions are random 32-byte hex tokens, expire after seven days, and are revoked on logout. Cookies are HttpOnly, SameSite=Lax, and Secure when `APP_URL` uses HTTPS. Mutating endpoints reject foreign Origin headers and require JSON. Seed tokens are HMAC-derived from `SEED_SESSION_SECRET`, have the documented prefixes, and stay deterministic for that configuration. Restarting renews their expiry and prints them in the exact `spec.md` format. Keep `.env`, `.dogfood.toml`, and boot logs private; these tokens grant the listed test access.

## T1 behavior

- Organizer: creates an owned event with all four dates, tracks, display prizes, and custom questions. Organizer reads are filtered by `organizer_id`.
- Participant: creates or joins a team via a random invite link. A team has at most four members and a participant has at most one team in each event. Serializable transactions enforce these rules across simultaneous requests; conflicting requests return 409 and can be retried.
- Submissions: every DATA-MODEL field is editable, including thumbnail, image URLs, video, repository, live link, technology tags, track, and custom answers. A draft needs a title and track. Submission additionally needs a description and answers to required custom questions. Media and links remain optional.
- Only current team members can read or mutate private submissions and retrieve team invite codes. All members have the same submission editing rights. API ownership is applied in Prisma query filters, after session and role checks.
- Submissions open inclusively and close exclusively: `now >= event.submissions_close` returns 403, for creation and every edit. The fixture closes at its actual `2026-03-01T18:00:00Z` timestamp. There is no fixture-only deadline bypass.
- One normal project per team; edit that project instead of creating a second. Both provided duplicate fixtures remain stored. The later `prj_41` is labeled Duplicate in the gallery.
- `/projects` and submitted project detail pages are public and server-rendered. Search covers title, tagline, description, and team name; filters cover track, team name, and exact technology tag. Private drafts never appear in these queries. All 41 fixture records are visible, including the documented duplicate.

## Schema decisions

The first and only migration contains all 13 documented tables, PostgreSQL-generated UUID keys, UTC TIMESTAMPTZ fields, external fixture IDs, relations, constraints, and query indexes. It also contains the approved `Event.organizer_id`, JSONB `prizes`, and JSONB `custom_questions` additions. The normalized table retains the documented name `NormalizedResult`.

Custom questions are `{ id, label, required }` objects and answers are strings keyed by question ID. The event form creates required text questions; the API also accepts optional questions. Prizes are a list of display strings. Custom answers are public with the project; the form makes this explicit.

As approved, `RubricCriterion.weight` stores positive **relative** weights in DECIMAL(5,2). The seed stores `1, 1, 1`. In T2 the effective coefficient must be `weight / sum(weights)`, giving exactly equal thirds without pretending 0.33 sums to one. No normalization implementation is included in T1.

The seed imports one event, 8 tracks, 30 judges, 40 teams, 41 projects, 126 historical judge assignments, and 378 raw criterion scores. `NormalizedResult` stays empty. It preserves incomplete review coverage and constant-judge values; it does not invent missing scores or run judging algorithms.

## Development and verification

To access the database from local tooling, use the development override:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
npm run lint
npm test
```

The override exposes the database on loopback only, using `DB_HOST_PORT`. Integration tests use `.env` and the running portal. They create uniquely named test users/events and clean up only those test records. They cover fixture counts, auth-first status codes, registration role injection, session expiry/revocation, event ownership, admin API access, draft privacy, cross-team isolation, complete submissions, required custom answers, URL validation, concurrent invite capacity, deadlines, and CSRF origin rejection. Unit tests exercise exact deadline boundaries and the shared ownership guard.

For local Next.js development, stop the Compose app, keep the database running with the override, and run `npm run dev`. `DATABASE_URL` in `.env` targets that loopback database, and the server uses `APP_PORT`. `npm run build && npm start` runs the local standalone production build. No schema change is needed to begin T2.

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
