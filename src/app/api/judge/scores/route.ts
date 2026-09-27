import { db } from "@/lib/db";
import { api, HttpError, success } from "@/lib/http";
import { requireRole, requireSelf } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "judge");
    const requested = new URL(request.url).searchParams.get("judge");
    if (requested) {
      const externalId = requested === "judge_a" ? "jdg_01" : requested === "judge_b" ? "jdg_02" : requested;
      const judge = await db.user.findFirst({ where: /^[0-9a-f-]{36}$/i.test(externalId) ? { id: externalId } : { external_id: externalId }, select: { id: true } });
      if (!judge) throw new HttpError(404, "Judge not found.");
      requireSelf(actor, judge.id);
    }
    return success(await db.score.findMany({ where: { judge_id: actor.id, assignment: { judge_id: actor.id, project: { track: { judge_assignments: { some: { judge_id: actor.id } } } } } }, include: { criterion: { select: { id: true, name: true, max_score: true } }, project: { select: { id: true, title: true, track: { select: { name: true } } } } }, orderBy: [{ project_id: "asc" }, { criterion: { sort_order: "asc" } }] }));
  });
}
