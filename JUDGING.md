# JUDGING

## T1 implementation boundary

This document describes the future T2 behavior. T1 creates the schema and preserves the fixture rubric, assignments, and raw scores only; it contains no scoring, normalization, rubric management, assignment, results, or export feature.

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
9. Variance Reduction
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

Weights must sum to 1.0. The platform enforces this when the organizer saves the rubric.

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

If `std(j,c) = 0` (the judge gave the same score on every project for this criterion), the z-score is defined as 0. See edge case handling below.

### Step 3: Per-project, per-criterion normalized score

For each project p and criterion c, average the z-scores from all judges who scored that project on that criterion:

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

**Our solution.** When `std(j,c) = 0`, we set `z(j, p, c) = 0`. This means the judge's score contributes no relative signal to the ranking. Their score is treated as exactly average within their own distribution.

**Why this is correct.** A constant judge provides no information about which project is better than another. Assigning z = 0 is equivalent to saying "this judge did not differentiate between projects on this criterion." It neither inflates nor deflates any project's normalized score. The alternative -- dropping the judge's data entirely -- would reduce coverage and waste a real review. Setting z = 0 preserves the review count while neutralizing the lack of variance.

### 6b. Single-project judge

**The problem.** A judge who scored only one project has n=1 scores. Sample standard deviation requires n >= 2, so it is undefined.

**Who it affects.** `jdg_01` (1 project) and `jdg_23` (1 project).

**Our solution.** Same as the constant-judge case: set z = 0. With only one data point, we cannot determine whether the judge is harsh, generous, or average. The safest assumption is that their score sits at their own mean.

### 6c. Incomplete batches

**The problem.** Not every judge finishes scoring all assigned projects. Some judges submitted 1 score entry, others submitted 11.

**Our solution.** We compute statistics only over the scores a judge actually submitted. Missing scores are not imputed, guessed, or averaged. A project that received 2 reviews is ranked using 2 reviews. The review count is displayed alongside every score so the organizer can see which results rest on thin evidence.

### 6d. Duplicate submission

**The problem.** Team `tm_07` submitted two projects: `prj_07` ("Dry Harbour", submitted at 04:29 UTC) and `prj_41` ("Dry Harbour", submitted at 17:57 UTC). Same title, same track, same repo URL.

**Our solution.** The seed script detects duplicate submissions from the same team by comparing team ID and title. The later submission (`prj_41`) is flagged as a duplicate. Both projects and their scores are preserved in the database -- deleting them would lose judge work. But only the earlier submission (`prj_07`) is included in the final ranking. The duplicate is visible in the gallery with a "Duplicate" label and excluded from the normalization and ranking calculations.

### 6e. Uneven review counts

**The problem.** Projects have between 2 and 5 reviews. A project with 5 reviews has a more reliable normalized score than a project with 2 reviews.

**Our solution.** We do not add a confidence penalty or weight by review count. Z-scores are comparable regardless of sample size as point estimates. However, we display the review count alongside every project's final score, and the CSV export includes it. The organizer can use this information when reviewing close calls.

---

## 7. Worked Example from Fixture Data

We walk through the full normalization pipeline for one project: `prj_07` ("Dry Harbour"), a project in the Accessibility track with 5 reviews from judges `jdg_19`, `jdg_21`, `jdg_26`, `jdg_01`, and `jdg_12`.

This project is a good example because it was scored by judges with very different baselines, and it includes a constant judge (`jdg_01`).

### Raw scores

| Judge  | functionality | quality | innovation |
|--------|-------------:|--------:|-----------:|
| jdg_19 |            2 |       3 |          2 |
| jdg_21 |            4 |       3 |          4 |
| jdg_26 |            4 |       5 |          5 |
| jdg_01 |            2 |       2 |          2 |
| jdg_12 |            4 |       5 |          3 |

Raw averages: functionality = 3.200, quality = 3.600, innovation = 3.200

### Judge baselines (mean and std across all their scores)

| Judge  | func mean | func std | qual mean | qual std | innov mean | innov std |
|--------|----------:|---------:|----------:|---------:|-----------:|----------:|
| jdg_19 |      3.25 |     1.26 |      4.00 |     0.82 |       2.75 |      0.96 |
| jdg_21 |      4.00 |     0.00 |      3.75 |     1.50 |       3.25 |      1.50 |
| jdg_26 |      3.80 |     1.14 |      3.60 |     1.07 |       3.70 |      1.16 |
| jdg_01 |      2.00 |     0.00 |      2.00 |     0.00 |       2.00 |      0.00 |
| jdg_12 |      4.00 |     0.00 |      4.00 |     1.41 |       2.50 |      0.71 |

`jdg_01` has std = 0.00 on all criteria (constant judge, single project).
`jdg_21` has std = 0.00 on functionality (gave 4 to every project on functionality).
`jdg_12` has std = 0.00 on functionality (gave 4 to every project on functionality).

### Z-score transformation

**Functionality:**

| Judge  | raw | mean | std  | z-score  | Notes                     |
|--------|----:|-----:|-----:|---------:|---------------------------|
| jdg_19 |   2 | 3.25 | 1.26 |   -0.993 | Below this judge's average |
| jdg_21 |   4 | 4.00 | 0.00 |    0.000 | Zero std, z = 0           |
| jdg_26 |   4 | 3.80 | 1.14 |   +0.176 | Slightly above average    |
| jdg_01 |   2 | 2.00 | 0.00 |    0.000 | Constant judge, z = 0     |
| jdg_12 |   4 | 4.00 | 0.00 |    0.000 | Zero std, z = 0           |

Normalized functionality = (-0.993 + 0.000 + 0.176 + 0.000 + 0.000) / 5 = **-0.163**

**Quality:**

| Judge  | raw | mean | std  | z-score  |
|--------|----:|-----:|-----:|---------:|
| jdg_19 |   3 | 4.00 | 0.82 |   -1.225 |
| jdg_21 |   3 | 3.75 | 1.50 |   -0.500 |
| jdg_26 |   5 | 3.60 | 1.07 |   +1.302 |
| jdg_01 |   2 | 2.00 | 0.00 |    0.000 |
| jdg_12 |   5 | 4.00 | 1.41 |   +0.707 |

Normalized quality = (-1.225 + -0.500 + 1.302 + 0.000 + 0.707) / 5 = **+0.057**

**Innovation:**

| Judge  | raw | mean | std  | z-score  |
|--------|----:|-----:|-----:|---------:|
| jdg_19 |   2 | 2.75 | 0.96 |   -0.783 |
| jdg_21 |   4 | 3.25 | 1.50 |   +0.500 |
| jdg_26 |   5 | 3.70 | 1.16 |   +1.121 |
| jdg_01 |   2 | 2.00 | 0.00 |    0.000 |
| jdg_12 |   3 | 2.50 | 0.71 |   +0.707 |

Normalized innovation = (-0.783 + 0.500 + 1.121 + 0.000 + 0.707) / 5 = **+0.309**

### Weighted final score

With equal weights (1/3 each):

```
final = (1/3)(-0.163) + (1/3)(0.057) + (1/3)(0.309) = 0.067
```

### Impact on ranking

| Metric                | Value |
|-----------------------|------:|
| Raw weighted average  | 3.333 |
| Raw rank              |    30 |
| Normalized score      | 0.067 |
| Normalized rank       |    16 |
| Rank change           |   +14 |

This project climbed 14 positions after normalization. The raw average of 3.333 placed it near the bottom because two of its judges (`jdg_01` and `jdg_19`) tend to score low. After adjusting for each judge's personal baseline, the project's relative performance is actually above average.

---

## 8. Rank Movement Analysis

We ran normalization across all 40 non-duplicate projects in the fixture data. The table below shows the top and bottom movers.

### Biggest climbers (projects that were unfairly penalized by raw averages)

| Project | Title        | Raw Rank | Norm Rank | Change |
|---------|--------------|--------:|---------:|-------:|
| prj_12  | Open Beacon  |      26 |        8 |    +18 |
| prj_07  | Dry Harbour  |      30 |       16 |    +14 |
| prj_22  | Dry Bridge   |      35 |       26 |     +9 |
| prj_24  | Glass Beacon |      20 |       13 |     +7 |
| prj_14  | Green Lantern|      28 |       23 |     +5 |

`prj_12` ("Open Beacon") is the most dramatic case. It climbed 18 positions because its raw scores were depressed by harsh judges. After normalization revealed those judges were harsh across the board, the project's relative performance turned out to be strong.

### Biggest drops (projects that were unfairly inflated by raw averages)

| Project | Title        | Raw Rank | Norm Rank | Change |
|---------|--------------|--------:|---------:|-------:|
| prj_19  | Small Relay  |      12 |       29 |    -17 |
| prj_15  | Copper Orbit |      13 |       28 |    -15 |
| prj_28  | Flat Meadow  |      27 |       38 |    -11 |
| prj_01  | Glass Signal |      23 |       31 |     -8 |
| prj_02  | Small Meadow |      15 |       22 |     -7 |

`prj_19` ("Small Relay") dropped 17 positions. Its raw average of 3.667 was inflated by generous judges. After normalization, its actual performance relative to those judges' baselines was below average.

### What this tells us

17 of the 40 projects changed rank by 3 or more positions after normalization. The maximum movement was 18 positions in either direction. A ranking system that uses raw averages would have placed 17 projects in materially wrong positions.

---

## 9. Variance Reduction

Normalization reduces the spread of final scores across projects, which is expected and correct. Judge-specific bias is noise, not signal, and removing it tightens the distribution around real differences in project quality.

| Metric                            | Raw       | Normalized |
|-----------------------------------|----------:|-----------:|
| Mean of weighted project scores   |     3.549 |     -0.020 |
| Standard deviation                |     0.360 |      0.295 |

The standard deviation dropped from 0.360 to 0.295, an 18% reduction. This means 18% of the apparent spread in raw scores was judge bias, not real quality difference. Normalization stripped that noise out.

The normalized mean is approximately zero, which is expected: z-scores are centered at zero by construction.

---

## 10. Alternative Methods We Considered

### Simple averaging (rejected)

Average raw scores across all judges who reviewed a project. This is what most platforms do. This is rejected because it produces unfair rankings when judges have different baselines, which they always do. Section 3 shows this with a concrete example. The fixture data confirms it: 17 of 40 projects would be ranked in materially wrong positions.

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
- See any scores (including their own project's scores before results are published)

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

**Progress dashboard.** Shows how many projects each judge has scored out of their assignments. Judges who have not started are highlighted. Judges who have scored fewer than half their assignments are flagged.

**Score browser.** The organizer can view all scores from all judges across all tracks. This is the one place where cross-judge, cross-track data is visible.

**Normalization preview.** The organizer can trigger normalization and see the raw vs. normalized rankings side by side before publishing results. This lets them verify that the normalization is producing reasonable results before participants see them.

**Results publication.** The organizer explicitly publishes results. Before publication, no participant can see scores or rankings.

---

## 13. CSV Export

The organizer can export a CSV at any point in the judging lifecycle. The export includes:

```
project_id, title, team_name, track, review_count,
functionality_raw_avg, quality_raw_avg, innovation_raw_avg,
functionality_normalized, quality_normalized, innovation_normalized,
weighted_total, rank
```

The CSV is generated server-side using standard comma-separated format with double-quote escaping. The content type is `text/csv` and the Content-Disposition header triggers a file download in the browser.

The organizer can also export at intermediate stages:
- Before judging: project list with team and track info
- During judging: partial scores with review counts
- After normalization: full results with raw and normalized scores

---

## 14. Auditability

Every score record stores:
- Who scored it (judge ID)
- What they scored (project ID, criterion ID)
- When they scored it (created_at timestamp)
- When they last updated it (updated_at timestamp)

Score updates overwrite the value but preserve the timestamp trail. If a judge changes a score, both the original `created_at` and the `updated_at` are visible.

The normalized results table stores a `computed_at` timestamp so the organizer can see when normalization was last run.

The organizer can cross-reference any final ranking against the raw data. Every number in the CSV export can be traced back to individual judge scores in the database. There is no black box.

---

## Summary of Design Decisions

| Decision                                | Reasoning                                    |
|-----------------------------------------|----------------------------------------------|
| Z-score over raw averaging              | Raw averages are unfair when judges have different baselines. The fixture data confirms this: 17 of 40 projects would be ranked incorrectly. |
| Per-criterion normalization             | Judges have criterion-specific biases. A judge harsh on quality but generous on innovation is not uncommon. |
| Sample standard deviation (n-1)         | Judge scores are a sample from their internal scale, not a census. |
| z = 0 for constant judges              | Preserves review count without injecting false signal. A constant judge provides no relative information. |
| z = 0 for single-project judges         | Same reasoning. One data point cannot establish a baseline. |
| No imputation for missing scores        | Guessing missing scores introduces bias. Absent data should stay absent. |
| Duplicate detection by team + title     | Catches the fixture data edge case (`prj_07`/`prj_41`). Earlier submission kept, later flagged. |
| Three-layer access control              | Role gate + ownership filter + explicit peer check. Defense in depth for the most critical security property. |
| Rankings exclude duplicates             | Duplicate submissions would double-count a team's work. |
| Review count displayed alongside score  | Transparency. The organizer should know which results rest on 2 reviews vs 5. |
