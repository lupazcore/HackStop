import { db } from "@/lib/db";
import { api, HttpError, success } from "@/lib/http";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    return success(await db.communityAudit.findMany({ where: { project: { team: { event_id: event.id } } }, select: { id: true, action: true, target_id: true, created_at: true, actor: { select: { id: true, name: true } }, project: { select: { id: true, title: true } } }, orderBy: { created_at: "desc" } }));
  });
}
