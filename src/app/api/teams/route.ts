import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { ownedTeams, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { text, uuid } from "@/lib/validation";

export async function GET() {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    return success(await db.team.findMany({ where: ownedTeams(actor), include: { event: true, members: { select: { role: true, user: { select: { id: true, name: true } } } } } }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant");
    const input = await body(request);
    const name = text(input.name, "Team name");
    const eventId = uuid(input.event_id, "event_id");
    const team = await db.$transaction(async tx => {
      if (!(await tx.event.findUnique({ where: { id: eventId } }))) throw new HttpError(404, "Event not found.");
      if (await tx.teamMember.findFirst({ where: { user_id: actor.id, team: { event_id: eventId } } })) throw new HttpError(409, "You already belong to a team in this event.");
      return tx.team.create({ data: { name, event_id: eventId, invite_code: randomBytes(24).toString("hex"), members: { create: { user_id: actor.id, role: "leader" } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 10000 });
    return success(team, 201);
  });
}
