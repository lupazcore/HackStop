import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { email, strings, text, uuid } from "@/lib/validation";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    return success(await db.user.findMany({ where: { role: "judge", track_assignments: { some: { track: { event_id: event.id } } } }, select: { id: true, name: true, email: true, track_assignments: { where: { track: { event_id: event.id } }, include: { track: { select: { id: true, name: true } } } } }, orderBy: { name: "asc" } }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const input = await body(request);
    const eventId = uuid(input.event_id, "Event ID");
    const judgeEmail = email(input.email);
    const name = text(input.name, "Judge name");
    const trackIds = strings(input.track_ids, "Track IDs", 30, 36).map(id => uuid(id, "Track ID"));
    if (!trackIds.length) throw new HttpError(400, "Select at least one track.");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true, tracks: { select: { id: true } } } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    const permitted = new Set(event.tracks.map(track => track.id));
    if (trackIds.some(id => !permitted.has(id))) throw new HttpError(400, "A selected track does not belong to this event.");
    const existing = await db.user.findUnique({ where: { email: judgeEmail }, select: { id: true, role: true } });
    if (existing && existing.role !== "judge") throw new HttpError(409, "This email belongs to another role.");
    const temporaryPassword = existing ? null : randomBytes(18).toString("base64url");
    const judge = await db.$transaction(async tx => {
      const user = existing ?? await tx.user.create({ data: { email: judgeEmail, name, role: "judge", password_hash: await hash(temporaryPassword!, 12) } });
      await tx.judgeTrackAssignment.createMany({ data: trackIds.map(trackId => ({ judge_id: user.id, track_id: trackId })), skipDuplicates: true });
      return user;
    });
    return success({ judge_id: judge.id, temporary_password: temporaryPassword, invited: !existing }, existing ? 200 : 201);
  });
}
