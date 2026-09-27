import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { lockJudgingEvent } from "./judging";

type ScoreRow = { judge_id: string; project_id: string; criterion_id: string; value: number; project: { is_duplicate: boolean } };

export async function recomputeResults(eventId: string, tx?: Prisma.TransactionClient): Promise<number> {
  if (!tx) return db.$transaction(transaction => recomputeResults(eventId, transaction), { maxWait: 10000, timeout: 10000 });
  await lockJudgingEvent(tx, eventId);
  const rubric = await tx.rubric.findUnique({ where: { event_id: eventId }, include: { criteria: { orderBy: { sort_order: "asc" } } } });
  if (!rubric?.criteria.length) throw new HttpError(409, "Configure a rubric before calculating results.");
  const weightTotal = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight.toNumber(), 0);
  if (weightTotal <= 0) throw new HttpError(409, "Rubric weights must have a positive total.");
  const projects = await tx.project.findMany({ where: { team: { event_id: eventId }, status: "submitted" }, select: { id: true, is_duplicate: true } });
  const scores: ScoreRow[] = await tx.score.findMany({ where: { project: { team: { event_id: eventId }, status: "submitted" } }, select: { judge_id: true, project_id: true, criterion_id: true, value: true, project: { select: { is_duplicate: true } } } });
  const distributions = new Map<string, number[]>();
  for (const score of scores) {
    if (score.project.is_duplicate) continue;
    const key = `${score.judge_id}:${score.criterion_id}`;
    const values = distributions.get(key) ?? [];
    values.push(score.value);
    distributions.set(key, values);
  }
  const stats = new Map<string, { mean: number; deviation: number }>();
  for (const [key, values] of distributions) {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviation = values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)) : 0;
    stats.set(key, { mean, deviation });
  }
  const byProject = new Map<string, ScoreRow[]>();
  for (const score of scores) {
    const rows = byProject.get(score.project_id) ?? [];
    rows.push(score);
    byProject.set(score.project_id, rows);
  }
  const results = projects.map(project => {
    const rows = byProject.get(project.id) ?? [];
    const criterionScores: Record<string, number> = {};
    const rawAvg: Record<string, number> = {};
    let weightedTotal = 0;
    let availableWeight = 0;
    for (const criterion of rubric.criteria) {
      const matching = rows.filter(score => score.criterion_id === criterion.id);
      if (!matching.length) continue;
      const normalized = matching.reduce((sum, score) => {
        const baseline = stats.get(`${score.judge_id}:${score.criterion_id}`);
        // A constant or single-score distribution has no relative signal on the z-score scale.
        return sum + (!baseline?.deviation ? 0 : (score.value - baseline.mean) / baseline.deviation);
      }, 0) / matching.length;
      criterionScores[criterion.name] = normalized;
      rawAvg[criterion.name] = matching.reduce((sum, score) => sum + score.value, 0) / matching.length;
      weightedTotal += criterion.weight.toNumber() * normalized;
      availableWeight += criterion.weight.toNumber();
    }
    return { project_id: project.id, criterion_scores: criterionScores, raw_avg: rawAvg, weighted_total: availableWeight ? weightedTotal / availableWeight : 0, review_count: new Set(rows.map(score => score.judge_id)).size, is_duplicate: project.is_duplicate, rankable: availableWeight === weightTotal };
  });
  const eligible = results.filter(result => !result.is_duplicate && result.review_count > 0 && result.rankable).sort((a, b) => b.weighted_total - a.weighted_total || a.project_id.localeCompare(b.project_id));
  const ranks = new Map(eligible.map((result, index) => [result.project_id, index + 1]));
  await tx.normalizedResult.deleteMany({ where: { project: { team: { event_id: eventId } } } });
  if (results.length) await tx.normalizedResult.createMany({ data: results.map(result => ({ project_id: result.project_id, criterion_scores: result.criterion_scores, raw_avg: result.raw_avg, weighted_total: result.weighted_total, review_count: result.review_count, rank: ranks.get(result.project_id) ?? null })) });
  return eligible.length;
}
