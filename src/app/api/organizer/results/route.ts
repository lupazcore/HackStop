import { db } from "@/lib/db";
import { votingIsOpen } from "@/lib/community";
import { api, checkOrigin, HttpError, success } from "@/lib/http";
import { recomputeResults } from "@/lib/normalization";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

async function eventFor(eventId: string, actor: Parameters<typeof ownedEvents>[0]) {
  const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true } });
  if (!event) throw new HttpError(404, "Event not found in your account.");
  return event;
}

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant", "judge", "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    if (actor.role !== "organizer" && actor.role !== "admin") {
      const event = await db.event.findUnique({ where: { id: eventId }, select: { voting_opens: true, voting_closes: true } });
      if (!event) throw new HttpError(404, "Event not found.");
      if (votingIsOpen(event, new Date())) throw new HttpError(423, "Results are not yet available while voting is open.");
      throw new HttpError(403, "Your role cannot view event rankings.");
    }
    await eventFor(eventId, actor);
    return success(await db.normalizedResult.findMany({ where: { project: { team: { event_id: eventId } } }, include: { project: { select: { external_id: true, title: true, is_duplicate: true, team: { select: { name: true } }, track: { select: { name: true } } } } }, orderBy: [{ rank: "asc" }, { project: { title: "asc" } }] }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    checkOrigin(request);
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    await eventFor(eventId, actor);
    return success({ ranked: await recomputeResults(eventId) });
  });
}
