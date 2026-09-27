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
    const [judges, assignments] = await Promise.all([
      db.user.findMany({ where: { role: "judge", track_assignments: { some: { track: { event_id: eventId } } } }, select: { id: true, name: true, email: true, track_assignments: { where: { track: { event_id: eventId } }, select: { track: { select: { name: true } } } } }, orderBy: { name: "asc" } }),
      db.judgeAssignment.findMany({ where: { project: { team: { event_id: eventId } } }, select: { judge_id: true, status: true } })
    ]);
    return success(judges.map(judge => {
      const assigned = assignments.filter(item => item.judge_id === judge.id);
      const completed = assigned.filter(item => item.status === "completed").length;
      return { id: judge.id, name: judge.name, email: judge.email, tracks: judge.track_assignments.map(item => item.track.name), assigned: assigned.length, completed, percentage: assigned.length ? Math.round(100 * completed / assigned.length) : 0 };
    }));
  });
}
