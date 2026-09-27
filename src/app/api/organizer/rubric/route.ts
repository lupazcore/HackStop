import { lockJudgingEvent } from "@/lib/judging";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { text, uuid } from "@/lib/validation";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, include: { rubric: { include: { criteria: { orderBy: { sort_order: "asc" } } } } } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    return success(event.rubric);
  });
}

export async function PUT(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const input = await body(request);
    const eventId = uuid(input.event_id, "Event ID");
    const name = text(input.name, "Rubric name");
    if (!Array.isArray(input.criteria) || !input.criteria.length || input.criteria.length > 20) throw new HttpError(400, "Add between one and twenty criteria.");
    const criteria = input.criteria.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new HttpError(400, "Each criterion needs a name, weight and maximum score.");
      const raw = item as Record<string, unknown>;
      const criterionName = text(raw.name, "Criterion name");
      const weight = Number(raw.weight);
      const maxScore = Number(raw.max_score);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 999.99 || Math.abs(Math.round(weight * 100) - weight * 100) > 1e-8) throw new HttpError(400, "Weights must be positive numbers with at most two decimal places.");
      if (!Number.isInteger(maxScore) || maxScore < 2 || maxScore > 100) throw new HttpError(400, "Maximum score must be an integer from 2 to 100.");
      return { name: criterionName, weight, max_score: maxScore, sort_order: index, id: raw.id ? uuid(raw.id, "Criterion ID") : null };
    });
    if (new Set(criteria.map(criterion => criterion.name.toLowerCase())).size !== criteria.length) throw new HttpError(400, "Criterion names must be unique.");
    const owned = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true } });
    if (!owned) throw new HttpError(404, "Event not found in your account.");
    const result = await db.$transaction(async tx => {
      await lockJudgingEvent(tx, eventId);
      const event = await tx.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, include: { rubric: { include: { criteria: true } } } });
      if (!event) throw new HttpError(404, "Event not found in your account.");
      const scoreCount = await tx.score.count({ where: { project: { team: { event_id: eventId } } } });
      if (scoreCount) {
        const original = event.rubric?.criteria ?? [];
        const ids = new Set(original.map(criterion => criterion.id));
        if (criteria.length !== original.length || criteria.some(criterion => !criterion.id || !ids.has(criterion.id) || original.find(old => old.id === criterion.id)?.max_score !== criterion.max_score)) throw new HttpError(409, "Once scoring starts, keep the same criteria and scales. Their names and weights can still change.");
      }
      if (event.rubric) {
        await tx.rubric.update({ where: { id: event.rubric.id }, data: { name } });
        if (!scoreCount) {
          await tx.rubricCriterion.deleteMany({ where: { rubric_id: event.rubric.id } });
          await tx.rubricCriterion.createMany({ data: criteria.map(criterion => ({ name: criterion.name, weight: criterion.weight, max_score: criterion.max_score, sort_order: criterion.sort_order, rubric_id: event.rubric!.id })) });
        } else {
          for (const criterion of criteria) await tx.rubricCriterion.update({ where: { id: criterion.id! }, data: { name: `__renaming_${criterion.id}` } });
          for (const criterion of criteria) await tx.rubricCriterion.update({ where: { id: criterion.id! }, data: { name: criterion.name, weight: criterion.weight, sort_order: criterion.sort_order } });
        }
      } else {
        await tx.rubric.create({ data: { event_id: eventId, name, criteria: { create: criteria.map(criterion => ({ name: criterion.name, weight: criterion.weight, max_score: criterion.max_score, sort_order: criterion.sort_order })) } } });
      }
      await tx.normalizedResult.deleteMany({ where: { project: { team: { event_id: eventId } } } });
      return tx.rubric.findUniqueOrThrow({ where: { event_id: eventId }, include: { criteria: { orderBy: { sort_order: "asc" } } } });
    }, { maxWait: 10000, timeout: 10000 });
    return success(result);
  });
}
