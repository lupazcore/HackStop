import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { text, uuid } from "@/lib/validation";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    const input = await body(request);
    const teamId = uuid((await context.params).teamId);
    const code = text(input.invite_code, "Invite code", 50);
    const membership = await db.$transaction(async tx => {
      const team = await tx.team.findFirst({ where: { id: teamId, invite_code: code }, include: { _count: { select: { members: true } } } });
      if (!team) throw new HttpError(404, "Invite link is invalid.");
      const existing = await tx.teamMember.findFirst({ where: { user_id: actor.id, team: { event_id: team.event_id } } });
      if (existing) throw new HttpError(409, "You already belong to a team in this event.");
      if (team._count.members >= 4) throw new HttpError(409, "This team already has four members.");
      return tx.teamMember.create({ data: { team_id: team.id, user_id: actor.id, role: "member" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 10000 });
    return success(membership, 201);
  });
}
