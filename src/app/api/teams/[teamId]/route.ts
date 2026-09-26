import { db } from "@/lib/db";
import { api, HttpError, success } from "@/lib/http";
import { ownedTeams, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    const team = await db.team.findFirst({ where: { id: uuid((await context.params).teamId), ...ownedTeams(actor) }, include: { members: { select: { role: true, user: { select: { id: true, name: true } } } } } });
    if (!team) throw new HttpError(404, "Team not found in your account.");
    return success(team);
  });
}
