import { db } from "@/lib/db";
import { eventInput } from "@/lib/events";
import { api, body, success } from "@/lib/http";
import { getSession } from "@/lib/session";
import { ownedEvents, requireRole } from "@/lib/permissions";

export async function GET() {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    return success(await db.event.findMany({ where: ownedEvents(actor), include: { tracks: true }, orderBy: { created_at: "desc" } }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const input = eventInput(await body(request));
    return success(await db.event.create({ data: { ...input, organizer_id: actor.id }, include: { tracks: true } }), 201);
  });
}
