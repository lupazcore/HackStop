import { db } from "@/lib/db";
import { hourAgo, hourlyLimit, lockCommunityActor } from "@/lib/community";
import { api, body, HttpError, success } from "@/lib/http";
import { requireRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Context) {
  return api(async () => {
    const projectId = uuid((await context.params).projectId, "Project ID");
    const project = await db.project.findFirst({ where: { id: projectId, status: "submitted" }, select: { id: true } });
    if (!project) throw new HttpError(404, "Project not found.");
    return success(await db.communityComment.findMany({ where: { project_id: projectId }, select: { id: true, body: true, created_at: true, user: { select: { name: true } } }, orderBy: { created_at: "asc" } }));
  });
}

export async function POST(request: Request, context: Context) {
  return api(async () => {
    const actor = requireRole(await getSession(), "participant", "judge", "organizer", "admin");
    const projectId = uuid((await context.params).projectId, "Project ID");
    const input = await body(request);
    const message = text(input.body, "Comment", 2000);
    const project = await db.project.findFirst({ where: { id: projectId, status: "submitted" }, select: { id: true } });
    if (!project) throw new HttpError(404, "Project not found.");
    const now = new Date();
    return success(await db.$transaction(async tx => {
      await lockCommunityActor(tx, actor.id);
      const count = await tx.communityComment.count({ where: { user_id: actor.id, created_at: { gte: hourAgo(now) } } });
      if (count >= hourlyLimit("COMMENT_RATE_LIMIT_PER_HOUR")) throw new HttpError(429, "Hourly comment limit reached. Try again later.");
      const comment = await tx.communityComment.create({ data: { user_id: actor.id, project_id: project.id, body: message } });
      await tx.communityAudit.create({ data: { actor_id: actor.id, project_id: project.id, action: "comment", target_id: comment.id } });
      return { id: comment.id, body: comment.body, created_at: comment.created_at, user: { name: actor.name } };
    }), 201);
  });
}
