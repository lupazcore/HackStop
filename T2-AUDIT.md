# T2 security and correctness audit

## Resolution follow-up: all four requested fixes verified

The findings below are the historical audit. They have now been addressed by the explicitly requested T2 correctness fixes:

- Zero-variance and single-score distributions contribute z=0. All 41 fixture NormalizedResult rows were recalculated, with raw Score rows unchanged. Independent fixture calculations match every stored criterion output and weighted total; all outputs are finite. See [the 34 ranking changes](T2-RANKING-CHANGES.md). JUDGING.md, ARCHITECTURE.md, and DATA-MODEL.md describe the corrected rule.
- Both judge assignment endpoints restrict their Team projection using Prisma select. Live regression assertions verify that neither list nor detail responses contain invite_code while preserving project/team/rubric data and ownership checks.
- Score saves, rubric changes, normalization, and CSV reads use one event-row lock within their database transactions. Score and rubric reads happen after acquiring the lock. The concurrency regression pauses the real normalization query after its read, initiates a real HTTP mutation, and resumes after observing the write waiting for the lock. The write then invalidates the completed earlier calculation; the next export recalculates from committed data. Both score and rubric variants failed against the unfixed server with stale total 0, and pass against the fixed server with expected totals 0.707107 and -0.353553 respectively.
- The organizer ranking query excludes null ranks and duplicate projects. The actual server HTML contains ranks 1 through 40 exactly once and only one Dry Harbour ranking cell. prj_41 still exists, retains its 12 Score rows, and remains unranked.

| Validation stage | T1 checks | T2 checks |
|---|---|---|
| After Fix 1 | 3/3 PASS | 4/4 PASS |
| After Fix 2 | 3/3 PASS | 4/4 PASS |
| After Fix 3 | 3/3 PASS | 4/4 PASS |
| After Fix 4 | 3/3 PASS | 4/4 PASS |

Each stage ran `python docs/run.py .dogfood.toml` against the rebuilt Docker portal. The final production build, lint/type check, and full test suite also pass (7 tests, including both concurrency subtests). Tests were copied into the running container to execute against its PostgreSQL database; the earlier image-packaging limitation did not prevent this follow-up run. Temporary test data was cleaned up: one fixture event and 378 raw score rows remain.

No dependencies or migrations were added. No T1 application files were changed. Changes to the shared architecture/data-model documentation only correct the normalization rule.

## Original audit evidence

Reviewed commit `210491f` on 2026-09-27 against the running Docker portal. The working tree was clean when the audit started. No application code, T1 files, dependencies, schema, or configuration were changed. This report is the only new file. Temporary database test records were removed; fixture scores were not changed. Fixture derived results were recalculated.

## Found: needs a decision before implementation

These findings are left unfixed because this request was explicitly a review task.

### P1: Concurrent scoring can leave stale normalized results and CSV

Locations: [normalization read](src/lib/normalization.ts:12), [normalization write](src/lib/normalization.ts:56), [score-save invalidation](src/app/api/judge/assignments/[projectId]/route.ts:61), [CSV freshness check](src/app/api/export.csv/route.ts:26).

Normalization reads scores outside its write transaction. A judge save can commit after that read, invalidate old results, and then have the in-flight normalizer insert obsolete results. CSV considers the results current when their row count matches the submitted-project count, so it exports those obsolete scores.

Confirmed with the real normalization function, real PostgreSQL, and a real HTTP score update in an isolated temporary event. A scheduling gate paused the normalizer immediately after its real Score query returned; it did not change the query result or calculation. While paused, a judge updated a score from 2 to 5. The save returned:

```http
HTTP 200
{"data":{"status":"completed"}}
```

After resuming normalization:

```text
Stored Score.value:                 5
Stored NormalizedResult total:      2
Expected total (one-score fallback):5
CSV HTTP status:                   200
CSV raw average / normalized / total: 2 / 2 / 2
```

Recommended repair: coordinate normalization, score writes, and rubric changes per event in their database transactions, including the normalization reads. A shared event-row lock is one possible solution; merely wrapping the final delete/create operations in a transaction is insufficient. Add a deterministic concurrency regression before considering this fixed. No formula or schema change is required.

### P1: Judge assignment responses expose team invite secrets

Locations: [assignment list query](src/app/api/judge/assignments/route.ts:9), [assignment detail query](src/app/api/judge/assignments/[projectId]/route.ts:19).

Both queries include all Team scalar columns and serialize `project.team.invite_code`. Live requests as judge_a returned HTTP 200 with a nonempty invite code in both responses; judge_b's assignment list also exposed codes. Secret values are intentionally omitted from this report.

The invite code is the credential accepted by the participant team-join endpoint. A judge with a separate participant account could use it to join a team where the existing membership/capacity rules permit. No unauthorized team join was performed during this audit.

Recommended repair: constrain the Team projection with Prisma `select` in both T2 queries, returning only fields needed for judging. Remove the secret at the query level, not by hiding it in the interface. Add response assertions for both routes. T1 membership code does not need to change.

### P2: The displayed ranking list still includes the duplicate

Location: [organizer judging page](src/app/(dashboard)/organizer/events/[eventId]/judging/page.tsx:27).

The actual organizer HTML contains 41 ranking-table rows, including:

| Rank cell | Project | Reviews | Weighted score |
|---|---|---:|---:|
| 4 | Dry Harbour | 5 | 1.061 |
| Excluded | Dry Harbour, Duplicate | 4 | 0.757 |

This is a presentation mismatch with the requested exclusion from ranking output. The duplicate is correctly unranked in the database and excluded from CSV; it is not receiving a second numeric rank. The page renders every result in the table headed "Normalized rankings."

Decision: exclude duplicate/unranked rows from that ranking table, while preserving their database rows and existing query access, or explicitly accept the current mixed table with its exclusion label. No deletion of scores is proposed.

## Confirmed safe: score ownership inventory

There is no separate authorization middleware in this implementation. APIs use `getSession()` and `requireRole()`; server pages use `pageActor()`. Every judge-accessible Score/JudgeAssignment query below filters by the authenticated user's ID in Prisma, including nested score reads. The requested judge parameter never substitutes for the authenticated identity in the Score query.

| Code path | Database scope and returned data |
|---|---|
| `src/app/api/judge/scores/route.ts`, GET | `Score.judge_id = actor.id`, assignment judge also `actor.id`, qualified-track predicate. `requireSelf` additionally rejects another requested judge. Returns own individual scores. |
| `src/app/api/judge/assignments/route.ts`, GET | `JudgeAssignment.judge_id = actor.id`, qualified track, submitted projects; nested `scores.where.judge_id = actor.id`. Invite-secret exposure is separately reported above. |
| `src/app/api/judge/assignments/[projectId]/route.ts`, GET | Authenticated judge + requested project + qualified track; nested scores filtered by `actor.id`. |
| Same route, PUT | Same ownership-scoped read; score upsert compound key and comment update use `actor.id`; assignment update uses the same authenticated judge/project key. Event-wide result invalidation returns no peer data. |
| `src/app/(dashboard)/judge/assignments/page.tsx` | Assignment query filtered by `actor.id` and qualified track; no scores loaded. |
| `src/app/(dashboard)/judge/scoring/[projectId]/page.tsx` | Assignment/detail, nested scores, and next-project queue all filtered by `actor.id` and qualified track. Only own saved scores are passed to ScoreForm. |
| `src/app/api/organizer/assignments/route.ts`, GET/POST | Organizer/admin gate followed by owned-event lookup. Lists assignment metadata, not individual score values. Automatic assignment reads existing assignments only in a track verified to belong to that owned event. |
| `src/app/api/organizer/progress/route.ts`, GET | Organizer/admin + owned event; reads judge IDs and assignment status for progress, not score values. |
| `src/app/api/organizer/rubric/route.ts`, PUT | Organizer/admin + owned event; counts event scores to protect rubric structure. Does not return individual scores. Invalidates only that event's derived results. |
| `src/app/(dashboard)/organizer/events/[eventId]/judging/page.tsx` | Organizer page guard + owned-event query precede assignment metadata, score count, and normalized-result reads. No individual peer scores returned. |
| `src/lib/normalization.ts`, `recomputeResults` | Intentionally reads all judges' raw values within one event to calculate cross-judge normalization. Its only application callers are the owned-event organizer results POST and CSV GET. Takes an event ID rather than an actor; not exposed as a judge route. Returns a ranked count, not individual scores. |
| `src/app/api/organizer/results/route.ts`, GET/POST | Organizer/admin + owned event; GET returns NormalizedResult aggregates and POST invokes the service. |
| `src/app/api/export.csv/route.ts`, GET | Organizer/admin + owned event; joins NormalizedResult to project/team/track, and may invoke normalization. Exports aggregates, not raw Score rows. |
| `prisma/seed.ts` | Offline fixture assignment/score inserts, not an HTTP read surface. |
| Integration tests and schema/migration | Privileged test reads and model definitions; no additional application endpoint. |

Organizer paths deliberately do not apply `judge_id = actor.id`: their event-wide calculations require multiple judges. They are protected by organizer/admin role and event ownership, and are unavailable to judge or participant callers. Admin cross-event API access is the existing documented role policy.

Repository-wide searches covered direct model queries, nested `scores`/`assignments` relations, normalized-result relations, raw-query entry points, and normalizer callers. Public gallery/project projections contain no scores or assignments. Judge invitation queries read track qualification and public judge identity, not individual scores. Client forms call the routes listed above; they do not read the database independently.

## Confirmed safe: live authorization probes

The exact required requests returned these raw status/body pairs:

```http
GET /api/judge/scores?judge=judge_a
Authenticated as: judge_b
HTTP 403
{"error":"This request does not belong to your account."}
```

```http
GET /api/judge/scores
Authenticated as: participant
HTTP 403
{"error":"Your role cannot perform this action."}
```

Positive control: judge_a's own scores request returned HTTP 200 with three criterion rows for the fixture project "Dry Harbour". Isolation was not passing because judge_a had no data.

Additional live checks:

- Judge B requesting judge A by fixture ID (`jdg_01`) or database UUID: 403.
- Judge B requesting judge A's unassigned project through assignment detail: 404, with no assignment or scores. Participant requesting that detail: 403.
- Own assignment lists contained no foreign judge IDs in assignments or nested scores: one assignment for judge_a and six for judge_b.
- Both judge_b and participant received 403 from organizer assignments, judges, progress, rubric, results, and CSV endpoints for the fixture event.

## Confirmed safe: fixture normalization, with the presentation exception above

- Invoked the actual organizer normalization endpoint: HTTP 200, `{"data":{"ranked":40}}`.
- All 41 stored result totals and criterion outputs were finite. Independent recomputation from `docs/fixtures.json` using sample standard deviation, actual scored values, the approved raw fallback, and duplicate-free baselines found no criterion-value or review-count mismatches.
- The constant judge `jdg_07` has three scored projects with raw 4s; `jdg_01` and `jdg_23` have one project each. Their zero-variance/single-value distributions did not cause a crash, NaN, or Infinity. The audit uses the user's approved raw fallback despite the stale `z=0` reminder in AGENTS.md.
- Fixture seeding derives assignments from recorded reviews, so the seeded assignment table alone does not represent unfinished work. To test that case rather than claim coverage from completed assignments, a temporary pending assignment was added for fixture judge `jdg_01` to real fixture project `prj_39`, within that judge's qualified track. Running the real normalizer left every criterion value, total, rank, and review count unchanged. The new pair had zero Score rows throughout. The pending assignment was removed afterward.
- `prj_41` still exists and a direct Prisma read returned its 12 individual criterion-score rows from four judges; its NormalizedResult rank is null. `prj_07` has rank 4 and five reviews.
- Actual CSV returned HTTP 200 with 40 rows and 40 unique project IDs: `prj_07` once, `prj_41` zero times. The UI exception is documented as P2 above.

## Confirmed safe: acceptance regression

Executed `python docs/run.py .dogfood.toml` against the running seeded portal:

| Check | Result |
|---|---|
| T1 gallery without authentication | PASS |
| T1 real fixture project in gallery response | PASS |
| T1 submission after fixture event deadline rejected | PASS |
| T2 judge sees own scores | PASS |
| T2 judge cannot read peer scores | PASS |
| T2 participant blocked from judge scores | PASS |
| T2 organizer CSV responds successfully | PASS |

An additional attempt to run the repository's integration test file inside the production container could not start because that image does not contain `tests/t2.integration.test.ts`. That suite is not claimed as executed in this audit. The HTTP probes, actual normalization runs, pending-assignment check, deterministic concurrency reproduction, and run.py results above were executed successfully.

No T1 regression was found by its three acceptance checks. Passing the seven acceptance checks does not cover the confirmed findings above.
