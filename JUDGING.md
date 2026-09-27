# JUDGING

## Implemented T2 behavior

T1 supplied the schema and fixture data. T2 adds assignment, scoring, rubric editing, organizer progress, normalized results, and CSV export without a schema migration. The zero-variance rule is z=0: constant and single-score distributions contribute no relative signal, keeping every contribution on the z-score scale.

Approved storage clarification: the DECIMAL(5,2) `weight` column holds relative weights (the fixture uses 1, 1, 1). In every formula below, `weight(c)` means `stored_weight(c) / sum(stored_weights)`. T2 must require a positive total and positive stored weights. This gives equal thirds and replaces the earlier requirement that the stored values themselves sum to 1.0.

This document explains how HackStop assigns judges, scores projects, normalizes scores across judges, and produces final rankings. It covers the math, the edge cases, and the reasoning behind each decision.

The judging system is the single most important subsystem in the platform. It directly determines whether results are fair. A platform that averages raw scores and hopes for the best is a platform where the harshest judge decides who loses.

---

## Table of Contents

1. Judge Assignment
2. Scoring Rubric
3. Why Raw Averages Are Unfair
4. Normalization Method
5. The Formula
6. Edge Cases
7. Worked Example from Fixture Data
8. Rank Movement Analysis
9. Distribution of Final Scores
10. Alternative Methods We Considered
11. Role Isolation
12. Organizer Visibility
13. CSV Export
14. Auditability

---

## 1. Judge Assignment

### The problem

Not every judge sees every project. In any real hackathon with more than twenty submissions, assigning all projects to all judges produces reviewer fatigue and inconsistent scoring. A judge who has scored thirty projects in five hours is not giving project thirty-one the same attention they gave project one.

### Our approach

We assign judges to projects through their track assignments. Each judge is assigned to one or more tracks when they are invited. They only see and score projects within those tracks.

Within a track, the assignment algorithm distributes projects across available judges to maximize two properties:

**Coverage**: every project receives at least two independent reviews. With the fixture data, every project has between 2 and 5 reviews.

**Balance**: judges within the same track receive approximately equal workloads. Perfect balance is not always possible when the number of projects is not evenly divisible by the number of judges, but the difference between the lightest and heaviest load within a track is at most one project.

### Assignment modes

The organizer can assign judges in two ways:

**Batch assignment.** The organizer manually selects a set of projects and assigns them to a specific judge. This is useful when the organizer wants direct control, for example to ensure a domain expert reviews a particular submission.

**Algorithmic assignment.** The system distributes projects across judges automatically. The algorithm is a round-robin with shuffle:

1. List all projects in the track in random order.
2. List all judges assigned to the track.
3. For each project, assign it to the next N judges in rotation, where N is the target review count (configurable, default 3).
4. Skip any judge who has already been assigned to that project (only relevant if batch and algorithmic assignment are combined).

The random shuffle prevents position bias. Without it, the first judge in the list always gets the first batch of projects, which systematically under-represents later submissions.

### Fixture data profile

The fixture data contains 30 judges across 8 tracks. Some tracks have heavy judge coverage (Security has 7 judges for 5 projects), while others are thinner (Climate has 4 judges for 3 projects). The assignment algorithm handles this asymmetry without manual tuning.

---

## 2. Scoring Rubric

The organizer configures a rubric for each event. A rubric is a list of criteria, each with:

- A name (e.g. "functionality")
- A weight (e.g. 0.33)
- A maximum score (e.g. 5)

Stored weights must be positive, with at most two decimal places. The platform divides each weight by the positive sum of all weights when calculating results.

The fixture data uses three equally weighted criteria:

| Criterion     | Weight | Max Score |
|---------------|--------|-----------|
| functionality | 1/3    | 5         |
| quality       | 1/3    | 5         |
| innovation    | 1/3    | 5         |

The organizer can change the number of criteria, their names, their weights, and the scoring scale. The normalization math works regardless of these choices because it operates on z-scores, which are unit-free.

When a judge opens the scoring interface for an assigned project, they see each criterion with its description and a score input. They provide one integer score per criterion and an optional text comment. The judge can save a partial review and return to complete it later.

---

## 3. Why Raw Averages Are Unfair

Consider two judges scoring the same set of projects on a 1-5 scale:

| Project | Judge A (harsh) | Judge B (generous) |
|---------|----------------:|-------------------:|
| X       |               2 |                  4 |
| Y       |               3 |                  5 |
| Z       |               1 |                  3 |

Judge A's average is 2.0. Judge B's average is 4.0. Both rank the projects in the same order: Y > X > Z. They agree on which project is best. But if we average their raw scores:

| Project | Raw Average |
|---------|------------:|
| X       |         3.0 |
| Y       |         4.0 |
| Z       |         2.0 |

This looks right only because both judges happened to see all three projects. Now imagine Judge A only sees X and Y, while Judge B only sees Y and Z:

| Project | Scores     | Raw Average |
|---------|------------|------------:|
| X       | A=2        |         2.0 |
| Y       | A=3, B=5   |         4.0 |
| Z       | B=3        |         3.0 |

Project Z (raw avg 3.0) now ranks above project X (raw avg 2.0), despite both judges agreeing that X is better than Z. The ranking is wrong because Judge B's generosity inflated Z's score while Judge A's harshness deflated X's score.

This is not a hypothetical. It is exactly what happens in the fixture data, where judges have between 1 and 11 scoring entries and no two judges review the same set of projects.

---

## 4. Normalization Method

We use **z-score normalization per judge, per criterion**.

The core idea: instead of comparing raw scores across judges, we compare how far each score deviates from that specific judge's personal baseline. A 3 from a harsh judge who averages 2.0 means something very different from a 3 from a generous judge who averages 4.5. Z-score normalization captures this.

### Why per-criterion

A judge might be consistently generous on "innovation" but harsh on "quality". Normalizing at the per-criterion level captures these systematic biases that a single aggregate z-score would miss.

### Why z-score instead of min-max

Min-max normalization (scaling each judge's scores to [0,1]) is sensitive to outliers. A single extreme score from a judge compresses all their other scores. Z-score normalization is more robust because it uses the standard deviation, which is less affected by individual outliers.

---

## 5. The Formula

### Step 1: Per-judge, per-criterion statistics

For each judge j and each criterion c, compute the mean and sample standard deviation of all scores that judge gave on that criterion:

```
mean(j,c) = (1/n) * sum of all scores judge j gave on criterion c
std(j,c)  = sqrt( (1/(n-1)) * sum of (score - mean)^2 )
```

We use sample standard deviation (dividing by n-1) rather than population standard deviation (dividing by n) because each judge's scores are a sample from their internal scale, not the complete population.

### Step 2: Z-score transformation

For each individual score, compute how many standard deviations it falls from that judge's mean on that criterion:

```
z(j, p, c) = (raw_score - mean(j,c)) / std(j,c)
```

If `std(j,c) = 0` or the judge has only one score for this criterion, set `z(j,p,c) = 0`. This prevents division by zero without mixing raw values into averages of z-scores. The original raw score remains stored unchanged.

### Step 3: Per-project, per-criterion normalized score

For each project p and criterion c, average the z-scores from all judges who scored that project on that criterion, including zero contributions from constant or single-score distributions:

```
norm(p, c) = (1/k) * sum of z(j, p, c) for all judges j who scored project p
```

where k is the number of judges who scored project p on criterion c.

### Step 4: Weighted final score

Combine the per-criterion normalized scores using the rubric weights:

```
final(p) = sum of weight(c) * norm(p, c) for all criteria c
```

### Step 5: Ranking

Sort all non-duplicate projects by `final(p)` in descending order. The project with the highest weighted normalized score ranks first.

---

## 6. Edge Cases

### 6a. Constant judge (zero variance)

**The problem.** A judge who gives the same score on every project on a given criterion produces a standard deviation of zero. The z-score formula divides by zero.

**Who it affects in the fixture data.**

`jdg_01` scored 1 project and gave 2 on every criterion. Standard deviation is undefined (n=1, so n-1=0).

`jdg_07` scored 3 projects and gave 4 on every criterion across all three. Standard deviation is 0.0.

**Our solution.** Set z=0 when the sample standard deviation is zero. A constant distribution provides no relative ranking signal. Keep its raw scores and review count, but contribute zero to the normalized average.

### 6b. Single-project judge

**The problem.** A judge who scored only one project has n=1 scores. Sample standard deviation requires n >= 2, so it is undefined.

**Who it affects.** `jdg_01` (1 project) and `jdg_23` (1 project).

**Our solution.** Set z=0. A single value cannot establish a sample standard deviation or a relative ranking signal.

### 6c. Incomplete batches

**The problem.** Not every judge finishes scoring all assigned projects. Some judges submitted 1 score entry, others submitted 11.

**Our solution.** We compute statistics only over the scores a judge actually submitted. Missing scores are not imputed, guessed, or averaged. A project that received 2 reviews is ranked using 2 reviews. The review count is displayed alongside every score so the organizer can see which results rest on thin evidence.

A partially scored project retains a result row and averages only criteria with actual scores. Its available criterion weights are rescaled to sum to one for the preview, and its rank remains empty until every rubric criterion has at least one score. A project with no scores likewise has no rank.

### 6d. Duplicate submission

**The problem.** Team `tm_07` submitted two projects: `prj_07` ("Dry Harbour", submitted at 04:29 UTC) and `prj_41` ("Dry Harbour", submitted at 17:57 UTC). Same title, same track, same repo URL.

**Our solution.** The seed script detects duplicate submissions from the same team by comparing team ID and title. The later submission (`prj_41`) is flagged as a duplicate. Both projects and their scores are preserved in the database -- deleting them would lose judge work. But only the earlier submission (`prj_07`) is included in the final ranking. The duplicate is visible in the gallery with a "Duplicate" label and excluded from the normalization and ranking calculations.

### 6e. Uneven review counts

**The problem.** Projects have between 2 and 5 reviews. A project with 5 reviews has a more reliable normalized score than a project with 2 reviews.

**Our solution.** We do not add a confidence penalty or weight by review count. Z-scores are comparable regardless of sample size as point estimates. However, we display the review count alongside every project's final score, and the CSV export includes it. The organizer can use this information when reviewing close calls.

---

## 7. Worked Example from Fixture Data

`prj_07` ("Dry Harbour") has five reviews. Statistics use each judge's scored non-duplicate projects only; `prj_41` is excluded from baselines and rankings but retains its stored scores.

| Criterion | Judge contributions after transformation | Project average |
|---|---|---:|
| functionality | jdg_19 -1.155, jdg_21 0.000, jdg_26 0.185, jdg_01 0.000, jdg_12 0.000 | -0.194 |
| quality | jdg_19 -1.000, jdg_21 -0.218, jdg_26 1.258, jdg_01 0.000, jdg_12 0.707 | 0.149 |
| innovation | jdg_19 -1.000, jdg_21 1.155, jdg_26 1.278, jdg_01 0.000, jdg_12 0.707 | 0.428 |

`jdg_01` has one review, so all three contributions are zero. `jdg_21` and `jdg_12` have zero functionality variance over their scored non-duplicate projects, so their functionality contributions are also zero. Other contributions use `(raw - judge mean) / sample standard deviation`.

With equal relative weights of `1, 1, 1`, the weighted result is `0.127759`, placing `prj_07` at normalized rank 11. Its raw weighted average is 3.333 (raw rank 30 when fixture IDs break raw-score ties).

## 8. Rank Movement Analysis

Across the 40 non-duplicate fixture projects, 21 move by at least three positions compared with raw criterion averages. The largest climbs include `prj_07`, `prj_12`, `prj_03`, `prj_24`, and `prj_22`. Comparisons use fixture project IDs to break raw-score ties; stored normalized ties use project UUIDs.

## 9. Distribution of Final Scores

The fixture mean raw weighted average is 3.549 with sample standard deviation 0.365. With z=0 for zero-variance distributions, the mean normalized project score is -0.013421 with sample standard deviation 0.299954. The project-level mean need not be exactly zero because projects have different review counts. Review counts remain visible beside results.

---

## 10. Alternative Methods We Considered

### Simple averaging (rejected)

Average raw scores across all judges who reviewed a project. This is what most platforms do. This is rejected because it produces unfair rankings when judges have different baselines, which they always do. Section 3 shows this with a concrete example. The fixture data shows substantial rank movement after per-judge normalization.

### Min-max normalization (rejected)

Scale each judge's scores to [0, 1] using their minimum and maximum:

```
normalized = (raw - min) / (max - min)
```

This is rejected for three reasons:

1. It is hypersensitive to outliers. A single extreme score from a judge compresses all their other scores into a narrow band.
2. If a judge's min equals their max (constant judge), the formula divides by zero, just like z-score. No advantage there.
3. It assumes the judge's scoring range is meaningful, which it is not. A judge who uses [2, 4] is not less opinionated than a judge who uses [1, 5].

### Percentile ranking (rejected)

Convert each judge's scores to percentile ranks, then average percentiles across judges.

This is rejected because percentile ranking loses granularity when a judge has reviewed few projects. A judge who reviewed 2 projects can only produce percentiles of 0 and 100, which exaggerates the gap between projects that might be close in quality.

### Bradley-Terry / pairwise comparison (not implemented, documented for context)

An alternative approach that avoids absolute scoring entirely. Show a judge two projects, ask which is better, and recover a global ranking using a maximum likelihood estimator. This is the approach used by Gavel (from HackMIT).

This is not implemented because:

1. It is a fundamentally different judging mode, not a normalization method applied to numeric scores.
2. The fixture data contains absolute scores, not pairwise comparisons.
3. The implementation complexity is higher and would risk our T2 completion.

It is a legitimate and arguably superior approach for large-scale hackathons. If we had more time, we would offer it as an alternative judging mode.

### Bayesian estimation (not implemented, documented for context)

Model each judge as having a latent bias and a latent variance, then use Bayesian inference to estimate the "true" project quality after accounting for judge-specific parameters. This is more sophisticated than z-score normalization because it accounts for the uncertainty in each judge's estimates.

This is not implemented because:

1. The fixture data has 2-5 reviews per project and 1-11 scores per judge. The sample sizes are too small for reliable Bayesian posterior estimates without strong priors.
2. The implementation and explanation complexity would exceed what we can defend in 72 hours.
3. Z-score normalization produces correct rankings on this data. The improvement from Bayesian estimation would be marginal.

---

## 11. Role Isolation

Role isolation is the single most common failure mode for judging systems. The spec calls it out directly: "If I can curl another judge's scores, it is not isolation."

### What we enforce

A judge can:
- See their own assignments
- See their own scores
- Submit and update scores for their assigned projects

A judge cannot:
- See another judge's scores
- See another judge's assignments
- See aggregate or normalized results
- See projects outside their assigned tracks
- Access organizer tools (progress dashboard, rubric editor, CSV export)

A participant cannot:
- Access any judging routes
- See any scores, including scores for their own project; no participant score endpoint exists in T2

A visitor (unauthenticated) cannot:
- Access any route except the public gallery

### Where enforcement lives

Every API route handler checks the caller's role before touching data. The check is implemented in two layers:

**Layer 1: Role gate.** The `requireRole()` function verifies the caller has the required role (e.g., "judge", "organizer"). If not, the handler returns `401` (no session) or `403` (wrong role).

**Layer 2: Ownership filter.** For judge routes, the database query always filters by the authenticated judge's ID. The query for "my scores" is:

```
WHERE judge_id = {authenticated_user_id}
```

There is no query that returns all scores and then filters in the application layer. The database never sends another judge's data to the application server. Even if the role gate were somehow bypassed, the query would return nothing belonging to another judge.

### The peer-score test

The acceptance suite tests this by requesting Judge A's scores using Judge B's session token. Our implementation returns `403` because:

1. The role gate confirms Judge B is a judge (passes).
2. The ownership filter restricts the query to Judge B's scores.
3. The `peer_scores` route additionally checks whether the requested judge ID matches the authenticated user. If not, it returns `403`.

This three-layer defense ensures that even creative URL construction cannot leak scores between judges.

---

## 12. Organizer Visibility

The organizer has full visibility into the judging process:

**Progress dashboard.** Shows each judge's assigned count, completed count, and percentage complete.

**Score data.** The organizer can inspect aggregate raw and normalized results across all tracks. Judge-to-project assignments remain available through the organizer assignment API.

**Normalization preview.** The organizer can trigger normalization and compare raw averages with weighted normalized results before exporting. Participants have no results route in T2.

**Results publication.** Deferred beyond the listed T2 scope. The schema has no publication field and no participant results UI is exposed.

---

## 13. CSV Export

The organizer can export a CSV at any point in the judging lifecycle. The export includes:

```
project_id, title, team_name, track, review_count,
functionality_raw_avg, functionality_normalized,
quality_raw_avg, quality_normalized,
innovation_raw_avg, innovation_normalized,
weighted_total, rank
```

The CSV is generated server-side using standard comma-separated format with double-quote escaping. The content type is `text/csv` and the Content-Disposition header triggers a file download in the browser.

Criterion columns follow the event's configured rubric. Exporting before judging produces the header only; projects without every criterion scored remain unranked and are omitted. During judging, completed projects are ranked from the scores actually submitted. The duplicate fixture submission remains queryable but never appears in the ranking export.

---

## 14. Auditability

Every score record stores:
- Who scored it (judge ID)
- What they scored (project ID, criterion ID)
- When they scored it (created_at timestamp)
- When they last updated it (updated_at timestamp)

Score updates overwrite the value but preserve the timestamp trail. If a judge changes a score, both the original `created_at` and the `updated_at` are visible.

The normalized results table stores a `computed_at` timestamp so the organizer can see when normalization was last run.

Score saves, rubric changes, normalization, and CSV reads acquire the same PostgreSQL event-row lock inside their transactions. Normalization reads its rubric and scores after acquiring the lock and holds it through replacement of NormalizedResult. A save arriving during normalization waits, then commits its update and invalidates the earlier results. The next export recalculates from the updated scores. CSV reads its rubric and results under the same lock, so its columns and values describe one consistent snapshot.

The organizer can cross-reference any final ranking against the raw data. Every number in the CSV export can be traced back to individual judge scores in the database. There is no black box.

---

## Summary of Design Decisions

| Decision                                | Reasoning                                    |
|-----------------------------------------|----------------------------------------------|
| Z-score over raw averaging              | Raw averages are unfair when judges have different baselines. The fixture data shows substantial rank movement after per-judge normalization. |
| Per-criterion normalization             | Judges have criterion-specific biases. A judge harsh on quality but generous on innovation is not uncommon. |
| Sample standard deviation (n-1)         | Judge scores are a sample from their internal scale, not a census. |
| z=0 for constant judges                 | Avoids division by zero without introducing a different score scale. |
| z=0 for single-project judges           | One data point cannot establish a sample standard deviation. |
| No imputation for missing scores        | Guessing missing scores introduces bias. Absent data should stay absent. |
| Duplicate detection by team + title     | Catches the fixture data edge case (`prj_07`/`prj_41`). Earlier submission kept, later flagged. |
| Three-layer access control              | Role gate + ownership filter + explicit peer check. Defense in depth for the most critical security property. |
| Rankings exclude duplicates             | Duplicate submissions would double-count a team's work. |
| Review count displayed alongside score  | Transparency. The organizer should know which results rest on 2 reviews vs 5. |
