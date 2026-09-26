# T1 verification

Verified on 2026-09-27 against the production Docker image.

## Official checker

The unmodified `docs/run.py` was run against the Compose portal using `.dogfood.toml` with T1 claimed. See `acceptance-report.txt` for its full output.

| T1 check | Result |
|---|---|
| Public gallery without authentication | PASS, HTTP 200 |
| A fixture project title appears in the gallery response | PASS |
| Closed fixture event rejects participant submission | PASS, HTTP 403 with deadline-specific error |

All four T2 checks fail with 404 because their routes are intentionally absent. T2 is not claimed.

## Additional verification

- Production build: passed locally and inside the multi-stage Docker build.
- ESLint and strict TypeScript: passed.
- Unit and HTTP integration suite: 3 tests passed, including the multi-step workflow and concurrency assertions. Also executed inside the production app container against PostgreSQL.
- Dependency audit: zero reported vulnerabilities after pinning the fixed transitive `deepmerge-ts` version.
- Browser: verified public gallery rendering, searching for Glass Signal, and organizer sign-in and event form rendering.
- Default Compose startup and application restart: healthy, retaining existing records and printing all four deterministic session headers.
- Schema drift: Prisma reported no difference between PostgreSQL and `prisma/schema.prisma`; exactly one migration exists.

## Offline first-boot verification

A separate temporary Compose project used the built app and PostgreSQL images, a fresh database volume, no published ports, and a Docker network with `internal: true`. Image pulls and builds were explicitly disabled. Both containers became healthy with no external network route.

The app applied the initial migration and seeded automatically. Requests from inside that isolated app container returned gallery 200, displayed Glass Signal, and returned 403 with `Submissions are closed for this event.` for the participant's late POST.

Verified counts: 1 event, 8 tracks, 40 teams, 41 projects, 30 fixture judges, 126 historical judge assignments, 378 criterion scores, and 0 normalized results.

The temporary offline project was removed after verification. The normal Compose stack remains running. Initial image preparation needs network access; normal startup uses the prepared local images.

## Development migration bookkeeping

The initial development database had recorded the checksum of Prisma's generated migration before its repetitive generated comments were removed to follow the code rules. The original checksum was reproduced from Prisma's generated SQL, schema equality was verified, and only that migration record's checksum was reconciled with the comment-free file. Application data and schema were unchanged. `.gitattributes` fixes LF line endings so checkout on Windows preserves migration checksums and shell entrypoints.
