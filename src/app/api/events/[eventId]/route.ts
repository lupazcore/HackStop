import { db } from "@/lib/db";
import { api, HttpError, success } from "@/lib/http";
import { getSession } from "@/lib/session";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { uuid } from "@/lib/validation";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const event = await db.event.findFirst({ where: { id: uuid((await context.params).eventId), ...ownedEvents(actor) }, include: { tracks: true } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    return success(event);
  });
}
