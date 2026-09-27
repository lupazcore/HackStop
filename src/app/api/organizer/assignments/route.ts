import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { api, body, HttpError, success } from "@/lib/http";
import { ownedEvents, requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { strings, uuid } from "@/lib/validation";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    return success(await db.judgeAssignment.findMany({ where: { project: { team: { event_id: event.id } } }, select: { id: true, judge_id: true, project_id: true, status: true, judge: { select: { id: true, name: true } }, project: { select: { id: true, title: true, track_id: true, track: { select: { name: true } } } } }, orderBy: { assigned_at: "asc" } }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "organizer", "admin");
    const input = await body(request);
    const eventId = uuid(input.event_id, "Event ID");
    const event = await db.event.findFirst({ where: { id: eventId, ...ownedEvents(actor) }, select: { id: true, tracks: { select: { id: true } } } });
    if (!event) throw new HttpError(404, "Event not found in your account.");
    if (input.mode === "manual") {
      const judgeId = uuid(input.judge_id, "Judge ID");
      const projectIds = strings(input.project_ids, "Project IDs", 100, 36).map(id => uuid(id, "Project ID"));
      if (!projectIds.length) throw new HttpError(400, "Select at least one project.");
      const [judge, projects] = await Promise.all([
        db.user.findFirst({ where: { id: judgeId, role: "judge" }, include: { track_assignments: { where: { track: { event_id: eventId } }, select: { track_id: true } } } }),
        db.project.findMany({ where: { id: { in: projectIds }, team: { event_id: eventId }, status: "submitted" }, select: { id: true, track_id: true } })
      ]);
      const qualified = new Set(judge?.track_assignments.map(track => track.track_id) ?? []);
      if (!judge || projects.length !== projectIds.length || projects.some(project => !qualified.has(project.track_id))) throw new HttpError(403, "Judge must be qualified for every selected project track.");
      const created = await db.judgeAssignment.createMany({ data: projects.map(project => ({ judge_id: judgeId, project_id: project.id })), skipDuplicates: true });
      return success({ assigned: created.count });
    }
    if (input.mode !== "automatic") throw new HttpError(400, "Mode must be manual or automatic.");
    const trackId = uuid(input.track_id, "Track ID");
    if (!event.tracks.some(track => track.id === trackId)) throw new HttpError(404, "Track not found in this event.");
    const target = Number(input.target_reviews ?? 3);
    if (!Number.isInteger(target) || target < 1 || target > 10) throw new HttpError(400, "Target reviews must be an integer from 1 to 10.");
    const [projects, qualified, existing] = await Promise.all([
      db.project.findMany({ where: { track_id: trackId, status: "submitted", is_duplicate: false }, select: { id: true } }),
      db.judgeTrackAssignment.findMany({ where: { track_id: trackId, judge: { role: "judge" } }, select: { judge_id: true } }),
      db.judgeAssignment.findMany({ where: { project: { track_id: trackId } }, select: { judge_id: true, project_id: true } })
    ]);
    if (qualified.length < target) throw new HttpError(409, "This track has fewer qualified judges than the target review count.");
    const load = new Map(qualified.map(judge => [judge.judge_id, existing.filter(item => item.judge_id === judge.judge_id).length]));
    const byProject = new Map(projects.map(project => [project.id, new Set(existing.filter(item => item.project_id === project.id).map(item => item.judge_id))]));
    const shuffled = [...projects];
    for (let index = shuffled.length - 1; index > 0; index--) { const other = randomInt(index + 1); [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]; }
    const additions: { judge_id: string; project_id: string }[] = [];
    for (const project of shuffled) {
      const assigned = byProject.get(project.id)!;
      while (assigned.size < target) {
        const available = qualified.filter(judge => !assigned.has(judge.judge_id)).sort((a, b) => (load.get(a.judge_id)! - load.get(b.judge_id)!) || a.judge_id.localeCompare(b.judge_id));
        const selected = available[0];
        if (!selected) break;
        additions.push({ judge_id: selected.judge_id, project_id: project.id });
        assigned.add(selected.judge_id);
        load.set(selected.judge_id, load.get(selected.judge_id)! + 1);
      }
    }
    const created = additions.length ? await db.judgeAssignment.createMany({ data: additions, skipDuplicates: true }) : { count: 0 };
    return success({ assigned: created.count, projects: projects.length });
  });
}
