import { db } from "@/lib/db";
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
    const actor = requireRole(await getSession(), "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
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
