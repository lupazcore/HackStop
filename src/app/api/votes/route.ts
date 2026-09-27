import { db } from "@/lib/db";
import { hourAgo, hourlyLimit, lockCommunityActor, votingIsOpen } from "@/lib/community";
import { api, body, HttpError, success } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { uuid } from "@/lib/validation";

export async function GET(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant", "judge", "organizer", "admin");
    const eventId = uuid(new URL(request.url).searchParams.get("event_id"), "Event ID");
    return success(await db.communityVote.findMany({ where: { user_id: actor.id, project: { team: { event_id: eventId } } }, select: { id: true, project_id: true, value: true, created_at: true }, orderBy: { created_at: "asc" } }));
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant", "judge", "organizer", "admin");
    const input = await body(request);
    const projectId = uuid(input.project_id, "Project ID");
    if (!Number.isInteger(input.value) || Number(input.value) < 1 || Number(input.value) > 5) throw new HttpError(400, "Rating must be an integer from 1 to 5.");
    const value = Number(input.value);
    const project = await db.project.findFirst({ where: { id: projectId, status: "submitted", is_duplicate: false }, select: { id: true, team: { select: { event: { select: { id: true, organizer_id: true, voting_opens: true, voting_closes: true } } } } } });
    if (!project) throw new HttpError(404, "Project not found on the ballot.");
    const event = project.team.event;
    const now = new Date();
    if (!votingIsOpen(event, now)) throw new HttpError(403, "Voting is not open for this event.");
    if (event.organizer_id === actor.id) throw new HttpError(403, "Event organizers cannot vote on their own event.");
    if (actor.role === "judge") {
      const assignment = await db.judgeTrackAssignment.findFirst({ where: { judge_id: actor.id, track: { event_id: event.id } }, select: { id: true } });
      if (assignment) throw new HttpError(403, "Assigned judges cannot vote on this event.");
    }
    return success(await db.$transaction(async tx => {
      await lockCommunityActor(tx, actor.id);
      const transactionNow = new Date();
      if (!votingIsOpen(event, transactionNow)) throw new HttpError(403, "Voting is not open for this event.");
      const count = await tx.communityVote.count({ where: { user_id: actor.id, created_at: { gte: hourAgo(transactionNow) } } });
      if (count >= hourlyLimit("VOTE_RATE_LIMIT_PER_HOUR")) throw new HttpError(429, "Hourly voting limit reached. Try again later.");
      const vote = await tx.communityVote.create({ data: { user_id: actor.id, project_id: project.id, value } });
      await tx.communityAudit.create({ data: { actor_id: actor.id, project_id: project.id, action: "vote", target_id: vote.id } });
      return { id: vote.id, project_id: vote.project_id, value: vote.value, created_at: vote.created_at };
    }), 201);
  });
}
