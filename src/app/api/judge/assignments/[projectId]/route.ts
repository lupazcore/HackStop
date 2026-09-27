import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { assertJudgingOpen, lockJudgingEvent } from "@/lib/judging";
import { requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string }> };
const whereFor = (judgeId: string, projectId: string) => ({ judge_id_project_id: { judge_id: judgeId, project_id: projectId } });

export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const actor = requireRole(await getSession(), "judge");
    const projectId = uuid((await context.params).projectId);
    const assignment = await db.judgeAssignment.findFirst({
      where: { judge_id: actor.id, project_id: projectId, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } },
      include: {
        project: { include: {
          team: { select: { id: true, name: true, event: { select: { id: true, name: true, submissions_close: true, judging_open: true, judging_close: true, rubric: { include: { criteria: { orderBy: { sort_order: "asc" } } } } } } } },
          track: { select: { id: true, name: true } }
        } },
        scores: { where: { judge_id: actor.id } }
      }
    });
    if (!assignment) throw new HttpError(404, "Assigned project not found.");
    return success(assignment);
  });
}

export async function PUT(request: Request, context: Context) {
  return api(async () => {
    const actor = requireRole(await getSession(), "judge");
    const projectId = uuid((await context.params).projectId);
    const input = await body(request);
    const owned = await db.judgeAssignment.findFirst({
      where: { judge_id: actor.id, project_id: projectId, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } },
      select: { project: { select: { team: { select: { event_id: true } } } } }
    });
    if (!owned) throw new HttpError(404, "Assigned project not found.");
    const result = await db.$transaction(async tx => {
      await lockJudgingEvent(tx, owned.project.team.event_id);
      const assignment = await tx.judgeAssignment.findFirst({
        where: { judge_id: actor.id, project_id: projectId, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } },
        include: {
          project: { include: { team: { include: { event: { include: { rubric: { include: { criteria: true } } } } } } } },
          scores: { where: { judge_id: actor.id } }
        }
      });
      if (!assignment) throw new HttpError(404, "Assigned project not found.");
      const event = assignment.project.team.event;
      assertJudgingOpen(event);
      if (!Array.isArray(input.scores) || input.scores.length > 50) throw new HttpError(400, "Scores must be a list of criterion values.");
      const criteria = event.rubric?.criteria ?? [];
      if (!criteria.length) throw new HttpError(409, "This event has no scoring rubric.");
      const valid = new Map(criteria.map(criterion => [criterion.id, criterion]));
      const entries = input.scores.map(item => {
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new HttpError(400, "Each score must name a criterion and integer value.");
        const raw = item as Record<string, unknown>;
        const criterionId = uuid(raw.criterion_id, "Criterion ID");
        const criterion = valid.get(criterionId);
        if (!criterion || !Number.isInteger(raw.value) || typeof raw.value !== "number" || raw.value < 1 || raw.value > criterion.max_score) throw new HttpError(400, "Score must be an integer within its criterion's scale.");
        return { criterion_id: criterionId, value: raw.value };
      });
      if (new Set(entries.map(entry => entry.criterion_id)).size !== entries.length) throw new HttpError(400, "Each criterion can be scored once per request.");
      const comment = text(input.comment, "Comment", 5000, false);
      const existing = new Set(assignment.scores.map(score => score.criterion_id));
      const complete = new Set([...existing, ...entries.map(entry => entry.criterion_id)]).size === criteria.length;
      for (const entry of entries) await tx.score.upsert({ where: { judge_id_project_id_criterion_id: { judge_id: actor.id, project_id: projectId, criterion_id: entry.criterion_id } }, create: { judge_id: actor.id, project_id: projectId, criterion_id: entry.criterion_id, value: entry.value, comment }, update: { value: entry.value, comment } });
      await tx.score.updateMany({ where: { judge_id: actor.id, project_id: projectId }, data: { comment } });
      await tx.judgeAssignment.update({ where: whereFor(actor.id, projectId), data: { status: complete ? "completed" : entries.length || existing.size ? "in_progress" : "pending" } });
      await tx.normalizedResult.deleteMany({ where: { project: { team: { event_id: event.id } } } });
      return { status: complete ? "completed" : entries.length || existing.size ? "in_progress" : "pending" };
    }, { maxWait: 10000, timeout: 10000 });
    return success(result);
  });
}
