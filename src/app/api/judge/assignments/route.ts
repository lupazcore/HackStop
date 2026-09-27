import { db } from "@/lib/db";
import { api, success } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export async function GET() {
  return api(async () => {
    const actor = requireRole(await getSession(), "judge");
    return success(await db.judgeAssignment.findMany({ where: { judge_id: actor.id, project: { status: "submitted", track: { judge_assignments: { some: { judge_id: actor.id } } } } }, include: { project: { include: { team: { include: { event: { select: { id: true, name: true, submissions_close: true, judging_open: true, judging_close: true, rubric: { include: { criteria: { orderBy: { sort_order: "asc" } } } } } } } }, track: true } }, scores: { where: { judge_id: actor.id }, include: { criterion: true } } }, orderBy: { assigned_at: "asc" } }));
  });
}
